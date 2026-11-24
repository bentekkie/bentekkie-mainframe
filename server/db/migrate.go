package db

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

//go:embed migrations/*.sql
var embeddedMigrations embed.FS

// migrationAdvisoryLockID is a fixed PostgreSQL advisory lock key used to serialize
// concurrent schema migrations across container restarts.
const migrationAdvisoryLockID int64 = 0x62656e74656b6b69

// Migration represents a single versioned SQL migration file.
type Migration struct {
	Version  int
	Name     string
	SQL      string
	Checksum string
}

// AppliedMigration represents a recorded row in schema_migrations.
type AppliedMigration struct {
	Version   int       `db:"version"`
	Name      string    `db:"name"`
	Checksum  string    `db:"checksum"`
	AppliedAt time.Time `db:"applied_at"`
}

// LoadMigrations reads and validates versioned *.sql files from dir within fsys.
// Files must be named "<positive_int>_<description>.sql" (e.g. "0001_baseline.sql").
func LoadMigrations(fsys fs.FS, dir string) ([]Migration, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations directory %q: %w", dir, err)
	}

	seenVersions := make(map[int]string)
	var migrations []Migration
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		version, err := parseMigrationVersion(entry.Name())
		if err != nil {
			return nil, err
		}
		if existing, dup := seenVersions[version]; dup {
			return nil, fmt.Errorf("duplicate migration version %d: %q and %q", version, existing, entry.Name())
		}
		seenVersions[version] = entry.Name()

		raw, err := fs.ReadFile(fsys, path.Join(dir, entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read migration %q: %w", entry.Name(), err)
		}
		normalized := strings.ReplaceAll(string(raw), "\r\n", "\n")
		sum := sha256.Sum256([]byte(normalized))
		migrations = append(migrations, Migration{
			Version:  version,
			Name:     entry.Name(),
			SQL:      normalized,
			Checksum: hex.EncodeToString(sum[:]),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})
	return migrations, nil
}

func parseMigrationVersion(filename string) (int, error) {
	base := strings.TrimSuffix(filename, ".sql")
	parts := strings.SplitN(base, "_", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return 0, fmt.Errorf("invalid migration filename %q: expected <version>_<description>.sql", filename)
	}
	v, err := strconv.Atoi(parts[0])
	if err != nil || v <= 0 {
		return 0, fmt.Errorf("invalid migration version in %q: must be a positive integer", filename)
	}
	return v, nil
}

// Migrate applies all pending embedded SQL migrations in order.
func (c *Connection) Migrate(ctx context.Context) error {
	return c.MigrateWithFS(ctx, embeddedMigrations, "migrations")
}

// MigrateWithFS applies all pending SQL migrations from fsys/dir under a PostgreSQL advisory lock.
func (c *Connection) MigrateWithFS(ctx context.Context, fsys fs.FS, dir string) error {
	migrations, err := LoadMigrations(fsys, dir)
	if err != nil {
		return err
	}

	sqlConn, err := c.conn.Conn(ctx)
	if err != nil {
		return fmt.Errorf("acquire connection for migrations: %w", err)
	}
	defer sqlConn.Close()

	if _, err := sqlConn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", migrationAdvisoryLockID); err != nil {
		return fmt.Errorf("acquire migration advisory lock: %w", err)
	}
	defer func() {
		unlockCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, unlockErr := sqlConn.ExecContext(unlockCtx, "SELECT pg_advisory_unlock($1)", migrationAdvisoryLockID); unlockErr != nil {
			log.WithError(unlockErr).Warn("Failed to release migration advisory lock")
		}
	}()

	const createTrackingTable = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version integer PRIMARY KEY,
    name text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT NOW()
);`
	if _, err := sqlConn.ExecContext(ctx, createTrackingTable); err != nil {
		return fmt.Errorf("ensure schema_migrations table: %w", err)
	}

	rows, err := sqlConn.QueryContext(ctx, "SELECT version, name, checksum FROM schema_migrations ORDER BY version ASC")
	if err != nil {
		return fmt.Errorf("query applied migrations: %w", err)
	}
	applied := make(map[int]AppliedMigration)
	for rows.Next() {
		var am AppliedMigration
		if err := rows.Scan(&am.Version, &am.Name, &am.Checksum); err != nil {
			rows.Close()
			return fmt.Errorf("scan applied migration: %w", err)
		}
		applied[am.Version] = am
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate applied migrations: %w", err)
	}
	rows.Close()

	for _, m := range migrations {
		if prev, ok := applied[m.Version]; ok {
			if prev.Checksum != m.Checksum {
				return fmt.Errorf(
					"migration %d (%s) checksum mismatch: database has %s (%s), binary has %s; do not modify applied migrations—add a new migration instead",
					m.Version, m.Name, prev.Checksum, prev.Name, m.Checksum,
				)
			}
			continue
		}

		tx, err := sqlConn.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", m.Name, err)
		}
		if _, err := tx.ExecContext(ctx, m.SQL); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("execute migration %s: %w", m.Name, err)
		}
		if _, err := tx.ExecContext(
			ctx,
			"INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
			m.Version, m.Name, m.Checksum,
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", m.Name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", m.Name, err)
		}
		log.Infof("Applied database migration %s", m.Name)
	}

	return nil
}

// AppliedMigrations returns all recorded schema migrations ordered by version.
func (c *Connection) AppliedMigrations(ctx context.Context) ([]AppliedMigration, error) {
	var applied []AppliedMigration
	err := c.conn.SelectContext(ctx, &applied, "SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC")
	return applied, err
}

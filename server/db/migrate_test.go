package db

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"

	_ "github.com/lib/pq"
	"github.com/ory/dockertest/v3"
)

func TestLoadEmbeddedMigrations(t *testing.T) {
	migrations, err := LoadMigrations(embeddedMigrations, "migrations")
	if err != nil {
		t.Fatalf("LoadMigrations failed: %v", err)
	}
	if len(migrations) == 0 {
		t.Fatal("expected at least one embedded migration")
	}
	if migrations[0].Version != 1 || migrations[0].Name != "0001_baseline.sql" {
		t.Fatalf("expected first migration to be 0001_baseline.sql, got version=%d name=%q", migrations[0].Version, migrations[0].Name)
	}
	for i, m := range migrations {
		if strings.TrimSpace(m.SQL) == "" {
			t.Fatalf("migration %s has empty SQL", m.Name)
		}
		if len(m.Checksum) != 64 {
			t.Fatalf("migration %s has invalid checksum length %d", m.Name, len(m.Checksum))
		}
		if i > 0 && m.Version <= migrations[i-1].Version {
			t.Fatalf("migrations not strictly sorted: %d after %d", m.Version, migrations[i-1].Version)
		}
	}
}

func TestLoadMigrationsValidation(t *testing.T) {
	t.Run("sorts numerically and normalizes CRLF", func(t *testing.T) {
		fsys := fstest.MapFS{
			"migrations/0010_ten.sql":  {Data: []byte("SELECT 10;\r\n")},
			"migrations/0002_two.sql":  {Data: []byte("SELECT 2;\n")},
			"migrations/0001_one.sql":  {Data: []byte("SELECT 1;\n")},
			"migrations/README.txt":    {Data: []byte("ignored")},
		}
		migs, err := LoadMigrations(fsys, "migrations")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(migs) != 3 {
			t.Fatalf("expected 3 migrations, got %d", len(migs))
		}
		if migs[0].Version != 1 || migs[1].Version != 2 || migs[2].Version != 10 {
			t.Fatalf("unexpected order: %+v", migs)
		}

		lfOnly := fstest.MapFS{
			"migrations/0010_ten.sql": {Data: []byte("SELECT 10;\n")},
		}
		migsLF, err := LoadMigrations(lfOnly, "migrations")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if migs[2].Checksum != migsLF[0].Checksum {
			t.Fatalf("expected CRLF normalization to match LF checksum")
		}
	})

	t.Run("rejects duplicate versions", func(t *testing.T) {
		fsys := fstest.MapFS{
			"migrations/0001_a.sql": {Data: []byte("SELECT 1;")},
			"migrations/0001_b.sql": {Data: []byte("SELECT 2;")},
		}
		if _, err := LoadMigrations(fsys, "migrations"); err == nil {
			t.Fatal("expected error for duplicate version")
		}
	})

	invalidNames := []string{
		"baseline.sql",
		"0000_zero.sql",
		"-1_negative.sql",
		"abc_alpha.sql",
		"0001_.sql",
	}
	for _, name := range invalidNames {
		t.Run("rejects "+name, func(t *testing.T) {
			fsys := fstest.MapFS{
				"migrations/" + name: {Data: []byte("SELECT 1;")},
			}
			if _, err := LoadMigrations(fsys, "migrations"); err == nil {
				t.Fatalf("expected error for invalid filename %q", name)
			}
		})
	}
}

func TestIsFileNilGuard(t *testing.T) {
	c := &Connection{}
	if _, err := c.IsFile(context.Background(), nil); err == nil {
		t.Fatal("expected error for nil inode")
	}
	if _, err := c.IsFile(context.Background(), &INode{}); err == nil {
		t.Fatal("expected error for invalid inode id")
	}
}

func TestMigrateFreshAndInPlaceUpgrade(t *testing.T) {
	pool, err := dockertest.NewPool("")
	if err != nil {
		t.Skipf("Docker unavailable for Postgres integration test: %v", err)
	}
	if err := pool.Client.Ping(); err != nil {
		t.Skipf("Docker daemon unreachable for Postgres integration test: %v", err)
	}

	resource, err := pool.Run("postgres", "15-alpine", []string{
		"POSTGRES_USER=testuser",
		"POSTGRES_PASSWORD=testpass",
		"POSTGRES_DB=fresh_db",
	})
	if err != nil {
		t.Skipf("Unable to start postgres container: %v", err)
	}
	defer func() {
		_ = pool.Purge(resource)
	}()

	port, err := strconv.Atoi(resource.GetPort("5432/tcp"))
	if err != nil {
		t.Fatalf("parse postgres port: %v", err)
	}

	ctx := context.Background()

	// 1. Fresh DB boot via Connect (runs 0001_baseline.sql + creates "/").
	freshConn, err := Connect(ctx, "127.0.0.1", port, "testuser", "testpass", "fresh_db")
	if err != nil {
		t.Fatalf("Connect to fresh DB failed: %v", err)
	}
	defer freshConn.Close()

	if freshConn.Root == nil || freshConn.Root.Path.String != "/" {
		t.Fatalf("expected root '/', got %+v", freshConn.Root)
	}
	applied, err := freshConn.AppliedMigrations(ctx)
	if err != nil || len(applied) != 1 || applied[0].Version != 1 {
		t.Fatalf("expected 1 applied migration, got %+v (err=%v)", applied, err)
	}

	// Verify transactional SeedDB does not wipe existing data on invalid JSON.
	seedPayload := `{"name":"","folders":[{"name":"dir_one","folders":[],"files":[{"name":"hello_world.md","contents":"hi"}]}],"files":[]}`
	if err := freshConn.SeedDB(ctx, []byte(seedPayload), true); err != nil {
		t.Fatalf("SeedDB valid payload failed: %v", err)
	}
	if err := freshConn.SeedDB(ctx, []byte("{bad json"), true); err == nil {
		t.Fatal("expected SeedDB to fail on invalid JSON")
	}
	fileNode, err := freshConn.FindINodeByPath(ctx, "/dir_one/hello_world.md")
	if err != nil {
		t.Fatalf("expected existing file to survive invalid SeedDB: %v", err)
	}
	isFile, err := freshConn.IsFile(ctx, fileNode)
	if err != nil || !isFile {
		t.Fatalf("expected IsFile=true for inode %v, got %v (err=%v)", fileNode.ID, isFile, err)
	}
	dirNode, err := freshConn.FindINodeByPath(ctx, "/dir_one")
	if err != nil {
		t.Fatalf("FindINodeByPath /dir_one failed: %v", err)
	}
	isDirFile, err := freshConn.IsFile(ctx, dirNode)
	if err != nil || isDirFile {
		t.Fatalf("expected IsFile=false for folder inode %v, got %v (err=%v)", dirNode.ID, isDirFile, err)
	}
	listings, err := freshConn.FindDirListingsByPath(ctx, "/dir_one")
	if err != nil || len(listings) != 1 || listings[0].Path.String != "/dir_one/hello_world.md" {
		t.Fatalf("expected FindDirListingsByPath to handle underscores cleanly, got %+v (err=%v)", listings, err)
	}

	// Verify tree / find / grep DB queries against live PostgreSQL.
	subtree, err := freshConn.FindSubtree(ctx, freshConn.Root.ID.Int64, 3, 200)
	if err != nil || len(subtree) != 2 {
		t.Fatalf("expected 2 subtree nodes (/dir_one and /dir_one/hello_world.md), got %+v (err=%v)", subtree, err)
	}
	foundByGlob, err := freshConn.SearchPaths(ctx, "/", "*.md", 50)
	if err != nil || len(foundByGlob) != 1 || foundByGlob[0].Path.String != "/dir_one/hello_world.md" {
		t.Fatalf("expected SearchPaths '*.md' to match hello_world.md, got %+v (err=%v)", foundByGlob, err)
	}
	grepHits, err := freshConn.SearchFileContents(ctx, "/", "HI", 50)
	if err != nil || len(grepHits) != 1 || grepHits[0].Path != "/dir_one/hello_world.md" {
		t.Fatalf("expected SearchFileContents 'HI' to match hello_world.md, got %+v (err=%v)", grepHits, err)
	}

	// 2. Simulate an in-place upgrade on a pre-existing v1 legacy volume (no schema_migrations table).
	if _, err := freshConn.conn.ExecContext(ctx, "CREATE DATABASE legacy_db"); err != nil {
		t.Fatalf("create legacy_db: %v", err)
	}
	legacyDSN := fmt.Sprintf("host=127.0.0.1 port=%d user=testuser password=testpass dbname=legacy_db sslmode=disable", port)
	rawDB, err := sql.Open("postgres", legacyDSN)
	if err != nil {
		t.Fatalf("open legacy_db: %v", err)
	}
	defer rawDB.Close()

	const legacyV1DDL = `
CREATE SEQUENCE IF NOT EXISTS inodes_id_seq;
CREATE TABLE IF NOT EXISTS inodes (
    id integer PRIMARY KEY NOT NULL DEFAULT nextval('inodes_id_seq'),
    parentinode integer REFERENCES inodes (id) ON DELETE CASCADE,
    path text UNIQUE
);
CREATE TABLE IF NOT EXISTS files (
    inode integer REFERENCES inodes (id) ON DELETE CASCADE,
    contents text
);
CREATE TABLE IF NOT EXISTS users (
    username text PRIMARY KEY,
    password text
);
CREATE OR REPLACE FUNCTION isfile(id integer)
RETURNS boolean AS $$ BEGIN RETURN exists(SELECT 1 from files where inode = id); END; $$ LANGUAGE PLPGSQL;
INSERT INTO inodes (path, parentinode) VALUES ('/', NULL);
INSERT INTO inodes (path, parentinode) VALUES ('/resume.md', (SELECT id FROM inodes WHERE path='/'));
INSERT INTO files (inode, contents) VALUES ((SELECT id FROM inodes WHERE path='/resume.md'), '# Existing Resume');
INSERT INTO users (username, password) VALUES ('existing_owner', 'keepme');
`
	if _, err := rawDB.ExecContext(ctx, legacyV1DDL); err != nil {
		t.Fatalf("seed legacy v1 schema: %v", err)
	}

	upgradedConn, err := Connect(ctx, "127.0.0.1", port, "testuser", "testpass", "legacy_db")
	if err != nil {
		t.Fatalf("in-place upgrade Connect failed: %v", err)
	}
	defer upgradedConn.Close()

	// Verify pre-existing rows survived adoption intact.
	resumeNode, err := upgradedConn.FindINodeByPath(ctx, "/resume.md")
	if err != nil || !resumeNode.IsFile {
		t.Fatalf("expected pre-existing /resume.md file to survive upgrade, got %+v (err=%v)", resumeNode, err)
	}
	resumeFile, err := upgradedConn.FindFile(ctx, resumeNode.ID.Int64)
	if err != nil || resumeFile.Contents.String != "# Existing Resume" {
		t.Fatalf("expected pre-existing content preserved, got %+v (err=%v)", resumeFile, err)
	}
	pw, err := upgradedConn.GetPassword(ctx, "existing_owner")
	if err != nil || pw != "keepme" {
		t.Fatalf("expected pre-existing user preserved, got %q (err=%v)", pw, err)
	}

	// Verify incremental v2 migration applies cleanly, is idempotent, and rejects checksum drift.
	baselineBytes, err := embeddedMigrations.ReadFile("migrations/0001_baseline.sql")
	if err != nil {
		t.Fatalf("read embedded baseline: %v", err)
	}
	v2FS := fstest.MapFS{
		"migrations/0001_baseline.sql": {Data: baselineBytes},
		"migrations/0002_notes.sql":    {Data: []byte("ALTER TABLE files ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';")},
	}
	if err := upgradedConn.MigrateWithFS(ctx, v2FS, "migrations"); err != nil {
		t.Fatalf("v2 migration failed: %v", err)
	}
	// Idempotent re-run
	if err := upgradedConn.MigrateWithFS(ctx, v2FS, "migrations"); err != nil {
		t.Fatalf("idempotent v2 re-run failed: %v", err)
	}
	applied, err = upgradedConn.AppliedMigrations(ctx)
	if err != nil || len(applied) != 2 || applied[1].Version != 2 {
		t.Fatalf("expected 2 applied migrations, got %+v (err=%v)", applied, err)
	}

	// Checksum mismatch detection
	tamperedFS := fstest.MapFS{
		"migrations/0001_baseline.sql": {Data: baselineBytes},
		"migrations/0002_notes.sql":    {Data: []byte("ALTER TABLE files ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT 'tampered';")},
	}
	if err := upgradedConn.MigrateWithFS(ctx, tamperedFS, "migrations"); err == nil {
		t.Fatal("expected checksum mismatch error on tampered applied migration")
	}

	// Atomic rollback on failing v3 migration
	failingV3FS := fstest.MapFS{
		"migrations/0001_baseline.sql": {Data: baselineBytes},
		"migrations/0002_notes.sql":    {Data: []byte("ALTER TABLE files ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';")},
		"migrations/0003_broken.sql":   {Data: []byte("CREATE TABLE should_rollback (id int); THIS IS INVALID SQL;")},
	}
	if err := upgradedConn.MigrateWithFS(ctx, failingV3FS, "migrations"); err == nil {
		t.Fatal("expected error on broken v3 migration")
	}
	applied, err = upgradedConn.AppliedMigrations(ctx)
	if err != nil || len(applied) != 2 {
		t.Fatalf("expected failed v3 migration not to be recorded, got %+v (err=%v)", applied, err)
	}
}

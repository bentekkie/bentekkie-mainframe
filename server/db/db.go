package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	p "path"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/sethvargo/go-password/password"
	log "github.com/sirupsen/logrus"

	"github.com/bentekkie/bentekkie-mainframe/server/env"
)

// Connection represents a connection to the database
type Connection struct {
	conn *sqlx.DB
	Root *INode
}

// INode represents a row in the inodes table
type INode struct {
	ID          sql.NullInt64
	ParentINode sql.NullInt64
	Path        sql.NullString
	IsFile      bool
}

// File represents a row in the files table
type File struct {
	INode
	Contents sql.NullString
}

// DbConnection is the current connection to the database
var DbConnection *Connection

const defaultDBConnectTimeout = 30 * time.Second

// Connect creates a Connection object, waits for PostgreSQL readiness, and runs embedded migrations.
func Connect(ctx context.Context, host string, port int, user string, password string, dbname string) (*Connection, error) {
	t := "host=%s port=%d user=%s password=%s dbname=%s sslmode=disable"
	connectionString := fmt.Sprintf(t, host, port, user, password, dbname)
	db, err := sqlx.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	db.MapperFunc(strings.ToLower)
	c := &Connection{conn: db, Root: nil}

	if err := c.waitForDB(ctx); err != nil {
		_ = db.Close()
		log.WithError(err).Error("Connect error: database not ready")
		return nil, err
	}

	if err := c.InitSchema(ctx); err != nil {
		_ = db.Close()
		log.WithError(err).Error("Connect error: schema initialization failed")
		return nil, err
	}

	c.InitAdminUser(ctx)
	return c, nil
}

// waitForDB retries PingContext with bounded exponential backoff until Postgres is ready or ctx expires.
func (c *Connection) waitForDB(ctx context.Context) error {
	waitCtx := ctx
	if _, hasDeadline := ctx.Deadline(); !hasDeadline {
		var cancel context.CancelFunc
		waitCtx, cancel = context.WithTimeout(ctx, defaultDBConnectTimeout)
		defer cancel()
	}

	backoff := 100 * time.Millisecond
	const maxBackoff = 2 * time.Second
	var lastErr error

	for {
		if err := c.conn.PingContext(waitCtx); err == nil {
			return nil
		} else {
			lastErr = err
		}

		timer := time.NewTimer(backoff)
		select {
		case <-waitCtx.Done():
			timer.Stop()
			return fmt.Errorf("database ping timed out (%v): %w", waitCtx.Err(), lastErr)
		case <-timer.C:
		}

		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

// Ping verifies live connectivity to PostgreSQL.
func (c *Connection) Ping(ctx context.Context) error {
	if c == nil || c.conn == nil {
		return errors.New("database connection not initialized")
	}
	return c.conn.PingContext(ctx)
}

// Close closes the underlying database pool.
func (c *Connection) Close() error {
	if c == nil || c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

// CreateTestConnection for testing
func CreateTestConnection(db *sql.DB, root *INode) *Connection {
	return &Connection{sqlx.NewDb(db, "postgres"), root}
}

// InitSchema runs all pending embedded SQL migrations and ensures the root "/" inode exists.
func (c *Connection) InitSchema(ctx context.Context) error {
	if err := c.Migrate(ctx); err != nil {
		return err
	}
	return c.ensureRoot(ctx)
}

func (c *Connection) ensureRoot(ctx context.Context) error {
	if _, err := c.conn.ExecContext(ctx, "INSERT INTO inodes (path, parentinode) VALUES ('/', NULL) ON CONFLICT (path) DO NOTHING"); err != nil {
		return fmt.Errorf("ensure root inode: %w", err)
	}
	root, err := c.FindINodeByPath(ctx, "/")
	if err != nil {
		return fmt.Errorf("load root inode: %w", err)
	}
	c.Root = root
	return nil
}

// InitAdminUser adds admin user if it dosnt exits
func (c *Connection) InitAdminUser(ctx context.Context) {
	username, err := env.GetEnvStr("ADMIN_USER")
	if err == nil {
		_, _ = c.conn.ExecContext(ctx, "DELETE FROM users where username=$1", username)
		pswd, err := password.Generate(15, 15, 0, false, true)
		if err != nil {
			log.WithError(err).Info("error generating password")
			return
		}
		_, err = c.conn.ExecContext(ctx, "INSERT INTO users (username,password) VALUES ($1,$2)", username, pswd)
		if err != nil {
			log.WithError(err).Info("error generating password")
			return
		}
		log.Info("Admin user created username:", username, " password:", pswd)
	}
}

func (iNode *INode) insert(ctx context.Context, c *Connection) error {
	var id sql.NullInt64
	rows, err := c.conn.NamedQueryContext(ctx, "INSERT INTO inodes (path, parentinode) VALUES (:path,:parentinode) RETURNING id", iNode)
	if err != nil {
		log.WithError(err).Error("Could not insert node", iNode)
		return err
	}
	defer rows.Close()
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return err
		}
		return errors.New("no id returned on inode insert")
	}
	err = rows.Scan(&id)
	if err != nil {
		log.Error(err)
		return err
	}
	iNode.ID = id

	return err
}

// DeleteAll deletes all inodes from the current database and re-creates the root inode.
func (c *Connection) DeleteAll(ctx context.Context) {
	if c.Root != nil && c.Root.ID.Valid {
		c.conn.MustExecContext(ctx, "DELETE FROM inodes WHERE id=$1", c.Root.ID)
	} else {
		c.conn.MustExecContext(ctx, "DELETE FROM inodes")
	}
	c.Root = nil
	if err := c.ensureRoot(ctx); err != nil {
		panic(err)
	}
}

// FindINodeByPath finds the INode with the given path
func (c *Connection) FindINodeByPath(ctx context.Context, path string) (*INode, error) {
	iNode := INode{}

	err := c.conn.GetContext(ctx, &iNode, `SELECT *,isfile(id) FROM inodes WHERE inodes.path=$1 LIMIT 1`, path)

	return &iNode, err
}

// FindINodeByID finds an INode with a given id
func (c *Connection) FindINodeByID(ctx context.Context, id int64) (*INode, error) {
	iNode := INode{}

	err := c.conn.GetContext(ctx, &iNode, `SELECT *,isfile(id) FROM inodes WHERE inodes.id=$1 LIMIT 1`, id)

	return &iNode, err
}

// NewDir creates a new directory
func (c *Connection) NewDir(ctx context.Context, parent *INode, name string) (*INode, error) {
	if parent == nil {
		return nil, errors.New("parent invalid")
	}
	folder := &INode{
		Path:        sql.NullString{String: p.Join(parent.Path.String, name), Valid: true},
		ParentINode: parent.ID,
		ID:          sql.NullInt64{},
	}
	err := folder.insert(ctx, c)
	if err != nil {
		return nil, err
	}

	return folder, err
}

// NewFile creates a new file
func (c *Connection) NewFile(ctx context.Context, parent *INode, name string, content string) (*File, error) {
	fileINode := INode{
		Path:        sql.NullString{String: p.Join(parent.Path.String, name), Valid: true},
		ParentINode: parent.ID,
		ID:          sql.NullInt64{},
	}
	err := fileINode.insert(ctx, c)
	if err != nil {
		return nil, err
	}
	file := &File{
		INode:    fileINode,
		Contents: sql.NullString{String: content, Valid: true},
	}
	_, err = c.conn.NamedExecContext(ctx, "INSERT INTO files (inode, contents) VALUES (:id,:contents)", file)
	if err != nil {
		c.conn.MustExecContext(ctx, "DELETE FROM inodes where id=$1", fileINode.ID)
		return nil, err
	}

	return file, err
}

// FindFile finds a file with an given id
func (c *Connection) FindFile(ctx context.Context, id int64) (*File, error) {
	file := File{}

	err := c.conn.GetContext(ctx, &file, "SELECT inodes.*,files.contents FROM files JOIN inodes on files.inode = inodes.id where files.inode=$1", id)

	return &file, err
}

// DeleteINode deletes a given INode
func (c *Connection) DeleteINode(ctx context.Context, iNode *INode) error {
	_, err := c.conn.ExecContext(ctx, "DELETE FROM inodes WHERE id=$1", iNode.ID)

	return err
}

// UpdateFileByPath sets the given File's content to the given contents
func (c *Connection) UpdateFileByPath(ctx context.Context, file *File, contents string) error {
	_, err := c.conn.ExecContext(ctx, "UPDATE files SET contents=$1 WHERE inode=$2", contents, file.ID)

	return err
}

// FindDirListings finds all INodes that are direct descendants of the INode given
func (c *Connection) FindDirListings(ctx context.Context, parent *INode) ([]*INode, error) {
	if parent == nil || !parent.ID.Valid {
		return nil, errors.New("parent invalid")
	}
	var listings []*INode

	err := c.conn.SelectContext(ctx, &listings, `
	SELECT *,isfile(id) FROM inodes
	WHERE parentinode=$1
	ORDER BY path ASC`, parent.ID)

	return listings, err
}

// FindDirListingsByPath finds all INodes that are direct descendants of the path given
func (c *Connection) FindDirListingsByPath(ctx context.Context, currentDir string) ([]*INode, error) {
	parent, err := c.FindINodeByPath(ctx, p.Clean(currentDir))
	if err != nil {
		return nil, err
	}
	return c.FindDirListings(ctx, parent)
}

// IsFile checks if given INode is a file
func (c *Connection) IsFile(ctx context.Context, iNode *INode) (bool, error) {
	if iNode == nil || !iNode.ID.Valid {
		return false, errors.New("invalid inode")
	}
	var result bool

	err := c.conn.GetContext(ctx, &result, "SELECT exists(SELECT 1 FROM files WHERE inode=$1)", iNode.ID.Int64)

	return result, err
}

// GetPassword for given user
func (c *Connection) GetPassword(ctx context.Context, username string) (string, error) {
	var password string
	err := c.conn.GetContext(ctx, &password, "SELECT password from users Where username=$1", username)
	return password, err
}

// NewUser registers a new user
func (c *Connection) NewUser(ctx context.Context, username string, password string) error {
	_, err := c.conn.ExecContext(ctx, "INSERT INTO users (username,password) VALUES ($1,$2)", username, password)
	return err
}

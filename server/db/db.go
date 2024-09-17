package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	p "path"
	"strings"

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

var schema = `
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
    username text primary key,
    password text
);
CREATE OR REPLACE FUNCTION isfile(id integer) 
RETURNS boolean AS $$ BEGIN RETURN exists(SELECT 1 from files where inode = id); END; $$LANGUAGE PLPGSQL;
`

// DbConnection is the current connection to the database
var DbConnection, _ = Connect(context.Background(), "localhost", 54320, "dbuser", "password", "data")

// Connect creates a Connection object
func Connect(ctx context.Context, host string, port int, user string, password string, dbname string) (*Connection, error) {
	t := "host=%s port=%d user=%s password=%s dbname=%s sslmode=disable"
	connectionString := fmt.Sprintf(t, host, port, user, password, dbname)
	var db *sqlx.DB
	db, err := sqlx.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	db.MapperFunc(strings.ToLower)
	c := &Connection{conn: db, Root: nil}
	err = c.InitSchema(ctx)
	c.InitAdminUser(ctx)
	if err != nil {
		log.WithError(err).Error("Connect error")
	}
	return c, err
}

// CreateTestConnection for testing
func CreateTestConnection(db *sql.DB, root *INode) *Connection {
	return &Connection{sqlx.NewDb(db, "postgres"), root}
}

// InitSchema initializes the currect connection with the correct schema
func (c *Connection) InitSchema(ctx context.Context) error {
	_, err := c.conn.ExecContext(ctx, schema)
	for err != nil {
		_, err = c.conn.ExecContext(ctx, schema)
	}
	root := &INode{
		Path:        sql.NullString{String: "/", Valid: true},
		ID:          sql.NullInt64{},
		ParentINode: sql.NullInt64{},
	}
	// Ensure that the root exists
	err = root.insert(ctx, c)
	if err != nil {
		root, err = c.FindINodeByPath(ctx, "/")
		if err != nil {
			return err
		}
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
	rows.Next()
	err = rows.Scan(&id)
	if err != nil {
		log.Error(err)
		return err
	}
	iNode.ID = id

	return err
}

// DeleteAll deletes all inodes from the current database
func (c *Connection) DeleteAll(ctx context.Context) {
	c.conn.MustExec("DELETE FROM inodes WHERE id=$1", c.Root.ID)
	c.Root = nil
	err := c.InitSchema(ctx)
	if err != nil {
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
	_, err = c.conn.NamedExec("INSERT INTO files (inode, contents) VALUES (:id,:contents)", file)
	if err != nil {
		c.conn.MustExec("DELETE FROM inodes where id=$1", fileINode.ID)
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

// FindDirListings finds all INodes that are direct decendands of the INode given
func (c *Connection) FindDirListings(ctx context.Context, parent *INode) ([]*INode, error) {
	var listings []*INode

	err := c.conn.SelectContext(ctx, &listings, `
	SELECT *,isfile(id) FROM inodes
	WHERE parentinode=$1`, parent.ID)

	return listings, err
}

// FindDirListingsByPath finds all INodes that are direct decendands of the path given
func (c *Connection) FindDirListingsByPath(ctx context.Context, currentDir string) ([]*INode, error) {
	var listings []*INode

	err := c.conn.SelectContext(ctx, &listings, `
SELECT inodes.*,isfile(id) FROM inodes
WHERE path LIKE $1 AND path NOT LIKE $2`,
		p.Join(currentDir, "_%"),
		p.Join(currentDir, "_%", "_%"))

	return listings, err
}

// IsFile checks if given INode is a file
func (c *Connection) IsFile(ctx context.Context, iNode *INode) (bool, error) {
	var result bool

	err := c.conn.GetContext(ctx, &result, "SELECT exists(select 1 from files WHERE inode=65)")

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

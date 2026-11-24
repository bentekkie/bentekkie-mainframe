package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	p "path"

	"github.com/jmoiron/sqlx"
)

// JSONINode stores a json representation of an INode
type JSONINode struct {
	Name    string      `json:"name" jsonschema_description:"Name of folder"`
	Folders []JSONINode `json:"folders" jsonschema_description:"Folders in folder"`
	Files   []JSONFile  `json:"files" jsonschema_description:"Files in folder"`
}

// JSONRoot stores the root json node
type JSONRoot struct {
	JSONINode
	Schema string `json:"$schema"`
}

// JSONFile stores a json representation of a File
type JSONFile struct {
	Name     string `json:"name"  jsonschema_description:"Name of file"`
	Contents string `json:"contents" jsonschema_description:"Contents of file"`
}

// SeedDB seeds the current db with json atomically inside a transaction.
func (c *Connection) SeedDB(ctx context.Context, jsonString []byte, wipeDB bool) error {
	var tree JSONINode
	if err := json.Unmarshal(jsonString, &tree); err != nil {
		return err
	}
	return c.seedTree(ctx, tree, wipeDB)
}

// SeedDBForTest with go struct
func (c *Connection) SeedDBForTest(ctx context.Context, tree JSONINode, wipeDB bool) {
	if err := c.seedTree(ctx, tree, wipeDB); err != nil {
		panic(err)
	}
}

func (c *Connection) seedTree(ctx context.Context, tree JSONINode, wipeDB bool) error {
	tx, err := c.conn.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin seed transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if wipeDB {
		if _, err := tx.ExecContext(ctx, "DELETE FROM inodes"); err != nil {
			return fmt.Errorf("wipe inodes: %w", err)
		}
	}

	if _, err := tx.ExecContext(ctx, "INSERT INTO inodes (path, parentinode) VALUES ('/', NULL) ON CONFLICT (path) DO NOTHING"); err != nil {
		return fmt.Errorf("ensure root inode in seed: %w", err)
	}
	var root INode
	if err := tx.GetContext(ctx, &root, `SELECT *,isfile(id) FROM inodes WHERE inodes.path='/' LIMIT 1`); err != nil {
		return fmt.Errorf("load root inode in seed: %w", err)
	}

	if err := addJSONINodeTx(ctx, tx, &root, nil, tree); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit seed transaction: %w", err)
	}
	c.Root = &root
	return nil
}

// DumpDB dumps all database info to json
func (c *Connection) DumpDB(ctx context.Context, schemaURL string) (string, error) {
	childFiles, childFolders, err := c.addINode(ctx, c.Root)
	if err != nil {
		return "", err
	}
	rootNode := JSONRoot{
		Schema: schemaURL,
		JSONINode: JSONINode{
			Name:    "",
			Folders: childFolders,
			Files:   childFiles,
		},
	}
	jsonData, err := json.Marshal(&rootNode)
	return string(jsonData), err
}

func (c *Connection) addINode(ctx context.Context, node *INode) ([]JSONFile, []JSONINode, error) {
	children, err := c.FindDirListings(ctx, node)
	if err != nil {
		return nil, nil, err
	}
	files := make([]JSONFile, 0)
	folders := make([]JSONINode, 0)
	for _, child := range children {
		if child.IsFile {
			file, err := c.FindFile(ctx, child.ID.Int64)
			if err != nil {
				return nil, nil, err
			}
			files = append(files, JSONFile{
				Name:     p.Base(file.Path.String),
				Contents: file.Contents.String,
			})
		} else {
			childFiles, childFolders, err := c.addINode(ctx, child)
			if err != nil {
				return nil, nil, err
			}
			folders = append(folders, JSONINode{
				Name:    p.Base(child.Path.String),
				Folders: childFolders,
				Files:   childFiles,
			})
		}
	}
	return files, folders, nil
}

func addJSONINodeTx(ctx context.Context, tx *sqlx.Tx, root *INode, parent *INode, node JSONINode) error {
	currINode := root
	if parent != nil {
		nodePath := p.Join(parent.Path.String, node.Name)
		if _, err := tx.ExecContext(
			ctx,
			"INSERT INTO inodes (path, parentinode) VALUES ($1, $2) ON CONFLICT (path) DO NOTHING",
			nodePath, parent.ID,
		); err != nil {
			return fmt.Errorf("upsert dir %q: %w", nodePath, err)
		}
		var dir INode
		if err := tx.GetContext(ctx, &dir, `SELECT *,isfile(id) FROM inodes WHERE inodes.path=$1 LIMIT 1`, nodePath); err != nil {
			return fmt.Errorf("load dir %q: %w", nodePath, err)
		}
		currINode = &dir
	}

	for _, child := range node.Folders {
		if err := addJSONINodeTx(ctx, tx, root, currINode, child); err != nil {
			return err
		}
	}
	for _, child := range node.Files {
		if err := addJSONFileTx(ctx, tx, currINode, child); err != nil {
			return err
		}
	}
	return nil
}

func addJSONFileTx(ctx context.Context, tx *sqlx.Tx, parent *INode, file JSONFile) error {
	filePath := p.Join(parent.Path.String, file.Name)
	var id sql.NullInt64
	err := tx.QueryRowContext(
		ctx,
		"INSERT INTO inodes (path, parentinode) VALUES ($1, $2) ON CONFLICT (path) DO NOTHING RETURNING id",
		filePath, parent.ID,
	).Scan(&id)
	if err == nil && id.Valid {
		if _, err := tx.ExecContext(ctx, "INSERT INTO files (inode, contents) VALUES ($1, $2)", id.Int64, file.Contents); err != nil {
			return fmt.Errorf("insert file contents %q: %w", filePath, err)
		}
		return nil
	}
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("upsert file inode %q: %w", filePath, err)
	}

	var existing INode
	if err := tx.GetContext(ctx, &existing, `SELECT *,isfile(id) FROM inodes WHERE inodes.path=$1 LIMIT 1`, filePath); err != nil {
		return fmt.Errorf("load existing file inode %q: %w", filePath, err)
	}
	res, err := tx.ExecContext(ctx, "UPDATE files SET contents=$1 WHERE inode=$2", file.Contents, existing.ID)
	if err != nil {
		return fmt.Errorf("update file contents %q: %w", filePath, err)
	}
	affected, err := res.RowsAffected()
	if err == nil && affected == 0 {
		if _, err := tx.ExecContext(ctx, "INSERT INTO files (inode, contents) VALUES ($1, $2)", existing.ID, file.Contents); err != nil {
			return fmt.Errorf("insert missing file contents %q: %w", filePath, err)
		}
	}
	return nil
}

package db

import (
	"context"
	"encoding/json"
	p "path"
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

// SeedDB seeds the current db with json
func (c *Connection) SeedDB(ctx context.Context, jsonString []byte, wipeDB bool) error {
	var tree JSONINode
	err := json.Unmarshal(jsonString, &tree)
	if err != nil {
		return err
	}
	if wipeDB {
		c.DeleteAll(ctx)
	}
	c.addJSONINode(ctx, nil, tree)
	return nil
}

// SeedDBForTest with go struct
func (c *Connection) SeedDBForTest(ctx context.Context, tree JSONINode, wipeDB bool) {
	if wipeDB {
		c.DeleteAll(ctx)
	}
	c.addJSONINode(ctx, nil, tree)
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
	children, _ := c.FindDirListings(ctx, node)
	files := make([]JSONFile, 0)
	folders := make([]JSONINode, 0)
	for _, child := range children {
		if child.IsFile {
			file, _ := c.FindFile(ctx, child.ID.Int64)
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

func (c *Connection) addJSONINode(ctx context.Context, parent *INode, node JSONINode) error {
	var err error
	currINode := c.Root
	if parent != nil {
		currINode, err = c.NewDir(ctx, parent, node.Name)
		if err != nil {
			currINode, err = c.FindINodeByPath(ctx, p.Join(parent.Path.String, node.Name))
			if err != nil {
				return err
			}
		}
	}

	for _, child := range node.Folders {
		err = c.addJSONINode(ctx, currINode, child)
		if err != nil {
			return err
		}
	}
	for _, child := range node.Files {
		err = c.addJSONFile(ctx, currINode, child)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Connection) addJSONFile(ctx context.Context, parent *INode, file JSONFile) error {
	_, err := c.NewFile(ctx, parent, file.Name, file.Contents)
	if err != nil {
		fileInode, err := c.FindINodeByPath(ctx, p.Join(parent.Path.String, file.Name))
		if err != nil {
			return err
		}
		dbFile, err := c.FindFile(ctx, fileInode.ID.Int64)
		if err != nil {
			return err
		}
		err = c.UpdateFileByPath(ctx, dbFile, file.Contents)
		if err != nil {
			return err
		}
	}
	return nil
}

package db

import (
	"encoding/json"
	p "path"
)

//JSONINode stores a json representation of an INode
type JSONINode struct {
	Name    string      `json:"name"`
	Folders []JSONINode `json:"folders"`
	Files   []JSONFile  `json:"files"`
}

//JSONFile stores a json representation of a File
type JSONFile struct {
	Name     string `json:"name"`
	Contents string `json:"contents"`
}

//SeedDB seeds the current db with json
func (c *Connection) SeedDB(jsonString []byte, wipeDB bool) error {
	var tree JSONINode
	err := json.Unmarshal(jsonString, &tree)
	if err != nil {
		return err
	}
	if wipeDB {
		c.DeleteAll()
	}
	c.addJSONINode(nil, tree)
	return nil
}

//SeedDBForTest with go struct
func (c *Connection) SeedDBForTest(tree  JSONINode, wipeDB bool) {
	if wipeDB {
		c.DeleteAll()
	}
	c.addJSONINode(nil, tree)
}

//DumpDB dumps all database info to json
func (c *Connection) DumpDB() (string, error) {
	childFiles, childFolders, err := c.addINode(c.Root)
	if err != nil {
		return "", err
	}
	jsonData, err := json.Marshal(JSONINode{
		Name:    "",
		Folders: childFolders,
		Files:   childFiles,
	})
	return string(jsonData), err
}

func (c *Connection) addINode(node *INode) ([]JSONFile, []JSONINode, error) {
	children, _ := c.FindDirListings(node)
	files := make([]JSONFile, 0)
	folders := make([]JSONINode, 0)
	for _, child := range children {
		if child.IsFile {
			file, _ := c.FindFile(child.ID.Int64)
			files = append(files, JSONFile{
				Name:     p.Base(file.Path.String),
				Contents: file.Contents.String,
			})
		} else {
			childFiles, childFolders, err := c.addINode(child)
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

func (c *Connection) addJSONINode(parent *INode, node JSONINode) error {
	var err error
	currINode := c.Root
	if parent != nil {
		currINode, err = c.NewDir(parent, node.Name)
		if err != nil {
			currINode, err = c.FindINodeByPath(p.Join(parent.Path.String, node.Name))
			if err != nil {
				return err
			}
		}
	}

	for _, child := range node.Folders {
		err = c.addJSONINode(currINode, child)
		if err != nil {
			return err
		}
	}
	for _, child := range node.Files {
		err = c.addJSONFile(currINode, child)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *Connection) addJSONFile(parent *INode, file JSONFile) error {
	_, err := c.NewFile(parent, file.Name, file.Contents)
	if err != nil {
		fileInode, err := c.FindINodeByPath(p.Join(parent.Path.String, file.Name))
		if err != nil {
			return err
		}
		dbFile, err := c.FindFile(fileInode.ID.Int64)
		if err != nil {
			return err
		}
		err = c.UpdateFileByPath(dbFile, file.Contents)
		if err != nil {
			return err
		}
	}
	return nil
}

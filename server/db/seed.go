package db

import (
	"encoding/json"
)

type JsonINode struct {
	Name string `json:"name"`
	Folders []JsonINode `json:"folders"`
	Files []JsonFile `json:"files"`
}

type JsonFile struct {
	Name string `json:"name"`
	Contents string `json:"contents"`
}

func (c *Connection) SeedDB(jsonString []byte) {
	var tree JsonINode
	err := json.Unmarshal(jsonString,&tree)
	if err != nil {
		panic(err)
	}
	c.DeleteAll()
	c.addJsonINode(nil, tree)
}

func (c *Connection) addJsonINode(parent *INode,node JsonINode)  {
	var err error
	currINode := c.Root
	if parent != nil {
		currINode, err = c.NewDir(parent, node.Name)
		if err != nil {
			panic(err)
		}
	}

	for _, child :=range node.Folders {
		c.addJsonINode(currINode, child)
	}
	for _,child :=range node.Files {
		c.addJsonFile(currINode, child)
	}
}

func (c *Connection) addJsonFile(parent *INode, file JsonFile) {
	_, err := c.NewFile(parent, file.Name, file.Contents)
	if err != nil {
		panic(err)
	}
}

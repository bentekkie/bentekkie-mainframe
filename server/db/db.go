package db

import (
	"errors"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
	p "path"
	"strings"
)

type Status int

const (
	CREATED Status = iota
	DELETED
	NOTFOUND
	FOUND
	UPDATED
	ERROR
)

type Table int

const (
	UserTable Table = iota
	ItemTable
)

func (t Table) String() string {
	return [...]string{"bentekkie-mainframe-users", "bentekkie-mainframe-store"}[t]
}

type Item struct {
	FileID  string   `json:"fileID"`
	Path    string   `json:"path"`
	Type    string   `json:"type"`
	Files   []string `json:"files"`
	Folders []string `json:"folders"`
	Content string   `json:"content"`
	Parent string	`json:"parent"`
	Client  Client   `json:"-"`
}

type HelpItem struct {
	FileID  string   `json:"fileID"`
	Path    string   `json:"path"`
	Content map[string]struct{
		Purpose string `json:"purpose"`
		Usage string	`json:"usage"`
	}   `json:"content"`
	Client  Client   `json:"-"`
}

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Client   Client `json:"-"`
}

type Client struct {
	dynamoDbTable string
	awsRegion     string
	ddb           *dynamodb.DynamoDB
}

func NewDynamoDBClient(dynamoDbTable Table, awsRegion string) Client {
	sess := session.Must(session.NewSession(&aws.Config{Region: aws.String(awsRegion)}))
	ddb := dynamodb.New(sess)
	c := Client{dynamoDbTable: dynamoDbTable.String(), awsRegion: awsRegion, ddb: ddb}
	return c
}

func (user *User) Read() (Status, error) {
	err := user.Client.read(
		struct {
			Username string `json:"username"`
		}{user.Username}, &user)
	if err != nil {
		return ERROR, err
	}
	return FOUND, nil
}

func (user *User) Write() (Status, error) {
	err := user.Client.write(user)
	if err != nil {
		return ERROR, err
	}
	return CREATED, nil
}

func (user *User) Delete() (Status, error) {
	panic("implement me")
}

func (user *User) HealthCheck() error {
	panic("implement me")
}

func (item *Item) Read() (Status, error) {
	err := item.Client.read(struct {
		FileID string `json:"fileID"`
		Path   string `json:"path"`
	}{item.FileID, item.Path}, &item)
	if err != nil {
		return ERROR, err
	}
	return FOUND, nil
}
func (item *HelpItem) Read() (Status, error) {
	err := item.Client.read(struct {
		FileID string `json:"fileID"`
		Path   string `json:"path"`
	}{item.FileID, item.Path}, &item)
	if err != nil {
		return ERROR, err
	}
	return FOUND, nil
}

func (item *Item) Write() (Status, error) {
	err := item.Client.write(item)
	if err != nil {
		return ERROR, err
	}
	return CREATED, nil
}

func (item *Item) Scan() ([]Item, Status, error) {
	avmap, err := item.Client.scan(
		expression.Name("path").Equal(expression.Value(item.Path)))
	if err != nil {
		return nil, ERROR, err
	}
	items := &[]Item{}
	err = dynamodbattribute.UnmarshalListOfMaps(avmap, items)
	if err != nil {
		return nil, ERROR, err
	}
	for idx  := range *items{
		(*items)[idx].Client = item.Client
	}
	return *items, FOUND, nil
}

func (item *Item) AddChild(name string,child Item) error {
	update := expression.UpdateBuilder{}

	update.Add(expression.Name(child.Type+"s"),expression.Value(name+"/"+child.FileID))

	return item.Client.update(struct {
		FileID string `json:"fileID"`
	}{item.FileID},update)
}

func (c *Client) scan(filter expression.ConditionBuilder) ([]map[string]*dynamodb.AttributeValue, error) {
	exp, err := expression.NewBuilder().WithFilter(filter).Build()
	if err != nil {
		return nil, err
	}
	input := &dynamodb.ScanInput{
		ExpressionAttributeNames:  exp.Names(),
		ExpressionAttributeValues: exp.Values(),
		FilterExpression:          exp.Filter(),
		TableName:                 &c.dynamoDbTable,
	}
	output, err := c.ddb.Scan(input)
	if err != nil {
		return nil, err
	}

	return output.Items, nil
}

func (item *Item) Delete() (Status, error) {
	panic("implement me")
}

func (s *Client) HealthCheck() error {
	_, err := s.ddb.DescribeTable(&dynamodb.DescribeTableInput{TableName: &s.dynamoDbTable})
	return err
}

func (c *Client) read(query interface{}, output interface{}) error {
	input := &dynamodb.GetItemInput{}
	input.SetTableName(c.dynamoDbTable)
	k, err := dynamodbattribute.MarshalMap(query)
	if err != nil {
		return err
	}
	input.SetKey(k)
	result, err := c.ddb.GetItem(input)
	if err != nil {
		log.WithError(err).WithField("k", k).Error("Could not get item")
		return err
	}
	return dynamodbattribute.UnmarshalMap(result.Item, &output)
}

func (c *Client) write(record interface{}) error {
	input := &dynamodb.PutItemInput{}
	input.SetTableName(c.dynamoDbTable)
	k, err := dynamodbattribute.MarshalMap(record)
	if err != nil {
		return err
	}
	input.SetItem(k)
	result, err := c.ddb.PutItem(input)
	if err != nil {
		return err
	}
	return dynamodbattribute.UnmarshalMap(result.Attributes, &record)
}

func (c *Client) update(key interface{}, update expression.UpdateBuilder) error {
	input := &dynamodb.UpdateItemInput{}
	exp,err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		return err
	}
	input.SetTableName(c.dynamoDbTable)
	input.SetUpdateExpression(*exp.Update())
	input.SetExpressionAttributeNames(exp.Names())
	input.SetExpressionAttributeValues(exp.Values())
	k, err := dynamodbattribute.MarshalMap(key)
	if err != nil {
		return err
	}
	input.SetKey(k)
	_, err = c.ddb.UpdateItem(input)
	if err != nil {
		return err
	}
	return nil
}

func NewFolder(path string, name string) error {
	itemsClient := NewDynamoDBClient(ItemTable, "us-west-2")
	parent := Item{
		Path: path,
		Client:itemsClient,
	}
	items, _, err := parent.Scan()
	if err != nil {
		return err
	}
	folder := Item{
		Type:"folder",
		Parent:items[0].FileID,
		Folders: []string{},
		Files: []string{},
		FileID:uuid.New().String(),
		Client:itemsClient,
		Path:items[0].Path+name+"/",
	}
	_, err = folder.Write()

	if err != nil {
		return err
	}

	return items[0].AddChild(name,folder)
}

func NewFile(path string, name string, content string) error {
	itemsClient := NewDynamoDBClient(ItemTable, "us-west-2")
	parent := Item{
		Path: path,
		Client:itemsClient,
	}
	items, _, err := parent.Scan()
	if err != nil {
		return err
	}
	if len(items) < 1 {
		return errors.New("parent not found")
	}
	folder := Item{
		Type:"file",
		Parent:items[0].FileID,
		FileID:uuid.New().String(),
		Client:itemsClient,
		Path:items[0].Path+name,
		Content:content,
	}
	_, err = folder.Write()

	if err != nil {
		return err
	}

	return items[0].AddChild(name,folder)
}

func GetFileByPath(path string) (*Item,error) {
	return getItemByPath(p.Clean(path))
}
func GetFolderByPath(path string) (*Item,error) {
	cleaned := p.Clean(path)
	if cleaned != "/" {
		cleaned += "/"
	}
	return getItemByPath(cleaned)
}


func getItemByPath(path string) (*Item,error) {
	itemsClient := NewDynamoDBClient(ItemTable, "us-west-2")
	file := Item {
		Path: path,
		Client:itemsClient,
	}
	items, _, err := file.Scan()
	if err != nil {
		return nil,err
	}
	if len(items) < 1 {
		return nil,errors.New("parent not found")
	}
	return &items[0],nil
}

func (item *Item) DirListing() string {
	if item.Type == "file" {
		return "<br/>this is a file<br/>"
	}
	resp := "</br>B:"+item.Path
	resp += "</br><table><tr><th>Name</th><th>Type</th></tr>"
	for _,file := range item.Files {
		resp += "<tr><td>" + strings.Split(file,"/")[0] + "</td><td>File</td></tr>"
	}
	for _,folder := range item.Folders {
		resp += "<tr><td>" + strings.Split(folder,"/")[0] + "</td><td>Folder</td></tr>"
	}
	resp += "</table><br/>"
	return resp
}

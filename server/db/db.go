package db

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbiface"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	log "github.com/sirupsen/logrus"
	p "path"
	"strings"
)

type Connection struct {
	conn *sqlx.DB
	Root *INode
}

type INode struct {
	Id sql.NullInt64
	ParentINode sql.NullInt64
	Path sql.NullString
	IsFile bool
}

type DirListing struct {
	ParentINode INode `db:"parent"`
	ChildINode INode `db:"child"`
}

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
`

var DbConnection, _ = Connect("localhost",54320,"dbuser","password","data")

func Connect(host string, port int, user string, password string, dbname string) (*Connection, error) {
	t := "host=%s port=%d user=%s password=%s dbname=%s sslmode=disable"
	connectionString := fmt.Sprintf(t, host, port, user, password, dbname)
	var db *sqlx.DB
	db, err := sqlx.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	db.MapperFunc(strings.ToLower)
	c := &Connection{conn:db,Root:nil}
	err = c.InitSchema()
	if err != nil {
		log.WithError(err).Error("Connect error")
	}
	return c, err
}

func (c *Connection) InitSchema() error {
	c.conn.MustExec(schema)
	root := &INode{
		Path:sql.NullString{String:"/",Valid:true},
		Id:sql.NullInt64{},
		ParentINode:sql.NullInt64{},
	}
	// Ensure that the root exists
	err := root.insert(c)
	if err != nil {
		root, err = c.FindINodeByPath("/")
		if err != nil {
			return err
		}
	}
	c.Root = root
	return nil
}

func (iNode *INode) insert(c *Connection) error {

	var id sql.NullInt64
	rows, err := c.conn.NamedQuery("INSERT INTO inodes (path, parentinode) VALUES (:path,:parentinode) RETURNING id", iNode)
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
	iNode.Id = id

	return err
}

func (c *Connection) DeleteAll() {
	c.conn.MustExec("DELETE FROM inodes WHERE id=$1",c.Root.Id)
	c.Root = nil
	err := c.InitSchema()
	if err != nil {
		panic(err)
	}
}

func (iNode *INode) GetParent(c *Connection) (*INode, error) {
	if iNode.ParentINode.Valid {
		return c.FindINodeById(iNode.ParentINode.Int64)
	}
	return nil, nil
}

func (c *Connection) FindINodeByPath(path string) (*INode, error) {
	iNode := INode{}

	err := c.conn.Get(&iNode,`SELECT *,isfile(id) FROM inodes WHERE inodes.path=$1 LIMIT 1`,path)

	return &iNode,err
}
func (c *Connection) FindINodeById(id int64) (*INode, error) {
	iNode := INode{}

	err := c.conn.Get(&iNode,`SELECT *,isfile(id) FROM inodes WHERE inodes.id=$1 LIMIT 1`,id)

	return &iNode,err
}

func (c *Connection) NewDir(parent *INode, name string) (*INode, error)  {
	if parent == nil {
		return nil, errors.New("parent invalid")
	}
	folder := &INode{
		Path:sql.NullString{String:p.Join(parent.Path.String,name),Valid:true},
		ParentINode:parent.Id,
		Id:sql.NullInt64{},
	}
	err := folder.insert(c)
	if err != nil {
		return nil, err
	}

	return folder, err
}

func (c *Connection) NewFile(parent *INode, name string, content string) (*File, error)  {
	fileINode := INode{
		Path:sql.NullString{String:p.Join(parent.Path.String,name), Valid:true},
		ParentINode:parent.Id,
		Id:sql.NullInt64{},
	}
	err := fileINode.insert(c)
	if err != nil {
		return nil, err
	}
	file := &File{
		INode:fileINode,
		Contents:sql.NullString{String:content, Valid:true},
	}
	_, err = c.conn.NamedExec("INSERT INTO files (inode, contents) VALUES (:id,:contents)", file)
	if err != nil {
		c.conn.MustExec("DELETE FROM inodes where id=$1",fileINode.Id)
		return nil, err
	}

	return file, err
}

func (c *Connection) FindFile(id int64) (*File, error) {
	file := File{}

	err := c.conn.Get(&file, "SELECT inodes.*,files.contents FROM files JOIN inodes on files.inode = inodes.id where files.inode=$1", id)

	return &file, err
}

func (c *Connection) DeleteINode(iNode *INode) error {
	_, err := c.conn.Exec("DELETE FROM inodes WHERE id=$1",iNode.Id)

	return err
}

func (c *Connection) UpdateFileByPath(file *File, contents string) error {
	log.Info(file,contents)
	_, err := c.conn.Exec("UPDATE files SET contents=$1 WHERE inode=$2", contents, file.Id)

	return err
}

func (c *Connection) FindDirListings(parent *INode) ([]*INode, error)  {
	var listings []*INode

	err := c.conn.Select(&listings, `
	SELECT *,isfile(id) FROM inodes
	WHERE parentinode=$1`,parent.Id)

	return listings,err
}
func (c *Connection) FindDirListingsByPath(currentDir string) ([]*INode, error)  {
	var listings []*INode

	err := c.conn.Select(&listings, `
SELECT inodes.*,isfile(id) FROM inodes
WHERE path LIKE $1 AND path NOT LIKE $2`,
  p.Join(currentDir,"_%"),
  p.Join(currentDir,"_%","_%"))

	return listings,err
}

func (c *Connection) IsFile(iNode *INode) (bool, error)  {
	var result bool

	err := c.conn.Get(&result, "SELECT exists(select 1 from files WHERE inode=65)")

	return result, err
}

func (c* Connection) GetPassword(username string) (string, error) {
	var password string
	err := c.conn.Get(&password,"SELECT password from users Where username=$1",username)
	return password, err
}


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
	DynamoDbTable string
	AwsRegion     string
	Ddb           dynamodbiface.DynamoDBAPI
}

func NewDynamoDBClient(dynamoDbTable Table, awsRegion string) *Client {
	sess := session.Must(session.NewSession(&aws.Config{Region: aws.String(awsRegion)}))
	ddb := dynamodb.New(sess)
	c := Client{DynamoDbTable: dynamoDbTable.String(), AwsRegion: awsRegion, Ddb: dynamodbiface.DynamoDBAPI(ddb)}
	return &c
}

var (
	ItemsClient = NewDynamoDBClient(ItemTable, "us-west-2")
	UserClient = NewDynamoDBClient(UserTable, "us-west-2")
)

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
	log.Info(item)
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

	update := expression.Set(
		expression.Name("files"),
		expression.Name("files").ListAppend(expression.Value([]string{"some", "list"})));
	log.Info(item)
	log.Info(update)
	return item.Client.update(struct {
		FileID string `json:"fileID"`
		Path string `json:"path"`
	}{item.FileID, item.Path},update)
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
		TableName:                 &c.DynamoDbTable,
	}
	output, err := c.Ddb.Scan(input)
	if err != nil {
		return nil, err
	}

	return output.Items, nil
}

func (item *Item) Delete() (Status, error) {
	panic("implement me")
}

func (c *Client) HealthCheck() error {
	_, err := c.Ddb.DescribeTable(&dynamodb.DescribeTableInput{TableName: &c.DynamoDbTable})
	return err
}

func (c *Client) read(query interface{}, output interface{}) error {
	input := &dynamodb.GetItemInput{}
	input.SetTableName(c.DynamoDbTable)
	k, err := dynamodbattribute.MarshalMap(query)
	if err != nil {
		return err
	}
	input.SetKey(k)
	result, err := c.Ddb.GetItem(input)
	if err != nil {
		log.WithError(err).WithField("k", k).Error("Could not get item")
		return err
	}
	return dynamodbattribute.UnmarshalMap(result.Item, &output)
}

func (c *Client) write(record interface{}) error {
	input := &dynamodb.PutItemInput{}
	input.SetTableName(c.DynamoDbTable)
	k, err := dynamodbattribute.MarshalMap(record)
	if err != nil {
		return err
	}
	input.SetItem(k)
	result, err := c.Ddb.PutItem(input)
	if err != nil {
		return err
	}
	return dynamodbattribute.UnmarshalMap(result.Attributes, &record)
}

func (c *Client) listAppend(key interface{}, listKey string, newValue string) error {
	return nil
}

func (c *Client) update(key interface{}, update expression.UpdateBuilder) error {
	input := &dynamodb.UpdateItemInput{}
	exp,err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		log.WithError(err).Error("1")
		return err
	}
	input.SetTableName(c.DynamoDbTable)
	input.SetUpdateExpression(*exp.Update())
	input.SetExpressionAttributeNames(exp.Names())
	input.SetExpressionAttributeValues(exp.Values())
	log.Info(input)
	k, err := dynamodbattribute.MarshalMap(key)
	if err != nil {
		log.WithError(err).Error("2")
		return err
	}
	input.SetKey(k)
	_, err = c.Ddb.UpdateItem(input)
	if err != nil {
		log.WithError(err).Error("3")
		return err
	}
	return nil
}

func NewFolder(path string, name string) error {
	parent := Item{
		Path: path,
		Client:*ItemsClient,
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
		Client:*ItemsClient,
		Path:items[0].Path+name+"/",
	}
	_, err = folder.Write()

	if err != nil {
		return err
	}

	return items[0].AddChild(name,folder)
}

func NewFile(path string, name string, content string) error {
	parent := Item{
		Path: path,
		Client:*ItemsClient,
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
		Client:*ItemsClient,
		Path:items[0].Path+name,
		Content:content,
		Files:nil,
		Folders:nil,
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
	file := Item {
		Path: path,
		Client:*ItemsClient,
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

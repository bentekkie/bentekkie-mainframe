package mainframe

import (
	"context"
	"errors"
	"fmt"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	mainframe "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/golang/protobuf/ptypes/empty"
	log "github.com/sirupsen/logrus"
	"strings"
)


type ShellServer struct{}


func NewShellServer() *ShellServer {
	return &ShellServer{}
}

func (ShellServer) GetRoot(ctx context.Context, in *empty.Empty) (*mainframe.Folder, error) {
	root, err := db.GetFolderByPath("/files/")
	if err != nil {
		return nil, err
	}
	return &mainframe.Folder{
		Parent:root.Parent,
		Files:root.Files,
		Path:root.Path,
		FileID:root.FileID,
		Folders:root.Folders,
	},nil
}



func (ShellServer) RunCommand(ctx context.Context, cmd *mainframe.Command) (*mainframe.Response, error) {
	if cmd == nil || cmd.CurrentDir == nil {
		return nil,errors.New("Internal error")
	}
	switch cmd.Command {
	case mainframe.CommandType_ls:
		newPath := ""
		if len(cmd.Args) > 0 {
			newPath = cmd.Args[0]
		}
		if !strings.HasPrefix(newPath,"/") {
			newPath = cmd.CurrentDir.Path +"/"+ newPath
		}
		item, err := db.GetFolderByPath(newPath)
		if err != nil || item.Type == "file" {
			log.WithError(err).Error("cat error")
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Invalid command. <br/>",
			},err
		}
		return &mainframe.Response{
			Command:cmd,
			Resp:item.DirListing(),
			CurrentDir:cmd.CurrentDir,
		},nil
	case mainframe.CommandType_cat:
		if len(cmd.Args) == 0 {
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> File not specified <br/>",
			},nil
		}
		newPath := cmd.Args[0]
		if !strings.HasPrefix(newPath,"/") {
			newPath = cmd.CurrentDir.Path +"/"+ newPath
		}
		item, err := db.GetFileByPath(newPath)
		if err != nil || item.Type == "folder" {
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Invalid file. <br/>",
			},err
		}
		return &mainframe.Response{
			Command:cmd,
			Resp:item.Content,
			CurrentDir:cmd.CurrentDir,
		},nil
	case mainframe.CommandType_cd:
		if len(cmd.Args) == 0 {
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Folder not specified <br/>",
			},nil
		}
		newPath := cmd.Args[0]
		if !strings.HasPrefix(newPath,"/") {
			newPath = cmd.CurrentDir.Path +"/"+ newPath
		}
		root, err := db.GetFolderByPath(newPath)
		if err != nil {
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Invalid Folder. <br/>",
			},err
		}
		return &mainframe.Response{
			CurrentDir:&mainframe.Folder{
				Parent:root.Parent,
				Files:root.Files,
				Path:root.Path,
				FileID:root.FileID,
				Folders:root.Folders,
			},
			Command:cmd,
			Resp:"<br/>Changed dir to B:"+ root.Path + "<br/>",
		},nil
	case mainframe.CommandType_help:
		if len(cmd.Args) == 0 {
			resp := "<div> Available Commands are listed below, for help on a specific command type \"help [command]\"</div><br/><table>"
			for _,cmd := range mainframe.CommandType_name {
				resp += "<tr><td>"+cmd+"</td></tr>"
			}
			resp += "</table>"
			return &mainframe.Response{
				Command:cmd,
				Resp:resp,
				CurrentDir:cmd.CurrentDir,
			},nil
		} else if _, ok := mainframe.CommandType_value[cmd.Args[0]]; ok {
			helpFile := db.HelpItem{
				Path:"help",
				FileID:"-1",
				Client:db.NewDynamoDBClient(db.ItemTable,"us-west-2"),
			}
			_,err := helpFile.Read()
			if err != nil {
				fmt.Println(err)
				return nil,errors.New("Internal error")
			}
			help := helpFile.Content[cmd.Args[0]]
			resp := "<p>"+cmd.Args[0]+"</p>"
			resp += "<table>"
			resp += "<tr>"
			resp += "<td VALIGN=\"TOP\">Usage</td>"
			resp += "<td VALIGN=\"TOP\">:</td>"
			resp += "<td VALIGN=\"TOP\">"+help.Usage+"</td>"
			resp += "</tr>"
			resp += "<tr>"
			resp += "<td VALIGN=\"TOP\">Purpose</td>"
			resp += "<td VALIGN=\"TOP\">:</td>"
			resp += "<td VALIGN=\"TOP\">"+help.Purpose+"</td>"
			resp += "</tr>"
			resp += "</table>"
			return &mainframe.Response{
				Command:cmd,
				Resp:resp,
				CurrentDir:cmd.CurrentDir,
			},nil
		} else {
			return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Invalid command. <br/>",
			},nil
		}
	default:
		return &mainframe.Response{
				Command:cmd,
				CurrentDir:cmd.CurrentDir,
				Resp:"<br/> Invalid command. <br/>",
			},nil
	}
}

func (ShellServer) AutoComplete(ctx context.Context, cmd *mainframe.Command) (*mainframe.AutoCompResponse, error) {
	if cmd == nil || cmd.CurrentDir == nil {
		return nil,errors.New("Internal error")
	}
	switch cmd.Command {
	case mainframe.CommandType_help:
		var completions []string
		for _,helpCommand :=  range mainframe.CommandType_name {
			completions = append(completions, cmd.Command.String()+" "+helpCommand)
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		},nil
	case mainframe.CommandType_ls:
		fallthrough
	case mainframe.CommandType_cd:
		var completions []string
		for _,folder :=  range cmd.CurrentDir.Folders {
			completions = append(completions, cmd.Command.String()+" "+strings.Split(folder,"/")[0])
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		},nil
	case mainframe.CommandType_cat:
		var completions []string
		for _,file :=  range cmd.CurrentDir.Files {
			completions = append(completions, cmd.Command.String()+" "+strings.Split(file,"/")[0])
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		},nil
	case mainframe.CommandType_download_resume:
		fallthrough
	case mainframe.CommandType_landing:
		fallthrough
	case mainframe.CommandType_clear:
		fallthrough
	default:
		return &mainframe.AutoCompResponse{
			Completions: []string{},
		},nil
	}
}


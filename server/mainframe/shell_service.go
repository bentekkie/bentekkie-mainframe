package mainframe

import (
	"context"
	"errors"
	p "path"
	"regexp"
	"strconv"
	"strings"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	mainframe "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/golang/protobuf/ptypes/empty"
	log "github.com/sirupsen/logrus"
)

//ShellServer is a ShellServer
type ShellServer struct{}

var validFilename, _ = regexp.Compile(`^[0-9a-zA-Z_\-.]+$`)

//RunSudoCommand runs a sudo command
func (ss ShellServer) RunSudoCommand(ctx context.Context, cmd *mainframe.SudoCommand) (*mainframe.SudoResponse, error) {
	status, err := auth.ParseJWT(cmd.Jwt)
	if err != nil || status == auth.ERROR {
		log.WithError(err).Error(status, cmd)
		return nil, errors.New("internal error")
	}
	if status == auth.EXPIRED {
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Session Expired",
			Type:       mainframe.ResponseType_text,
		}, nil
	}
	if status != auth.VALID {
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Authentication Error",
			Type:       mainframe.ResponseType_text,
		}, nil
	}
	switch cmd.Command {
	case mainframe.SudoCommandType_touch:
		if len(cmd.Args) == 0 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Provide at least one file to create",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		resp := ""
		for _, fileName := range cmd.Args {

			parent, err := db.DbConnection.FindINodeByPath(cmd.CurrentDir.Path)
			if err != nil || !validFilename.MatchString(fileName) {
				log.WithError(err).Error("Error creating file")
				resp += "\nError creating " + fileName
			} else {
				_, err = db.DbConnection.NewFile(parent, fileName, "")
				if err != nil {
					log.WithError(err).Error("Error creating file")
					resp += "\nError creating " + fileName
				} else {
					resp += "\nCreated " + fileName
				}
			}
		}
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       resp,
			Type:       mainframe.ResponseType_text,
		}, nil
	case mainframe.SudoCommandType_edit:
		if len(cmd.Args) == 0 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Provide at least one file to edit",
				Type:       mainframe.ResponseType_text,
			}, nil
		} else if len(cmd.Args) == 1 {
			res, err := ss.RunCommand(ctx, &mainframe.Command{
				Command:    mainframe.CommandType_cat,
				CurrentDir: cmd.CurrentDir,
				Args:       []string{cmd.Args[0]},
			})
			if res != nil {
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       res.Resp,
					Type:       mainframe.ResponseType_markdown,
				}, err
			}
			return nil, errors.New("invalid file")
		} else if len(cmd.Args) == 2 {
			newPath := cmd.Args[0]
			if !strings.HasPrefix(newPath, "/") {
				newPath = p.Join(cmd.CurrentDir.Path, newPath)
			}
			newPath = p.Clean(newPath)
			fileINode, err := db.DbConnection.FindINodeByPath(newPath)
			if err != nil {
				log.WithError(err).Error("edit error")
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Internal Server Error",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			if !fileINode.IsFile {
				return &mainframe.SudoResponse{
					Command:    cmd,
					Resp:       "This is a folder",
					CurrentDir: cmd.CurrentDir,
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			file, err := db.DbConnection.FindFile(fileINode.ID.Int64)
			if err != nil {
				log.WithError(err).Error("edit error")
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Internal Server Error",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			err = db.DbConnection.UpdateFileByPath(file, cmd.Args[1])
			if err != nil {
				log.WithError(err).Error("edit error")
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Internal Server Error",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "File updated",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return nil, errors.New("too many arguments")
	case mainframe.SudoCommandType_mkdir:
		newPath := ""
		if len(cmd.Args) > 0 {
			newPath = cmd.Args[0]
		}
		if !strings.HasPrefix(newPath, "/") {
			newPath = p.Join(cmd.CurrentDir.Path, newPath)
		}
		newPath = p.Clean(newPath)
		parentPath := p.Dir(newPath)
		parent, err := db.DbConnection.FindINodeByPath(parentPath)
		if err != nil || parent.IsFile {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Invalid parent directory",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		childName := p.Base(newPath)
		if !validFilename.MatchString(childName) {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Invalid folder name",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		_, err = db.DbConnection.NewDir(parent, childName)
		if err != nil {
			log.WithError(err).Error("mkdir error: error creating dir")
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Error creating directory",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Successfully created directory",
			Type:       mainframe.ResponseType_text,
		}, nil
	case mainframe.SudoCommandType_rm:
		if len(cmd.Args) == 0 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "File or folder not specified",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		force := cmd.Args[0] == "-f"
		if force && len(cmd.Args) == 1 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "File or folder not specified",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		newPath := cmd.Args[0]
		if force {
			newPath = cmd.Args[1]
		}
		if !strings.HasPrefix(newPath, "/") {
			newPath = p.Join(cmd.CurrentDir.Path, newPath)
		}
		newPath = p.Clean(newPath)
		iNode, err := db.DbConnection.FindINodeByPath(newPath)
		if err != nil {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Invalid file or folder",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		if !iNode.IsFile {
			children, err := db.DbConnection.FindDirListings(iNode)
			if err != nil {
				log.WithError(err).Error("rm error")
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Internal Server Error",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			if len(children) > 0 && !force {
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Folder not empty",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
		}
		err = db.DbConnection.DeleteINode(iNode)
		if err != nil {
			log.WithError(err).Error("rm error")
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Successfully deleted",
			Type:       mainframe.ResponseType_text,
		}, nil
	case mainframe.SudoCommandType_adduser:
		if len(cmd.Args) != 2 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Wrong number of args",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		err := db.DbConnection.NewUser(cmd.Args[0], cmd.Args[1])
		if err != nil {
			log.WithError(err).Error("adduser error")
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "User created",
			Type:       mainframe.ResponseType_text,
		}, nil
	case mainframe.SudoCommandType_dump:
		result, err := db.DbConnection.DumpDB()
		if err != nil {
			log.WithError(err).Error("dump error")
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       result,
			Type:       mainframe.ResponseType_json,
		}, nil
	case mainframe.SudoCommandType_seed:
		if len(cmd.Args) < 1 || len(cmd.Args) > 2 {
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Wrong number of args",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		wipeDB := false
		if len(cmd.Args) > 1 {
			res, err := strconv.ParseBool(cmd.Args[1])
			if err != nil {
				return &mainframe.SudoResponse{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Second argument not boolean",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			wipeDB = res
		}
		err = db.DbConnection.SeedDB([]byte(cmd.Args[0]), wipeDB)
		if err != nil {
			log.WithError(err).Error("seed error")
			return &mainframe.SudoResponse{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.SudoResponse{
			Command: cmd,
			CurrentDir: &mainframe.Folder{
				Path: db.DbConnection.Root.Path.String,
			},
			Resp: "DB seeded",
			Type: mainframe.ResponseType_text,
		}, nil
	default:
		return &mainframe.SudoResponse{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Invalid command",
			Type:       mainframe.ResponseType_text,
		}, nil
	}

}

//NewShellServer creates a new ShellServer
func NewShellServer() *ShellServer {
	return &ShellServer{}
}

//GetRoot returns the root of the filesystem
func (ShellServer) GetRoot(ctx context.Context, in *empty.Empty) (*mainframe.Folder, error) {
	root := db.DbConnection.Root
	return &mainframe.Folder{
		Path: root.Path.String,
	}, nil
}

//RunCommand runs a given command
func (ShellServer) RunCommand(ctx context.Context, cmd *mainframe.Command) (*mainframe.Response, error) {
	if cmd == nil || cmd.CurrentDir == nil {
		return nil, errors.New("internal error")
	}
	switch cmd.Command {
	case mainframe.CommandType_ls:
		newPath := ""
		if len(cmd.Args) > 0 {
			newPath = cmd.Args[0]
		}
		if !strings.HasPrefix(newPath, "/") {
			newPath = p.Join(cmd.CurrentDir.Path, newPath)
		}
		newPath = p.Clean(newPath)
		folder, err := db.DbConnection.FindINodeByPath(newPath)
		if err != nil || folder.IsFile {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Folder does not exist",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		children, err := db.DbConnection.FindDirListingsByPath(newPath)
		if err != nil {
			log.WithError(err).Error("ls error")
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		resp := "### " + newPath + "\n"
		resp += "|Name|Type|\n"
		resp += "|----|----|\n"
		for _, child := range children {
			kind := "Folder"
			if child.IsFile {
				kind = "File"
			}
			resp += "|" + p.Base(child.Path.String) + "|" + kind + "|\n"
		}
		return &mainframe.Response{
			Command:    cmd,
			Resp:       resp,
			CurrentDir: cmd.CurrentDir,
			Type:       mainframe.ResponseType_markdown,
		}, nil
	case mainframe.CommandType_cat:
		if len(cmd.Args) == 0 {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "File not specified",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		newPath := cmd.Args[0]
		if !strings.HasPrefix(newPath, "/") {
			newPath = p.Join(cmd.CurrentDir.Path, newPath)
		}
		newPath = p.Clean(newPath)
		fileINode, err := db.DbConnection.FindINodeByPath(newPath)
		if err != nil {
			log.WithError(err).Error("cat error")
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Internal Server Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		if !fileINode.IsFile {
			return &mainframe.Response{
				Command:    cmd,
				Resp:       "This is a folder",
				CurrentDir: cmd.CurrentDir,
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		file, err := db.DbConnection.FindFile(fileINode.ID.Int64)
		if err != nil || !file.Contents.Valid {
			log.WithError(err).Error("cat error: invalid file")
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Invalid file",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.Response{
			Command:    cmd,
			Resp:       file.Contents.String,
			CurrentDir: cmd.CurrentDir,
			Type:       mainframe.ResponseType_markdown,
		}, nil
	case mainframe.CommandType_cd:
		if len(cmd.Args) == 0 {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Folder not specified",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		newPath := cmd.Args[0]
		if !strings.HasPrefix(newPath, "/") {
			newPath = p.Join(cmd.CurrentDir.Path, newPath)
		}
		newPath = p.Clean(newPath)
		folder, err := db.DbConnection.FindINodeByPath(newPath)
		if err != nil || !folder.Path.Valid {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Invalid Folder",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		if folder.IsFile {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "This is a file",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.Response{
			CurrentDir: &mainframe.Folder{
				Path: folder.Path.String,
			},
			Command: cmd,
			Resp:    "",
			Type:    mainframe.ResponseType_text,
		}, nil
	case mainframe.CommandType_help:
		if len(cmd.Args) == 0 {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       ALL_COMMANDS_HELP,
				Type:       mainframe.ResponseType_markdown,
			}, nil
		}
		if len(cmd.Args) == 1 {
			if _, found := mainframe.CommandType_value[cmd.Args[0]]; !found {
				return &mainframe.Response{
					Command:    cmd,
					CurrentDir: cmd.CurrentDir,
					Resp:       "Command does not exist",
					Type:       mainframe.ResponseType_text,
				}, nil
			}
			argCmdType := mainframe.CommandType(mainframe.CommandType_value[cmd.Args[0]])
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       HelpText(&argCmdType),
				Type:       mainframe.ResponseType_markdown,
			}, nil
		}

		return &mainframe.Response{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Invalid command usage",
			Type:       mainframe.ResponseType_text,
		}, nil
	case mainframe.CommandType_login:
		if len(cmd.Args) != 2 {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Login Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		password, err := db.DbConnection.GetPassword(cmd.Args[0])
		if err != nil || password != cmd.Args[1] {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Login Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		jwtToken, err := auth.NewJWT(cmd.Args[0])
		if err != nil {
			return &mainframe.Response{
				Command:    cmd,
				CurrentDir: cmd.CurrentDir,
				Resp:       "Login Error",
				Type:       mainframe.ResponseType_text,
			}, nil
		}
		return &mainframe.Response{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "JWT:" + jwtToken,
			Type:       mainframe.ResponseType_text,
		}, nil

	default:
		return &mainframe.Response{
			Command:    cmd,
			CurrentDir: cmd.CurrentDir,
			Resp:       "Invalid command.",
			Type:       mainframe.ResponseType_text,
		}, nil
	}
}

//AutoComplete generates the completions for a given command
func (ShellServer) AutoComplete(ctx context.Context, cmd *mainframe.Command) (*mainframe.AutoCompResponse, error) {
	if cmd == nil || cmd.CurrentDir == nil {
		return nil, errors.New("internal error")
	}
	switch cmd.Command {
	case mainframe.CommandType_help:
		var completions []string
		for _, helpCommand := range mainframe.CommandType_name {
			completions = append(completions, cmd.Command.String()+" "+helpCommand)
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		}, nil
	case mainframe.CommandType_ls:
		fallthrough
	case mainframe.CommandType_cd:
		var completions []string
		folder, err := db.DbConnection.FindINodeByPath(cmd.CurrentDir.Path)
		if err != nil || !folder.Path.Valid {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		children, err := db.DbConnection.FindDirListings(folder)
		if err != nil {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		for _, child := range children {
			if !child.IsFile {
				completions = append(completions, cmd.Command.String()+" "+p.Base(child.Path.String))
			}
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		}, nil
	case mainframe.CommandType_cat:
		var completions []string
		folder, err := db.DbConnection.FindINodeByPath(cmd.CurrentDir.Path)
		if err != nil || !folder.Path.Valid {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		children, err := db.DbConnection.FindDirListings(folder)
		if err != nil {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		for _, child := range children {
			if child.IsFile {
				completions = append(completions, cmd.Command.String()+" "+p.Base(child.Path.String))
			}
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		}, nil
	case mainframe.CommandType_download_resume:
		fallthrough
	case mainframe.CommandType_landing:
		fallthrough
	case mainframe.CommandType_clear:
		fallthrough
	default:
		return &mainframe.AutoCompResponse{
			Completions: []string{},
		}, nil
	}
}

//SudoAutoComplete generates the completions for a given sudo command
func (ss ShellServer) SudoAutoComplete(ctx context.Context, cmd *mainframe.SudoCommand) (*mainframe.AutoCompResponse, error) {
	if cmd == nil || cmd.CurrentDir == nil {
		return nil, errors.New("internal error")
	}
	switch cmd.Command {
	case mainframe.SudoCommandType_edit:
		var completions []string
		folder, err := db.DbConnection.FindINodeByPath(cmd.CurrentDir.Path)
		if err != nil || !folder.Path.Valid {
			log.WithError(err).Error("edit error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		children, err := db.DbConnection.FindDirListings(folder)
		if err != nil {
			log.WithError(err).Error("edit error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		for _, child := range children {
			if child.IsFile {
				completions = append(completions, cmd.Command.String()+" "+p.Base(child.Path.String))
			}
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		}, nil

	case mainframe.SudoCommandType_mkdir:
		fallthrough
	case mainframe.SudoCommandType_touch:
		var completions []string
		folder, err := db.DbConnection.FindINodeByPath(cmd.CurrentDir.Path)
		if err != nil || !folder.Path.Valid {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		children, err := db.DbConnection.FindDirListings(folder)
		if err != nil {
			log.WithError(err).Error("cd error")
			return &mainframe.AutoCompResponse{
				Completions: completions,
			}, nil
		}
		for _, child := range children {
			if !child.IsFile {
				completions = append(completions, cmd.Command.String()+" "+p.Base(child.Path.String))
			}
		}
		return &mainframe.AutoCompResponse{
			Completions: completions,
		}, nil

	case mainframe.SudoCommandType_logout:
		fallthrough
	default:
		return &mainframe.AutoCompResponse{
			Completions: []string{},
		}, nil
	}

}

package mainframe

import (
	"fmt"
	"sort"

	mainframe "github.com/bentekkie/bentekkie-mainframe/proto/command/v1"
)

func helpText(cmdName string, description string, usage string) string {
	if usage == "" {
		return fmt.Sprintf("### Help for %s\n\nUsage: `%s`\n\n%s\n\n", cmdName, cmdName, description)
	}
	return fmt.Sprintf("### Help for %s\n\nUsage: `%s %s`\n\n%s\n\n", cmdName, cmdName, usage, description)
}

func HelpText(cmd *mainframe.CommandType) string {
	description, usage := "", ""
	switch *cmd {
	case mainframe.CommandType_ls:
		description = "List files and folders in a directory"
		usage = "[relative path to directory]"
	case mainframe.CommandType_cat:
		description = "Prints contents of file to console"
		usage = "[relative path to file]"
	case mainframe.CommandType_cd:
		description = "Changes current directory"
		usage = "[relative path to new directory]"
	case mainframe.CommandType_help:
		description = "Prints helptext for a command"
		usage = "[command name]"
	case mainframe.CommandType_clear:
		description = "Clears console"
		usage = ""
	case mainframe.CommandType_landing:
		description = "Opens the landing page"
		usage = ""
	case mainframe.CommandType_download_resume:
		description = "Downloads pdf resume"
		usage = ""
	case mainframe.CommandType_login:
		description = "Logs in to admin console"
		usage = ""
	case mainframe.CommandType_exec:
		description = "Executes script file"
		usage = "[relative path to file]"
	}
	return helpText(cmd.String(), description, usage)
}

func SudoHelpText(cmd *mainframe.SudoCommandType) string {
	description, usage := "", ""
	switch *cmd {
	case mainframe.SudoCommandType_logout:
		description = "Logs out of the admin console"
		usage = ""
	case mainframe.SudoCommandType_touch:
		description = "Creates one or more empty files in the current directory"
		usage = "<file> [file...]"
	case mainframe.SudoCommandType_mkdir:
		description = "Creates a new directory"
		usage = "<path>"
	case mainframe.SudoCommandType_rm:
		description = "Deletes a file or directory (use -f for non-empty directories)"
		usage = "[-f] <path>"
	case mainframe.SudoCommandType_adduser:
		description = "Creates a new admin user"
		usage = "[username password]"
	case mainframe.SudoCommandType_edit:
		description = "Opens the Markdown editor for a file"
		usage = "<path>"
	case mainframe.SudoCommandType_dump:
		description = "Downloads the current virtual filesystem as dump.json"
		usage = ""
	case mainframe.SudoCommandType_seed:
		description = "Imports a JSON filesystem dump into the database"
		usage = ""
	}
	return helpText(cmd.String(), description, usage)
}

func _AllCommandsHelp() string {
	keys := make([]int, 0, len(mainframe.CommandType_name))
	for k := range mainframe.CommandType_name {
		keys = append(keys, int(k))
	}
	sort.Ints(keys)

	help := ""
	for _, k := range keys {
		kEnum := mainframe.CommandType(k)
		help += HelpText(&kEnum)
	}
	return help
}

func _AllSudoCommandsHelp() string {
	keys := make([]int, 0, len(mainframe.SudoCommandType_name))
	for k := range mainframe.SudoCommandType_name {
		keys = append(keys, int(k))
	}
	sort.Ints(keys)

	help := ""
	for _, k := range keys {
		kEnum := mainframe.SudoCommandType(k)
		help += SudoHelpText(&kEnum)
	}
	return help
}

var ALL_COMMANDS_HELP = "## Help:\n" + _AllCommandsHelp() + "## Admin Commands (requires login):\n" + _AllSudoCommandsHelp()

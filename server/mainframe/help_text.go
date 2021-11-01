package mainframe

import (
	"fmt"

	mainframe "github.com/bentekkie/bentekkie-mainframe/server/generated"
)

func helpText(cmdName string, description string, usage string) string {
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
		description = "Unimplemented"
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

func _AllCommandsHelp() string {
	help := ""
	for k := range mainframe.CommandType_name {
		k_enum := mainframe.CommandType(k)
		help += HelpText(&k_enum)
	}
	return help
}

var ALL_COMMANDS_HELP = "## Help:\n" + _AllCommandsHelp()

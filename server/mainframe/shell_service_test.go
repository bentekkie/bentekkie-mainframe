package mainframe

import (
	"context"
	"testing"

	mainframe "github.com/bentekkie/bentekkie-mainframe/proto/command/v1"
	"github.com/bentekkie/bentekkie-mainframe/server/auth"
)

func TestRmBlocksRootDirectory(t *testing.T) {
	auth.InitJWT()
	token, err := auth.NewJWT("admin")
	if err != nil {
		t.Fatalf("NewJWT failed: %v", err)
	}

	ss := NewShellServer()
	cases := []struct {
		name       string
		currentDir string
		args       []string
	}{
		{name: "rm slash", currentDir: "/", args: []string{"/"}},
		{name: "rm -f slash", currentDir: "/", args: []string{"-f", "/"}},
		{name: "rm -f parent traversal to root", currentDir: "/projects", args: []string{"-f", ".."}},
		{name: "rm dot at root", currentDir: "/", args: []string{"."}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := ss.runSudoCommand(context.Background(), &mainframe.SudoCommand{
				Command:    mainframe.SudoCommandType_rm,
				CurrentDir: &mainframe.Folder{Path: tc.currentDir},
				Args:       tc.args,
				Jwt:        token,
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if resp.Resp != "Cannot delete root directory" {
				t.Fatalf("expected root deletion guard message, got %q", resp.Resp)
			}
		})
	}
}

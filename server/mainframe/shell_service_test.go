package mainframe

import (
	"context"
	"testing"
	"time"

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

func TestLoginRateLimiting(t *testing.T) {
	ss := &ShellServer{
		loginLimiter: auth.NewLoginLimiter(2, 5*time.Minute),
	}
	ctx := auth.WithClientIP(context.Background(), "198.51.100.55")
	cmd := &mainframe.Command{
		Command:    mainframe.CommandType_login,
		CurrentDir: &mainframe.Folder{Path: "/"},
		Args:       []string{"only-one-arg"},
	}

	for i := 0; i < 2; i++ {
		resp, err := ss.runCommand(ctx, cmd)
		if err != nil {
			t.Fatalf("unexpected error on attempt %d: %v", i+1, err)
		}
		if resp.Resp != "Login Error" {
			t.Fatalf("expected Login Error on attempt %d, got %q", i+1, resp.Resp)
		}
	}

	resp, err := ss.runCommand(ctx, cmd)
	if err != nil {
		t.Fatalf("unexpected error on rate-limited attempt: %v", err)
	}
	if resp.Resp != "Too many login attempts. Please try again later." {
		t.Fatalf("expected rate-limit message, got %q", resp.Resp)
	}
}

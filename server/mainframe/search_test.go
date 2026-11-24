package mainframe

import (
	"context"
	"database/sql"
	"strings"
	"testing"

	mainframe "github.com/bentekkie/bentekkie-mainframe/proto/command/v1"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
)

func TestParseTreeArgs(t *testing.T) {
	t.Run("defaults", func(t *testing.T) {
		opts, err := parseTreeArgs(nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if opts.targetPath != "" || opts.maxDepth != defaultTreeDepth || opts.showHidden {
			t.Fatalf("unexpected defaults: %+v", opts)
		}
	})

	t.Run("path depth and hidden flag", func(t *testing.T) {
		opts, err := parseTreeArgs([]string{"projects", "-L", "2", "-a"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if opts.targetPath != "projects" || opts.maxDepth != 2 || !opts.showHidden {
			t.Fatalf("unexpected opts: %+v", opts)
		}
	})

	t.Run("compact -L flag and clamping", func(t *testing.T) {
		opts, err := parseTreeArgs([]string{"-L99"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if opts.maxDepth != maxTreeDepth {
			t.Fatalf("expected depth clamped to %d, got %d", maxTreeDepth, opts.maxDepth)
		}
	})

	t.Run("invalid depth and unknown flag", func(t *testing.T) {
		if _, err := parseTreeArgs([]string{"-L", "0"}); err == nil {
			t.Fatal("expected error for -L 0")
		}
		if _, err := parseTreeArgs([]string{"-L"}); err == nil {
			t.Fatal("expected error for missing -L value")
		}
		if _, err := parseTreeArgs([]string{"-z"}); err == nil {
			t.Fatal("expected error for unknown flag")
		}
	})
}

func TestRenderTree(t *testing.T) {
	nodes := []*db.TreeNode{
		{
			INode: db.INode{
				ID:          sql.NullInt64{Int64: 2, Valid: true},
				ParentINode: sql.NullInt64{Int64: 1, Valid: true},
				Path:        sql.NullString{String: "/.init", Valid: true},
				IsFile:      true,
			},
			Depth: 1,
		},
		{
			INode: db.INode{
				ID:          sql.NullInt64{Int64: 3, Valid: true},
				ParentINode: sql.NullInt64{Int64: 1, Valid: true},
				Path:        sql.NullString{String: "/projects", Valid: true},
				IsFile:      false,
			},
			Depth: 1,
		},
		{
			INode: db.INode{
				ID:          sql.NullInt64{Int64: 4, Valid: true},
				ParentINode: sql.NullInt64{Int64: 3, Valid: true},
				Path:        sql.NullString{String: "/projects/mainframe.md", Valid: true},
				IsFile:      true,
			},
			Depth: 2,
		},
		{
			INode: db.INode{
				ID:          sql.NullInt64{Int64: 5, Valid: true},
				ParentINode: sql.NullInt64{Int64: 1, Valid: true},
				Path:        sql.NullString{String: "/resume.md", Valid: true},
				IsFile:      true,
			},
			Depth: 1,
		},
	}

	out := renderTree("/", 1, nodes, false)
	if strings.Contains(out, ".init") {
		t.Fatalf("expected dotfiles hidden by default, got:\n%s", out)
	}
	for _, want := range []string{"├── projects/", "│   └── mainframe.md", "└── resume.md", "1 directory, 2 files"} {
		if !strings.Contains(out, want) {
			t.Fatalf("expected tree output to contain %q, got:\n%s", want, out)
		}
	}

	outAll := renderTree("/", 1, nodes, true)
	if !strings.Contains(outAll, ".init") || !strings.Contains(outAll, "1 directory, 3 files") {
		t.Fatalf("expected -a output to include .init, got:\n%s", outAll)
	}
}

func TestFormatFindAndGrep(t *testing.T) {
	inodes := []*db.INode{
		{Path: sql.NullString{String: "/.init", Valid: true}, IsFile: true},
		{Path: sql.NullString{String: "/projects/mainframe.md", Valid: true}, IsFile: true},
	}

	findOut := formatFindResults(inodes, false, "mainframe")
	if strings.Contains(findOut, ".init") || !strings.Contains(findOut, "|/projects/mainframe.md|File|") {
		t.Fatalf("unexpected find output:\n%s", findOut)
	}

	findDot := formatFindResults(inodes, false, ".init")
	if !strings.Contains(findDot, "|/.init|File|") {
		t.Fatalf("expected explicit dotfile pattern to match .init, got:\n%s", findDot)
	}

	grepFiles := []*db.GrepFileMatch{
		{Path: "/.init", Contents: "cat resume.md\nGo rules"},
		{Path: "/resume.md", Contents: "Line 1\nBuilt Go and Kubernetes systems\nLine 3"},
	}
	grepOut := formatGrepMatches(grepFiles, "go", false)
	if strings.Contains(grepOut, ".init") {
		t.Fatalf("expected grep to skip dotfiles by default, got:\n%s", grepOut)
	}
	if !strings.Contains(grepOut, "`/resume.md:2` — Built Go and Kubernetes systems") {
		t.Fatalf("unexpected grep output:\n%s", grepOut)
	}
}

func TestHelpCoversTreeFindGrep(t *testing.T) {
	ss := NewShellServer()
	ctx := context.Background()
	rootDir := &mainframe.Folder{Path: "/"}

	for _, cmdName := range []string{"tree", "find", "grep"} {
		resp, err := ss.runCommand(ctx, &mainframe.Command{
			Command:    mainframe.CommandType_help,
			CurrentDir: rootDir,
			Args:       []string{cmdName},
		})
		if err != nil {
			t.Fatalf("help %s failed: %v", cmdName, err)
		}
		if resp.Type != mainframe.ResponseType_markdown || !strings.Contains(resp.Resp, "### Help for "+cmdName) {
			t.Fatalf("unexpected help response for %s: %+v", cmdName, resp)
		}
	}
}

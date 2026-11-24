package mainframe

import (
	"errors"
	"fmt"
	p "path"
	"sort"
	"strconv"
	"strings"

	"github.com/bentekkie/bentekkie-mainframe/server/db"
)

const (
	defaultTreeDepth      = 3
	maxTreeDepth          = 10
	maxTreeNodes          = 200
	maxFindResults        = 50
	maxGrepFiles          = 50
	maxGrepMatchesPerFile = 5
	maxGrepMatchesTotal   = 50
	maxGrepSnippetLen     = 120
)

type treeOptions struct {
	targetPath string
	maxDepth   int
	showHidden bool
}

func parseTreeArgs(args []string) (treeOptions, error) {
	opts := treeOptions{
		maxDepth: defaultTreeDepth,
	}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch {
		case arg == "-a":
			opts.showHidden = true
		case arg == "-L":
			if i+1 >= len(args) {
				return opts, errors.New("usage: tree [path] [-L depth] [-a]")
			}
			i++
			d, err := strconv.Atoi(args[i])
			if err != nil || d < 1 {
				return opts, errors.New("invalid depth for -L: must be a positive integer")
			}
			if d > maxTreeDepth {
				d = maxTreeDepth
			}
			opts.maxDepth = d
		case strings.HasPrefix(arg, "-L") && len(arg) > 2:
			d, err := strconv.Atoi(arg[2:])
			if err != nil || d < 1 {
				return opts, errors.New("invalid depth for -L: must be a positive integer")
			}
			if d > maxTreeDepth {
				d = maxTreeDepth
			}
			opts.maxDepth = d
		case strings.HasPrefix(arg, "-"):
			return opts, fmt.Errorf("unknown flag %q (usage: tree [path] [-L depth] [-a])", arg)
		default:
			if opts.targetPath != "" {
				return opts, errors.New("too many arguments (usage: tree [path] [-L depth] [-a])")
			}
			opts.targetPath = arg
		}
	}
	return opts, nil
}

func parseSearchArgs(args []string, usage string) (query string, targetPath string, showHidden bool, err error) {
	var positional []string
	for _, arg := range args {
		if arg == "-a" {
			showHidden = true
			continue
		}
		positional = append(positional, arg)
	}
	if len(positional) == 0 {
		return "", "", false, errors.New(usage)
	}
	if len(positional) > 2 {
		return "", "", false, errors.New(usage)
	}
	query = positional[0]
	if len(positional) == 2 {
		targetPath = positional[1]
	}
	return query, targetPath, showHidden, nil
}

func isHiddenPath(fullPath string) bool {
	for _, seg := range strings.Split(strings.TrimPrefix(fullPath, "/"), "/") {
		if strings.HasPrefix(seg, ".") {
			return true
		}
	}
	return false
}

func renderTree(rootPath string, rootID int64, nodes []*db.TreeNode, showHidden bool) string {
	childrenByParent := make(map[int64][]*db.TreeNode)
	for _, n := range nodes {
		if n == nil || !n.ParentINode.Valid {
			continue
		}
		if !showHidden && isHiddenPath(n.Path.String) {
			continue
		}
		childrenByParent[n.ParentINode.Int64] = append(childrenByParent[n.ParentINode.Int64], n)
	}
	for parentID := range childrenByParent {
		list := childrenByParent[parentID]
		sort.Slice(list, func(i, j int) bool {
			return list[i].Path.String < list[j].Path.String
		})
	}

	var b strings.Builder
	b.WriteString("```text\n")
	b.WriteString(rootPath)
	b.WriteByte('\n')

	dirs, files := 0, 0
	var walk func(parentID int64, prefix string)
	walk = func(parentID int64, prefix string) {
		children := childrenByParent[parentID]
		for idx, child := range children {
			isLast := idx == len(children)-1
			connector := "├── "
			childPrefix := prefix + "│   "
			if isLast {
				connector = "└── "
				childPrefix = prefix + "    "
			}
			name := p.Base(child.Path.String)
			if child.IsFile {
				files++
				b.WriteString(prefix)
				b.WriteString(connector)
				b.WriteString(name)
				b.WriteByte('\n')
			} else {
				dirs++
				b.WriteString(prefix)
				b.WriteString(connector)
				b.WriteString(name)
				b.WriteString("/\n")
				walk(child.ID.Int64, childPrefix)
			}
		}
	}
	walk(rootID, "")
	b.WriteString("```\n\n")

	dirWord := "directories"
	if dirs == 1 {
		dirWord = "directory"
	}
	fileWord := "files"
	if files == 1 {
		fileWord = "file"
	}
	b.WriteString(fmt.Sprintf("%d %s, %d %s", dirs, dirWord, files, fileWord))
	if len(nodes) >= maxTreeNodes {
		b.WriteString(" *(truncated)*")
	}
	return b.String()
}

func formatFindResults(results []*db.INode, showHidden bool, pattern string) string {
	includeHidden := showHidden || strings.HasPrefix(pattern, ".")
	var visible []*db.INode
	for _, node := range results {
		if node == nil || !node.Path.Valid {
			continue
		}
		if !includeHidden && isHiddenPath(node.Path.String) {
			continue
		}
		visible = append(visible, node)
	}
	if len(visible) == 0 {
		return "No matches found"
	}

	var b strings.Builder
	b.WriteString("|Path|Type|\n")
	b.WriteString("|----|----|\n")
	for _, node := range visible {
		kind := "Folder"
		if node.IsFile {
			kind = "File"
		}
		escapedPath := strings.ReplaceAll(node.Path.String, "|", `\|`)
		b.WriteString("|")
		b.WriteString(escapedPath)
		b.WriteString("|")
		b.WriteString(kind)
		b.WriteString("|\n")
	}
	if len(results) >= maxFindResults {
		b.WriteString("\n*Showing first results; narrow your pattern or path for more.*")
	}
	return b.String()
}

func truncateSnippet(line string, lowerQuery string) string {
	trimmed := strings.TrimSpace(line)
	if len(trimmed) <= maxGrepSnippetLen {
		return trimmed
	}
	lower := strings.ToLower(trimmed)
	idx := strings.Index(lower, lowerQuery)
	if idx < 0 {
		return trimmed[:maxGrepSnippetLen-3] + "..."
	}
	start := idx - 30
	if start < 0 {
		start = 0
	}
	end := start + maxGrepSnippetLen
	if end > len(trimmed) {
		end = len(trimmed)
		start = end - maxGrepSnippetLen
		if start < 0 {
			start = 0
		}
	}
	snippet := trimmed[start:end]
	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(trimmed) {
		snippet = snippet + "..."
	}
	return snippet
}

func formatGrepMatches(files []*db.GrepFileMatch, query string, showHidden bool) string {
	lowerQuery := strings.ToLower(query)
	var b strings.Builder
	totalMatches := 0
	truncated := false

	for _, f := range files {
		if f == nil {
			continue
		}
		if !showHidden && isHiddenPath(f.Path) {
			continue
		}
		lines := strings.Split(strings.ReplaceAll(f.Contents, "\r\n", "\n"), "\n")
		fileMatches := 0
		for i, line := range lines {
			if !strings.Contains(strings.ToLower(line), lowerQuery) {
				continue
			}
			if totalMatches >= maxGrepMatchesTotal {
				truncated = true
				break
			}
			if fileMatches >= maxGrepMatchesPerFile {
				truncated = true
				break
			}
			snippet := truncateSnippet(line, lowerQuery)
			snippet = strings.ReplaceAll(snippet, "`", "'")
			b.WriteString(fmt.Sprintf("- `%s:%d` — %s\n", f.Path, i+1, snippet))
			fileMatches++
			totalMatches++
		}
		if totalMatches >= maxGrepMatchesTotal {
			break
		}
	}

	if totalMatches == 0 {
		return "No matches found"
	}
	if truncated || len(files) >= maxGrepFiles {
		b.WriteString("\n*Output truncated; narrow your query or path for more matches.*")
	}
	return b.String()
}

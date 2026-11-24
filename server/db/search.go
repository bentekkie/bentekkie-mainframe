package db

import (
	"context"
	"errors"
	p "path"
	"strings"
)

// TreeNode represents an INode together with its depth relative to a subtree root.
type TreeNode struct {
	INode
	Depth int `db:"depth"`
}

// GrepFileMatch holds a file path and its contents for content search results.
type GrepFileMatch struct {
	Path     string `db:"path"`
	Contents string `db:"contents"`
}

// escapeLike escapes SQL LIKE special characters (\, %, _) using backslash as the escape char.
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}

// globToLikePattern converts a user search pattern into a safe SQL ILIKE pattern (ESCAPE '\').
// If pattern contains '*' or '?', they map to '%' and '_'. Otherwise it matches as a substring.
func globToLikePattern(pattern string) string {
	hasGlob := strings.ContainsAny(pattern, "*?")
	var b strings.Builder
	if !hasGlob {
		b.WriteByte('%')
	}
	for _, ch := range pattern {
		switch ch {
		case '\\', '%', '_':
			b.WriteByte('\\')
			b.WriteRune(ch)
		case '*':
			b.WriteByte('%')
		case '?':
			b.WriteByte('_')
		default:
			b.WriteRune(ch)
		}
	}
	if !hasGlob {
		b.WriteByte('%')
	}
	return b.String()
}

// scopePrefixPattern builds a SQL LIKE pattern matching descendants strictly under basePath.
func scopePrefixPattern(basePath string) string {
	clean := p.Clean(basePath)
	if clean == "/" || clean == "." {
		return "/%"
	}
	return escapeLike(clean) + "/%"
}

// FindSubtree returns descendants of rootID up to maxDepth (1..10), ordered by path, capped at limit.
func (c *Connection) FindSubtree(ctx context.Context, rootID int64, maxDepth int, limit int) ([]*TreeNode, error) {
	if maxDepth < 1 {
		maxDepth = 1
	}
	if maxDepth > 10 {
		maxDepth = 10
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}

	var nodes []*TreeNode
	const query = `
WITH RECURSIVE subtree AS (
    SELECT id, parentinode, path, 1 AS depth
    FROM inodes
    WHERE parentinode = $1
    UNION ALL
    SELECT i.id, i.parentinode, i.path, s.depth + 1
    FROM inodes i
    JOIN subtree s ON i.parentinode = s.id
    WHERE s.depth < $2
)
SELECT id, parentinode, path, isfile(id) AS isfile, depth
FROM subtree
ORDER BY path ASC
LIMIT $3`
	err := c.conn.SelectContext(ctx, &nodes, query, rootID, maxDepth, limit)
	return nodes, err
}

// SearchPaths searches inode paths under basePath matching pattern (glob or case-insensitive substring).
func (c *Connection) SearchPaths(ctx context.Context, basePath string, pattern string, limit int) ([]*INode, error) {
	if strings.TrimSpace(pattern) == "" {
		return nil, errors.New("search pattern is required")
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	prefix := scopePrefixPattern(basePath)
	namePattern := globToLikePattern(pattern)

	// Match against either the basename (when pattern has no '/') or the full path (when pattern includes '/').
	var query string
	if strings.Contains(pattern, "/") {
		query = `
SELECT *, isfile(id) AS isfile
FROM inodes
WHERE path <> '/'
  AND path LIKE $1 ESCAPE '\'
  AND path ILIKE $2 ESCAPE '\'
ORDER BY path ASC
LIMIT $3`
	} else {
		query = `
SELECT *, isfile(id) AS isfile
FROM inodes
WHERE path <> '/'
  AND path LIKE $1 ESCAPE '\'
  AND regexp_replace(path, '^.*/', '') ILIKE $2 ESCAPE '\'
ORDER BY path ASC
LIMIT $3`
	}

	var results []*INode
	err := c.conn.SelectContext(ctx, &results, query, prefix, namePattern, limit)
	return results, err
}

// SearchFileContents searches file contents under basePath (directory or single file) for case-insensitive substring query.
func (c *Connection) SearchFileContents(ctx context.Context, basePath string, queryText string, limit int) ([]*GrepFileMatch, error) {
	if queryText == "" {
		return nil, errors.New("search query is required")
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	clean := p.Clean(basePath)
	likeQuery := "%" + escapeLike(queryText) + "%"

	var results []*GrepFileMatch
	if clean == "/" || clean == "." {
		const sqlQuery = `
SELECT i.path, f.contents
FROM files f
JOIN inodes i ON f.inode = i.id
WHERE f.contents ILIKE $1 ESCAPE '\'
ORDER BY i.path ASC
LIMIT $2`
		err := c.conn.SelectContext(ctx, &results, sqlQuery, likeQuery, limit)
		return results, err
	}

	prefix := escapeLike(clean) + "/%"
	const sqlQuery = `
SELECT i.path, f.contents
FROM files f
JOIN inodes i ON f.inode = i.id
WHERE (i.path = $1 OR i.path LIKE $2 ESCAPE '\')
  AND f.contents ILIKE $3 ESCAPE '\'
ORDER BY i.path ASC
LIMIT $4`
	err := c.conn.SelectContext(ctx, &results, sqlQuery, clean, prefix, likeQuery, limit)
	return results, err
}

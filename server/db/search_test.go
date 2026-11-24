package db

import "testing"

func TestEscapeLikeAndGlobToLikePattern(t *testing.T) {
	if got := escapeLike(`a_b%c\d`); got != `a\_b\%c\\d` {
		t.Fatalf("unexpected escapeLike: %q", got)
	}

	cases := []struct {
		in   string
		want string
	}{
		{in: "resume", want: "%resume%"},
		{in: "my_file", want: `%my\_file%`},
		{in: "*.md", want: "%.md"},
		{in: "proj_?.go", want: `proj\__.go`},
		{in: "100%", want: `%100\%%`},
	}
	for _, tc := range cases {
		if got := globToLikePattern(tc.in); got != tc.want {
			t.Errorf("globToLikePattern(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}

	if got := scopePrefixPattern("/"); got != "/%" {
		t.Fatalf("unexpected root scope prefix: %q", got)
	}
	if got := scopePrefixPattern("/my_dir"); got != `/my\_dir/%` {
		t.Fatalf("unexpected subdir scope prefix: %q", got)
	}
}

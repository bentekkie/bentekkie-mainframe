package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
)

func TestHealthAndReadinessEndpoints(t *testing.T) {
	prev := db.DbConnection
	db.DbConnection = nil
	defer func() {
		db.DbConnection = prev
	}()

	mux := NewMux(t.TempDir())

	t.Run("healthz returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 from /healthz, got %d", rec.Code)
		}
	})

	t.Run("readyz returns 503 when db is not initialized", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 from /readyz without db, got %d", rec.Code)
		}
	})

	t.Run("api config returns defaults and env overrides", func(t *testing.T) {
		t.Setenv("LANDING_URL", "")
		t.Setenv("RESUME_URL", "")

		req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 from /api/config, got %d", rec.Code)
		}
		var cfg runtimeConfig
		if err := json.NewDecoder(rec.Body).Decode(&cfg); err != nil {
			t.Fatalf("decode /api/config: %v", err)
		}
		if cfg.LandingURL != defaultLandingURL || cfg.ResumeURL != defaultResumeURL {
			t.Fatalf("unexpected default config: %+v", cfg)
		}

		t.Setenv("LANDING_URL", "https://example.com")
		t.Setenv("RESUME_URL", "https://example.com/resume.pdf")
		rec2 := httptest.NewRecorder()
		mux.ServeHTTP(rec2, httptest.NewRequest(http.MethodGet, "/api/config", nil))
		var cfg2 runtimeConfig
		if err := json.NewDecoder(rec2.Body).Decode(&cfg2); err != nil {
			t.Fatalf("decode overridden /api/config: %v", err)
		}
		if cfg2.LandingURL != "https://example.com" || cfg2.ResumeURL != "https://example.com/resume.pdf" {
			t.Fatalf("unexpected overridden config: %+v", cfg2)
		}
	})
}

func TestExtractClientIPCloudflareAndCaddy(t *testing.T) {
	cases := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		want       string
	}{
		{
			name: "prefers CF-Connecting-IP over X-Forwarded-For from Cloudflare + Caddy",
			headers: map[string]string{
				"CF-Connecting-IP": "198.51.100.42",
				"X-Forwarded-For":  "203.0.113.99, 172.70.10.5",
			},
			remoteAddr: "172.18.0.2:41234",
			want:       "198.51.100.42",
		},
		{
			name: "supports IPv6 CF-Connecting-IP",
			headers: map[string]string{
				"CF-Connecting-IP": "2001:db8::1",
				"X-Forwarded-For":  "172.70.10.5",
			},
			remoteAddr: "172.18.0.2:41234",
			want:       "2001:db8::1",
		},
		{
			name: "ignores invalid CF-Connecting-IP and falls back to X-Forwarded-For",
			headers: map[string]string{
				"CF-Connecting-IP": "not-an-ip",
				"X-Forwarded-For":  "198.51.100.7, 10.0.0.1",
			},
			remoteAddr: "172.18.0.2:41234",
			want:       "198.51.100.7",
		},
		{
			name: "falls back to X-Real-IP when CF and XFF absent",
			headers: map[string]string{
				"X-Real-IP": "198.51.100.8",
			},
			remoteAddr: "172.18.0.2:41234",
			want:       "198.51.100.8",
		},
		{
			name:       "falls back to RemoteAddr stripping port and unmapping IPv4-mapped IPv6",
			headers:    nil,
			remoteAddr: "[::ffff:203.0.113.5]:54321",
			want:       "203.0.113.5",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/grpc/mainframe.shell/runCommand", nil)
			req.RemoteAddr = tc.remoteAddr
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}

			var captured string
			h := withClientIP(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				captured = auth.ClientIPFromContext(r.Context())
				w.WriteHeader(http.StatusOK)
			}))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if captured != tc.want {
				t.Fatalf("expected client IP %q, got %q", tc.want, captured)
			}
		})
	}
}

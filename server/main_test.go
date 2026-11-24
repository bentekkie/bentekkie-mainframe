package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

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
}

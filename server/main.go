package server

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/bentekkie/bentekkie-mainframe/proto/command/v1/commandv1connect"
	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	"github.com/bentekkie/bentekkie-mainframe/server/env"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	log "github.com/sirupsen/logrus"
)

// StaticDir returns the configured static asset directory, defaulting to "/out".
func StaticDir() string {
	dir, err := env.GetEnvStr("STATIC_DIR")
	if err != nil || dir == "" {
		return "/out"
	}
	return dir
}

func parseNormalizedIP(raw string) (string, bool) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", false
	}
	if addr, err := netip.ParseAddr(s); err == nil {
		return addr.Unmap().String(), true
	}
	if host, _, err := net.SplitHostPort(s); err == nil {
		if addr, err := netip.ParseAddr(host); err == nil {
			return addr.Unmap().String(), true
		}
	}
	return "", false
}

// extractClientIP resolves the caller's IP across Cloudflare -> Caddy -> server.
// Prefers Cloudflare's CF-Connecting-IP (overwritten at the Cloudflare edge and preserved by Caddy),
// then True-Client-IP, X-Forwarded-For, X-Real-IP, and finally RemoteAddr.
func extractClientIP(r *http.Request) string {
	for _, header := range []string{"CF-Connecting-IP", "True-Client-IP"} {
		if ip, ok := parseNormalizedIP(r.Header.Get(header)); ok {
			return ip
		}
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		for _, part := range strings.Split(xff, ",") {
			if ip, ok := parseNormalizedIP(part); ok {
				return ip
			}
		}
	}
	if ip, ok := parseNormalizedIP(r.Header.Get("X-Real-IP")); ok {
		return ip
	}
	if ip, ok := parseNormalizedIP(r.RemoteAddr); ok {
		return ip
	}
	return r.RemoteAddr
}

func withClientIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := auth.WithClientIP(r.Context(), extractClientIP(r))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// NewMux builds the HTTP handler mounting static assets, Connect-RPC, and health probes.
func NewMux(staticDir string) *http.ServeMux {
	shellServer := mainframe.NewShellServer()

	api := http.NewServeMux()
	api.Handle(commandv1connect.NewShellHandler(shellServer))

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if db.DbConnection == nil || db.DbConnection.Root == nil {
			http.Error(w, "not ready", http.StatusServiceUnavailable)
			return
		}
		pingCtx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.DbConnection.Ping(pingCtx); err != nil {
			http.Error(w, "not ready", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ready\n"))
	})
	mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	mux.Handle("/grpc/", withClientIP(http.StripPrefix("/grpc", api)))
	return mux
}

// Run starts the HTTP server with graceful shutdown on SIGINT/SIGTERM.
func Run(port int) error {
	auth.InitJWT()
	mux := NewMux(StaticDir())

	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(port),
		Handler: mux,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Infof("Listening on :%d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		log.Infof("Received signal %v, shutting down gracefully", sig)
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}

// RunTest starts the server in test mode.
func RunTest(mockDbConnection *db.Connection) *httptest.Server {
	auth.InitJWT()
	db.DbConnection = mockDbConnection
	mux := NewMux(StaticDir())
	log.Println("Listening...")
	return httptest.NewServer(mux)
}

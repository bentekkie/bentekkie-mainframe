package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"os/signal"
	"strconv"
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
	mux.Handle("/grpc/", http.StripPrefix("/grpc", api))
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

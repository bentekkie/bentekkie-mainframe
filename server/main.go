package server

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/go-chi/chi"
	chiMiddleware "github.com/go-chi/chi/middleware"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/rs/cors"
	"golang.org/x/crypto/acme/autocert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var clientBuildDir, _ = filepath.Abs("client/build")

var prod, _ = getenvBool("PROD")

var ErrEnvVarEmpty = errors.New("getenv: environment variable empty")


func getenvStr(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return v, ErrEnvVarEmpty
	}
	return v, nil
}

func getenvBool(key string) (bool, error) {
	s, err := getenvStr(key)
	if err != nil {
		return false, err
	}
	v, err := strconv.ParseBool(s)
	if err != nil {
		return false, err
	}
	return v, nil
}


func Run() {
	if prod {

		dataDir := "."
		hostPolicy := func(ctx context.Context, host string) error {
			// Note: change to your real domain
			allowedHost := "bentekkie.com"
			if strings.HasSuffix(host,allowedHost){
				return nil
			}
			return fmt.Errorf("acme/autocert: only %s host is allowed", allowedHost)
		}


		grpcServer := grpc.NewServer()
		shellServer := mainframe.NewShellServer()
		pb.RegisterShellServer(grpcServer, shellServer)
		wrappedGrpc := grpcweb.WrapServer(grpcServer)
		rtr := mux.NewRouter()
		rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)
		rtr.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(clientBuildDir, "static")))))
		rtr.PathPrefix("/").Handler(http.FileServer(http.Dir(clientBuildDir)))
		log.Println("Listening...")
		m := &autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: hostPolicy,
			Cache:      autocert.DirCache(dataDir),
		}
		server := &http.Server{
			Addr:      ":8082",
			Handler:   rtr,
			TLSConfig: &tls.Config{
				GetCertificate: m.GetCertificate,
			},
		}
		go http.ListenAndServe(":5000", m.HTTPHandler(nil))

		log.Fatal(server.ListenAndServeTLS("", ""))
	} else {
		grpcServer := grpc.NewServer()
		shellServer := mainframe.NewShellServer()
		pb.RegisterShellServer(grpcServer, shellServer)

		wrappedGrpc := grpcweb.WrapServer(grpcServer)

		router := chi.NewRouter()
		router.Use(
			chiMiddleware.Logger,
			chiMiddleware.Recoverer,
			middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler,	// Must come before general CORS handling
			cors.New(cors.Options{
				AllowedOrigins: []string{"*"},
				AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
				AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", },
				ExposedHeaders:   []string{"Link"},
				AllowCredentials: true,
				MaxAge:           300, // Maximum value not ignored by any of major browsers
			}).Handler,
		)

		FileServer(router, "/", http.Dir(clientBuildDir))

		if err := http.ListenAndServe(":8082", router); err != nil {
			grpclog.Fatalf("failed starting http2 server: %v", err)
		}
	}
}


func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit URL parameters.")
	}

	fs := http.StripPrefix(path, http.FileServer(root))

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fs.ServeHTTP(w, r)
	}))
}

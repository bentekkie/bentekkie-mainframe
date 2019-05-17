package server

import (
	"context"
	"crypto/tls"
	"fmt"
	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"golang.org/x/crypto/acme/autocert"
	"google.golang.org/grpc"
	"log"
	"net/http"
	"path/filepath"
)

var clientBuildDir, _ = filepath.Abs("client/build")


func Run() {
	dataDir := "."
	hostPolicy := func(ctx context.Context, host string) error {
		// Note: change to your real domain
		allowedHost := "v2.bentekkie.com"
		if host == {
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
		Addr:      ":443",
		Handler:   rtr,
		TLSConfig: &tls.Config{
			GetCertificate: m.GetCertificate,
		},
	}
	go http.ListenAndServe(":5000", m.HTTPHandler(nil))

	log.Fatal(server.ListenAndServeTLS("", ""))
}

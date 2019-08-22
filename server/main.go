package server

import (
	"context"
	"crypto/tls"
	"fmt"
	"github.com/bentekkie/bentekkie-mainframe/server/env"
	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/gobuffalo/packr"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"golang.org/x/crypto/acme/autocert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
	"log"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
)

var prod, _ = env.GetEnvBool("PROD")


// Run starts server
func Run(port int) {
	fmt.Println(prod)
	box := packr.NewBox("../client/build")
	grpcServer := grpc.NewServer()
	shellServer := mainframe.NewShellServer()
	pb.RegisterShellServer(grpcServer, shellServer)
	wrappedGrpc := grpcweb.WrapServer(grpcServer)
	rtr := mux.NewRouter()
	rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)
	rtr.PathPrefix("/").Handler(http.FileServer(box))
	if prod {
		dataDir := "."
		hostPolicy := func(ctx context.Context, host string) error {
			allowedHost := "bentekkie.com"
			if strings.HasSuffix(host, allowedHost) {
				return nil
			}
			return fmt.Errorf("acme/autocert: only %s host is allowed", allowedHost)
		}
		log.Println("Listening...")
		m := &autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: hostPolicy,
			Cache:      autocert.DirCache(dataDir),
		}
		server := &http.Server{
			Addr:    ":"+strconv.Itoa(port),
			Handler: rtr,
			TLSConfig: &tls.Config{
				GetCertificate: m.GetCertificate,
			},
		}
		go http.ListenAndServe(":5000", m.HTTPHandler(nil))

		log.Fatal(server.ListenAndServeTLS("", ""))
	} else {
		log.Println("Listening...")
		if err := http.ListenAndServe(":"+strconv.Itoa(port),
			handlers.CORS(
				handlers.AllowedOrigins([]string{"*"}),
				handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}),
				handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}))(rtr)); err != nil {
			grpclog.Fatalf("failed starting http2 server: %v", err)
		}
	}
}

func RunTest() *httptest.Server {
	box := packr.NewBox("../client/build")
	grpcServer := grpc.NewServer()
	shellServer := mainframe.NewShellServer()
	pb.RegisterShellServer(grpcServer, shellServer)
	wrappedGrpc := grpcweb.WrapServer(grpcServer)
	rtr := mux.NewRouter()
	rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)
	rtr.PathPrefix("/").Handler(http.FileServer(box))
	return httptest.NewServer(handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}))(rtr))

}

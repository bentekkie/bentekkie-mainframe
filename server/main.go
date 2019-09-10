package server

import (
	"log"
	"net/http"
	"net/http/httptest"
	"strconv"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"

	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/gobuffalo/packr"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
)

// Run starts server
func Run(port int) {
	auth.InitJWT()
	box := packr.NewBox("../client/build")
	grpcServer := grpc.NewServer()
	shellServer := mainframe.NewShellServer()
	pb.RegisterShellServer(grpcServer, shellServer)
	wrappedGrpc := grpcweb.WrapServer(grpcServer)
	rtr := mux.NewRouter()
	rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)
	rtr.PathPrefix("/").Handler(http.FileServer(box))
	log.Println("Listening...")
	if err := http.ListenAndServe(":"+strconv.Itoa(port),
		handlers.CORS(
			handlers.AllowedOrigins([]string{"*"}),
			handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}),
			handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}))(rtr)); err != nil {
		grpclog.Fatalf("failed starting http2 server: %v", err)
	}

}

//RunTest server in test mode
func RunTest(mockDbConnection *db.Connection) *httptest.Server {
	auth.InitJWT()
	db.DbConnection = mockDbConnection
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

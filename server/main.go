package server

import (
	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
	"log"
	"net/http"
	"path/filepath"
)

var clientBuildDir, _ = filepath.Abs("client/build")

func Run() {
	grpcServer := grpc.NewServer()
	shellServer := mainframe.NewShellServer()
	pb.RegisterShellServer(grpcServer, shellServer)
	wrappedGrpc := grpcweb.WrapServer(grpcServer)
	rtr := mux.NewRouter()
	rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)
	rtr.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(clientBuildDir, "static")))))
	rtr.PathPrefix("/").Handler(http.FileServer(http.Dir(clientBuildDir)))
	log.Println("Listening...")
	corsObj := handlers.AllowedOrigins([]string{"*"})
	_ = http.ListenAndServe(":5000", handlers.CORS(corsObj)(rtr))
}

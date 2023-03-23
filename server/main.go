package server

import (
	"net/http"
	"net/http/httptest"
	"strconv"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"

	"encoding/json"

	"github.com/alecthomas/jsonschema"
	pb "github.com/bentekkie/bentekkie-mainframe/server/generated"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/bentekkie/bentekkie-mainframe/server/middleware"
	"github.com/gobuffalo/packr"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"
)

// Run starts server
func Run(port int) {
	auth.InitJWT()
	box := packr.NewBox("../clientnext/out")
	grpcServer := grpc.NewServer()
	shellServer := mainframe.NewShellServer()
	pb.RegisterShellServer(grpcServer, shellServer)
	wrappedGrpc := grpcweb.WrapServer(grpcServer, grpcweb.WithWebsockets(true))
	rtr := mux.NewRouter()
	rtr.Use(middleware.NewGrpcWebMiddleware(wrappedGrpc).Handler)

	rtr.PathPrefix("/").Handler(http.FileServer(box))
	reflector := jsonschema.Reflector{ExpandedStruct: true}
	schema := reflector.Reflect(&db.JSONRoot{})
	schema.AdditionalProperties = []byte("true")
	rtr.Use(overridePath("/dbschema", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(schema)
	}))
	log.Println("Listening...")
	if err := http.ListenAndServe(":"+strconv.Itoa(port),
		handlers.CORS(
			handlers.AllowedOrigins([]string{"*"}),
			handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"}),
			handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}))(rtr)); err != nil {
		grpclog.Fatalf("failed starting http2 server: %v", err)
	}

}

func overridePath(path string, override http.HandlerFunc) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.URL.Path {
			case path:
				override.ServeHTTP(w, r)
			default:
				next.ServeHTTP(w, r)
			}
		})
	}
}

//RunTest server in test mode
func RunTest(mockDbConnection *db.Connection) *httptest.Server {
	auth.InitJWT()
	db.DbConnection = mockDbConnection
	box := packr.NewBox("../clientnext/out")
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

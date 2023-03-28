package server

import (
	"net/http"
	"net/http/httptest"
	"strconv"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"

	"github.com/bentekkie/bentekkie-mainframe/proto/command/v1/commandv1connect"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	log "github.com/sirupsen/logrus"
)

// Run starts server
func Run(port int) {
	auth.InitJWT()
	shellServer := mainframe.NewShellServer()

	api := http.NewServeMux()
	api.Handle(commandv1connect.NewShellHandler(shellServer))

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("/out")))
	mux.Handle("/grpc/", http.StripPrefix("/grpc", api))
	http.ListenAndServe(":"+strconv.Itoa(port), mux)
	log.Println("Listening...")
}

// RunTest server in test mode
func RunTest(mockDbConnection *db.Connection) *httptest.Server {
	auth.InitJWT()
	db.DbConnection = mockDbConnection
	api := http.NewServeMux()
	shellServer := mainframe.NewShellServer()
	api.Handle(commandv1connect.NewShellHandler(shellServer))

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("/out")))
	mux.Handle("/grpc/", http.StripPrefix("/grpc", api))
	log.Println("Listening...")
	return httptest.NewServer(mux)
}

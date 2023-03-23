package server

import (
	"net/http"
	"net/http/httptest"
	"strconv"

	"github.com/bentekkie/bentekkie-mainframe/server/auth"
	"github.com/bentekkie/bentekkie-mainframe/server/db"

	"github.com/bentekkie/bentekkie-mainframe/server/generated/messages/messagesconnect"
	"github.com/bentekkie/bentekkie-mainframe/server/mainframe"
	"github.com/gobuffalo/packr"
	log "github.com/sirupsen/logrus"
)

// Run starts server
func Run(port int) {
	auth.InitJWT()
	box := packr.NewBox("../clientnext/out")
	shellServer := mainframe.NewShellServer()

	api := http.NewServeMux()
	api.Handle(messagesconnect.NewShellHandler(shellServer))

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(box))
	mux.Handle("/grpc/", http.StripPrefix("/grpc", api))
	http.ListenAndServe(":"+strconv.Itoa(port), mux)
	log.Println("Listening...")

}

// RunTest server in test mode
func RunTest(mockDbConnection *db.Connection) *httptest.Server {
	auth.InitJWT()
	db.DbConnection = mockDbConnection
	box := packr.NewBox("../clientnext/out")
	api := http.NewServeMux()
	shellServer := mainframe.NewShellServer()
	api.Handle(messagesconnect.NewShellHandler(shellServer))

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(box))
	mux.Handle("/grpc/", http.StripPrefix("/grpc", api))
	log.Println("Listening...")
	return httptest.NewServer(mux)
}

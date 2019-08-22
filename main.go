package main

import (
	"flag"
	"fmt"
	"github.com/bentekkie/bentekkie-mainframe/server"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	log "github.com/sirupsen/logrus"
	"io/ioutil"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	seedFlag := flag.String("seed","","File to seed database with")
	flag.Parse()
	log.SetReportCaller(true)
	var err error
	db.DbConnection, err = db.Connect("localhost",54320,"dbuser","password","data")
	if err != nil {
		fmt.Println(err)
	}
	if *seedFlag != "" {
		jsonFile, err := os.Open(*seedFlag)
		if err != nil {
			panic(err)
		}
		defer jsonFile.Close()
		byteValue, _ := ioutil.ReadAll(jsonFile)
		db.DbConnection.SeedDB(byteValue)
	}
	server.Run(8082)
}


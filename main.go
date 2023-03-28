package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/bentekkie/bentekkie-mainframe/server"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	"github.com/bentekkie/bentekkie-mainframe/server/env"
	log "github.com/sirupsen/logrus"

	"io/ioutil"

	"github.com/joho/godotenv"

	_ "github.com/lib/pq"
)

var ftar map[string][]byte

// init is invoked before main()
func init() {
	// loads values from .env into the system
	if err := godotenv.Load(); err != nil {
		log.Print("No .env file found")
	}
}

func main() {
	seedFlag := flag.String("seed", "", "File to seed database with")
	flag.Parse()
	log.SetReportCaller(true)
	var err error
	dbHost, err := env.GetEnvStr("POSTGRES_HOST")
	if err != nil {
		panic("POSTGRES_HOST not defined")
	}
	dbUser, err := env.GetEnvStr("POSTGRES_USER")
	if err != nil {
		panic("POSTGRES_USER not defined")
	}
	dbPassword, err := env.GetEnvStr("POSTGRES_PASSWORD")
	if err != nil {
		panic("POSTGRES_PASSWORD not defined")
	}
	dbName, err := env.GetEnvStr("POSTGRES_DB")
	if err != nil {
		panic("POSTGRES_DB not defined")
	}
	dbPort, err := env.GetEnvInt("POSTGRES_PORT")
	if err != nil {
		panic("POSTGRES_PORT not defined")
	}

	port, err := env.GetEnvInt("PORT")
	if err != nil {
		port = 8082
	}
	log.Debug("Starting")
	db.DbConnection, err = db.Connect(dbHost, dbPort, dbUser, dbPassword, dbName)
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
		db.DbConnection.SeedDB(byteValue, true)
	}
	log.Debug("Starting")
	files, err := ioutil.ReadDir("/out")
	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {
		log.Infof("%v, %v", file.Name(), file.IsDir())
	}
	server.Run(port)
}

// MapKeysToSlice extract keys of map as slice,
func MapKeysToSlice[K comparable, V any](m map[K]V) []K {
	keys := make([]K, len(m))

	i := 0
	for k := range m {
		keys[i] = k
		i++
	}
	return keys
}

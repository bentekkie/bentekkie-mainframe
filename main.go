package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"strconv"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/bentekkie/bentekkie-mainframe/server"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
	"github.com/bentekkie/bentekkie-mainframe/server/env"

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

func runHealthcheck(port int) error {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + strconv.Itoa(port) + "/readyz")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("readyz returned status %d", resp.StatusCode)
	}
	return nil
}

func main() {
	seedFlag := flag.String("seed", "", "File to seed database with")
	migrateOnlyFlag := flag.Bool("migrate-only", false, "Run pending database migrations and exit")
	healthcheckFlag := flag.Bool("healthcheck", false, "Probe local /readyz endpoint and exit 0 if healthy")
	flag.Parse()

	port, err := env.GetEnvInt("PORT")
	if err != nil {
		port = 8082
	}

	if *healthcheckFlag {
		if err := runHealthcheck(port); err != nil {
			fmt.Fprintf(os.Stderr, "healthcheck failed: %v\n", err)
			os.Exit(1)
		}
		return
	}

	log.SetReportCaller(true)
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

	log.Debug("Connecting to database and running migrations")
	ctx := context.Background()
	db.DbConnection, err = db.Connect(ctx, dbHost, dbPort, dbUser, dbPassword, dbName)
	if err != nil {
		log.WithError(err).Fatal("Failed to connect and migrate database")
	}
	defer db.DbConnection.Close()

	if *migrateOnlyFlag {
		log.Info("Database migrations complete")
		return
	}

	if *seedFlag != "" {
		jsonFile, err := os.Open(*seedFlag)
		if err != nil {
			log.WithError(err).Fatalf("Failed to open seed file %q", *seedFlag)
		}
		defer jsonFile.Close()
		byteValue, err := io.ReadAll(jsonFile)
		if err != nil {
			log.WithError(err).Fatalf("Failed to read seed file %q", *seedFlag)
		}
		if err := db.DbConnection.SeedDB(ctx, byteValue, true); err != nil {
			log.WithError(err).Fatalf("Failed to seed database from %q", *seedFlag)
		}
	}

	staticDir := server.StaticDir()
	files, err := os.ReadDir(staticDir)
	if err != nil {
		log.WithError(err).Fatalf("Failed to read static directory %q", staticDir)
	}

	for _, file := range files {
		log.Infof("%v, %v", file.Name(), file.IsDir())
	}
	if err := mime.AddExtensionType(".webmanifest", "application/manifest+json"); err != nil {
		log.Fatal(err)
	}
	if err := server.Run(port); err != nil {
		log.WithError(err).Fatal("Server exited with error")
	}
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

package main_test

import (
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/bentekkie/bentekkie-mainframe/server/db"
	"github.com/bentekkie/bentekkie-mainframe/server/env"
	"github.com/joho/godotenv"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/ory/dockertest/v3"
	"github.com/sclevine/agouti"
	log "github.com/sirupsen/logrus"
)

var pool, _ = dockertest.NewPool("")
var (
	agoutiDriver *agouti.WebDriver
)
var user, _ = env.GetEnvStr("POSTGRES_USER")
var password, _ = env.GetEnvStr("POSTGRES_PASSWORD")
var dbName, _ = env.GetEnvStr("POSTGRES_DB")
var testDB = db.JSONINode{
	Name: "",
	Folders: []db.JSONINode{
		db.JSONINode{
			Name: "testFolder",
			Files: []db.JSONFile{
				db.JSONFile{
					Name:     "testFile",
					Contents: "Hello World!",
				},
				db.JSONFile{
					Name:     "anotherFile",
					Contents: "Another File",
				},
			},
			Folders: []db.JSONINode{},
		},
	},
	Files: []db.JSONFile{
		db.JSONFile{
			Name:     ".init",
			Contents: "cat testFolder/testFile",
		},
	},
}

func TestBentekkieMainframe(t *testing.T) {
	if err := godotenv.Load(); err != nil {
		log.Print("No .env file found")
	}
	SetDefaultEventuallyTimeout(time.Second * 5)
	RegisterFailHandler(Fail)
	//startWebsite()
	RunSpecs(t, "BentekkieMainframe Suite")
	//websiteSession.Kill()
}

var _ = AfterSuite(func() {
	if agoutiDriver != nil {
		Expect(agoutiDriver.Stop()).To(Succeed())
	}
})

var _ = SynchronizedBeforeSuite(func() []byte {
	Expect(buildReact()).To(Succeed())
	return []byte{}
}, func(bytes []byte) {
	str := string(bytes)
	Expect(str).To(BeEmpty())
	agoutiDriver = agouti.ChromeDriver(agouti.ChromeOptions("args", []string{"--headless", "--disable-gpu", "--no-sandbox"}))
	Expect(agoutiDriver.Start()).To(Succeed())
})

func buildReact() error {
	cmd := exec.Command("yarn", "build")
	cmd.Dir = "client"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

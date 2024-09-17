package main_test

import (
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

var (
	pool, _      = dockertest.NewPool("")
	agoutiDriver *agouti.WebDriver
)

var (
	user, _     = env.GetEnvStr("POSTGRES_USER")
	password, _ = env.GetEnvStr("POSTGRES_PASSWORD")
	dbName, _   = env.GetEnvStr("POSTGRES_DB")
	testDB      = db.JSONINode{
		Name: "",
		Folders: []db.JSONINode{
			{
				Name: "testFolder",
				Files: []db.JSONFile{
					{
						Name:     "testFile",
						Contents: "Hello World!",
					},
					{
						Name:     "anotherFile",
						Contents: "Another File",
					},
				},
				Folders: []db.JSONINode{},
			},
		},
		Files: []db.JSONFile{
			{
				Name:     ".init",
				Contents: "cat testFolder/testFile",
			},
		},
	}
)

func TestBentekkieMainframe(t *testing.T) {
	if err := godotenv.Load(); err != nil {
		log.Print("No .env file found")
	}
	SetDefaultEventuallyTimeout(time.Second * 5)
	RegisterFailHandler(Fail)
	// startWebsite()
	RunSpecs(t, "BentekkieMainframe Suite")
	// websiteSession.Kill()
}

var _ = AfterSuite(func() {
	if agoutiDriver != nil {
		Expect(agoutiDriver.Stop()).To(Succeed())
	}
})

var _ = SynchronizedBeforeSuite(func() []byte {
	return []byte{}
}, func(bytes []byte) {
	str := string(bytes)
	Expect(str).To(BeEmpty())
	agoutiDriver = agouti.ChromeDriver(agouti.ChromeOptions("args", []string{"--headless", "--disable-gpu", "--no-sandbox"}))
	Expect(agoutiDriver.Start()).To(Succeed())
})

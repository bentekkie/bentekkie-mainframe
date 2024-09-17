package main_test

import (
	"context"
	"io/ioutil"
	"log"
	"net/http/httptest"
	"strconv"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/ory/dockertest/v3"
	"github.com/sclevine/agouti"
	. "github.com/sclevine/agouti/matchers"

	server2 "github.com/bentekkie/bentekkie-mainframe/server"
	"github.com/bentekkie/bentekkie-mainframe/server/db"
)

var (
	b, _      = ioutil.ReadFile("ascii_art.txt")
	ascii_art = "______            _                 _          _____                  _ _ _     \n| ___ \\          (_)               (_)        /  ___|                | | ( )\n| |_/ / ___ _ __  _  __ _ _ __ ___  _ _ __    \\ `--.  ___  __ _  __ _| | |/ ___ \n| ___ \\/ _ \\ '_ \\| |/ _` | '_ ` _ \\| | '_ \\    `--. \\/ _ \\/ _` |/ _` | | | / __|\n| |_/ /  __/ | | | | (_| | | | | | | | | | |  /\\__/ /  __/ (_| | (_| | | | \\__ \\\n\\____/ \\___|_| |_| |\\__,_|_| |_| |_|_|_| |_|  \\____/ \\___|\\__, |\\__,_|_|_| |___/\n                _/ |                                       __/ |                \n               |__/                                       |___/                 \n                        ______ \n                        | ___ \\\n                        | |_/ /___  ___ _   _ _ __ ___   ___ \n                        |    // _ \\/ __| | | | '_ ` _ \\ / _ \\\n                        | |\\ \\  __/\\__ \\ |_| | | | | | |  __/\n                        \\_| \\_\\___||___/\\__,_|_| |_| |_|\\___|"
)

var _ = Describe("PageOpen", func() {
	var (
		page     *agouti.Page
		server   *httptest.Server
		resource *dockertest.Resource
	)

	BeforeEach(func() {
		var err error
		resource, err = pool.Run("postgres", "latest", []string{"POSTGRES_USER=" + user, "POSTGRES_PASSWORD=" + password, "POSTGRES_DB=" + dbName})
		port, err := strconv.Atoi(resource.GetPort("5432/tcp"))
		conn, err := db.Connect(context.Background(), "localhost", port, user, password, dbName)
		conn.SeedDBForTest(context.Background(), testDB, true)
		server = server2.RunTest(conn)
		page, err = agoutiDriver.NewPage()
		Expect(err).NotTo(HaveOccurred())
	})

	It("Show welcome banner on page load", func() {
		By("opening page", func() {
			Expect(page.Navigate(server.URL)).To(Succeed())
			Eventually(page.FindByClass("Window_contentInner")).Should(BeFound())
		})
		By("Running Init script", func() {
			Eventually(page.Find("p")).Should(BeFound())
			actual, _ := page.Find("p").Text()
			Expect(actual).To(ContainSubstring("Hello World!"))
		})
	})

	AfterEach(func() {
		Expect(page.Destroy()).To(Succeed())
		server.Close()
		if err := pool.Purge(resource); err != nil {
			log.Fatalf("Could not purge resource: %s", err)
		}
	})
})

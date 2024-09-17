package main_test

import (
	"context"
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

var _ = Describe("Commands", func() {
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
		err = page.SetImplicitWait(5000)
		Expect(err).NotTo(HaveOccurred())
	})

	openPage := func() {
		Expect(page.Navigate(server.URL)).To(Succeed())
		Eventually(page.FindByClass("Window_contentInner")).Should(BeFound())
	}

	typeCommand := func(command string) func() {
		return func() {
			By("typing '"+command+"' command", func() {
				n, _ := page.All(".Window_contentInner > div").Count()
				Eventually(page.Find("input[type=text]")).Should(BeFound())
				Expect(page.Find("input[type=text]").SendKeys(command + "\uE007")).To(Succeed())
				Expect(page.Find("input[type=text]")).Should(HaveAttribute("value", ""))
				Eventually(page.All(".Window_contentInner > div"), "10s", "100ms").Should(HaveCount(n + 2))
				Expect(page.Find(".Window_contentInner > div:nth-last-child(2)").Text()).Should(ContainSubstring(command))
			})
		}
	}

	It("should show list of files for ls command", func() {
		By("opening page", openPage)
		By("typing ls command", typeCommand("ls"))
		Eventually(page.Find(".Window_contentInner > div:last-child > table").All("tr").All("td")).
			Should(BeFound())
	})

	It("should show file contents for cat command", func() {
		By("opening page", openPage)
		By("typing cat command", typeCommand("cat testFolder/anotherFile"))
		Eventually(page.Find(".Window_contentInner > div:last-child")).Should(BeFound())
		Expect(page.Find(".Window_contentInner > div:last-child").Text()).
			Should(ContainSubstring("Another File"))
	})

	It("should change prompt when changing directory with cd command", func() {
		By("opening page", openPage)
		Expect(page.FindByClass("CommandBar_submitText").Text()).ShouldNot(HaveSuffix("/testFolder>"))
		By("typing cd command", typeCommand("cd testFolder"))
		Eventually(page.Find(".Window_contentInner > div:last-child")).Should(BeFound())
		Expect(page.FindByClass("CommandBar_submitText").Text()).Should(HaveSuffix("/testFolder>"))
	})

	/* It("should show help with help command", func() {
		By("opening page", openPage)
		By("typing help command", typeCommand("help"))
		Eventually(page.Find(".Window_contentInner > p:last-child")).Should(BeFound())
		Expect(page.Find(".Window_contentInner > p:last-child").Text()).
			Should(ContainSubstring(
				"Available Commands are listed below, for help on a specific command type \"help [command]\""))
	}) */

	It("should clear the screen with clear command", func() {
		By("opening page", openPage)
		By("typing 'ls' command", typeCommand("ls"))
		By("typing 'clear' command", func() {
			Eventually(page.Find("input[type=text]")).Should(BeFound())
			Expect(page.Find("input[type=text]").SendKeys("clear" + "\uE007")).To(Succeed())
			Expect(page.Find("input[type=text]")).Should(HaveAttribute("value", ""))
		})
		Eventually(page.All(".Window_contentInner > div")).Should(HaveCount(0))
	})

	/* 	for _, command := range []string{"cat", "ls", "help", "cd"} {
		cmd := command
		It("should show help for "+cmd+" with help command", func() {
			By("opening page", openPage)
			By("typing help "+cmd+" command", typeCommand("help "+cmd))
			Eventually(page.Find(".Window_contentInner > p:last-child > table")).Should(BeFound())
			Expect(page.AllByXPath("//div[contains(@class,'Window_contentInner')]/p[last()]//tr")).Should(HaveCount(2))
			selection := page.AllByXPath("//div[contains(@class,'Window_contentInner')]/p[last()]//tr")
			Expect(selection.At(0).Find("td:first-child")).Should(HaveText("Usage"))
			Expect(selection.At(1).Find("td:first-child")).Should(HaveText("Purpose"))
		})
	} */

	AfterEach(func() {
		Expect(page.Destroy()).To(Succeed())
		server.Close()
		// You can't defer this because os.Exit doesn't care for defer
		if err := pool.Purge(resource); err != nil {
			log.Fatalf("Could not purge resource: %s", err)
		}
	})
})

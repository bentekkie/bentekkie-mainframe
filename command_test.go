package main_test

import (
	server2 "github.com/bentekkie/bentekkie-mainframe/server"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/sclevine/agouti"
	. "github.com/sclevine/agouti/matchers"
	"net/http/httptest"
)

var _ = Describe("Commands", func() {
	var (
		page *agouti.Page
		server *httptest.Server
	)

	BeforeEach(func() {
		var err error
		server = server2.RunTest()
		page, err = agoutiDriver.NewPage()
		Expect(err).NotTo(HaveOccurred())
		err = page.SetImplicitWait(5000)
		Expect(err).NotTo(HaveOccurred())
	})

	var openPage = func() {
		Expect(page.Navigate(server.URL)).To(Succeed())
		Eventually(page.FindByClass("Window_contentInner")).Should(BeFound())
	}

	var typeCommand = func(command string) func() {
		return func() {
			By("typing '"+command+"' command", func() {
				Eventually(page.Find("pre")).Should(BeFound())
				n, _ := page.All(".Window_contentInner > p").Count()
				Eventually(page.Find("input[type=text]")).Should(BeFound())
				Expect(page.Find("input[type=text]").SendKeys(command + "\uE007")).To(Succeed())
				Expect(page.Find("input[type=text]")).Should(HaveAttribute("value", ""))
				Eventually(page.All(".Window_contentInner > p"), "10s", "100ms").Should(HaveCount(n + 2))
				Expect(page.Find(".Window_contentInner > p:nth-last-child(2)").Text()).Should(ContainSubstring(command))
			})
		}
	}

	It("should show list of files for ls command", func() {
		By("opening page", openPage)
		By("typing ls command", typeCommand("ls"))
		Eventually(page.Find(".Window_contentInner > p:last-child > table").All("tr").All("td")).
			Should(BeFound())
	})

	It("should show file contents for cat command", func() {
		By("opening page", openPage)
		By("typing cat command", typeCommand("cat hello-world"))
		Eventually(page.Find(".Window_contentInner > p:last-child")).Should(BeFound())
		Expect(page.Find(".Window_contentInner > p:last-child").Text()).
			Should(ContainSubstring("Hello World!"))
	})

	It("should change prompt when changing directory with cd command", func() {
		By("opening page", openPage)
		Expect(page.FindByClass("CommandBar_submitText").Text()).ShouldNot(HaveSuffix("/projects>"))
		By("typing cd command", typeCommand("cd projects"))
		Eventually(page.Find(".Window_contentInner > p:last-child")).Should(BeFound())
		Expect(page.Find(".Window_contentInner > p:last-child").Text()).
			Should(ContainSubstring("Changed dir to B:/files/projects/"))
		Expect(page.FindByClass("CommandBar_submitText").Text()).Should(HaveSuffix("/projects>"))
	})

	It("should show help with help command", func() {
		By("opening page", openPage)
		By("typing help command", typeCommand("help"))
		Eventually(page.Find(".Window_contentInner > p:last-child")).Should(BeFound())
		Expect(page.Find(".Window_contentInner > p:last-child").Text()).
			Should(ContainSubstring(
				"Available Commands are listed below, for help on a specific command type \"help [command]\""))
	})

	It("should clear the screen with clear command", func() {
		By("opening page", openPage)
		By("typing help command", typeCommand("ls"))
		Eventually(page.All(".Window_contentInner > p")).Should(HaveCount(3))
		By("typing 'clear' command", func() {
			Eventually(page.Find("input[type=text]")).Should(BeFound())
			Expect(page.Find("input[type=text]").SendKeys("clear" + "\uE007")).To(Succeed())
			Expect(page.Find("input[type=text]")).Should(HaveAttribute("value", ""))
		})
		Eventually(page.Find(".Window_contentInner > p")).Should(HaveCount(1))
	})

	for _, command := range []string{"cat","ls","help","cd"} {
		cmd := command
		It("should show help for "+cmd+" with help command", func() {
			By("opening page", openPage)
			By("typing help " + cmd + " command", typeCommand("help "+ cmd))
			Eventually(page.Find(".Window_contentInner > p:last-child > table")).Should(BeFound())
			Expect(page.AllByXPath("//div[contains(@class,'Window_contentInner')]/p[last()]//tr")).Should(HaveCount(2))
			selection := page.AllByXPath("//div[contains(@class,'Window_contentInner')]/p[last()]//tr")
			Expect(selection.At(0).Find("td:first-child")).Should(HaveText("Usage"))
			Expect(selection.At(1).Find("td:first-child")).Should(HaveText("Purpose"))
		})
	}

	AfterEach(func() {
		Expect(page.Destroy()).To(Succeed())
		server.Close()
	})
})

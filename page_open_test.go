package main_test

import (
	"github.com/bentekkie/bentekkie-mainframe/server"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/sclevine/agouti"
	. "github.com/sclevine/agouti/matchers"
	"io/ioutil"
)

var b,_ = ioutil.ReadFile("ascii_art.txt")
var ascii_art = "______            _                 _          _____                  _ _ _     \n| ___ \\          (_)               (_)        /  ___|                | | ( )\n| |_/ / ___ _ __  _  __ _ _ __ ___  _ _ __    \\ `--.  ___  __ _  __ _| | |/ ___ \n| ___ \\/ _ \\ '_ \\| |/ _` | '_ ` _ \\| | '_ \\    `--. \\/ _ \\/ _` |/ _` | | | / __|\n| |_/ /  __/ | | | | (_| | | | | | | | | | |  /\\__/ /  __/ (_| | (_| | | | \\__ \\\n\\____/ \\___|_| |_| |\\__,_|_| |_| |_|_|_| |_|  \\____/ \\___|\\__, |\\__,_|_|_| |___/\n                _/ |                                       __/ |                \n               |__/                                       |___/                 \n                        ______ \n                        | ___ \\\n                        | |_/ /___  ___ _   _ _ __ ___   ___ \n                        |    // _ \\/ __| | | | '_ ` _ \\ / _ \\\n                        | |\\ \\  __/\\__ \\ |_| | | | | | |  __/\n                        \\_| \\_\\___||___/\\__,_|_| |_| |_|\\___|"


var _ = Describe("PageOpen", func() {
	var page *agouti.Page

	BeforeEach(func() {
		go server.Run()

		var err error
		page, err = agoutiDriver.NewPage()
		Expect(err).NotTo(HaveOccurred())
	})

	It("Show welcome banner on page load",func() {
		By("opening page", func () {
			Expect(page.Navigate("http://localhost:8082")).To(Succeed())
			Eventually(page.FindByClass("Window_contentInner")).Should(BeFound())
		})
		By("Displaying ascci art", func() {
			Eventually(page.Find("pre")).Should(BeFound())
			actual, _ := page.Find("pre").Text()
			Expect(actual).To(ContainSubstring(ascii_art))
		})
	})

	AfterEach(func() {
		Expect(page.Destroy()).To(Succeed())
	})
})

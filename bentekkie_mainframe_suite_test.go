package main_test

import (
	"github.com/onsi/gomega/gexec"
	"os/exec"
	"testing"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/sclevine/agouti"
)

var (
	agoutiDriver   *agouti.WebDriver
	websiteSession *gexec.Session
)

func TestBentekkieMainframe(t *testing.T) {
	RegisterFailHandler(Fail)
	//startWebsite()
	RunSpecs(t, "BentekkieMainframe Suite")
	//websiteSession.Kill()
}


var _ = BeforeSuite(func() {
	agoutiDriver = agouti.ChromeDriver()
	Expect(agoutiDriver.Start()).To(Succeed())
})

var _ = AfterSuite(func() {
	Expect(agoutiDriver.Stop()).To(Succeed())
})

func startWebsite() {
	command := exec.Command("go", "run", "main.go")
	Eventually(func() error {
		var err error
		websiteSession, err = gexec.Start(command, GinkgoWriter, GinkgoWriter)
		return err
	}).Should(Succeed())
}

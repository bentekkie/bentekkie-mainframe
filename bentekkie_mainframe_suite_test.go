package main_test

import (
	"os"
	"os/exec"
	"testing"
	"time"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/sclevine/agouti"
)

var (
	agoutiDriver   *agouti.WebDriver
)


func TestBentekkieMainframe(t *testing.T) {
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
	agoutiDriver = agouti.ChromeDriver(agouti.ChromeOptions("args", []string{"--headless", "--disable-gpu", "--no-sandbox"}),)
	Expect(agoutiDriver.Start()).To(Succeed())
})

func buildReact() error{
	cmd := exec.Command("yarn","build")
	cmd.Dir = "client"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

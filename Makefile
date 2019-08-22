server.o:
	echo building
	set GOOS=linux
	set GOARCH=amd64
	cd client && yarn build
	packr build
	go build -ldflags="-w -s" -o $@

clean:
	rm server.o
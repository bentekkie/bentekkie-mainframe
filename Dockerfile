FROM node:alpine AS clientBuilder
WORKDIR /
COPY client/package.json .
RUN npm install

COPY client/ .
RUN npm run build


############################
# STEP 1 build executable binary
############################
FROM golang:alpine AS builder
# Install git.
# Git is required for fetching the dependencies.
RUN apk update && apk add --no-cache git
WORKDIR $GOPATH/src/github.com/bentekkie/bentekkie-mainframe
# Fetch dependencies.
# Using go get.
ENV GO111MODULE=on

COPY go.mod .
COPY go.sum .

RUN go get -u github.com/gobuffalo/packr/packr

RUN go mod download

COPY --from=clientBuilder build client/build/
RUN ls client
COPY . .
# Build the binary.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 packr build -ldflags="-w -s" -o /go/bin/hello
RUN chmod +x /go/bin/hello
############################
# STEP 2 build a small image
############################
FROM scratch
# Copy our static executable.
COPY --from=builder /go/bin/hello /go/bin/hello
# Run the hello binary.
ENTRYPOINT ["/go/bin/hello"]
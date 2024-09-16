#!/bin/bash
export GOPACKAGESDRIVER_BAZEL=/home/bentekkie/go/bin/bazelisk
exec /home/bentekkie/go/bin/bazelisk run -- @rules_go//go/tools/gopackagesdriver "${@}"
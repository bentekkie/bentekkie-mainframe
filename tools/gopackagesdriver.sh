#!/bin/bash
export GOPACKAGESDRIVER_BAZEL=/home/bentekkie/go/bin/bazelisk
exec /home/bentekkie/go/bin/bazelisk run -- @io_bazel_rules_go//go/tools/gopackagesdriver "${@}"
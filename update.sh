#!/bin/bash

set -e
set -x

docker compose pull
docker compose up -d --remove-orphans
docker image prune -f

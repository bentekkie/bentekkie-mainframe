protoc --go_out=plugins=grpc:server/generated \
 --plugin=protoc-gen-ts=client/./node_modules/.bin/protoc-gen-ts \
 --js_out=import_style=commonjs,binary:client/src/generated \
 --ts_out=service=grpc-web:client/src/generated -I messages messages/*.proto
for filename in client/src/generated/*; do
    echo "/* eslint-disable */\n$(cat $filename)" > $filename
done
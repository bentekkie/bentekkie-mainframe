protoc --go_out=plugins=grpc:server/generated \
 --plugin=protoc-gen-ts=client/./node_modules/.bin/protoc-gen-ts \
 --js_out=import_style=commonjs,binary:clientnext/src/generated \
 --ts_out=service=grpc-web:clientnext/src/generated -I messages messages/*.proto
for filename in clientnext/src/generated/*; do
    echo "/* eslint-disable */\n$(cat $filename)" > $filename
done
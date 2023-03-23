protoc --go_out=server/generated --go-grpc_out=server/generated \
 --ts_out=service=grpc-web:clientnext/src/generated -I messages messages/*.proto
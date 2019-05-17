for /f %%i in ('dir /b messages\*.proto') do (
    protoc  --go_out=plugins=grpc:server\generated ^
            --plugin=protoc-gen-ts=client\node_modules\.bin\protoc-gen-ts.cmd ^
            --js_out=import_style=commonjs,binary:client2\src\generated ^
            --ts_out=service=true:client2\src\generated ^
             -I messages ^
             messages\%%i
)
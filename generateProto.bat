@echo off
setlocal EnableExtensions
for /f %%i in ('dir /b messages\*.proto') do (
    protoc  --go_out=plugins=grpc:server\generated ^
            --plugin=protoc-gen-ts=client\node_modules\.bin\protoc-gen-ts.cmd ^
            --js_out=import_style=commonjs,binary:client\src\generated ^
            --ts_out=service=true:client\src\generated ^
             -I messages ^
             messages\%%i
)
for /f %%i in ('dir /b client\src\generated\*.js') do (
    echo /* eslint-disable */ > tmp.txt
    type client\src\generated\%%i >> tmp.txt
    type tmp.txt > client\src\generated\%%i
    del tmp.txt
)
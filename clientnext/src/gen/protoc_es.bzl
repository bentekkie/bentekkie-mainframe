"""Rule to invoke protoc-gen-es using the resolved prebuilt protoc toolchain."""

def _protoc_es_impl(ctx):
    proto_toolchain = ctx.toolchains["@rules_proto//proto:toolchain_type"].proto
    protoc = proto_toolchain.proto_compiler
    plugin = ctx.attr.plugin[DefaultInfo].files_to_run
    out = ctx.outputs.out
    proto_file = ctx.file.proto_src
    wkt_files = ctx.files.well_known_type_protos
    wkt_include = wkt_files[0].dirname + "/../.."

    ctx.actions.run_shell(
        inputs = depset([proto_file] + wkt_files),
        outputs = [out],
        tools = [protoc, plugin],
        command = """
            set -euo pipefail
            export BAZEL_BINDIR="{bindir}"
            OUT_DIR="$(dirname "{out}")"
            "{protoc}" \
                -I "{wkt_include}" \
                -I . \
                --plugin=protoc-gen-es="{plugin}" \
                --es_out="$OUT_DIR" \
                --es_opt=target=ts \
                "{proto_src}"
            cp "$OUT_DIR/$(dirname "{proto_src}")/{out_name}" "{out}"
        """.format(
            bindir = ctx.bin_dir.path,
            out = out.path,
            out_name = out.basename,
            protoc = protoc.executable.path,
            wkt_include = wkt_include,
            plugin = plugin.executable.path,
            proto_src = proto_file.path,
        ),
        mnemonic = "ProtocGenEs",
        progress_message = "Generating TypeScript protobuf %s" % out.short_path,
    )
    return [DefaultInfo(files = depset([out]))]

protoc_es_gen = rule(
    implementation = _protoc_es_impl,
    attrs = {
        "proto_src": attr.label(
            allow_single_file = [".proto"],
            mandatory = True,
        ),
        "well_known_type_protos": attr.label_list(
            allow_files = [".proto"],
            default = ["@protobuf//:well_known_type_protos"],
        ),
        "plugin": attr.label(
            executable = True,
            cfg = "exec",
            mandatory = True,
        ),
        "out": attr.output(mandatory = True),
    },
    toolchains = ["@rules_proto//proto:toolchain_type"],
)

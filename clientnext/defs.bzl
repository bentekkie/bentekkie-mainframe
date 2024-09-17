load("@aspect_rules_js//js:defs.bzl", "js_run_binary", "js_run_devserver")
load("@rules_pkg//pkg:mappings.bzl", "strip_prefix")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")
load("@aspect_rules_ts//ts:defs.bzl", "ts_project")


def next_ts_project(
    name,
    **kwargs):
    ts_project(
        name = name,
        allow_js = False,
        declaration = True,
        incremental = True,
        preserve_jsx = True,
        tsconfig = "//clientnext:tsconfig",
        visibility = ["//clientnext:__subpackages__"],
        **kwargs,
    )   

def next(
        name,
        srcs,
        data,
        next_js_binary,
        next_bin,
        next_build_out = ".next",
        next_export_out = "out",
        visibility = None,
        **kwargs):
    """Generates Next.js targets build, dev & start targets.

    `{name}`       - a js_run_binary build target that runs `next build`
    `{name}_dev`   - a js_run_devserver binary target that runs `next dev`
    `{name}_start` - a js_run_devserver binary target that runs `next start`

    Use this macro in the BUILD file at the root of a next app where the `next.config.js` file is
    located.

    For example, a target such as

    ```
    load("//bazel:next.bzl", "next")

    next(
        name = "next",
        srcs = [
            "//apps/alpha/pages",
            "//apps/alpha/public",
            "//apps/alpha/styles",
        ],
        data = [
            "//:node_modules/next",
            "//:node_modules/react-dom",
            "//:node_modules/react",
            "//:node_modules/typescript",
            "next.config.js",
            "package.json",
        ],
        next_bin = "../../node_modules/.bin/next",
        next_js_binary = ":next_js_binary",
    )
    ```

    in an `apps/alpha/BUILD.bazel` file where the root `BUILD.bazel` file has
    next linked to `node_modules` and the `next_js_binary`:

    ```
    load("@npm//:defs.bzl", "npm_link_all_packages")
    load("@npm//:next/package_json.bzl", next_bin = "bin")

    npm_link_all_packages(name = "node_modules")

    next_bin.next_binary(
        name = "next_js_binary",
        visibility = ["//visibility:public"],
    )
    ```

    will create the targets:

    ```
    //apps/alpha:next
    //apps/alpha:next_dev
    //apps/alpha:next_start
    ```

    To build the above next app, equivalent to running
    `next build` outside Bazel, run,

    ```
    bazel build //apps/alpha:next
    ```

    To run the development server in watch mode with
    [ibazel](https://github.com/bazelbuild/bazel-watcher), equivalent to running
    `next dev` outside Bazel, run

    ```
    ibazel run //apps/alpha:next_dev
    ```

    To run the production server in watch mode with
    [ibazel](https://github.com/bazelbuild/bazel-watcher), equivalent to running
    `next start` outside Bazel,

    ```
    ibazel run //apps/alpha:next_start
    ```

    To export the above next app, equivalent to running
    `next export` outside Bazel, run,

    ```
    bazel build //apps/alpha:next_export
    ```

    Args:
        name: The name of the build target.

        srcs: Source files to include in build & dev targets.
            Typically these are source files or transpiled source files in Next.js source folders
            such as `pages`, `public` & `styles`.

        data: Data files to include in all targets.
            These are typically npm packages required for the build & configuration files such as
            package.json and next.config.js.

        next_js_binary: The next js_binary. Used for the `build `target.

            Typically this is a js_binary target created using `bin` loaded from the `package_json.bzl`
            file of the npm package.

            See main docstring above for example usage.

        next_bin: The next bin command. Used for the `dev` and `start` targets.

            Typically the path to the next entry point from the current package. For example `./node_modules/.bin/next`,
            if next is linked to the current package, or a relative path such as `../node_modules/.bin/next`, if next is
            linked in the parent package.

            See main docstring above for example usage.

        next_build_out: The `next build` output directory. Defaults to `.next` which is the Next.js default output directory for the `build` command.

        next_export_out: The `next export` output directory. Defaults to `out` which is the Next.js default output directory for the `export` command.

        visibility: visibility of targets

        **kwargs: Other attributes passed to all targets such as `tags`.
    """

    tags = kwargs.pop("tags", [])

    # `next build` creates an optimized bundle of the application
    # https://nextjs.org/docs/api-reference/cli#build
    js_run_binary(
        name = name,
        tool = next_js_binary,
        args = ["build"],
        srcs = srcs + data,
        out_dirs = [next_build_out],
        chdir = native.package_name(),
        tags = tags + ["manual"],
        visibility = visibility,
        **kwargs
    )

    # `next dev` runs the application in development mode
    # https://nextjs.org/docs/api-reference/cli#development
    js_run_devserver(
        name = "{}_dev".format(name),
        command = next_bin,
        args = ["dev"],
        data = srcs + data,
        chdir = native.package_name(),
        tags = tags,
        visibility = visibility,
        **kwargs
    )

    # `next start` runs the application in production mode
    # https://nextjs.org/docs/api-reference/cli#production
    js_run_devserver(
        name = "{}_start".format(name),
        command = next_bin,
        args = ["start"],
        data = data + [name],
        chdir = native.package_name(),
        tags = tags,
        visibility = visibility,
        **kwargs
    )

    # `next export` runs the application in production mode
    # https://nextjs.org/docs/api-reference/cli#production
    js_run_binary(
        name = "{}_export".format(name),
        tool = next_js_binary,
        args = ["build"],
        srcs = srcs + data,
        out_dirs = [next_export_out],
        chdir = native.package_name(),
        tags = tags + ["manual"],
        visibility = visibility,
        **kwargs
    )

    pkg_tar(
        name = "{}_export_tar".format(name),
        srcs = [":{}_export".format(name)],
        strip_prefix = strip_prefix.from_pkg(),
        visibility = visibility,
        out = "{}_export.tar".format(name)
    )
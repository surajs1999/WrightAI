const esbuild = require("esbuild");
const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: !isProduction,
  minify: isProduction,
};

if (isWatch) {
  /**
   * Enables watch mode on the esbuild context and logs a notification message to the console.
   *
   * This function activates the watch mode for the esbuild build context, which monitors source files for changes and triggers automatic rebuilds. A confirmation message is logged to indicate that the watch mode has been successfully initiated.
   *
   * @param {BuildContext} ctx - The esbuild build context object that provides the watch() method for enabling file watching.
   * @returns {void} This function does not return a value.
   * @example
   * const ctx = await esbuild.context(buildOptions);
   * watchPlugin(ctx);
   */
  /**
   * Enables watch mode for the esbuild context and logs a notification message to the console.
   *
   * This function activates the esbuild context's watch functionality, which monitors files for changes and triggers rebuilds automatically. After enabling watch mode, it outputs a confirmation message to the console indicating that the watcher is active.
   *
   * @param {BuildContext} ctx - The esbuild build context object that provides the watch method for enabling file watching.
   * @returns {void} This function does not return a value.
   * @example
   * const ctx = await esbuild.context(buildOptions);
   * ((ctx) => {
   *   ctx.watch();
   *   console.log("Watching for changes...");
   * })(ctx);
   */
  /**
   * Enables watch mode on the build context and logs a notification message to the console.
   *
   * This function is typically used as a plugin or callback in esbuild to activate file watching, allowing the build process to automatically rebuild when source files change.
   *
   * @param {Object} ctx - The esbuild plugin context object that provides the watch() method for enabling file watching.
   * @returns {void} This function does not return a value.
   * @example
   * const plugin = { name: 'watch-plugin', setup(build) { build.onEnd((ctx) => { ctx.watch(); console.log("Watching for changes..."); }); } };
   */
  /**
   * Enables file watching mode and logs a notification message to the console.
   *
   * This function activates the watch mode on the provided build context, which monitors source files for changes and triggers rebuilds automatically. It then outputs a confirmation message to indicate that file watching has been initiated.
   *
   * @param {BuildContext} ctx - The esbuild build context object that provides the watch() method for enabling file watching.
   * @returns {void} This function does not return a value.
   * @example
   * await esbuild.context(buildOptions).then((ctx) => { ctx.watch(); console.log("Watching for changes..."); })
   */
  /**
   * Enables watch mode on the build context and logs a notification message to the console.
   *
   * This function activates the watch mode for the esbuild context, which monitors source files for changes and automatically rebuilds when modifications are detected. It also outputs a console message to inform the user that watch mode is active.
   *
   * @param {BuildContext} ctx - The esbuild context object that provides the watch method for enabling file change monitoring.
   * @returns {void} This function does not return a value.
   * @example
   * const ctx = await esbuild.context(buildOptions);
   * watchPlugin(ctx);
   */
  /**
   * Enables file watching mode and logs a confirmation message to the console.
   *
   * This function is typically used as a plugin callback in esbuild to enable automatic rebuilding when source files change. It activates the watch mode through the context object and provides user feedback via console output.
   *
   * @param {Object} ctx - The esbuild plugin context object that provides the watch() method to enable file watching mode.
   * @returns {void} This function does not return a value.
   * @example
   * esbuild.context({ plugins: [{ name: 'watch-plugin', setup(build) { build.onEnd((ctx) => { ctx.watch(); console.log('Watching for changes...'); }); } }] });
   */
  esbuild.context(buildOptions).then((ctx) => {
    ctx.watch();
    console.log("Watching for changes...");
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log("Build complete.");
  }).catch(() => process.exit(1));
}

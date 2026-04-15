/*
* Build the card designer view in the /docs dir (Github Pages) using index.html as an entrypoint
* build this using Bun.build in the /docs dir
*/

Bun.build({
    entrypoints: ["views/designer/card/index.html"],
    outdir: "docs",
    minify: true,
    sourcemap: false,
    publicPath: "/",
})
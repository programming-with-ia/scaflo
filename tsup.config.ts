import { defineConfig } from "tsup";
import fs from "fs-extra";

const isDev = process.env.npm_lifecycle_event === "dev";

export default defineConfig({
    clean: true,
    entry: ["src/index.ts"],
    format: ["esm"],
    minify: !isDev,
    target: "esnext",
    outDir: "dist",
    // dts: true,
    plugins: [
        {
            name: "dts-copy-plugin",
            buildEnd(ctx) {
                fs.copyFileSync("src/types.ts", "dist/index.d.ts");
            },
        },
    ],
});

import fs from "fs-extra";
import path from "path";
import * as jsonc from "jsonc-parser";

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, "test");
const destDir = path.join(sourceDir, "dist");

/**
 * function to build test assets using synchronous methods.
 */
function buildTestAssetsSync() {
    try {
        console.log("🚀 Starting synchronous build process...");

        fs.ensureDirSync(destDir);
        console.log(`Ensured destination directory exists: '${destDir}'`);

        console.log("\nProcessing .jsonc files...");
        if (!fs.existsSync(sourceDir)) {
            console.error(
                `❌ Source directory not found at '${sourceDir}'. Exiting.`,
            );
            return;
        }
        const allFiles = fs.readdirSync(sourceDir);
        const jsoncFiles = allFiles.filter(
            (file) => path.extname(file) === ".jsonc",
        );

        if (jsoncFiles.length === 0) {
            console.warn(
                `⚠️ No .jsonc files were found directly in '${sourceDir}'.`,
            );
        } else {
            console.log(`Found ${jsoncFiles.length} .jsonc files to process.`);
            jsoncFiles.forEach((file) => {
                const sourcePath = path.join(sourceDir, file);
                const destFileName = `${path.basename(file, ".jsonc")}.json`;
                const destPath = path.join(destDir, destFileName);

                try {
                    const fileContent = fs.readFileSync(sourcePath, "utf-8");

                    const jsonObj = jsonc.parse(fileContent);

                    fs.writeJsonSync(destPath, jsonObj, { spaces: 2 });
                    console.log(
                        `✅ Transformed: ${file} -> dist/${destFileName}`,
                    );
                } catch (error) {
                    console.error(`❌ Error processing file '${file}':`, error);
                }
            });
        }

        console.log("\nProcessing schema.json...");
        const schemaSourcePath = path.join(sourceDir, "schema.json");
        const schemaDestPath = path.join(destDir, "schema.json");

        try {
            fs.copySync(schemaSourcePath, schemaDestPath);
            console.log(`✅ Copied: schema.json -> dist/schema.json`);
        } catch (error) {
            if (
                error instanceof Error &&
                "code" in error &&
                error.code === "ENOENT"
            ) {
                console.warn(
                    `⚠️ 'schema.json' not found in '${sourceDir}'. Skipping copy.`,
                );
            } else {
                console.error("❌ Error copying schema.json:", error);
            }
        }

        console.log("\n✨ Build complete!");
    } catch (error) {
        console.error(
            "An unexpected error occurred during the build process:",
            error,
        );
    }
}

buildTestAssetsSync();

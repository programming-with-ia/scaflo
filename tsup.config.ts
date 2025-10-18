import { defineConfig } from "tsup";
import fs from "fs-extra";

const isDev = process.env.npm_lifecycle_event === "dev";

function removeComments(
  sourceCode: string,
  options: { singleline?: boolean; multiline?: boolean } = {
    singleline: true,
    multiline: true,
  }
): string {
  let result = sourceCode;

  if (options.singleline) {
    result = result.replace(/\/\/.*/g, "");
  }

  if (options.multiline) {
    result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  return result;
}

function removeEmptyLines(sourceCode: string): string {
  return sourceCode
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");
}

function getAllTypeNames(sourceCode: string): string[] {
  const regex = /\ntype\s+([a-zA-Z0-9_]+)\s*=/g;
  const typeNames: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceCode)) !== null) {
    typeNames.push(match[1]);
  }

  return typeNames;
}

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
      name: "",
      buildEnd() {
        const srcFilePath = "src/types.ts";
        const destFilePath = "dist/index.d.ts";
        const sourceCode = fs.readFileSync(srcFilePath, "utf-8");

        const transformedCode = removeEmptyLines(
          // Remove comments
          removeComments(sourceCode, {
            singleline: true,
            multiline: true,
          })
        );

        // Write processed content to destination
        fs.writeFileSync(
          destFilePath,
          removeEmptyLines(
            transformedCode +
              `\n\nexport type { ${getAllTypeNames(transformedCode).join(", ")} }`
          ),
          "utf-8"
        );

        console.log(`✅ Processed and wrote file: ${destFilePath}`);
      },
    },
  ],
  onSuccess: isDev ? "node dist/index.js" : undefined,
});

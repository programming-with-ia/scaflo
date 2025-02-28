#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import ora from "ora";
// import chalk from "chalk";
import path from "path";
// import * as p from "@clack/prompts";
import { logger } from "./lib/logger";
import chalk from "chalk";
import { Consts, globals as G } from "./lib/globals";
import { sleep, withSpinner, isValidUrl } from "./lib/helpers";
import { prompts } from "./lib/prompts";
import { installDependencies } from "./lib/installDependencies";
import { handleFilePath } from "./lib/handlePath";
import { config } from "./lib/setting";
import { Fetch } from "./lib/fetch";

/*
 * later:
 * use default file name for local file paths
 * add <-ask-> in file replacement
 */

const RequiredNodeDependencies: NonNullable<JsonStructure["dependencies"]> = [];

const program = new Command();

program
  .version("1.0.0")
  .argument("<jsonPath>", "URL or local path of the JSON file")
  .option("-d, --dir <directory>", "Set working directory")
  .option("-f, --force", "Force overwrite files if they already exist") //! not implemented
  .option(
    "-e, --extend-path <extendPath>",
    "extend files path from current working dir"
  )
  .action(async (jsonPath: string, options: CliOptions) => {
    G.spinner = ora("Fetching JSON...").start();

    try {
      if (options.dir) {
        process.chdir(options.dir);
        logger.info(`Working directory: ${process.cwd()}`);
      }

      await processJson(jsonPath, options);
      //! this feature is not tested
      if (RequiredNodeDependencies && RequiredNodeDependencies.length) {
        await installDependencies(RequiredNodeDependencies);
      }
      G.spinner.succeed("Files added successfully!");
    } catch (error) {
      G.spinner.fail(chalk.red(`Error: ${(error as Error).message}`));
      throw error;
    }
  });

async function processJson(
  jsonPath: string,
  options: CliOptions
): Promise<void> {
  //
  // handle json local or remote file
  G.spinner.text = "Processing Json Data: " + jsonPath;
  logger.info(G.spinner.text);

  let jsonData: JsonStructure;
  if (isValidUrl(jsonPath)) {
    jsonData = await Fetch<JsonStructure>(jsonPath, "json");
  } else {
    jsonData = fs.readJsonSync(path.resolve(jsonPath));
  }

  //* handling array of files
  const hasFiles = Array.isArray(jsonData.files) && jsonData.files.length > 0;
  const hasGroupFiles =
    Array.isArray(jsonData.groups?.files) && jsonData.groups.files.length > 0;

  if (!hasFiles && !hasGroupFiles) {
    throw new Error("Invalid JSON structure: Missing files array");
  }

  const basePath = (
    options.extendPath
      ? await handleFilePath({
          name: options.extendPath,
          ignoreExist: true,
        })
      : ""
  ) as string;

  // process files list
  if (hasFiles) {
    for (const file of jsonData.files!) {
      await processFile({ file, options, basePath: basePath });
    }
  }

  if (hasGroupFiles) {
    // handle group.base
    if (!jsonData.groups?.base) {
      logger.warn("Invalid `data.groups.base`. Use `data.files` instead.");
    }

    let gBasePath = path.join(basePath, jsonData.groups?.base ?? "");

    if (jsonData.groups?.base && basePath != gBasePath) {
      gBasePath = (await handleFilePath({
        name: gBasePath,
        ignoreExist: true,
      })) as string;
    }

    // process group files
    for (const file of jsonData.groups?.files!) {
      await processFile({
        file,
        options,
        basePath: gBasePath,
        // extend: jsonData.groups?.base
      });
    }
  }

  //* handling dependencies
  if (jsonData.dependencies) {
    for (const dep of jsonData.dependencies) {
      if (
        typeof dep === "string" &&
        (isValidUrl(dep) || path.isAbsolute(dep))
      ) {
        await processJson(dep, options);
      } else {
        RequiredNodeDependencies.push(dep);
      }
    }
  }
}

async function processFile({
  file,
  options,
  basePath,
}: {
  file: FileType;
  options: CliOptions;
  basePath?: string;
}): Promise<void> {
  // logger.info(JSON.stringify(options));
  let filePath = file.name;

  let newFilePath = await handleFilePath({
    name: file.name,
    basePath,
    ignoreExist: file.method == "a",
  });

  if (Consts.isCodeRed(newFilePath)) {
    logger.warn(`✖ Skipped file: ${filePath}`);
    return;
  }

  let content = file.content;

  if (!/\n/.test(content) /* isInline */) {
    if (isValidUrl(content)) {
      content = await Fetch(content, "text");
    } else if (path.isAbsolute(content)) {
      content = fs.readFileSync(content, "utf-8");
    }
  }

  G.spinner.text = "writing file " + newFilePath;
  // await sleep(5000)
  if (typeof file.method === "object") {
    let existingContent = fs.readFileSync(newFilePath, "utf-8");
    for (const [key, value] of Object.entries(file.method)) {
      existingContent = existingContent.replace(new RegExp(key, "g"), value);
    }
    fs.writeFileSync(newFilePath, existingContent, "utf-8");
  } else {
    fs.ensureDirSync(path.dirname(newFilePath));
    const writeMethod =
      file.method === "a" ? fs.appendFileSync : fs.writeFileSync;
    writeMethod(newFilePath, content, "utf-8");
  }
  logger.success(`✔ File processed: ${newFilePath}`);
}

program
  .command("get <key>")
  .description("Retrieve the value associated with a given key")
  .action((key: keyof Settings) => {
    const value = config.get(key);
    if (value !== undefined) {
      console.log(`Value for "${key}": ${value}`);
    } else {
      console.log(`Key "${key}" not found.`);
    }
  });

program
  .command("set <key> <value>")
  .description(
    "Assign a value to a specific key (creates or updates the key-value pair)"
  )
  .action((key: keyof Settings, value: Settings[typeof key]) => {
    config.set(key, value, true);
    console.log(`Successfully set "${key}" to "${value}".`);
  });

program.parse();

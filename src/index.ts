#!/usr/bin/env node
import ora from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import { logger } from "./lib/logger";
import { Consts, globals as G } from "./lib/globals";
import { installDependencies } from "./lib/installDependencies";
import { config } from "./lib/setting";
import { sharedData } from "./lib/shared";
import { processJson } from "./processJson";
import type { CliOptions, JsonStructure, Settings } from "./types";

const program = new Command();

program
    .version("1.0.0")
    .argument("<jsonPath>", "URL or local path of the JSON file")
    .option("-d, --dir <directory>", "Set working directory")
    .option("-f, --force", "Force overwrite files if they already exist")
    .option(
        "-e, --extend-path <extendPath>",
        "extend files path from current working dir",
    )
    .action(async (jsonPath: string, options: CliOptions) => {
        G.spinner = ora("Fetching JSON...").start();

        try {
            if (options.dir) {
                process.chdir(options.dir);
                logger.info(`Working directory: ${process.cwd()}`);
            }

            sharedData.cliOptions = options;

            if (fs.pathExistsSync(Consts.storeFile)) {
                sharedData.storedData = fs.readJsonSync(
                    path.join(process.cwd(), Consts.storeFile),
                );
            }

            await processJson(jsonPath);

            if (Object.keys(sharedData.storedData).length > 0) {
                fs.writeJsonSync(
                    path.join(process.cwd(), Consts.storeFile),
                    sharedData.storedData,
                );
            }

            //! this feature is not fully tested for all package managers tested
            if (sharedData.nodeDependencies?.length) {
                logger.warn("not tested for all package managers yet");
                await installDependencies(sharedData.nodeDependencies);
            }
            if (sharedData.registryDependencies?.length) {
                //! install shadcn registry
                logger.error(
                    `Component installation feature is temporarily unavailable. \n- reason: Automatic installation unsupported. \n- action:Manual installation required. \n- components: ${sharedData.registryDependencies.join(", ")}`,
                );
            }
            G.spinner.succeed("Files added successfully!");
        } catch (error) {
            G.spinner.fail(chalk.red(`Error: ${(error as Error).message}`));
            throw error;
        }
    });

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
        "Assign a value to a specific key (creates or updates the key-value pair)",
    )
    .action((key: keyof Settings, value: Settings[typeof key]) => {
        config.set(key, value, true);
        console.log(`Successfully set "${key}" to "${value}".`);
    });

program.parse();

export type { JsonStructure };

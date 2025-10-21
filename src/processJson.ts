import fs from "fs-extra";
import path from "path";
import { logger } from "./lib/logger";
import { Consts, globals as G } from "./lib/globals";
import { isValidUrl } from "./lib/helpers";
import { handleFilePath } from "./lib/handlePath";
import { Fetch } from "./lib/fetch";
import { getValueFromSource, sharedData } from "./lib/shared";
import type { FileType, Job, JsonStructure } from "./types";
import { evaluateWhen } from "./lib/evaluateWhen";
import { prompts } from "./lib/prompts";
import { parseVar } from "./lib/match-vars";
import { setDeepValue } from "./lib/utils";

export async function processJson(jsonPath: string): Promise<void> {
    //
    // handle json local or remote file
    G.spinner.text = `Processing Json Data: ${jsonPath}`;
    logger.info(G.spinner.text);

    const { cliOptions } = sharedData;

    let jsonData: JsonStructure;
    if (isValidUrl(jsonPath)) {
        jsonData = await Fetch<JsonStructure>(jsonPath, "json");
    } else {
        jsonData = fs.readJsonSync(path.resolve(jsonPath));
    }

    const basePath = (
        cliOptions.extendPath
            ? await handleFilePath({
                  name: cliOptions.extendPath,
                  ignoreExist: true,
              })
            : ""
    ) as string;

    await processJobs({
        jobs: jsonData.jobs,
        basePath,
        definitions: jsonData.definitions,
    });

    //* handling dependencies
    if (jsonData.dependencies) {
        for (const dep of jsonData.dependencies) {
            if (
                typeof dep === "string" &&
                (isValidUrl(dep) || path.isAbsolute(dep)) &&
                !(dep in sharedData.jobResults) // ignore when already proceed this file
            ) {
                sharedData.jobResults[dep] = "";
                await processJson(dep);
            } else {
                sharedData.nodeDependencies.push(dep);
            }
        }
    }
    if (jsonData.registryDependencies) {
        sharedData.registryDependencies.push(...jsonData.registryDependencies);
    }
}

async function processJobs({
    jobs,
    basePath,
}: {
    jobs?: Job[];
    basePath: string;
    definitions?: JsonStructure["definitions"];
}) {
    if (!jobs) {
        return;
    }

    for (const job of jobs) {
        await processJob({ job, basePath });
    }
}

async function processJob({
    job,
    basePath,
    definitions,
}: {
    job: Job;
    basePath: string;
    definitions?: JsonStructure["definitions"];
}) {
    const { when, id, confirm } = job;

    if (
        (id && id in sharedData.jobResults) || // ignore same jobs, helpful when same job from multiple dependencies
        (when &&
            !evaluateWhen(when, {
                data: sharedData.jobResults,
                settings: sharedData.storedData,
            }))
    ) {
        return;
    }

    if (confirm) {
        let initialValue: boolean = true;
        let _confirm = confirm;

        if (_confirm.startsWith("!")) {
            _confirm = confirm.slice(1);
            initialValue = false;
        }
        const ans = await prompts.confirm({
            message: _confirm,
            initialValue: initialValue,
        });

        if (ans !== initialValue) {
            return;
        }
    }

    //
    if (!job.type || job.type === "file") {
        await processFile({ file: job, basePath });
        //
        // handle question
    } else if (job.type === "question") {
        //* sharedData.jobResults
        const { defaultValue, question, id, questionType } = job;
        let answer: symbol | boolean | string = "";

        console.log("");
        // if startswith @ and in sharedData.storedData
        // if startswith # and in sharedData.jobResults
        // if not startswith @ | # and in sharedData.jobResults

        let prefix: string = "#";
        let _id = id;
        if (id.startsWith("@") || id.startsWith("#")) {
            prefix = id.charAt(0);
            _id = id.slice(1);
        }

        if (
            getValueFromSource(
                _id,
                prefix === "#" ? "memory" : "store",
                undefined,
                false,
            ) !== undefined
        ) {
            return;
        }

        if (questionType === "ask") {
            answer = await prompts.text({
                message: question,
                defaultValue: defaultValue,
                placeholder: defaultValue
                    ? "default: " + defaultValue
                    : undefined,
            });
        } else if (questionType === "confirm") {
            answer = await prompts.confirm({
                message: question,
                initialValue: defaultValue === "true",
            });
        } else if (questionType === "options") {
            answer = await prompts.select({
                message: question,
                initialValue: defaultValue,
                options: Object.entries(job.options).map(([key, value]) => ({
                    label: value,
                    value: key,
                })),
            });
        } else {
            throw new Error(`Invalid question type '${questionType}'`);
        }

        //
        setDeepValue(
            prefix === "#" ? sharedData.jobResults : sharedData.storedData,
            _id,
            String(answer),
        );

        //
        // handle jobs group
    } else if (job.type === "group") {
        let _basePath = basePath;
        if (job.base) {
            _basePath = (await handleFilePath({
                name: path.join(_basePath, job.base),
                ignoreExist: true,
            })) as string;
        }
        await processJobs({ jobs: job.jobs, basePath: _basePath });
    } else if (job.type === "registryDependencies") {
        if (typeof job.registryDependencies === "string") {
            job.registryDependencies = [job.registryDependencies];
        }
        if (Array.isArray(job.registryDependencies)) {
            sharedData.registryDependencies.push(...job.registryDependencies);
        } else {
            throw new Error(
                `Invalid registryDependencies type: ${typeof job.registryDependencies}`,
            );
        }
        //
    } else if (job.type === "dependencies") {
        if (typeof job.dependencies === "string") {
            job.dependencies = [job.dependencies];
        }
        if (Array.isArray(job.dependencies)) {
            sharedData.nodeDependencies.push(...job.dependencies);
        } else {
            throw new Error(
                `Invalid dependencies type: ${typeof job.dependencies}`,
            );
        }
    } else if (
        job.type === "run" &&
        Object.keys(definitions ?? {}).includes(job.target)
    ) {
        await processJob({
            job: definitions![job.target] as Job,
            basePath,
            definitions,
        });
    } else if (job.type === "log") {
        logger[job.logLevel ?? "log"](job.message);
    } else {
        throw new Error(`Invalid job type '${job.type}'`);
    }

    if (id) {
        sharedData.jobResults[id] = sharedData.jobResults[id] ?? "";
    }
}

async function processFile({
    file,
    basePath,
}: {
    file: FileType;
    basePath?: string;
}): Promise<void> {
    const filePath = file.name;

    const { cliOptions } = sharedData;

    const newFilePath = await handleFilePath({
        name: file.name,
        basePath,
        ignoreExist:
            !!cliOptions.force ||
            file.method === "a" ||
            file.method === "replace",
    });

    if (Consts.isCodeRed(newFilePath)) {
        logger.warn(`✖ Skipped file: ${filePath}`);
        return;
    }

    if (file.method !== "replace" && !/\n/.test(file.content) /* isInline */) {
        if (isValidUrl(file.content)) {
            file.content = await Fetch(file.content, "text");
        } else if (
            path.isAbsolute(file.content) &&
            fs.pathExistsSync(file.content)
        ) {
            console.log(file.content);
            file.content = fs.readFileSync(file.content, "utf-8");
        }
    }

    G.spinner.text = `writing file ${newFilePath}`;
    if (file.method === "replace") {
        let existingContent = fs.readFileSync(newFilePath, "utf-8");
        for (let [key, value] of Object.entries(file.content)) {
            const parsedVar = parseVar(value);
            if (parsedVar.match) {
                value = String(
                    getValueFromSource(
                        parsedVar.varName,
                        parsedVar.varType,
                        value,
                    ),
                );
            }
            existingContent = existingContent.replace(
                new RegExp(key, "g"),
                value,
            );
        }
        fs.writeFileSync(newFilePath, existingContent, "utf-8");
    } else {
        fs.ensureDirSync(path.dirname(newFilePath));
        const writeMethod =
            file.method === "a" ? fs.appendFileSync : fs.writeFileSync;
        writeMethod(newFilePath, file.content, "utf-8");
    }
    logger.success(`✔ File processed: ${newFilePath}`);
}

import fs from "fs-extra";
import path from "path";

import { Consts } from "./globals";
import { prompts } from "./prompts";
import { parseAskCommand, parseVar } from "./match-vars";
import { getValueFromSource } from "./shared";

// return relative path
export async function handleFilePath({
    name,
    basePath,
    ignoreExist,
}: // options,
{
    name: string;
    basePath?: string; // simple path doesn't has any templates (%components%) and placeholders (<-ask->)
    ignoreExist?: boolean;
    // options: CliOptions;
    // extend?: string;
}): Promise<string | typeof Consts.CODE_RED> {
    function makeFullFilePath(fpath: string) {
        const srcExist =
            fs.pathExistsSync("src") && fs.statSync("src").isDirectory();
        const srcDir = srcExist ? "src" : "";

        const templatePaths = {
            "%SRC%": srcDir,
            "%COMPONENTS%": path.join(srcDir, "components"),
            "%HOOKS%": path.join(srcDir, "hooks"),
        };

        let fullFPath = path.join(basePath ?? "", fpath);

        for (const [placeholder, replacement] of Object.entries(
            templatePaths,
        )) {
            fullFPath = fullFPath.replace(
                new RegExp(`.*${placeholder}`, "gi"),
                replacement,
            ); // replace everything before and including the placeholder
        }

        return fullFPath;
    }

    let fullFilePath: string | typeof Consts.CODE_RED = makeFullFilePath(
        name || "<-ask->",
    ); // `<-ask->` only for first time if empty string;

    async function askForFileName(options?: {
        // return: fullFileName
        message?: string;
        defaultName?: string;
        placeholder?: string;
        base?: string;
        handler?: (value: string) => string | undefined;
    }) {
        const getFilePath = options?.base
            ? (fname: string) => path.join(options.base!, fname)
            : makeFullFilePath;

        const newFileName = (await prompts.text({
            message: options?.message ?? "Enter file name:",
            placeholder: options?.placeholder,
            defaultValue: options?.defaultName,
            validate: (input) => {
                let fname = input.trim() || options?.defaultName; // use default name. example: <-ask | default.tsx->

                if (!fname) return "File name cannot be empty";
                return options?.handler?.(getFilePath(fname));
                // return fs.pathExistsSync(getFilePath(fname)) //! ignore/remove this. path exists this because check it later and ask for rename or overwrite
                //   ? `⚠️ File/Folder '${fname}' already exists. Choose another name.`
                //   : undefined;
            },
        })) as string;

        return getFilePath(newFileName.trim());
    }

    //* handle <-ask-> template
    fullFilePath = await (async () => {
        const segments = fullFilePath.split(/[\\/]/);
        let resolvedPath = "";

        for (let i = 0; i < segments.length; i++) {
            let current = segments[i];
            const isLast = i === segments.length - 1;
            // const askTemplate = current.match(/^<-\s*ask\s*(?:\|\s*([^->]+))?\s*->$/);

            // const askTemplate = current.match(
            //     /^<-\s*ask\s*(?:\|\s*([a-zA-Z0-9._\- \[\]\(\)\{\}!@#$%^&+=,~]+))?\s*->$/,
            // );

            const parsedVar = parseVar(current);
            if (parsedVar.match) {
                current = getValueFromSource(
                    parsedVar.varName,
                    parsedVar.varType,
                    current,
                )!;
            }

            const _askTemplate = parseAskCommand(current);
            if (_askTemplate.match) {
                const defaultName = _askTemplate.default || "";

                //! no need this feature
                const templateValue = _askTemplate.varName
                    ? getValueFromSource(
                          _askTemplate.varName,
                          _askTemplate.varType!,
                      )
                    : undefined;

                if (templateValue) {
                    resolvedPath = path.join(resolvedPath, templateValue);
                } else {
                    resolvedPath = await askForFileName({
                        message: `Enter ${isLast && !ignoreExist ? "file" : "folder"} name.`, // If `ignoreExist` is `true`, assume it is a folder.
                        defaultName,
                        placeholder: `${resolvedPath}${path.sep}[${
                            defaultName || "placeholder"
                        }]`,
                        base: resolvedPath,
                    });
                }
            } else {
                resolvedPath = path.join(resolvedPath, current);
            }
        }

        return resolvedPath;
    })();

    if (!ignoreExist && fs.pathExistsSync(fullFilePath)) {
        const fileActionResult = await prompts.select<boolean | 2>({
            message: `File '${fullFilePath}' already exists. Do you want to overwrite it?`,
            options: [
                { value: 2, label: "Rename" },
                { value: true, label: "Yes" },
                { value: false, label: "No" },
            ],
        });

        if (fileActionResult === 2) {
            const dirPath = path.dirname(fullFilePath);

            const newFilePath = await askForFileName({
                message: "Enter new Filename",
                // placeholder: dirPath + path.sep + `[${path.basename(fullFilePath)}]`,
                base: dirPath,
                handler: (currentPath) =>
                    fs.pathExistsSync(currentPath)
                        ? currentPath +
                          " Already exists please enter other file name"
                        : undefined,
            });
            //+ add option newFilePath.endswith(--overwrite) to break loop
            fullFilePath = newFilePath;
        } else if (!fileActionResult) {
            fullFilePath = Consts.CODE_RED;
        }
    }

    return fullFilePath;
}

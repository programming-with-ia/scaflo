/**
 * Parses a variable tag string like `<@varName>` or `<#varName>`.
 * @param input The string to parse.
 * @returns A match object with `varName` and `varType` ('store' or 'memory').
 */
export function parseVar(
    input: string,
):
    | { match: true; varName: string; varType: "store" | "memory" }
    | { match: false; varName?: never; varType?: never } {
    const regex = /^<\s*([@#])\s*([\.a-zA-Z0-9_-]+)\s*>$/;
    const match = input.match(regex);

    if (match) {
        const typeChar = match[1]; // @ or #
        const varName = match[2];
        const varType = typeChar === "@" ? "store" : "memory";

        return {
            match: true,
            varName,
            varType,
        };
    }

    return { match: false };
}

/**
 * Parses an 'ask' command, extracting an optional default value and a variable tag.
 * Example: `<-ask | defaultValue | <@varName>->`
 * @param commandString The command string to parse.
 * @returns A match object with the parsed data.
 */
export function parseAskCommand(commandString: string): {
    match: boolean;
    default?: string;
    varName?: string;
    varType?: "memory" | "store";
} {
    const askRegex =
        /^<-\s*ask\s*(?:\|\s*([^|<>]+))?\s*(?:\|\s*(<[\#\@][a-zA-Z0-9._\-]+>))?\s*->$/;

    const mainMatch = commandString.match(askRegex);

    if (!mainMatch) {
        return { match: false };
    }

    const defaultVal = mainMatch[1] ? mainMatch[1].trim() : undefined;
    const varTagString = mainMatch[2];

    let varName: string | undefined;
    let varType: "memory" | "store" | undefined;

    if (varTagString) {
        const varMatch = parseVar(varTagString);
        if (varMatch.match) {
            varName = varMatch.varName;
            varType = varMatch.varType;
        }
    }

    return {
        match: true,
        default: defaultVal,
        varName,
        varType,
    };
}

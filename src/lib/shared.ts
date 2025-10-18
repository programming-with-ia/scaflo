import type { CliOptions, JsonStructure } from "../types";
import { logger } from "./logger";
import { getDeepValue } from "./utils";

export const sharedData: {
    nodeDependencies: NonNullable<JsonStructure["dependencies"]>;
    registryDependencies: NonNullable<JsonStructure["dependencies"]>;
    cliOptions: CliOptions;
    // Done for simple jobs like dependencies done, file done
    jobResults: Record<string, string>;
    storedData: Record<string, string>;
} = {
    nodeDependencies: [],
    registryDependencies: [],
    cliOptions: {},
    jobResults: {},
    storedData: {},
};

export function getValueFromSource(
    key: string,
    varType: "store" | "memory",
    defaultValue?: string,
    warn?: boolean,
): string | undefined {
    const value =
        varType === "store"
            ? getDeepValue(sharedData.storedData, key)
            : getDeepValue(sharedData.jobResults, key);

    if (warn && value === undefined) {
        logger.warn(`value not found for variable: '${key}'`);
    }
    return (value as string | undefined) ?? defaultValue;
}

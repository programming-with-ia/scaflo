import type { RequireAtLeastOne, SetOptional, SetRequired } from "type-fest";

/**
 * Represents a file operation. It's a discriminated union based on the `method`.
 */
type FileType = {
    /**
     * The path of the file relative to a base directory.
     */
    name: string;
} & (
    | {
          /**
           * Defines the available methods for writing to a file.
           * - 'a': Append to the file.
           * - 'w': Write to the file, overwriting existing content (default).
           */
          method?: "w" | "a";
          /**
           * The content to write to the file. Can be a string, a URL to fetch content from,
           * or an absolute path to another file to read content from.
           */
          content: string;
      }
    | {
          /**
           * Specifies that the operation is to replace content within the file.
           */
          method: "replace";
          /**
           * A map of key-value pairs for replacement.
           * Each key is the string to be replaced, and its value is the new string.
           * Example: `{ "oldValue": "newValue" }`
           */
          content: Record<string, string>;
      }
);

/**
 * Defines the structure for a user prompt (question).
 * It's a discriminated union based on the `questionType`.
 */
type Questions = {
    /** The question to display to the user. */
    question: string;
    /** A default value for the prompt. */
    defaultValue?: string;
} & (
    | {
          /**
           * - 'ask': A simple text input prompt.
           * - 'confirm': A yes/no prompt.
           */
          questionType: "ask" | "confirm";
      }
    | {
          /**
           * An options prompt (e.g., a select list).
           */
          questionType: "options";
          /**
           * A map of options to display. The key is the value to be used,
           * and the value is the label shown to the user.
           * Example: `{ "react": "React.js" }`
           */
          options: Record<string, string>;
      }
);

/**
 * A generic wrapper type that adds common job properties to a specific job configuration.
 * @template T - The specific configuration object for the job (e.g., Questions, FileType).
 * @template Type - A string literal representing the job's type.
 */
type ForJob<
    T extends Record<string, unknown>,
    Type extends
        | "question"
        | "group"
        | "file"
        | "registryDependencies"
        | "dependencies",
> = T & {
    /**
     * A unique identifier for the job. Used for referencing in `when` conditions.
     *
     * Examples:
     * - `setting.theme`
     * - `setting.theme-color`
     * - `setting.ThemeColor`
     * - `#ThemeColor` helpful for questions job to save value in memory
     * - `@ThemeColor` helpful for questions job to save value in store file (and use on next time)
     */
    id?: string;
    /**
     * A conditional expression that determines if the job should run.
     * The expression can reference the outcomes of other jobs using their IDs.
     *
     * Examples:
     * - `!#job1`: Run if job1 was not successful.
     * - `#job1 == 'some-value'`: Run if the result of job1 is 'some-value'.
     * - `#job1 && #job2=='failure'`: Run if job1 was successful AND job2 failed.
     * - `!(#job1 || #job2)`: Run if neither job1 nor job2 was successful.
     */
    when?: string;
    /**
     * The type of the job.
     */
    type: Type;

    /**
     * If provided, the job requires confirmation.
     * Standard logic: **'yes' runs the job**.
     * Prefixing with '!' inverts the logic: **'no' runs the job**.
     *
     * Example:
     * - 'Are you sure?' -> Requires 'yes'
     * - '!Are you sure?' -> Requires 'no'
     */
    confirm?: string;
};

/**
 * Represents a single executable task or a collection of tasks (a job).
 * This is a union of all possible job types.
 */
type Job =
    /** A job that prompts the user with a question. The `id` is required to store and reference the answer. */
    | SetRequired<ForJob<Questions, "question">, "id">
    /** A job that contains a nested group of other jobs. */
    | ForJob<JobsGroup, "group">
    /** A job to install dependencies from a UI registry (e.g., shadcn/ui). Requires a `when` condition. */
    | SetRequired<
          ForJob<
              { registryDependencies: string[] | string },
              "registryDependencies"
          >,
          "when"
      >
    /** A job to install npm packages. Requires a `when` condition. */
    | SetRequired<
          ForJob<{ dependencies: string[] | string }, "dependencies">,
          "when"
      >
    /**
     * A job to perform a file operation.
     * The `type` property is optional and defaults to 'file'.
     */
    | SetOptional<ForJob<FileType, "file">, "type">;

/**
 * Defines a group of jobs that can be executed together.
 */
type JobsGroup = {
    /** An array of jobs to execute. */
    jobs: Job[];
    /** An optional base path for file operations within this group. */
    base?: string;
};

/**
 * The root structure of the entire configuration JSON file.
 */
type JsonStructure = {
    /** The name of the scaffold. */
    name?: string;
    /** A user-friendly title for the scaffold. */
    title?: string;
    /** The version of the scaffold. */
    version?: string;
    /** A brief description of what the scaffold does. */
    description?: string;
    /** A list of registry dependencies (e.g., for shadcn/ui) to be installed. */
    registryDependencies?: string[];
    /**
     * A list of Node.js dependencies to be installed.
     */
    dependencies?: string[];
    /**
     * An array of Jobs.
     * Job: Represents a single executable task or a collection of tasks (a job).
     */
    jobs?: Job[];
};
// & RequireAtLeastOne<{ files?: FileType[]; jobs?: Job[] }, "files" | "jobs">;

/**
 * Defines the shape of command-line options.
 */
type CliOptions = {
    /** If true, overwrite existing files without prompting. */
    force?: boolean;
    /** An additional path segment to extend the output directory. */
    extendPath?: string;
    /** The target directory for the scaffolding operation. */
    dir?: string;
};

/**
 * Defines user-specific settings.
 */
type Settings = {
    /** A GitHub personal access token, used for operations requiring API authentication. */
    githubToken: string;
};

export type { FileType, JsonStructure, CliOptions, Settings, Job };

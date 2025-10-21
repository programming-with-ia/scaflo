import type {
    RequireAtLeastOne,
    SetOptional,
    SetRequired,
    Except,
} from "type-fest";

/**
 * Describes a file manipulation operation. This is a discriminated union
 * based on the `method` property, which determines whether to write, append,
 * or replace content.
 */
type FileType = {
    /**
     * The path of the file, relative to the project or a `base` directory.
     * @example "src/components/Button.tsx"
     */
    name: string;
} & (
    | {
          /**
           * The method for writing to the file.
           * - `w` (default): Write to the file, overwriting any existing content.
           * - `a`: Append content to the end of the file.
           */
          method?: "w" | "a";
          /**
           * The content to write or append. This can be:
           * 1. A raw string.
           * 2. A URL to fetch content from.
           * 3. An absolute path to a local file to read content from.
           */
          content: string;
      }
    | {
          /**
           * Specifies a search-and-replace operation within the file.
           */
          method: "replace";
          /**
           * A key-value map where each key is a string to be replaced by its
           * corresponding value. Values can also be dynamic variables that
           * reference answers from question jobs, using `<#id>` or `<@id>` syntax.
           * @example { "%%THEME_COLOR%%": "<#themeColor>", "%%API_URL%%": "<@apiUrl>" }
           */
          content: Record<string, string>;
      }
);

/**
 * Defines the structure for a user prompt. This is a discriminated union
 * based on the `questionType`.
 */
type Questions = {
    /** The question text displayed to the user. */
    question: string;
    /** An optional default value for the prompt. */
    defaultValue?: string;
} & (
    | {
          /**
           * The type of prompt to display.
           * - `ask`: A simple text input prompt.
           * - `confirm`: A yes/no prompt, returns a boolean.
           */
          questionType: "ask" | "confirm";
      }
    | {
          /**
           * A multiple-choice prompt.
           */
          questionType: "options";
          /**
           * A map of options to display. The key is the value returned,
           * and the value is the label shown to the user.
           * @example { "react": "React.js", "vue": "Vue.js" }
           */
          options: Record<string, string>;
      }
);

/**
 * A generic wrapper that adds shared properties to a job configuration.
 * @template T The specific configuration object for the job.
 * @template Type A string literal representing the job's type.
 */
type ForJob<
    T extends Record<string, unknown>,
    Type extends
        | "question"
        | "group"
        | "file"
        | "registryDependencies"
        | "dependencies"
        | "run"
        | "log",
> = T & {
    /**
     * A unique identifier for the job. It's used to reference the job's
     * result or state in `when` conditions.
     *
     * ---
     *
     * **For `question` jobs specifically**, the prefix determines storage behavior:
     * - `#id`: The answer is stored in memory for the current session.
     * - `@id`: The answer is persisted to a store file for future runs.
     * - `id`: A standard identifier with no special storage behavior.
     *
     * For all other job types, the prefixes have no special meaning.
     *
     * @example "setting.theme", "#isProUser", "@userEmail"
     */
    id?: string;
    /**
     * A conditional expression that determines if the job should execute. It supports two forms:
     *
     * **1. Existence Check:**
     * Checks only if a job has run (i.e., its result is `defined`). This is **not** a "truthy" check.
     * - `#id` or `@id`: Condition is met if the job with this ID has a defined result.
     * - `!#id` or `!@id`: Condition is met if the job has *not* run (its result is `undefined`).
     *
     * **2. JavaScript-like Expression:**
     * A full expression for complex value comparisons.
     * **Note**: Use the loose equality operators (`==`, `!=`) in the string;
     * they will be executed as strict equality checks (`===`, `!==`) at runtime.
     *
     * @example "#useTypescript" // Run if the 'useTypescript' job was executed.
     * @example "!#skipAdvanced" // Run if the 'skipAdvanced' job was NOT executed.
     * @example "#framework == 'react'" // Runs if the 'framework' result is strictly equal to 'react'.
     */
    when?: string;
    /**
     * The type of the job.
     */
    type: Type;

    /**
     * A confirmation prompt to show before executing the job.
     * - **Default**: Job runs if the user answers 'yes'.
     * - **Inverted**: If the string starts with `!`, the job runs if the user answers 'no'.
     *
     * @example "Are you sure you want to install this?"
     * @example "!Skip advanced setup?"
     */
    confirm?: string;
};

/**
 * Represents a single executable task (a "job") within the scaffold process.
 * This is a union of all possible job types.
 */
type Job =
    /** Prompts the user for input. An `id` is required to store and reference the answer. If a stored value with the same ID exists, the question is skipped. */
    | SetRequired<ForJob<Questions, "question">, "id">
    /** A container for a nested sequence of jobs. */
    | ForJob<JobsGroup, "group">
    /** Installs dependencies from a UI component registry (e.g., shadcn/ui). A `when` condition is required. */
    | SetRequired<
          ForJob<
              { registryDependencies: string[] | string },
              "registryDependencies"
          >,
          "when"
      >
    /** Installs npm packages. A `when` condition is required. */
    | SetRequired<
          ForJob<{ dependencies: string[] | string }, "dependencies">,
          "when"
      >
    /** Performs a file operation (write, append, or replace). The `type` property defaults to 'file'. */
    | SetOptional<ForJob<FileType, "file">, "type">
    /** Execute a job from the `definitions` map */
    | ForJob<{ target: string }, "run">
    /** Displays a custom message in the terminal. */
    | ForJob<
          {
              logLevel?: "error" | "warn" | "info" | "success" | "log"; // default: "log"
              message: string;
          },
          "log"
      >;

/**
 * Defines a group of jobs that can be executed together, often sharing a
 * common context like a base path.
 */
type JobsGroup = {
    /** An array of `Job` objects to be executed sequentially. */
    jobs: Job[];
    /** An optional base path that prefixes all file paths within this group. */
    base?: string;
};

/**
 * Defines the root structure for a scaffold configuration file.
 */
type JsonStructure = {
    /** The internal name of the scaffold. */
    name?: string;
    /** A user-friendly title for the scaffold. */
    title?: string;
    /** The semantic version of the scaffold. */
    version?: string;
    /** A brief summary of what the scaffold does. */
    description?: string;
    /** A list of UI registry dependencies (e.g., from shadcn/ui) to be installed. */
    registryDependencies?: string[];
    /**
     * A list of npm packages to be installed.
     */
    dependencies?: string[];
    /**
     * The primary array of jobs to be executed by the scaffolder.
     */
    jobs?: Job[];

    /**
     * A collection of reusable job definitions that can be referenced.
     */
    definitions?: Record<string, Except<Job, "when">>;
};

/**
 * Defines the shape of command-line interface (CLI) options.
 */
type CliOptions = {
    /** If true, overwrite existing files without prompting. @default false */
    force?: boolean;
    /** An additional path segment to append to the output directory. */
    extendPath?: string;
    /** The target directory for the scaffolding operation. */
    dir?: string;
};

/**
 * Defines user-specific settings, typically from a global configuration file.
 */
type Settings = {
    /** A GitHub personal access token, used for operations requiring API authentication. */
    githubToken: string;
};

export type { FileType, JsonStructure, CliOptions, Settings, Job };

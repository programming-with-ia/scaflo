# Scaflo 🏗️

[](https://www.google.com/search?q=https://www.npmjs.com/package/scaflo)

**Scaflo** is a powerful, job-based CLI tool for automating project scaffolding. Define a series of tasks in a single JSON file—creating files, asking questions, installing dependencies, and more. Scaflo executes them sequentially with support for **conditional logic**, **user prompts**, and **persistent state** to create highly adaptable templates.

It works seamlessly with both local and remote JSON configurations, making it perfect for personal boilerplates and enforcing team-wide standards.

-----

## ✨ Core Features

  - **Job-Based System**: Every action is a "job"—create a file, ask a question, install a package, or group other jobs.
  - [**Conditional Logic**](#conditional-logic-when): Use powerful [`when`](#conditional-logic-when) clauses to run jobs only when specific conditions are met, based on user answers or previous outcomes.
  - **Interactive Prompts**: Engage with the user through text inputs, confirmations (`y/n`), or a list of options.
  - **State Management**: Save user answers in-memory for the current session (`#id`) or persistently across runs (`@id`).
  - [**Dynamic Paths & Content**](#dynamic-file-paths): Use stored answers as variables in file paths, file content, and conditional checks.
  - **Dependency Management**: Install npm packages and UI library components (e.g., shadcn/ui) as part of your scaffold.
  - **Remote & Local Sources**: Fetch your scaffold configuration from a URL or a local file path.
  - **GitHub Auth**: Natively supports a GitHub token to fetch configurations from private repositories.

-----

## 💻 Installation

Install Scaflo globally to use the `scaflo` command anywhere:

```bash
npm install -g scaflo
```

Or run it directly without a global installation using `npx`:

```bash
npx scaflo@latest <jsonPath>
```

-----

## 🚀 Usage

### **Basic Command**

```bash
scaflo <source> [options]
```

  - `<source>`: The path to a local `.json` file or a URL to a remote one.

### **CLI Options**

| Option          | Short | Description                                          |
| --------------- | ----- | ---------------------------------------------------- |
| `--dir`         | `-d`  | Set the working directory for the scaffold.          |
| `--force`       | `-f`  | Overwrite existing files without prompting.          |
| `--extend-path` | `-e`  | Adds a prefix to the `name` property of all file jobs. |

-----

## 📄 The `scaflo.json` Structure

The power of Scaflo comes from its JSON structure. At its core, it's a list of **jobs** to be executed in order.

### **Root Properties**

| Property             | Type       | Description                                                 |
| -------------------- | ---------- | ----------------------------------------------------------- |
| `name`               | `string`   | The name of the scaffold.                                   |
| `description`        | `string`   | A brief description of what the scaffold does.              |
| `dependencies`       | `string[]` | A list of npm packages to install at the start.             |
| `registryDependencies` | `string[]` | A list of registry components (e.g., shadcn/ui) to install. |
| `jobs`               | `Job[]`    | The array of jobs to execute sequentially. This is the heart of Scaflo. |
| `definitions`        | `Record<string, Except<Job, "when">>`    | A collection of reusable job definitions that can be referenced. ([see `run`](#run) below) |

### **The Job Object**

Every object in the `jobs` array is a **Job**. All jobs share these common properties:

| Property  | Type     | Description                                                                                                        |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `type`    | `string` | The type of job. Can be `file`, `question`, `group`, `dependencies`, or `registryDependencies`.                    |
| `id`      | `string` | A unique identifier for the job, used in [`when` conditions](#conditional-logic-when). [**Required for `question` jobs.**](#question) |
| [`when`](#conditional-logic-when)    | `string` | A conditional expression. The job only runs if this condition is met.                                              |
| `confirm` | `string` | A yes/no question to ask before running the job. Answering 'yes' proceeds. Prefix with `!` to run on a 'no' answer. |

-----

## ⚙️ Job Types

### **`file`**

The `file` job (the default type if `type` is omitted) creates, appends to, or modifies files.

```json
{
  "name": "src/components/<#componentName>.tsx",
  "content": "export const Button = () => <button>Click Me</button>;",
  "method": "w"
}
```

  - `name`: The path to the file. This path is **dynamic** and can include variables and placeholders (see "[Dynamic File Paths](#dynamic-file-paths)" below).
  - `content`: The content for the file. Can be **inline text**, a **URL**, or an **absolute path** to another local file.
  - `method`:
      - `"w"` (default): **Write** to the file, overwriting it if it exists.
      - `"a"`: **Append** content to the end of the file.
      - `"replace"`: **Replace** content within the file. The `content` property must be an object where keys are search strings and values are their replacements. **Replacement values can also be variables**.

### **`question`**

Prompts the user for input and stores the answer for later use. **A unique `id` is required.**

```json
{
  "type": "question",
  "id": "@project.linter",
  "questionType": "confirm",
  "question": "Do you want to use ESLint?",
  "defaultValue": true
}
```

  - `id`: The key used to store the answer.
      - **Prefixes** determine storage: `#myVar` for session memory, `@myVar` for persistent storage.
      - **Dot notation** (e.g., `project.linter`) creates nested objects in the stored state, which can be accessed in [`when` conditions](#conditional-logic-when).
  - `questionType`:
      - `"ask"`: Simple text input.
      - `"confirm"`: A `true`/`false` (yes/no) question.
      - `"options"`: Presents a list of choices. Requires an `options` object: `{ "value": "Label" }`.

### **`log`**

Displays a message to the console during execution. This is useful for providing status updates, warnings, or instructions to the user.

```json
{
  "jobs": [
    {
      "type": "question",
      "id": "#projectName",
      "question": "What is your project's name?",
      "defaultValue": "my-awesome-project"
    },
    {
      "type": "log",
      "logLevel": "info",
      "message": "Starting setup..."
    },
    // ... other jobs ...
    {
      "type": "log",
      "logLevel": "success",
      "message": "✅ Project has been successfully created!"
    }
  ]
}
```

  - `message`: The string to display in the console.
  - `logLevel`: (Optional) The style of the log. Can be `info`, `warn`, `error`, `success`, or `log` (default).

### **`dependencies` & `registryDependencies`**

Installs packages. These jobs are most powerful when combined with a [`when` condition](#conditional-logic-when).

```json
{
  "type": "dependencies",
  "when": "@project.linter == true",
  "dependencies": ["eslint", "prettier"]
}
```

### **`group`**

A special job that contains a nested `jobs` array and an optional `base` path. It's perfect for running a batch of related jobs under a single [`when` condition](#conditional-logic-when).

```json
{
  "type": "group",
  "when": "#useTypescript == true",
  "base": "src/",
  "jobs": [
    { "name": "../tsconfig.json", "content": "{}" },
    { "name": "index.ts", "content": "// TS entry file" }
  ]
}
```

### **`run`**

Executes a reusable job from the top-level `definitions` map. This allows you to define a piece of logic once and run it from multiple places, keeping your configuration clean and easy to manage.

```json
{
  "definitions": {
    "createUseMouseHook": {
      "type": "file",
      "name": "src/hooks/useMouse.ts",
      "content": "export const useMouse = () => {\n  \\ ...\n};"
    }
  },
  "jobs": [
    {
      "type": "run",
      "target": "createUseMouseHook", // run `createUseMouseHook` job from `definitions`.
    }
  ]
}
```
  - `target`: The key of the job to execute from the definitions object.


-----

## 🧠 Advanced Concepts

### **Conditional Logic (`when`)**

A `when` expression determines if a job should run. It can access any stored variable, including **nested values** using dot notation (e.g., `#project.linter`).

1.  **Existence Check**: Checks if a job has run (i.e., its result is `defined`), **not** whether the value is "truthy".

      - `"#useAuth"`: Runs if the `useAuth` job was executed.
      - `"!#useAuth"`: Runs if the `useAuth` job was **skipped**.

2.  **Value Comparison**: Compares a job's result to a specific value.

      - **Note**: Use loose equality operators (`==`, `!=`) in the JSON. Scaflo's engine will execute them as **strict** (`===`, `!==`) comparisons at runtime.
      - `"#framework == 'react'"`: Runs if the `framework` result is strictly `'react'`.
      - `"@project.linter == true"`: Runs if the nested `linter` value is the boolean `true`.

### **Dynamic File Paths**

The `name` property of a `file` job is highly dynamic. You can construct paths using a combination of:

  - **Variables**: Inject answers from questions.
      - `"name": "src/components/<#componentName>/index.tsx"`
  - **Ask Placeholders**: Prompt the user directly for a path segment.
      - `<-ask->`: Prompts the user (e.g., `src/<-ask->/index.js`).
      - `<-ask|defaultName->`: Prompts with a default value.
  - **Directory Shortcuts**: Use special keywords that resolve to common paths.
      - `%SRC%`, `%COMPONENTS%` (e.g., `src`, `src/components`).

-----

## 💡 Examples

### **1. Conditional File Creation**

Ask if they want TypeScript and only create `tsconfig.json` if they say yes.

```json
{
  "jobs": [
    {
      "type": "question",
      "questionType": "confirm",
      "id": "@project.useTypescript",
      "question": "Use TypeScript?",
      "defaultValue": true
    },
    {
      // This job only runs if the answer is `true`.
      "name": "tsconfig.json",
      "content": "{\n  \"compilerOptions\": {}\n}",
      "when": "@project.useTypescript == true"
    }
  ]
}
```

### **2. Dynamic Component Scaffolding**

Ask for a component name and use it to generate a file with the correct name and content.

```json
{
  "jobs": [
    {
      "type": "question",
      "questionType": "ask",
      "id": "#componentName",
      "question": "What is the name of your component?",
      "defaultValue": "Button"
    },
    {
      // Step 1: Create a file with a dynamic path and placeholder content.
      "name": "src/components/<#componentName>.tsx",
      "content": "export const %%COMPONENT_NAME%% = () => <></>;"
    },
    {
      // Step 2: Replace the placeholder with the stored variable.
      "name": "src/components/<#componentName>.tsx",
      "method": "replace",
      "content": {
        "%%COMPONENT_NAME%%": "<#componentName>"
      }
    }
  ]
}
```

-----

## 🔒 Configuration & Authentication

Scaflo can store a GitHub personal access token to fetch configurations from private repositories.

### **Set a Value**

```bash
# Set your GitHub token
scaflo set githubToken ghp_abcdef123456
```

### **Get a Value**

```bash
# View the currently stored token
scaflo get githubToken
```

-----

## 🤝 Contributing

Contributions are welcome\! Please feel free to open an issue or submit a pull request on [GitHub](https://github.com/programming-with-ia/scaflo).

## 📄 License

This project is licensed under the MIT License.
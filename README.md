# Scaflo 🏗️

**Scaflo** is a flexible CLI tool for scaffolding project files from structured JSON files, supporting both local and remote JSON sources. It simplifies setting up project files, managing templates, and automating file creation with customizable content.

## Features ✨

- 🗂️ Supports **remote (URL)** and **local JSON files**.
- 📝 Create, append, or modify files based on predefined JSON templates.
- 📂 Supports **grouped files with base directories**.
- 🔄 Automatic handling of **nested dependencies** (other JSON files).
- ✅ File overwrite, rename, and append options.
- 🔐 Supports **GitHub token authentication** 
  - (for fetching files from private repositories)
  - (⚡Recommended for all tasks).
- 📁 Supports dynamic placeholders like `%SRC%`, `%COMPONENTS%`, and user prompts [`<-ask->`](#).

---

## Installation 💻

```bash
npm install -g scaflo
```

Direct use

---

## Usage 🚀

### Basic Command

```bash
scaflo <jsonPath>
```

without global installation

```bash
pnpm dlx scaflo@latest <jsonPath>
```

- `<jsonPath>` - URL or local path to the JSON file defining your files and templates.

### Options

| Option     | Short | Description |
|------------|-------|-------------|
| `--dir`     | `-d`  | Set working directory before processing files |
| `--force`   | `-f`  | Force overwrite files without prompt |
| `--extend-path` | `-e`  | Extend file paths from a base directory |

Example:

```bash
scaflo https://example.com/template.json --dir my-project --extend-path src/components
```

---

## JSON Structure 📄

The JSON file should follow this schema:

```jsonc
{
  "files": [
    {
      "name": "example.txt",
      "content": "https://example.com/example.txt",
      "method": "w"
    }
  ],
  "groups": {
    "base": "components",
    "files": [
      {
        "name": "Button.tsx",
        "content": "./templates/Button.tsx"
      }
    ]
  },
  "dependencies": [
    "axios",
    "https://example.com/another-template.json"
  ]
}
```

### File Methods

- `"w"`: Write (default).
- `"a"`: Append.
- Object: Key-value pair for replacing content in existing files.
- File content can be:
    - Inline text.
    - URL (remote).
    - Absolute path (local).

---

## Dynamic Placeholders 🧰

You can use special placeholders in file paths:

| Placeholder   | Description |
|---------------|-------------|
| `%SRC%`         | Replaced with `src` directory if it exists |
| `%COMPONENTS%`  | Points to `src/components` |
| `<-ask->` or `<-ask\|withDefaultName->`  | in file or folder names, prompting the user to enter names dynamically. |

Example:

```json
{
  "files": [
    {
      "name": "<-ask->",
      "content": "https://example.com/example.txt",
    },
    {
      "name": "<-ask | defaultName.ts->",
      "content": "https://example.com/example.txt",
    },
    {
      "name": "<-ask|components->/button.tsx",
      "content": "https://example.com/example.txt",
    },
    {
      "name": "%components%/<-ask|button->.tsx",
      "content": "https://example.com/example.txt",
    },
  ],
}
```

---

## Commands ⚙️

- `set` Config Value
  - Example: `scaflo set githubToken ghp_abcdef123456`

- `get` Config Value
  - scaflo get githubToken

**✅ valid properties**

```js
// key: value-type
{ githubToken: string }
  ```

---

## Example Workflow 📚

```bash
scaflo https://raw.githubusercontent.com/your-repo/template.json -d my-project
```

- This fetches `template.json`, processes the files inside, and places them in `my-project`.
- If files already exist, you can choose to overwrite, rename, or skip.
- Prompts appear if any filenames use `<-ask->`.


## Authentication 🔐

To access private GitHub files (e.g., raw URLs from private repos), set your GitHub token:

```bash
scaflo set githubToken <your_personal_access_token>
```

---

## Future Plans 🛠️

- [ ] Support partial file updates with `<-ask->` in file content.
- [ ] Enhanced support for nested templates and complex dependency trees.

---

## See Also

[vDocs Hooks](https://programming-with-ia.github.io/vDocs/hooks/). [scaflos](https://github.com/programming-with-ia/vDocs/tree/scaflos)

## License 📄

MIT License.

## Contributing 🤝

Contributions are welcome! Feel free to open issues or pull requests on [GitHub](https://github.com/programming-with-ia/scaflo).

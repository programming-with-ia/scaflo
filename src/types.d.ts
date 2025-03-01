type FileWriteMethods = "a" | "w" | Record<string, string>; // Append, Write (default), or Replace key-value

type FileType = {
  name: string;
  // id?: string; // used as file name. that used to replace some thing in file content when name like <-ask->

  /**
   * File Content
   * file url
   * file absolute path
   */
  content: string;
  method?: FileWriteMethods;
};

interface JsonStructure {
  /**
   * A list of Node.js dependencies, which can be:
   * - A string representing a package name.
   * - A record where the key is the package name and the value is its version.
   * - URLs pointing to other nested JSON files (both local and remote).
   *
   * ⚠️ Only absolute paths are supported for local files.
   */
  dependencies?: Array<string | Record<string, string>>;
  files?: FileType[];
  groups?: { base: string; files: FileType[] };
}

interface CliOptions {
  force?: boolean;
  extendPath?: string;
  dir?: string;
}

type Settings = { githubToken: string };

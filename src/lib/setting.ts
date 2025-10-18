import os from "os";
import path from "path";
import fs from "fs-extra";
import type { Settings } from "../types";

class ConfigManager<T extends Record<string, unknown>, Config = Partial<T>> {
  private configPath: string;
  private config: Config;

  constructor(relativePath: string) {
    // Extend the provided path with os.homedir()
    this.configPath = path.join(os.homedir(), relativePath);
    this.ensureDirectoryExists();
    this.config = this.load();
  }

  private ensureDirectoryExists() {
    const dir = path.dirname(this.configPath);
    fs.ensureDirSync(dir);
  }

  private load(): Config {
    if (fs.existsSync(this.configPath)) {
      return fs.readJsonSync(this.configPath);
    }
    return {} as Config; // Return empty object if config file doesn't exist
  }

  get<K extends keyof Config>(
    key: K,
    default_: Config[typeof key] | undefined = undefined
  ): Config[K] | undefined {
    return this.config[key] ?? default_;
  }

  set(key: keyof Config, value: Config[typeof key], save: boolean = false) {
    this.config[key] = value;
    if (save) {
      this.save();
    }
  }

  save() {
    fs.writeJsonSync(this.configPath, this.config, { spaces: 0 });
  }
}

export const config = new ConfigManager<Settings>(".scaflo-config");

import chalk from "chalk";
import * as p from "@clack/prompts";
import { withSpinner } from "./helpers";

export const logger = {
  error: withSpinner((...args: unknown[]) => {
    p.log.error(chalk.red(...args));
  }),
  warn: withSpinner((...args: unknown[]) => {
    p.log.warn(chalk.yellow(...args));
  }),
  info: withSpinner((...args: unknown[]) => {
    p.log.info(chalk.cyan(...args));
  }),
  success: withSpinner((...args: unknown[]) => {
    p.log.success(chalk.green(...args));
  }),
  log: withSpinner((...args: unknown[]) => {
    console.log(...args);
  }),
};

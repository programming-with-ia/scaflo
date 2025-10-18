import * as p from "@clack/prompts";
import { withSpinner } from "./helpers";
import { logger } from "./logger";

export function withHandleCancel<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await fn(...args);
    if (p.isCancel(result)) {
      logger.error("\n✖ Operation canceled by user.");
      process.exit(1);
    }
    return result;
  }) as T;
}

export const prompts = {
  select: withSpinner(withHandleCancel(p.select)) as typeof p.select,
  text: withSpinner(withHandleCancel(p.text)),
  confirm: withSpinner(withHandleCancel(p.confirm)),
};

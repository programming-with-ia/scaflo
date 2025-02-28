import { globals as G } from "./globals";

export function withSpinner<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const spinning = G.spinner.isSpinning;
    const t = G.spinner.text;

    if (spinning) {
      G.spinner.stop();
    }

    let result;
    try {
      result = fn(...args);
      if (result instanceof Promise) {
        return result.finally(() => {
          if (spinning) {
            G.spinner.start(t);
          }
        }) as ReturnType<T>;
      }
      return result;
    } finally {
      if (!(result instanceof Promise) && spinning) {
        G.spinner.start(t);
      }
    }
  }) as T;
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isValidUrl = (str: string) =>
  /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(str);

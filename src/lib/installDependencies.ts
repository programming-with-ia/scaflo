import { execa, type StdinOption } from "execa";
import { logger } from "./logger";
import { type PackageManager, getUserPkgManager } from "./getUserPkgManager";
import { globals as G } from "./globals";
import { prompts } from "./prompts";
import { JsonStructure } from "../types";

/**
 * Runs the install command with appropriate package manager handling.
 */
export const installDependencies = async (
  packages: NonNullable<JsonStructure["dependencies"]>
) => {
  const pkgManager = getUserPkgManager();
  // Convert input into an array of package install strings

  if (packages.length === 0) {
    logger.log("No packages to install.");
    return null;
  }

  if (
    !(await prompts.confirm({
      message: `Are you sure to install pacakges: ${packages.join(" ")}`,
      initialValue: true,
    }))
  ) {
    return;
  }

  switch (pkgManager) {
    case "npm":
      await execa(pkgManager, ["install", ...packageList], {
        cwd: process.cwd(),
        stderr: "inherit",
      });
      return null;

    case "pnpm":
      return execWithSpinner(pkgManager, {
        args: ["add", ...packageList],
        onDataHandle: () => (data) => {
          const text = data.toString();
          if (text.includes("Progress")) {
            logger.log(text.includes("|") ? text.split(" | ")[1] ?? "" : text);
          }
        },
      });

    case "yarn":
      return execWithSpinner(pkgManager, {
        args: ["add", ...packageList],
        onDataHandle: () => (data) => {
          logger.log(data.toString());
        },
      });

    case "bun":
      return execWithSpinner(pkgManager, {
        args: ["add", ...packageList],
        stdout: "ignore",
      });
  }
};

/**
 * Executes command with Ora spinner.
 */
const execWithSpinner = async (
  pkgManager: PackageManager,
  options: {
    args?: string[];
    stdout?: "pipe" | "ignore" | "inherit";
    onDataHandle?: () => (data: Buffer) => void;
  }
) => {
  const { onDataHandle, args, stdout = "pipe" } = options;

  G.spinner.text = `Running ${pkgManager} install <deps>...`;
  logger.info(G.spinner.text);

  const subprocess = execa(pkgManager, args, { cwd: process.cwd(), stdout });

  await new Promise<void>((res, rej) => {
    if (onDataHandle) {
      subprocess.stdout?.on("data", onDataHandle());
    }

    subprocess.on("error", (e) => {
      logger.error(e.message);
      G.spinner.fail(`Error: ${e.message}`);
      rej(e);
    });

    subprocess.on("close", () => {
      logger.success(`✅ complete dependencies installation`);
      res();
    });
  });
};

import { execa, type StdinOption } from "execa";
import { logger } from "./logger";
import { type PackageManager, getUserPkgManager } from "./getUserPkgManager";
import { globals as G } from "./globals";

/**
 * Runs the install command with appropriate package manager handling.
 */
export const installDependencies = async (
  packages: NonNullable<JsonStructure["dependencies"]>
) => {
  const pkgManager = getUserPkgManager();
  // Convert input into an array of package install strings
  const packageList = packages.flatMap((pkg) =>
    typeof pkg === "string"
      ? pkg
      : Object.entries(pkg).map(([name, version]) => `${name}@${version}`)
  );

  if (packageList.length === 0) {
    logger.log("No packages to install.");
    return null;
  }

  switch (pkgManager) {
    case "npm":
      await execa(pkgManager, ["install", ...packageList], {
        cwd: process.cwd(),
        stderr: "inherit",
      });
      return null;

    case "pnpm":
      return execWithSpinner(pkgManager, packageList, {
        onDataHandle: () => (data) => {
          const text = data.toString();
          if (text.includes("Progress")) {
            logger.log(text.includes("|") ? text.split(" | ")[1] ?? "" : text);
          }
        },
      });

    case "yarn":
      return execWithSpinner(pkgManager, packageList, {
        onDataHandle: () => (data) => {
          logger.log(data.toString());
        },
      });

    case "bun":
      return execWithSpinner(pkgManager, packageList, {
        stdout: "ignore",
      });
  }
};

/**
 * Executes command with Ora spinner.
 */
const execWithSpinner = async (
  pkgManager: PackageManager,
  packages: string[],
  options: {
    args?: string[];
    stdout?: "pipe" | "ignore" | "inherit";
    onDataHandle?: () => (data: Buffer) => void;
  }
) => {
  const {
    onDataHandle,
    args = ["add", ...packages],
    stdout = "pipe",
  } = options;

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

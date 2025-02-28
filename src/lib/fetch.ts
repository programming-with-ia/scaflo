import { globals as G } from "./globals";
import { logger } from "./logger";
import { config } from "./setting";

/* fetch with Github auth */
export async function Fetch<T>(
  url: string,
  as: "text" | "json" = "text"
): Promise<T> {
  const token = config.get("githubToken");
  const headers: Record<string, string> = {};

  if (url.startsWith("https://raw.githubusercontent.com") && token) {
    logger.log("with token");
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    G.spinner.text = "fetch " + url;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      G.spinner.fail("Fetch Error.");
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }

    return await response[as]();
  } catch (error) {
    G.spinner.fail();
    console.error("Error fetching file:", error);
    throw error;
  }
}

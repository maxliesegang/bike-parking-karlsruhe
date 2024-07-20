import { FeatureCollection } from "geojson";
import https from "https";
import config from "./config";

export async function fetchAbstellanlagenData(): Promise<FeatureCollection> {
  return new Promise((resolve, reject) => {
    const options = {
      rejectUnauthorized: false, // TODO: Remove this in production
      headers: {
        "User-Agent": "Node.js",
      },
      timeout: config.HTTPS_TIMEOUT,
    };

    https
      .get(config.JSON_URL, options, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          try {
            const data = Buffer.concat(chunks).toString("utf8");
            const jsonData: FeatureCollection = JSON.parse(data);
            resolve(jsonData);
          } catch (error: any) {
            reject(new Error(`Failed to parse JSON data: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(new Error(`HTTPS request failed: ${error.message}`));
      })
      .on("timeout", () => {
        reject(new Error("HTTPS request timed out"));
      });
  });
}

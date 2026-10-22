import { type APL } from "@saleor/app-sdk/APL";
import { DynamoAPL } from "@saleor/app-sdk/APL/dynamodb";
import { FileAPL } from "@saleor/app-sdk/APL/file";
import { UpstashAPL } from "@saleor/app-sdk/APL/upstash";
import { SaleorApp } from "@saleor/app-sdk/saleor-app";

import { env } from "./env";
import { getDynamoEnv } from "./env-dynamodb";
import { createLogger } from "./logger";
import { createDynamoMainTable } from "./modules/dynamodb/dynamo-main-table";

const logger = createLogger("saleor-app");

const aplType = env.APL;

export let apl: APL;

switch (aplType) {
  case "dynamodb": {
    const dynamoEnv = getDynamoEnv();
    const dynamoMainTable = createDynamoMainTable(dynamoEnv);

    apl = DynamoAPL.create({
      table: dynamoMainTable,
      externalLogger: (message, level) => {
        if (level === "error") {
          logger.error(`[DynamoAPL] ${message}`);
        } else {
          logger.debug(`[DynamoAPL] ${message}`);
        }
      },
    });

    break;
  }

  case "upstash":
    apl = new UpstashAPL();

    break;

  case "file":
    // Upstream's FileAPL takes no path from the environment: with no
    // argument it always writes ".saleor-app-auth.json" into the process's
    // working directory. Next.js standalone chdirs into the app directory,
    // so the Saleor auth token lands in the container's writable layer and a
    // container replacement silently loses the installation — every webhook
    // then answers 401, which Saleor records as a failed delivery.
    //
    // Passing the path through makes FILE_APL_PATH mean what the env file
    // says it means, and lets the token live on a mounted volume. The
    // directory the file lands in must be writable by the runtime user.
    apl = new FileAPL({ fileName: env.FILE_APL_PATH || ".saleor-app-auth.json" });

    break;

  default: {
    throw new Error("Invalid APL config, ");
  }
}
export const saleorApp = new SaleorApp({
  apl,
});

export const REQUIRED_SALEOR_VERSION = ">=3.22 <3.24";

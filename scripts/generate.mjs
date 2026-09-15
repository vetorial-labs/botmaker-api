#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(root, "specs/openapi-v2.json");
const output = resolve(root, "src/generated/schema.d.ts");

mkdirSync(dirname(output), { recursive: true });

const spec = JSON.parse(readFileSync(input, "utf8"));
const schemas = spec.components?.schemas ?? {};
if (!schemas.RequestIdResponse) {
  schemas.RequestIdResponse = {
    type: "object",
    description:
      "Patched locally: upstream OpenAPI referenced this schema but did not define it.",
    properties: {
      webhookNotificationId: { type: "string" },
      requestId: { type: "string" },
    },
  };
  spec.components.schemas = schemas;
  writeFileSync(input, `${JSON.stringify(spec, null, 2)}\n`);
  console.log("patched specs/openapi-v2.json: added RequestIdResponse");
}

const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/openapi-typescript/bin/cli.js"),
    input,
    "-o",
    output,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`generated ${output}`);

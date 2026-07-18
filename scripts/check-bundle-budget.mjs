import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const DIST_DIR = resolve("dist");
const MANIFEST_PATH = resolve(DIST_DIR, ".vite", "manifest.json");
const KIB = 1024;

const budgets = {
  initialJavaScriptGzip: 170 * KIB,
  initialCssGzip: 15 * KIB,
  singleJavaScriptChunk: 300 * KIB,
  routes: {
    "src/features/documents/DocumentsHubPage.tsx": 20 * KIB,
    "src/features/documents/DocumentDetailRoute.tsx": 28 * KIB,
    "src/features/documents/create/InvoiceCreatePage.tsx": 42 * KIB,
    "src/features/settings/SettingsView.tsx": 12 * KIB,
  },
};
const routeRequiredDynamicEntries = {
  "src/features/documents/create/InvoiceCreatePage.tsx": [
    "src/features/documents/DocumentCreateComposer.tsx",
  ],
};

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const entry = Object.entries(manifest).find(([, chunk]) => chunk.isEntry);

if (!entry) {
  throw new Error("Bundle-Budget konnte keinen Einstiegspunkt im Vite-Manifest finden.");
}

const collectStaticImports = (key, chunkKeys = new Set()) => {
  if (chunkKeys.has(key)) return chunkKeys;
  chunkKeys.add(key);
  const chunk = manifest[key];
  for (const importedKey of chunk?.imports ?? []) collectStaticImports(importedKey, chunkKeys);
  return chunkKeys;
};
const initialChunkKeys = collectStaticImports(entry[0]);

const initialJavaScriptFiles = new Set();
const initialCssFiles = new Set();
for (const key of initialChunkKeys) {
  const chunk = manifest[key];
  if (chunk?.file?.endsWith(".js")) initialJavaScriptFiles.add(chunk.file);
  for (const cssFile of chunk?.css ?? []) initialCssFiles.add(cssFile);
}

const gzipSize = (relativePath) => gzipSync(readFileSync(resolve(DIST_DIR, relativePath))).byteLength;
const initialJavaScriptGzip = [...initialJavaScriptFiles].reduce((total, file) => total + gzipSize(file), 0);
const initialCssGzip = [...initialCssFiles].reduce((total, file) => total + gzipSize(file), 0);
const routeJavaScriptGzip = Object.fromEntries(
  Object.keys(budgets.routes).map((routeKey) => {
    if (!manifest[routeKey]) {
      throw new Error(`Bundle-Budget konnte die Route ${routeKey} nicht im Vite-Manifest finden.`);
    }
    const routeChunkKeys = collectStaticImports(routeKey);
    for (const dynamicEntry of routeRequiredDynamicEntries[routeKey] ?? []) {
      if (!manifest[dynamicEntry]) {
        throw new Error(`Bundle-Budget konnte den benötigten Teil ${dynamicEntry} nicht im Vite-Manifest finden.`);
      }
      collectStaticImports(dynamicEntry, routeChunkKeys);
    }
    const routeFiles = new Set(
      [...routeChunkKeys]
        .filter((key) => !initialChunkKeys.has(key))
        .map((key) => manifest[key]?.file)
        .filter((file) => file?.endsWith(".js")),
    );
    return [
      routeKey,
      [...routeFiles].reduce((total, file) => total + gzipSize(file), 0),
    ];
  }),
);

const javascriptChunks = Object.values(manifest)
  .map((chunk) => chunk.file)
  .filter((file) => file?.endsWith(".js"));
const largestJavaScriptChunk = javascriptChunks.reduce(
  (largest, file) => {
    const bytes = statSync(resolve(DIST_DIR, file)).size;
    return bytes > largest.bytes ? { file, bytes } : largest;
  },
  { file: "", bytes: 0 },
);

const formatKib = (bytes) => `${(bytes / KIB).toFixed(1)} KiB`;
console.log(`Initiales JavaScript (gzip): ${formatKib(initialJavaScriptGzip)} / ${formatKib(budgets.initialJavaScriptGzip)}`);
console.log(`Initiales CSS (gzip): ${formatKib(initialCssGzip)} / ${formatKib(budgets.initialCssGzip)}`);
console.log(`Groesster JavaScript-Chunk: ${largestJavaScriptChunk.file} (${formatKib(largestJavaScriptChunk.bytes)}) / ${formatKib(budgets.singleJavaScriptChunk)}`);
for (const [routeKey, gzipBytes] of Object.entries(routeJavaScriptGzip)) {
  console.log(`Route ${routeKey} (gzip): ${formatKib(gzipBytes)} / ${formatKib(budgets.routes[routeKey])}`);
}

const violations = [];
if (initialJavaScriptGzip > budgets.initialJavaScriptGzip) {
  violations.push("Das initiale JavaScript ueberschreitet das gzip-Budget.");
}
if (initialCssGzip > budgets.initialCssGzip) {
  violations.push("Das initiale CSS ueberschreitet das gzip-Budget.");
}
if (largestJavaScriptChunk.bytes > budgets.singleJavaScriptChunk) {
  violations.push(`Der Chunk ${largestJavaScriptChunk.file} ueberschreitet das Groessenbudget.`);
}
for (const [routeKey, gzipBytes] of Object.entries(routeJavaScriptGzip)) {
  if (gzipBytes > budgets.routes[routeKey]) {
    violations.push(`Die Route ${routeKey} ueberschreitet ihr gzip-Budget.`);
  }
}

if (violations.length > 0) {
  throw new Error(`Bundle-Budget verletzt:\n- ${violations.join("\n- ")}`);
}

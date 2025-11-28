#!/usr/bin/env node
/**
 * Build helper for GitHub Pages (docs/ as source).
 * Copies dist/ into docs/ while preserving an existing CNAME.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const docsDir = path.join(root, "docs");
const cnamePath = path.join(docsDir, "CNAME");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const cname = fs.existsSync(cnamePath) ? fs.readFileSync(cnamePath, "utf8") : null;

// Ensure docs/ exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Remove everything in docs/ except CNAME (if present)
for (const entry of fs.readdirSync(docsDir)) {
  if (entry === "CNAME") continue;
  fs.rmSync(path.join(docsDir, entry), { recursive: true, force: true });
}

// Copy dist/ into docs/
fs.cpSync(distDir, docsDir, { recursive: true });

// Restore CNAME if it existed
if (cname) {
  fs.writeFileSync(cnamePath, cname);
}

console.log("Published dist/ to docs/ (GitHub Pages).");

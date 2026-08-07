"use strict";

const fs = require("fs");
const path = require("path");

function removeDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeDirectory(full);
    } else {
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(dir);
}

const targets = [path.resolve(__dirname, "..", "dist"), path.resolve(__dirname, "..", "node_modules", ".cache")];

for (const target of targets) {
  if (fs.existsSync(target)) {
    removeDirectory(target);
    console.log(`clean: removed ${path.relative(process.cwd(), target)}`);
  } else {
    console.log(`clean: skipped (missing) ${path.relative(process.cwd(), target)}`);
  }
}

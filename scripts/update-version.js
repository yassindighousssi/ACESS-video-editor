"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const VERSION_FILE = path.resolve(__dirname, "..", "src", "core", "updates", "common", "current-version.json");
const PACKAGE_FILE = path.resolve(__dirname, "..", "package.json");

const CHANNELS = ["stable", "beta", "nightly"];

function buildType() {
  if (process.env.BUILD_TYPE === "release") return "release";
  if (process.env.IS_RELEASE === "true") return "release";
  if (process.argv.includes("--release")) return "release";
  return process.env.BUILD_TYPE || "dev";
}

function latestTag() {
  try {
    const tag = execSync("git describe --tags --abbrev=0", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    return tag || null;
  } catch {
    return null;
  }
}

function commitCount() {
  try {
    const count = execSync("git rev-list --count HEAD", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    return Number.parseInt(count, 10) || 0;
  } catch {
    return 0;
  }
}

function parseVersion(raw) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-(stable|beta|nightly))?$/.exec(String(raw).trim());
  if (!match) return null;
  const channel = CHANNELS.includes(match[4]) ? match[4] : "stable";
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), channel };
}

function resolveVersion() {
  const tag = latestTag();
  if (tag) {
    const parsed = parseVersion(tag);
    if (parsed) return { parsed, source: `git tag ${tag}` };
  }
  if (fs.existsSync(VERSION_FILE)) {
    const current = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
    const parsed = parseVersion(`${current.major}.${current.minor}.${current.patch}-${current.channel}`);
    if (parsed) return { parsed, source: `${path.relative(process.cwd(), VERSION_FILE)}` };
  }
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf8"));
  const parsed = parseVersion(pkg.version);
  if (parsed) return { parsed, source: `package.json v${pkg.version}` };
  return null;
}

const type = buildType();
if (type !== "release") {
  console.log(`update-version: skipped (BUILD_TYPE=${type || "dev"}, not a release build)`);
  process.exit(0);
}

const resolved = resolveVersion();
if (!resolved) {
  console.error("update-version: cannot determine version (no git tag and no valid package.json version)");
  process.exit(1);
}

const current = fs.existsSync(VERSION_FILE) ? JSON.parse(fs.readFileSync(VERSION_FILE, "utf8")) : {};
const build = Math.max(Number.isFinite(current.build) ? current.build : 0, 0) + 1;
const next = { major: resolved.parsed.major, minor: resolved.parsed.minor, patch: resolved.parsed.patch, channel: resolved.parsed.channel, build };

fs.writeFileSync(VERSION_FILE, JSON.stringify(next, null, 2) + "\n");
console.log(`update-version: wrote ${path.relative(process.cwd(), VERSION_FILE)} -> ${next.major}.${next.minor}.${next.patch}-${next.channel} (build ${next.build}, from ${resolved.source})`);

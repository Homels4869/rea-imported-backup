#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const checks = [];

function check(condition, message) {
  if (condition) checks.push(message);
  else errors.push(message);
}
function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(pluginRoot, relativePath), "utf8"));
  } catch (error) {
    errors.push(relativePath + ": invalid or unreadable JSON (" + error.message + ")");
    return null;
  }
}
function exists(relativePath) {
  return existsSync(resolve(pluginRoot, relativePath));
}
function getFrontmatter(content) {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---", 4);
  if (end < 0) return null;
  return content.slice(4, end).split(/\r?\n/);
}
function hasField(lines, key) {
  return lines?.some((line) => line.startsWith(key + ":") && line.slice(key.length + 1).trim().length > 0) ?? false;
}
function fieldEquals(lines, key, value) {
  return lines?.some((line) => line.trim() === key + ": " + value) ?? false;
}

const portable = readJson("plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
const codex = readJson(".codex-plugin/plugin.json");
const mcp = readJson(".mcp.json");

for (const [label, manifest] of [["portable", portable], ["Claude Code", claude], ["Codex", codex]]) {
  if (!manifest) continue;
  check(manifest.name === "rea-reverse-engineering", label + " manifest has expected plugin name");
  const versionParts = typeof manifest.version === "string" ? manifest.version.split(".") : [];
  check(versionParts.length === 3 && versionParts.every((part) => part.length > 0 && [...part].every((char) => char >= "0" && char <= "9")), label + " manifest has semantic version");
  check(typeof manifest.description === "string" && manifest.description.trim().length > 0, label + " manifest has description");
}
if (portable && codex) {
  check(portable.version === codex.version, "portable and Codex versions match");
  check(portable.name === codex.name, "portable and Codex names match");
}
if (portable && claude) {
  check(portable.version === claude.version, "portable and Claude versions match");
  check(portable.name === claude.name, "portable and Claude names match");
}

for (const path of [
  "README.md", "TESTING.md", "AGENT_WORKFLOW.md", "AGENTS_AND_SUBAGENTS.md",
  "SKILLS_CATALOG.md", ".mcp.json", "templates/agent-task.md", "templates/agent-handoff.md",
]) {
  check(exists(path), "required file exists: " + path);
}
if (portable) {
  check(typeof portable.skills === "string" && exists(portable.skills.startsWith("./") ? portable.skills.slice(2) : portable.skills), "portable manifest points to existing skills directory");
  check(typeof portable.mcpServers === "string" && exists(portable.mcpServers.startsWith("./") ? portable.mcpServers.slice(2) : portable.mcpServers), "portable manifest points to existing MCP configuration");
}
if (mcp) {
  const server = mcp.mcpServers?.rea;
  check(Boolean(server), ".mcp.json declares the rea MCP server");
  if (server) {
    check(server.command === "npx", "REA MCP server uses npx");
    check(Array.isArray(server.args) && server.args.includes("rea-agents@latest") && server.args.includes("mcp"), "MCP invokes the published rea-agents entry point");
  }
}

const skillsRoot = resolve(pluginRoot, "skills");
let skillDirectories = [];
try {
  skillDirectories = readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
} catch (error) {
  errors.push("skills/: unable to read directory (" + error.message + ")");
}
check(skillDirectories.length >= 70, "plugin includes at least 70 skills (found " + skillDirectories.length + ")");

const catalogPath = resolve(pluginRoot, "SKILLS_CATALOG.md");
const catalog = existsSync(catalogPath) ? readFileSync(catalogPath, "utf8") : "";
check(catalog.length > 0, "skills catalog exists and is readable");

const allSlugs = new Set();
for (const entry of skillDirectories) {
  const name = entry.name;
  const path = resolve(skillsRoot, name, "SKILL.md");
  check(existsSync(path), "skill " + name + " has SKILL.md");
  if (!existsSync(path)) continue;

  const content = readFileSync(path, "utf8");
  const frontmatter = getFrontmatter(content);
  check(Boolean(frontmatter), "skill " + name + " has YAML frontmatter");
  if (frontmatter) {
    check(fieldEquals(frontmatter, "name", name), "skill " + name + " frontmatter name matches directory");
    check(hasField(frontmatter, "description"), "skill " + name + " has a description");
    check(content.length >= 700, "skill " + name + " contains substantive workflow guidance");
  }
  check(content.includes("## "), "skill " + name + " has documented sections");
  check(catalog.includes("./skills/" + name + "/SKILL.md"), "skill " + name + " is linked from catalog");
  allSlugs.add(name);
}
const catalogLinks = catalog.split(/\r?\n/).filter((line) => line.includes("](./skills/"));
for (const line of catalogLinks) {
  const start = line.indexOf("](./skills/") + "](./skills/".length;
  const end = line.indexOf("/SKILL.md)", start);
  if (end < 0) {
    errors.push("catalog contains malformed skill link: " + line.trim());
    continue;
  }
  const slug = line.slice(start, end);
  check(allSlugs.has(slug), "catalog link resolves to skill " + slug);
}

const agentsRoot = resolve(pluginRoot, "agents");
let agentFiles = [];
try {
  agentFiles = readdirSync(agentsRoot, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
} catch (error) {
  errors.push("agents/: unable to read agent directory (" + error.message + ")");
}
check(agentFiles.length >= 8, "plugin includes at least eight specialist agent definitions");
const agentNames = new Set();
for (const entry of agentFiles) {
  const name = entry.name.slice(0, -3);
  const content = readFileSync(resolve(agentsRoot, entry.name), "utf8");
  const frontmatter = getFrontmatter(content);
  check(Boolean(frontmatter), "agent " + name + " has YAML frontmatter");
  if (frontmatter) {
    check(fieldEquals(frontmatter, "name", name), "agent " + name + " name matches filename");
    check(hasField(frontmatter, "description"), "agent " + name + " has a description");
    check(hasField(frontmatter, "tools"), "agent " + name + " declares tools");
  }
  check(content.length >= 700, "agent " + name + " contains substantive role guidance");
  check(content.includes("## "), "agent " + name + " has documented sections");
  check(!agentNames.has(name), "agent name is unique: " + name);
  agentNames.add(name);
}

console.log("REA plugin validation: " + checks.length + " checks passed; " + errors.length + " failed.\n");
for (const item of checks) console.log("PASS  " + item);
for (const item of errors) console.error("FAIL  " + item);
console.log("Inventory: " + skillDirectories.length + " skills, " + agentFiles.length + " specialist agent definitions.");
if (errors.length > 0) process.exitCode = 1;

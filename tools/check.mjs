import { access, readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { deck, pageRenderers } from "../deck.js";
import { validateDeck } from "../core/engine/validate-deck.js";
import { createBlockRegistry } from "../shared/components/registry.js";

const registry = createBlockRegistry(pageRenderers);
const errors = validateDeck(deck, registry.componentTypes);
const root = fileURLToPath(new URL("..", import.meta.url));
const sourceFiles = await walk(root);
const forbidden = [
  { pattern: /\/Users\//, message: "包含绝对磁盘路径" },
  { pattern: /https?:\/\//, message: "包含远程 URL" },
  { pattern: /(?:src|href)=[\"']\//, message: "包含站点根路径引用" },
  { pattern: /from\s+[\"']\//, message: "包含绝对模块引用" },
];

for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  const relativePath = file.slice(root.length + 1);
  forbidden.forEach((rule) => {
    if (rule.pattern.test(content)) errors.push(`${relativePath}: ${rule.message}`);
  });
  if (/^(core|shared)\//.test(relativePath) && /from\s+["'][^"']*pages\//.test(content)) {
    errors.push(`${relativePath}: 全局层不得依赖具体页面`);
  }
  if (relativePath.startsWith("pages/") && extname(file) === ".js") {
    const imports = [...content.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    imports.forEach((source) => {
      if (!source.startsWith("./") && !source.startsWith("../../shared/")) {
        errors.push(`${relativePath}: 页面只能依赖本页或 shared，当前依赖 ${source}`);
      }
    });
  }
}

const pageEntries = await readdir(`${root}/pages`, { withFileTypes: true });
for (const entry of pageEntries.filter((item) => item.isDirectory())) {
  for (const required of ["page.js", "component.js", "logic.js", "styles.css", "assets"]) {
    try {
      await access(`${root}/pages/${entry.name}/${required}`);
    } catch {
      errors.push(`pages/${entry.name}: 缺少 ${required}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`协议校验通过：${deck.slides.length} 个场景节点，引用与分层依赖均符合约束。`);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "qa") continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ([".html", ".js", ".mjs", ".css", ".json"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

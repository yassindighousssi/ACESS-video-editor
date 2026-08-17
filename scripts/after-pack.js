const fs = require("fs");
const path = require("path");

function removeFile(dir, name) {
  const target = path.join(dir, name);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    console.log(`afterPack: removed ${name}`);
  }
}

module.exports = async function (context) {
  const dir = context.appOutDir;

  const localesDir = path.join(dir, "locales");
  if (fs.existsSync(localesDir)) {
    const keep = new Set(["en.pak", "ar.pak"]);
    for (const file of fs.readdirSync(localesDir)) {
      if (!keep.has(file)) {
        removeFile(localesDir, file);
      }
    }
    console.log(`afterPack: locales trimmed to ${fs.readdirSync(localesDir).join(", ")}`);
  }

  removeFile(dir, "LICENSES.chromium.html");
  removeFile(dir, "dxcompiler.dll");
  removeFile(dir, "vk_swiftshader.dll");
  removeFile(dir, "vk_swiftshader_icd.json");
  removeFile(dir, "d3dcompiler_47.dll");
  removeFile(dir, "LICENSE.electron.txt");
  removeFile(dir, "chrome_100_percent.pak");
  removeFile(dir, "chrome_200_percent.pak");
};

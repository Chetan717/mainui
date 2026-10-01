import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return collectSourceFiles(absolutePath);
    }
    return /\.(?:js|jsx|ts|tsx)$/.test(entry) ? [absolutePath] : [];
  });
}

test("all customer-care actions use the new support number", () => {
  const countryNumber = "919341947815";
  const dialNumber = `+${countryNumber}`;

  const settings = read("src/pages/Profile/Settingsmenu.jsx");
  assert.match(settings, new RegExp(`tel:\\${dialNumber}`));
  assert.match(settings, new RegExp(`https://wa\\.me/${countryNumber}`));

  for (const relativePath of [
    "src/pages/Home.jsx",
    "src/pages/SelectCompany/SelectComp.jsx",
    "src/components/Sidebar.jsx",
    "src/components-source/Sidebar.jsx",
  ]) {
    assert.match(
      read(relativePath),
      new RegExp(`https://wa\\.me/${countryNumber}`),
      `${relativePath} does not use the current support WhatsApp number`,
    );
  }
});

test("legacy support number is absent from executable source", () => {
  const legacyLocalNumber = ["9229", "885383"].join("");
  const allSource = collectSourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(allSource, new RegExp(legacyLocalNumber));
});

import assert from "node:assert/strict";
import test from "node:test";

import { SITE_THEME_BOOTSTRAP_SCRIPT } from "../lib/siteTheme";

function runBootstrap({
  storedTheme = null,
  legacyTheme = null,
  cookie = "",
  storageThrows = false,
}: {
  storedTheme?: string | null;
  legacyTheme?: string | null;
  cookie?: string;
  storageThrows?: boolean;
} = {}) {
  const classes = new Set(["dark"]);
  const classList = {
    toggle(name: string, force: boolean) {
      if (force) classes.add(name);
      else classes.delete(name);
    },
  };

  Function(
    "document",
    "localStorage",
    SITE_THEME_BOOTSTRAP_SCRIPT,
  )(
    { documentElement: { classList }, cookie },
    {
      getItem(key: string) {
        if (storageThrows) throw new Error("storage unavailable");
        return key === "techjournal-theme" ? storedTheme : legacyTheme;
      },
    },
  );

  return classes;
}

test("theme bootstrap keeps dark as the site default", () => {
  assert.equal(runBootstrap().has("dark"), true);
  assert.equal(runBootstrap({ storedTheme: "unexpected" }).has("dark"), true);
  assert.equal(runBootstrap({ storageThrows: true }).has("dark"), true);
});

test("theme bootstrap honors explicit light and glass preferences", () => {
  assert.equal(runBootstrap({ storedTheme: "light" }).has("dark"), false);
  assert.deepEqual([...runBootstrap({ storedTheme: "glass" })].sort(), ["dark", "glass"]);
});

test("namespaced preference wins and cookie provides a storage fallback", () => {
  assert.equal(runBootstrap({ storedTheme: "dark", legacyTheme: "light" }).has("dark"), true);
  assert.equal(
    runBootstrap({ cookie: "other=x; techjournal-theme=light", storageThrows: true }).has("dark"),
    false,
  );
});

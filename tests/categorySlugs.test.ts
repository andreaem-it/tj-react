import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCategoryUrlSlug,
  getCategoryUrlSlugFromWpSlug,
  resolveCategoryByUrlSlug,
} from "../lib/categorySlugs";

describe("categorySlugs", () => {
  it("converte gli slug WordPress usati nelle URL pubbliche", () => {
    assert.equal(getCategoryUrlSlugFromWpSlug("applicazioni"), "apps");
    assert.equal(getCategoryUrlSlug({ slug: "intelligenza-artificiale" }), "ia");
    assert.equal(getCategoryUrlSlugFromWpSlug("apple"), "apple");
  });

  it("risolve lo slug pubblico nella categoria WordPress", () => {
    const categories = [{ id: 1, slug: "games" }, { id: 2, slug: "apple" }];
    assert.equal(resolveCategoryByUrlSlug(categories, "gaming")?.id, 1);
    assert.equal(resolveCategoryByUrlSlug(categories, "apple")?.id, 2);
  });
});

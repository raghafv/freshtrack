import { describe, expect, it } from "vitest";
import { CURATED_RECIPES, matchRecipe, normalize } from "./curated-recipes";

describe("curated cookbook", () => {
  it("ships all 29 recipes", () => {
    expect(CURATED_RECIPES).toHaveLength(29);
  });
  it("has no em-dashes", () => {
    expect(JSON.stringify(CURATED_RECIPES).includes("\u2014")).toBe(false);
  });
  it("maps Indian names to English", () => {
    expect(normalize("Aloo")).toBe("potato");
    expect(normalize("Capsicum")).toBe("bell pepper");
  });
  it("does not count peanut butter as butter", () => {
    const r = { ...CURATED_RECIPES[0], ingredients: [{ name: "butter", amount: "1 tbsp" }] };
    expect(matchRecipe(r, ["peanut butter"]).percent).toBe(0);
    expect(matchRecipe(r, ["butter"]).percent).toBe(100);
  });
});

import { describe, expect, it } from "vitest";
import { RUBRIC, rankOpportunities, scoreOpportunity, type Opportunity } from "../src/economics/scoring";

const make = (id: string, scores: Partial<Opportunity["scores"]>, extra: Partial<Opportunity> = {}): Opportunity => ({
  id,
  name: id,
  niche: "test",
  scores: {
    demand: 10,
    margin: 10,
    adPotential: 8,
    competition: 5,
    differentiation: 5,
    logistics: 5,
    retention: 2,
    regulatory: 5,
    ...scores,
  },
  evidence: [],
  ...extra,
});

describe("scoring rubric", () => {
  it("sums to 100 points", () => {
    expect(Object.values(RUBRIC).reduce((sum, c) => sum + c.max, 0)).toBe(100);
  });

  it("totals the criteria of an opportunity", () => {
    expect(scoreOpportunity(make("a", {})).total).toBe(50);
  });

  it("rejects a criterion above its maximum", () => {
    expect(() => scoreOpportunity(make("a", { retention: 6 }))).toThrow(/retention/);
  });

  it("ranks by total, then lower regulatory risk, then margin", () => {
    const ranked = rankOpportunities([
      make("low", { demand: 5 }),
      make("tie-risky", { regulatory: 3, demand: 12 }),
      make("tie-safe", { regulatory: 5, demand: 10 }),
      make("best", { demand: 18 }),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["best", "tie-safe", "tie-risky", "low"]);
    expect(ranked[0]?.rank).toBe(1);
  });

  it("puts knocked-out opportunities after every eligible one", () => {
    const ranked = rankOpportunities([
      make("killed", { demand: 20, margin: 20 }, { knockOut: "allégations trompeuses inévitables" }),
      make("eligible", {}),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["eligible", "killed"]);
    expect(ranked[1]?.eligible).toBe(false);
  });
});

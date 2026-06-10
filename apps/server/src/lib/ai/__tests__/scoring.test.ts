import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectAgentCandidates,
  scoreDashboardIntent,
  scoreSqlQueryIntent,
} from "../intent/scoring.js";

describe("Phase 2 intent scoring", () => {
  it("detects Vietnamese SQL count query", () => {
    const question = "Dem so banner trong bang banners hom nay";
    assert.ok(scoreSqlQueryIntent(question) >= 0.45);
    assert.ok(detectAgentCandidates(question).includes("sql"));
  });

  it("detects multi-intent dashboard + SQL", () => {
    const question =
      "Thong ke activity log va tra cuu sql bang campaigns";
    const candidates = detectAgentCandidates(question);
    assert.ok(candidates.includes("sql"));
    assert.ok(candidates.includes("dashboard"));
  });

  it("detects dashboard upload stats", () => {
    const question = "Thong ke hoat dong upload gan day";
    assert.ok(scoreDashboardIntent(question) >= 0.45);
    assert.ok(detectAgentCandidates(question).includes("dashboard"));
  });
});

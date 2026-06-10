import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRoute } from "../agents/router/routeIntent.js";
import type { AgentContext } from "../core/types.js";

function makeCtx(question: string): AgentContext {
  return {
    requestId: "test-request",
    question,
    provider: "gemini",
    role: "admin",
    email: "admin@test.com",
    memoryKey: "test:admin@test.com",
    history: [],
    attachments: [],
  };
}

describe("resolveRoute multi-intent", () => {
  it("routes dashboard + SQL with rule_multi", async () => {
    const route = await resolveRoute(
      makeCtx("Thong ke activity log va tra cuu sql bang campaigns"),
    );
    assert.equal(route.source, "rule_multi");
    assert.equal(route.intent, "multi_intent");
    assert.ok(route.agents.includes("sql"));
    assert.ok(route.agents.includes("dashboard"));
  });

  it("routes SQL-only Vietnamese query", async () => {
    const route = await resolveRoute(
      makeCtx("Dem so banner trong bang banners hom nay"),
    );
    assert.ok(route.agents.includes("sql"));
    assert.equal(route.agents.length, 1);
  });

  it("routes dashboard-only query", async () => {
    const route = await resolveRoute(
      makeCtx("Thong ke activity log gan day"),
    );
    assert.ok(route.agents.includes("dashboard"));
    assert.equal(route.agents.length, 1);
    assert.equal(route.intent, "dashboard_insight");
  });
});

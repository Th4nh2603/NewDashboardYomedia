import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSelectQuery } from "../tools/mysql/validateQuery.js";
import type { MysqlWhitelist } from "../tools/mysql/whitelist.js";

const baseWhitelist: MysqlWhitelist = {
  tables: ["campaigns", "banners"],
  columnsByTable: {
    campaigns: ["id", "name", "status"],
    banners: ["id", "name", "created_at"],
  },
  maxRows: 100,
};

describe("validateSelectQuery", () => {
  it("allows SELECT with whitelisted columns", () => {
    const result = validateSelectQuery(
      "SELECT id, name FROM campaigns WHERE status = 'active'",
      baseWhitelist,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.sql, /LIMIT 100$/i);
    }
  });

  it("rejects SELECT * when column whitelist is configured", () => {
    const result = validateSelectQuery(
      "SELECT * FROM campaigns",
      baseWhitelist,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /SELECT \*/i);
    }
  });

  it("rejects columns outside whitelist", () => {
    const result = validateSelectQuery(
      "SELECT secret_key FROM campaigns",
      baseWhitelist,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /secret_key/i);
    }
  });

  it("rejects non-whitelisted tables", () => {
    const result = validateSelectQuery(
      "SELECT id FROM users",
      baseWhitelist,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /users/i);
    }
  });

  it("allows COUNT(*) with column whitelist", () => {
    const result = validateSelectQuery(
      "SELECT COUNT(*) FROM banners",
      baseWhitelist,
    );
    assert.equal(result.ok, true);
  });

  it("skips column checks when MYSQL_ALLOWED_COLUMNS is empty", () => {
    const openWhitelist: MysqlWhitelist = {
      tables: ["campaigns"],
      columnsByTable: {},
      maxRows: 50,
    };
    const result = validateSelectQuery("SELECT * FROM campaigns", openWhitelist);
    assert.equal(result.ok, true);
  });
});

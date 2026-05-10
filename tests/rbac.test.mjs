import test from "node:test";
import assert from "node:assert/strict";
import { Roles, normalizeRole, normalizeStatus, UserStatuses } from "@hotel-booking/rbac";

test("normalizeRole maps legacy roles to canonical roles", () => {
  assert.equal(normalizeRole("user"), Roles.USER);
  assert.equal(normalizeRole("admin"), Roles.ADMIN);
  assert.equal(normalizeRole("superadmin"), Roles.SUPERADMIN);
  assert.equal(normalizeRole("owner"), Roles.ADMIN);
});

test("normalizeStatus maps legacy status names", () => {
  assert.equal(normalizeStatus("active"), UserStatuses.ACTIVE);
  assert.equal(normalizeStatus("blocked"), UserStatuses.BLOCKED);
});

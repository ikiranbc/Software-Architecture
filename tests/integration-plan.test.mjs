import test from "node:test";

// Integration checklist for local CI/staging environments with full infra running.
// These are intentionally skipped in lightweight local syntax/build runs.

test.skip("Auth signup/login", () => {});
test.skip("JWT validation", () => {});
test.skip("RBAC middleware", () => {});
test.skip("Hotel creation by Admin", () => {});
test.skip("Room creation by Admin", () => {});
test.skip("Hotel approval by SuperAdmin", () => {});
test.skip("Booking creation by User", () => {});
test.skip("Booking confirmation", () => {});
test.skip("Wallet top-up", () => {});
test.skip("Successful payment", () => {});
test.skip("Failed payment due to insufficient balance", () => {});
test.skip("Duplicate booking prevention", () => {});
test.skip("Duplicate payment prevention", () => {});
test.skip("Blocked user login attempt", () => {});
test.skip("Admin accessing SuperAdmin route", () => {});
test.skip("User accessing Admin route", () => {});

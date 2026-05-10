/**
 * Controller Layer (MVC / Interface Adapter pattern):
 * - Translates HTTP input/output for the application boundary.
 * - Delegates business decisions to services (Single Responsibility Principle).
 */

import * as authService from "../services/auth.service.js";

export async function signup(req, res) {
  const payload = await authService.signup(req.body);
  res.status(201).json(payload);
}

export async function login(req, res) {
  const payload = await authService.login(req.body);
  res.json(payload);
}

export async function refreshToken(req, res) {
  const payload = await authService.refreshAuthToken(req.body);
  res.json(payload);
}

export async function logout(_req, res) {
  const payload = await authService.logout();
  res.json(payload);
}

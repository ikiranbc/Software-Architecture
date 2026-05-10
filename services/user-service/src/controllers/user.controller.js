/**
 * Controller Layer (MVC / Interface Adapter pattern):
 * - Translates HTTP input/output for the application boundary.
 * - Delegates business decisions to services (Single Responsibility Principle).
 */

import * as userService from "../services/user.service.js";

export async function getMe(req, res) {
  const payload = await userService.getMyProfile(req.user.id);
  res.json(payload);
}

export async function patchMe(req, res) {
  const payload = await userService.updateMyProfile(req.user.id, req.body);
  res.json(payload);
}

export async function getUser(req, res) {
  const payload = await userService.getUserById(req.params.userId);
  res.json(payload);
}

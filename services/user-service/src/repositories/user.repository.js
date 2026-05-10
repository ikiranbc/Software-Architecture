/**
 * Repository Layer (Repository pattern):
 * - Encapsulates data access/query details behind stable methods.
 * - Supports Dependency Inversion by decoupling services from storage specifics.
 */

import { User } from "../models/user.model.js";

export function findUserById(userId) {
  return User.findById(userId);
}

export function updateUserById(userId, payload) {
  return User.findByIdAndUpdate(userId, payload, { new: true });
}

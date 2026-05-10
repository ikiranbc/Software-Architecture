/**
 * Repository Layer (Repository pattern):
 * - Encapsulates data access/query details behind stable methods.
 * - Supports Dependency Inversion by decoupling services from storage specifics.
 */

import { User } from "../models/user.model.js";

export function findUserByEmail(email) {
  return User.findOne({ email });
}

export function createUser(payload) {
  return User.create(payload);
}

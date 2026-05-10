/**
 * Service Layer (Application Service / Use-Case Interactor pattern):
 * - Implements business rules and orchestration.
 * - Coordinates repositories, policies, and external integrations.
 */

import { httpError } from "@hotel-booking/shared-utils";
import { findUserById, updateUserById } from "../repositories/user.repository.js";

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt
  };
}

export async function getMyProfile(userId) {
  const user = await findUserById(userId);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  return publicUser(user);
}

export async function updateMyProfile(userId, payload) {
  const user = await updateUserById(userId, payload);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  return publicUser(user);
}

export async function getUserById(userId) {
  const user = await findUserById(userId);
  if (!user) throw httpError(404, "User not found", "USER_NOT_FOUND");
  return publicUser(user);
}

/**
 * Controller Layer (MVC / Interface Adapter pattern):
 * - Translates HTTP input/output for the application boundary.
 * - Delegates business decisions to services (Single Responsibility Principle).
 */

import * as hotelService from "../services/hotel.service.js";

export async function listHotels(req, res) {
  const payload = await hotelService.listPublicHotels(req.query);
  res.json(payload);
}

export async function getHotel(req, res) {
  const payload = await hotelService.getPublicHotel(req.params.hotelId);
  res.json(payload);
}

export async function listHotelRooms(req, res) {
  const payload = await hotelService.listPublicHotelRooms(req.params.hotelId, req.query);
  res.json(payload);
}

export async function getInternalRoom(req, res) {
  const payload = await hotelService.getInternalRoom(req.params.roomId);
  res.json(payload);
}

export async function createHotel(req, res) {
  const payload = await hotelService.createOwnerHotel(req.user, req.body);
  res.status(201).json(payload);
}

export async function listOwnedHotels(req, res) {
  const payload = await hotelService.listOwnerHotels(req.user);
  res.json(payload);
}

export async function patchHotel(req, res) {
  const payload = await hotelService.updateOwnerHotel(req.user, req.params.hotelId, req.body);
  res.json(payload);
}

export async function removeHotel(req, res) {
  const payload = await hotelService.deleteOwnerHotel(req.user, req.params.hotelId);
  res.json(payload);
}

export async function listOwnedHotelRooms(req, res) {
  const payload = await hotelService.listOwnerHotelRooms(req.user, req.params.hotelId);
  res.json(payload);
}

export async function createRoom(req, res) {
  const payload = await hotelService.createOwnerRoom(req.user, req.params.hotelId, req.body);
  res.status(201).json(payload);
}

export async function patchRoom(req, res) {
  const payload = await hotelService.updateOwnerRoom(req.user, req.params.roomId, req.body);
  res.json(payload);
}

export async function removeRoom(req, res) {
  const payload = await hotelService.deleteOwnerRoom(req.user, req.params.roomId);
  res.json(payload);
}

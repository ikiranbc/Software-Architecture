export function buildApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window === "undefined") return "http://localhost:8790";
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:8790`;
  }

  return "";
}

export class ApiClient {
  constructor({ baseUrl, getToken }) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    } catch {
      const target = this.baseUrl || window.location.origin;
      throw new Error(`API is unreachable at ${target}. Check that the gateway is running and the production API URL is configured.`);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Request failed");
    return payload;
  }
}

export class AuthApi {
  constructor(client) {
    this.client = client;
  }

  login(credentials) {
    return this.client.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
  }

  signup(payload) {
    return this.client.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
}

export class HotelApi {
  constructor(client) {
    this.client = client;
  }

  list(query) {
    const params = new URLSearchParams();
    if (query.city) params.set("city", query.city);
    if (query.guests) params.set("guests", query.guests);
    params.set("page", query.page || 1);
    params.set("limit", query.limit || 20);
    return this.client.request(`/api/hotels?${params.toString()}`);
  }

  listOwnerHotels() {
    return this.client.request("/api/owner/hotels");
  }

  createHotel(payload) {
    return this.client.request("/api/owner/hotels", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  updateHotel(hotelId, payload) {
    return this.client.request(`/api/owner/hotels/${hotelId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  deleteHotel(hotelId) {
    return this.client.request(`/api/owner/hotels/${hotelId}`, {
      method: "DELETE"
    });
  }

  listHotelRooms(hotelId) {
    return this.client.request(`/api/owner/hotels/${hotelId}/rooms`);
  }

  createRoom(hotelId, payload) {
    return this.client.request(`/api/owner/hotels/${hotelId}/rooms`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  updateRoom(roomId, payload) {
    return this.client.request(`/api/owner/rooms/${roomId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  deleteRoom(roomId) {
    return this.client.request(`/api/owner/rooms/${roomId}`, {
      method: "DELETE"
    });
  }
}

export class BookingApi {
  constructor(client) {
    this.client = client;
  }

  listMine() {
    return this.client.request("/api/bookings/my-bookings");
  }

  create(payload) {
    return this.client.request("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  confirm(bookingId, payload = {}) {
    return this.client.request(`/api/bookings/${bookingId}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getById(bookingId) {
    return this.client.request(`/api/bookings/${bookingId}`);
  }

  getPaymentStatus(bookingId) {
    return this.client.request(`/api/bookings/${bookingId}/payment-status`);
  }

  cancel(bookingId) {
    return this.client.request(`/api/bookings/${bookingId}/cancel`, {
      method: "POST"
    });
  }
}

export class UserApi {
  constructor(client) {
    this.client = client;
  }

  me() {
    return this.client.request("/api/users/me");
  }

  updateMe(payload) {
    return this.client.request("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
}

export class WalletApi {
  constructor(client) {
    this.client = client;
  }

  balance() {
    return this.client.request("/api/wallet/balance");
  }

  transactions() {
    return this.client.request("/api/wallet/transactions");
  }

  topUp(payload) {
    return this.client.request("/api/wallet/top-up", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
}

export class PaymentApi {
  constructor(client) {
    this.client = client;
  }

  proceed(bookingId, payload = {}) {
    return this.client.request(`/api/payments/${bookingId}/proceed`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
}

export function createDomainApi(getToken) {
  const baseUrl = buildApiBaseUrl();
  const client = new ApiClient({ baseUrl, getToken });

  return {
    baseUrl,
    auth: new AuthApi(client),
    users: new UserApi(client),
    hotels: new HotelApi(client),
    bookings: new BookingApi(client),
    wallet: new WalletApi(client),
    payments: new PaymentApi(client)
  };
}

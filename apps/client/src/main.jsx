import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  Workflow
} from "lucide-react";
import { createDomainApi } from "./api.js";
import "./styles.css";

const INVENTORY_ROLES = ["ADMIN", "SUPERADMIN"];
const AUTH_ROLES = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

const ROLE_DASHBOARDS = {
  GUEST: {
    title: "Guest Dashboard",
    capabilities: ["Browse hotels and rooms", "Create bookings", "Top up wallet", "Track bookings and transactions"]
  },
  USER: {
    title: "User Dashboard",
    capabilities: ["Browse hotels and rooms", "Create bookings", "Top up wallet", "Track bookings and transactions"]
  },
  ADMIN: {
    title: "Admin Dashboard",
    capabilities: ["All user capabilities", "Manage hotels across owners", "Manage rooms across owners", "View or moderate any booking"]
  },
  SUPERADMIN: {
    title: "Superadmin Dashboard",
    capabilities: ["All admin capabilities", "Platform-level inventory control", "Cross-owner hotel and room moderation", "Full booking visibility"]
  }
};

const SERVICE_FLOW = `G --> A["Auth Service"]
G --> U["User Service"]
G --> H["Hotel Service"]
G --> B["Booking Service"]
G --> W["Wallet Service"]`;

const ROUTES = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, requiresAuth: true, allowedRoles: AUTH_ROLES },
  { id: "auth", label: "Auth", icon: ShieldCheck },
  { id: "hotels", label: "Hotels", icon: Building2, requiresAuth: true, allowedRoles: AUTH_ROLES },
  { id: "bookings", label: "Bookings", icon: CalendarCheck, requiresAuth: true, allowedRoles: AUTH_ROLES },
  { id: "wallet", label: "Wallet", icon: Wallet, requiresAuth: true, allowedRoles: AUTH_ROLES },
  { id: "profile", label: "Profile", icon: User, requiresAuth: true, allowedRoles: AUTH_ROLES },
  { id: "inventory", label: "Inventory", icon: BedDouble, requiresAuth: true, requiresInventoryRole: true, allowedRoles: INVENTORY_ROLES },
  { id: "services", label: "Services", icon: Workflow, requiresAuth: true, allowedRoles: AUTH_ROLES }
];

const BOOKING_FLOW_STEPS = [
  "Book hotel",
  "Confirm booking",
  "Proceed payment",
  "Payment completed"
];

function idempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAmenities(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toAmenitiesText(value) {
  return (value || []).join(", ");
}

function hotelFormFromModel(hotel) {
  return {
    name: hotel.name || "",
    city: hotel.city || "",
    country: hotel.country || "",
    address: hotel.address || "",
    description: hotel.description || "",
    amenities: toAmenitiesText(hotel.amenities)
  };
}

function roomFormFromModel(room) {
  return {
    roomNumber: room.roomNumber || "",
    type: room.type || "STANDARD",
    capacity: room.capacity || 1,
    pricePerNight: room.pricePerNight || 1,
    amenities: toAmenitiesText(room.amenities)
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function statusClass(value) {
  return String(value || "unknown").toLowerCase().replaceAll("_", "-");
}

function shortId(value) {
  const text = String(value || "");
  if (text.length <= 12) return text || "N/A";
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function routeFromHash(hasToken) {
  if (typeof window === "undefined") return hasToken ? "overview" : "auth";
  const route = window.location.hash.replace(/^#\/?/, "").trim();
  if (!route) return hasToken ? "overview" : "auth";
  return ROUTES.some((item) => item.id === route) ? route : hasToken ? "overview" : "auth";
}

function normalizeRole(role) {
  const value = String(role || "GUEST").trim();
  if (!value) return "GUEST";
  const upper = value.toUpperCase();
  if (AUTH_ROLES.includes(upper) || upper === "GUEST") return upper;
  if (upper === "SUPER_ADMIN" || upper === "SUPER ADMIN") return "SUPERADMIN";
  if (upper === "OWNER") return "ADMIN";
  return "USER";
}

function App() {
  const initialToken = localStorage.getItem("hotel_token") || "";
  const [token, setToken] = useState(initialToken);
  const [route, setRoute] = useState(() => routeFromHash(Boolean(initialToken)));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("hotel_user") || "null"));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "USER" });

  const [hotels, setHotels] = useState([]);
  const [query, setQuery] = useState({ city: "", guests: 1, page: 1 });

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const [bookingDraft, setBookingDraft] = useState({
    checkInDate: new Date().toISOString().slice(0, 10),
    checkOutDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    guests: 1
  });
  const [bookingFlow, setBookingFlow] = useState({
    step: "idle",
    hotelName: "",
    room: null,
    bookingId: ""
  });
  const [bookingConfirmedPopup, setBookingConfirmedPopup] = useState(null);
  const [bookingFailedPopup, setBookingFailedPopup] = useState(null);

  const [topUpAmount, setTopUpAmount] = useState(250);

  const [managerHotels, setManagerHotels] = useState([]);
  const [managerRooms, setManagerRooms] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");

  const [createHotelForm, setCreateHotelForm] = useState({
    name: "",
    city: "",
    country: "",
    address: "",
    description: "",
    amenities: ""
  });

  const [createRoomForm, setCreateRoomForm] = useState({
    roomNumber: "",
    type: "STANDARD",
    capacity: 2,
    pricePerNight: 120,
    amenities: ""
  });

  const [hotelEdits, setHotelEdits] = useState({});
  const [roomEdits, setRoomEdits] = useState({});
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const domainApi = useMemo(() => createDomainApi(() => token), [token]);
  const activeRole = normalizeRole(user?.role);
  const roleDashboard = ROLE_DASHBOARDS[activeRole] || ROLE_DASHBOARDS.USER;
  const canManageInventory = Boolean(user && INVENTORY_ROLES.includes(activeRole));
  const hasPendingPaymentBooking = bookings.some((booking) => booking.status === "PENDING_PAYMENT");
  const bookingFlowInProgress = bookingFlow.step === "confirm" || bookingFlow.step === "payment";
  const userCrudLockedByBooking = activeRole === "USER" && (hasPendingPaymentBooking || bookingFlowInProgress);
  const canAccessInventoryRoute = canManageInventory && !userCrudLockedByBooking;

  function isRoleAllowedForRoute(routeMeta) {
    if (!routeMeta?.allowedRoles) return true;
    return routeMeta.allowedRoles.includes(activeRole);
  }

  function canAccessRoute(routeMeta) {
    if (!routeMeta) return false;
    if (routeMeta.id === "auth") return !token;
    if (routeMeta.requiresAuth && !token) return false;
    if (!isRoleAllowedForRoute(routeMeta)) return false;
    if (routeMeta.requiresInventoryRole && !canAccessInventoryRoute) return false;
    return true;
  }

  function routeAccessMessage(routeMeta) {
    if (!routeMeta) return "Page is unavailable.";
    if (routeMeta.requiresAuth && !token) return "Please sign in first.";
    if (!isRoleAllowedForRoute(routeMeta)) return `This page is not available for ${activeRole} role.`;
    if (routeMeta.requiresInventoryRole && !canAccessInventoryRoute) {
      return "Inventory pages are available for admin/superadmin roles.";
    }
    return "This page is not accessible with your current role.";
  }

  function navigate(nextRoute) {
    const routeMeta = ROUTES.find((item) => item.id === nextRoute);
    if (!routeMeta) return;

    if (!canAccessRoute(routeMeta)) {
      setNotice(routeAccessMessage(routeMeta));
      const fallbackRoute = token ? "overview" : "auth";
      setRoute(fallbackRoute);
      if (typeof window !== "undefined") window.location.hash = `/${fallbackRoute}`;
      return;
    }

    setRoute(nextRoute);
    if (typeof window !== "undefined") window.location.hash = `/${nextRoute}`;
  }

  function setRouteDirectly(nextRoute) {
    setRoute(nextRoute);
    if (typeof window !== "undefined") window.location.hash = `/${nextRoute}`;
  }

  async function loadHotels() {
    const payload = await domainApi.hotels.list({ ...query, limit: 50, cacheBust: Date.now() });
    setHotels(payload.data || []);
  }

  async function loadManagerHotels() {
    if (!canAccessInventoryRoute) {
      setManagerHotels([]);
      setManagerRooms([]);
      setSelectedHotelId("");
      return;
    }

    const payload = await domainApi.hotels.listOwnerHotels();
    const items = payload.data || [];
    setManagerHotels(items);

    setSelectedHotelId((current) => {
      if (current && items.some((hotel) => hotel.id === current)) return current;
      return items[0]?.id || "";
    });
  }

  async function loadManagerRooms(hotelId = selectedHotelId) {
    if (!canAccessInventoryRoute || !hotelId) {
      setManagerRooms([]);
      return;
    }
    const payload = await domainApi.hotels.listHotelRooms(hotelId);
    setManagerRooms(payload.data || []);
  }

  async function loadBookingsForRole(role) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === "SUPERADMIN") return domainApi.bookings.listPlatform();
    if (normalizedRole === "ADMIN") return domainApi.bookings.listManaged();
    return domainApi.bookings.listMine();
  }

  async function loadPrivateData() {
    if (!token) return;

    const [profilePayload, walletPayload, transactionPayload] = await Promise.all([
      domainApi.users.me(),
      domainApi.wallet.balance(),
      domainApi.wallet.transactions()
    ]);
    const bookingPayload = await loadBookingsForRole(profilePayload.role);

    setUser(profilePayload);
    localStorage.setItem("hotel_user", JSON.stringify(profilePayload));
    setProfileForm({ name: profilePayload.name || "", phone: profilePayload.phone || "" });

    setWallet(walletPayload);
    setTransactions(transactionPayload.data || []);
    setBookings(bookingPayload.data || []);
    setSelectedBookingId((current) => {
      if (current && (bookingPayload.data || []).some((booking) => booking.id === current)) return current;
      return bookingPayload.data?.[0]?.id || "";
    });

    if (INVENTORY_ROLES.includes(normalizeRole(profilePayload.role))) {
      await loadManagerHotels();
    } else {
      setManagerHotels([]);
      setManagerRooms([]);
      setSelectedHotelId("");
    }
  }

  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromHash(Boolean(token));

      const nextMeta = ROUTES.find((item) => item.id === next);
      if (!canAccessRoute(nextMeta)) {
        const fallbackRoute = token ? "overview" : "auth";
        if (typeof window !== "undefined") window.location.hash = `/${fallbackRoute}`;
        setRoute(fallbackRoute);
        return;
      }

      setRoute(next);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", syncRoute);
      if (!window.location.hash) window.location.hash = token ? "/overview" : "/auth";
    }
    syncRoute();
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hashchange", syncRoute);
      }
    };
  }, [token, canAccessInventoryRoute, activeRole]);

  useEffect(() => {
    loadHotels().catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    if (!token) return;
    if (route === "auth") {
      setRouteDirectly("overview");
    }
    loadPrivateData().catch((error) => {
      const message = String(error?.message || "");
      if (/unauthor|forbidden|token|401|403/i.test(message)) {
        localStorage.removeItem("hotel_token");
        localStorage.removeItem("hotel_user");
        setToken("");
        setUser(null);
        setNotice("Session expired. Please sign in again.");
        return;
      }
      setNotice(message || "Unable to load account data.");
    });
  }, [token]);

  useEffect(() => {
    if (!canAccessInventoryRoute) return;
    loadManagerRooms().catch((error) => setNotice(error.message));
  }, [selectedHotelId, canAccessInventoryRoute]);

  useEffect(() => {
    if (!user) {
      setProfileForm({ name: "", phone: "" });
      return;
    }
    setProfileForm({ name: user.name || "", phone: user.phone || "" });
  }, [user?.id, user?.name, user?.phone]);

  async function submitAuth(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const body = authMode === "login" ? { email: authForm.email, password: authForm.password } : authForm;
      const payload = authMode === "login" ? await domainApi.auth.login(body) : await domainApi.auth.signup(body);
      localStorage.setItem("hotel_token", payload.token);
      localStorage.setItem("hotel_user", JSON.stringify(payload.user));
      setToken(payload.token);
      setUser(payload.user);
      setProfileForm({ name: payload.user.name || "", phone: payload.user.phone || "" });
      setNotice(`Signed in as ${payload.user.name}`);
      setRouteDirectly("overview");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("hotel_token");
    localStorage.removeItem("hotel_user");
    setToken("");
    setUser(null);
    setWallet(null);
    setBookings([]);
    setTransactions([]);
    setManagerHotels([]);
    setManagerRooms([]);
    setSelectedHotelId("");
    setHotelEdits({});
    setRoomEdits({});
    setProfileForm({ name: "", phone: "" });
    navigate("auth");
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!token) return;
    setProfileLoading(true);
    try {
      const payload = await domainApi.users.updateMe({
        name: profileForm.name,
        phone: profileForm.phone
      });
      setUser(payload);
      localStorage.setItem("hotel_user", JSON.stringify(payload));
      setNotice("Profile updated");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function topUp() {
    setLoading(true);
    try {
      await domainApi.wallet.topUp({ amount: Number(topUpAmount), idempotencyKey: idempotencyKey("topup") });
      await loadPrivateData();
      setNotice("Wallet topped up");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function ensureInventoryCrudAllowed() {
    if (!canAccessInventoryRoute) {
      setNotice("Inventory actions are available for admin/superadmin roles.");
      return false;
    }
    if (!userCrudLockedByBooking) return true;
    setNotice("Finish your pending booking payment before managing hotels or rooms.");
    return false;
  }

  function startBookingFlow(hotel, room) {
    if (!token) {
      setNotice("Sign in before booking a room");
      navigate("auth");
      return;
    }

    setNotice("");
    setBookingFlow({
      step: "confirm",
      hotelName: hotel.name,
      room,
      bookingId: ""
    });
  }

  function resetBookingFlow() {
    setBookingFlow({
      step: "idle",
      hotelName: "",
      room: null,
      bookingId: ""
    });
  }

  function bookingStepProgress(step) {
    if (step === "confirm") return 2;
    if (step === "payment") return 3;
    if (step === "completed") return 4;
    return 1;
  }

  async function waitForBookingConfirmation(bookingId) {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const paymentState = await domainApi.bookings.getPaymentStatus(bookingId);
      const latest = await domainApi.bookings.getById(bookingId);
      if (latest.status === "CONFIRMED") return latest;
      if (latest.status === "FAILED") {
        throw new Error(paymentState.failureReason ? `Payment failed: ${paymentState.failureReason}` : "Payment failed. Top up wallet and try again.");
      }
      if (latest.status === "CANCELLED") {
        throw new Error("Booking was cancelled before payment completion.");
      }
      await wait(1200);
    }
    throw new Error("Payment is still processing. Check Bookings page in a moment.");
  }

  async function confirmBookingStep() {
    if (!bookingFlow.room) return;

    setLoading(true);
    try {
      const createdBooking = await domainApi.bookings.create({
        roomId: bookingFlow.room.id,
        checkInDate: bookingDraft.checkInDate,
        checkOutDate: bookingDraft.checkOutDate,
        guests: Number(bookingDraft.guests),
        idempotencyKey: idempotencyKey("booking")
      });

      await domainApi.bookings.confirm(createdBooking.id, { idempotencyKey: idempotencyKey("booking-confirm") });
      setBookingFlow((current) => ({
        ...current,
        step: "payment",
        bookingId: createdBooking.id
      }));
      setNotice("Booking confirmed. Proceed to payment to complete your booking.");
    } catch (error) {
      setNotice(error.message);
      resetBookingFlow();
    } finally {
      setLoading(false);
    }
  }

  async function proceedPaymentStep() {
    if (!bookingFlow.bookingId) return;

    setLoading(true);
    try {
      await domainApi.payments.proceed(bookingFlow.bookingId, { idempotencyKey: idempotencyKey("payment") });
      const confirmedBooking = await waitForBookingConfirmation(bookingFlow.bookingId);
      await loadPrivateData();
      setBookingFlow((current) => ({ ...current, step: "completed" }));
      setBookingConfirmedPopup({
        id: confirmedBooking.id,
        hotelName: bookingFlow.hotelName,
        roomType: bookingFlow.room?.type || "",
        totalAmount: confirmedBooking.totalAmount,
        checkInDate: confirmedBooking.checkInDate,
        checkOutDate: confirmedBooking.checkOutDate
      });
      setNotice("Payment completed and your booking is confirmed.");
      resetBookingFlow();
    } catch (error) {
      setNotice(error.message);
      setBookingFailedPopup({
        bookingId: bookingFlow.bookingId,
        hotelName: bookingFlow.hotelName,
        reason: error.message
      });
      await loadPrivateData();
    } finally {
      setLoading(false);
    }
  }

  async function createHotel(event) {
    event.preventDefault();
    if (!ensureInventoryCrudAllowed()) return;
    setLoading(true);
    try {
      const createdHotel = await domainApi.hotels.createHotel({
        ...createHotelForm,
        amenities: parseAmenities(createHotelForm.amenities)
      });
      setCreateHotelForm({ name: "", city: "", country: "", address: "", description: "", amenities: "" });
      await Promise.all([loadManagerHotels(), loadHotels()]);
      setHotels((current) => {
        if (current.some((hotel) => hotel.id === createdHotel.id)) return current;
        const matchesCity = !query.city || createdHotel.city?.toLowerCase() === query.city.toLowerCase();
        if (!matchesCity) return current;
        return [{ ...createdHotel, rooms: [] }, ...current];
      });
      setNotice("Hotel created");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!ensureInventoryCrudAllowed()) return;
    if (!selectedHotelId) {
      setNotice("Select a hotel first");
      return;
    }

    setLoading(true);
    try {
      await domainApi.hotels.createRoom(selectedHotelId, {
        roomNumber: createRoomForm.roomNumber,
        type: createRoomForm.type,
        capacity: Number(createRoomForm.capacity),
        pricePerNight: Number(createRoomForm.pricePerNight),
        amenities: parseAmenities(createRoomForm.amenities)
      });
      setCreateRoomForm((current) => ({ ...current, roomNumber: "", amenities: "" }));
      await Promise.all([loadManagerRooms(selectedHotelId), loadHotels()]);
      setNotice("Room created");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function beginEditHotel(hotel) {
    if (!ensureInventoryCrudAllowed()) return;
    setHotelEdits((current) => ({ ...current, [hotel.id]: hotelFormFromModel(hotel) }));
  }

  function setHotelField(hotelId, key, value) {
    setHotelEdits((current) => ({
      ...current,
      [hotelId]: {
        ...(current[hotelId] || {}),
        [key]: value
      }
    }));
  }

  async function saveHotelEdit(hotelId) {
    if (!ensureInventoryCrudAllowed()) return;
    const draft = hotelEdits[hotelId];
    if (!draft) return;

    setLoading(true);
    try {
      await domainApi.hotels.updateHotel(hotelId, {
        ...draft,
        amenities: parseAmenities(draft.amenities)
      });
      await Promise.all([loadManagerHotels(), loadHotels()]);
      setHotelEdits((current) => {
        const next = { ...current };
        delete next[hotelId];
        return next;
      });
      setNotice("Hotel updated");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeHotel(hotelId) {
    if (!ensureInventoryCrudAllowed()) return;
    setLoading(true);
    try {
      await domainApi.hotels.deleteHotel(hotelId);
      await Promise.all([loadManagerHotels(), loadHotels()]);
      setNotice("Hotel deleted");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function setHotelActive(hotelId, isActive) {
    if (!ensureInventoryCrudAllowed()) return;
    setLoading(true);
    try {
      await domainApi.hotels.updateHotel(hotelId, { isActive });
      await Promise.all([loadManagerHotels(), loadHotels()]);
      setNotice(isActive ? "Hotel activated" : "Hotel deactivated");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function beginEditRoom(room) {
    if (!ensureInventoryCrudAllowed()) return;
    setRoomEdits((current) => ({ ...current, [room.id]: roomFormFromModel(room) }));
  }

  function setRoomField(roomId, key, value) {
    setRoomEdits((current) => ({
      ...current,
      [roomId]: {
        ...(current[roomId] || {}),
        [key]: value
      }
    }));
  }

  async function saveRoomEdit(roomId) {
    if (!ensureInventoryCrudAllowed()) return;
    const draft = roomEdits[roomId];
    if (!draft) return;

    setLoading(true);
    try {
      await domainApi.hotels.updateRoom(roomId, {
        roomNumber: draft.roomNumber,
        type: draft.type,
        capacity: Number(draft.capacity),
        pricePerNight: Number(draft.pricePerNight),
        amenities: parseAmenities(draft.amenities)
      });
      await Promise.all([loadManagerRooms(selectedHotelId), loadHotels()]);
      setRoomEdits((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
      setNotice("Room updated");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeRoom(roomId) {
    if (!ensureInventoryCrudAllowed()) return;
    setLoading(true);
    try {
      await domainApi.hotels.deleteRoom(roomId);
      await Promise.all([loadManagerRooms(selectedHotelId), loadHotels()]);
      setNotice("Room deleted");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function setRoomActive(roomId, isActive) {
    if (!ensureInventoryCrudAllowed()) return;
    setLoading(true);
    try {
      await domainApi.hotels.updateRoom(roomId, { isActive });
      await Promise.all([loadManagerRooms(selectedHotelId), loadHotels()]);
      setNotice(isActive ? "Room activated" : "Room deactivated");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(bookingId) {
    setLoading(true);
    try {
      await domainApi.bookings.cancel(bookingId);
      await loadPrivateData();
      setNotice("Booking cancelled");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function renderAuthPage() {
    if (token && user) {
      return (
        <div className="single-page auth-layout">
          <section className="panel-block auth-intro">
            <div className="section-title">
              <ShieldCheck size={18} />
              <h2>You are already signed in</h2>
            </div>
            <p>{user.name} is active as {normalizeRole(user.role)}.</p>
            <div className="row-actions">
              <button type="button" className="primary-button" onClick={() => navigate("overview")}>
                Open Dashboard
              </button>
              <button type="button" className="icon-button" onClick={logout}>
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="single-page auth-layout">
        <section className="panel-block auth-intro">
          <div className="section-title">
            <Building2 size={18} />
            <h2>Welcome to StayFlow</h2>
          </div>
          <p>Manage hotel operations with clean role-based access for guests, admins, and superadmins.</p>
          <div className="capability-list">
            <span>Auth-first protected routing</span>
            <span>Hotel and room CRUD by role</span>
            <span>Bookings, wallet, and profile pages</span>
          </div>
        </section>
        <form className="panel-block narrow-panel" onSubmit={submitAuth}>
          <div className="section-title">
            <CreditCard size={18} />
            <h2>{authMode === "login" ? "Sign In" : "Create Account"}</h2>
          </div>
          <div className="segmented">
            <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
            <button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>Signup</button>
          </div>
          {authMode === "signup" && (
            <>
              <input placeholder="Name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
              <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                <option value="USER">User</option>
              </select>
            </>
          )}
          <input placeholder="Email" type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
          <input placeholder="Password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
          <button className="primary-button" disabled={loading}>{authMode === "login" ? "Login" : "Signup"}</button>
        </form>
      </div>
    );
  }

  function renderOverviewPage() {
    return (
      <div className="single-page page-stack">
        <div className="summary-grid">
          <div className="summary-tile">
            <span>Role</span>
            <strong>{roleDashboard.title.replace(" Dashboard", "")}</strong>
          </div>
          <div className="summary-tile">
            <span>Hotels</span>
            <strong>{hotels.length}</strong>
          </div>
          <div className="summary-tile">
            <span>Bookings</span>
            <strong>{bookings.length}</strong>
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <Building2 size={18} />
            <h2>{roleDashboard.title}</h2>
          </div>
          <div className="capability-list">
            {roleDashboard.capabilities.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="row-actions">
            {ROUTES.filter((item) => item.requiresAuth && item.id !== "overview").map((item) => {
              const Icon = item.icon;
              if (!canAccessRoute(item)) return null;
              return (
                <button key={item.id} type="button" className="icon-button" onClick={() => navigate(item.id)}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderHotelsPage() {
    const stepProgress = bookingStepProgress(bookingFlow.step);
    return (
      <div className="single-page page-stack">
        <div className="toolbar">
          <div className="section-title">
            <Search size={18} />
            <h1>Hotels</h1>
          </div>
          <div className="toolbar-controls">
            <input placeholder="City" value={query.city} onChange={(event) => setQuery({ ...query, city: event.target.value })} />
            <input type="number" min="1" value={query.guests} onChange={(event) => setQuery({ ...query, guests: event.target.value })} />
            <button className="icon-button filled" onClick={loadHotels} title="Search hotels">
              <Search size={18} />
            </button>
            <button className="icon-button" onClick={loadPrivateData} title="Refresh account data" disabled={!token}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="booking-strip">
          <label>
            Check-in
            <input type="date" value={bookingDraft.checkInDate} onChange={(event) => setBookingDraft({ ...bookingDraft, checkInDate: event.target.value })} />
          </label>
          <label>
            Check-out
            <input type="date" value={bookingDraft.checkOutDate} onChange={(event) => setBookingDraft({ ...bookingDraft, checkOutDate: event.target.value })} />
          </label>
          <label>
            Guests
            <input type="number" min="1" value={bookingDraft.guests} onChange={(event) => setBookingDraft({ ...bookingDraft, guests: event.target.value })} />
          </label>
        </div>

        {bookingFlow.step !== "idle" && (
          <div className="panel-block booking-flow-card">
            <div className="section-title">
              <CalendarCheck size={18} />
              <h2>Booking Payment Flow</h2>
            </div>

            <div className="booking-step-track">
              {BOOKING_FLOW_STEPS.map((label, index) => {
                const stepNumber = index + 1;
                const stateClass = stepNumber < stepProgress ? "done" : stepNumber === stepProgress ? "active" : "";
                return (
                  <span key={label} className={`booking-step-chip ${stateClass}`.trim()}>
                    {stepNumber}. {label}
                  </span>
                );
              })}
            </div>

            <div className="booking-focus">
              <strong>{bookingFlow.hotelName}</strong>
              {bookingFlow.room && (
                <span>
                  {bookingFlow.room.type} · {bookingFlow.room.capacity} guests · ${bookingFlow.room.pricePerNight}/night
                </span>
              )}
            </div>

            <div className="booking-flow-actions">
              {bookingFlow.step === "confirm" && (
                <>
                  <button type="button" className="icon-button" onClick={resetBookingFlow} disabled={loading}>Cancel</button>
                  <button type="button" className="primary-button" onClick={confirmBookingStep} disabled={loading}>
                    Confirm Booking
                  </button>
                </>
              )}
              {bookingFlow.step === "payment" && (
                <button type="button" className="primary-button" onClick={proceedPaymentStep} disabled={loading}>
                  {loading ? "Processing payment..." : "Proceed to Payment"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="hotel-grid">
          {hotels.map((hotel) => (
            <article className="hotel-card" key={hotel.id}>
              <div>
                <h3>{hotel.name}</h3>
                <p>{hotel.city}, {hotel.country}</p>
                <p>{hotel.description || hotel.address || "Owner-managed property"}</p>
              </div>
              <div className="amenities">{hotel.amenities?.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
              <div className="room-list">
                {(hotel.rooms || []).map((room) => (
                  <div className="room-row" key={room.id}>
                    <BedDouble size={18} />
                    <span>{room.type} · {room.capacity} guests · ${room.pricePerNight}/night</span>
                    <button className="icon-button filled" onClick={() => startBookingFlow(hotel, room)} title="Book room" disabled={loading}>
                      <CalendarCheck size={18} />
                    </button>
                  </div>
                ))}
                {hotel.rooms?.length === 0 && <p>No rooms match the current guest count.</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderBookingsPage() {
    const visibleBookings = bookings.filter((booking) => {
      if (bookingFilter === "ALL") return true;
      if (bookingFilter === "ACTIVE") return ["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status);
      if (bookingFilter === "PAYMENT_ISSUES") return ["FAILED", "CANCELLED"].includes(booking.status) || ["FAILED", "REFUNDED"].includes(booking.paymentStatus);
      return booking.status === bookingFilter;
    });
    const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId) || visibleBookings[0] || bookings[0];
    const confirmedCount = bookings.filter((booking) => booking.status === "CONFIRMED").length;
    const pendingCount = bookings.filter((booking) => booking.status === "PENDING_PAYMENT").length;
    const failedCount = bookings.filter((booking) => ["FAILED", "CANCELLED"].includes(booking.status)).length;
    const totalRevenue = bookings
      .filter((booking) => booking.status === "CONFIRMED")
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
    const averageBookingValue = confirmedCount > 0 ? totalRevenue / confirmedCount : 0;
    const selectedProgress = selectedBooking?.status === "CONFIRMED"
      ? 3
      : ["FAILED", "CANCELLED"].includes(selectedBooking?.status)
        ? 3
        : selectedBooking?.paymentStatus === "PROCESSING"
          ? 2
          : 1;

    return (
      <div className="single-page booking-dashboard">
        <div className="booking-hero panel-block">
          <div>
            <div className="section-title">
              <CalendarCheck size={18} />
              <h1>{activeRole === "SUPERADMIN" ? "Platform Booking Center" : activeRole === "ADMIN" ? "Managed Booking Center" : "Booking Center"}</h1>
            </div>
            <p>Track booking lifecycle, payment state, stay details, and operational identifiers from one screen.</p>
          </div>
          <div className="booking-hero-actions">
            <button type="button" className="icon-button" onClick={loadPrivateData} disabled={loading} title="Refresh bookings">
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button type="button" className="primary-button" onClick={() => navigate("hotels")}>
              New Booking
            </button>
          </div>
        </div>

        <div className="summary-grid booking-summary">
          <div className="summary-tile">
            <span>Total Bookings</span>
            <strong>{bookings.length}</strong>
          </div>
          <div className="summary-tile">
            <span>Confirmed</span>
            <strong>{confirmedCount}</strong>
          </div>
          <div className="summary-tile">
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
          <div className="summary-tile">
            <span>Issues</span>
            <strong>{failedCount}</strong>
          </div>
          <div className="summary-tile">
            <span>Confirmed Value</span>
            <strong>{money(totalRevenue)}</strong>
          </div>
          <div className="summary-tile">
            <span>Average Value</span>
            <strong>{money(averageBookingValue)}</strong>
          </div>
        </div>

        <div className="panel-block booking-control-panel">
          <div className="section-title">
            <CalendarCheck size={18} />
            <h2>{activeRole === "SUPERADMIN" ? "All Platform Bookings" : activeRole === "ADMIN" ? "Managed Bookings" : "My Bookings"}</h2>
          </div>
          <span className="booking-showing-count">
            Showing {visibleBookings.length} of {bookings.length}
          </span>
          <div className="booking-filters">
            {["ALL", "ACTIVE", "PENDING_PAYMENT", "CONFIRMED", "PAYMENT_ISSUES"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={bookingFilter === filter ? "active" : ""}
                onClick={() => setBookingFilter(filter)}
              >
                {filter.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="booking-layout">
          <div className="booking-list-panel panel-block">
            <div className="section-title">
              <Search size={18} />
              <h2>Booking Queue</h2>
            </div>
            <div className="booking-card-list">
              {visibleBookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  className={selectedBooking?.id === booking.id ? "booking-list-card active" : "booking-list-card"}
                  onClick={() => setSelectedBookingId(booking.id)}
                >
                  <span className="booking-list-main">
                    <strong>{formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}</strong>
                    <small>#{shortId(booking.id)} · {booking.guests} guests · {booking.nights} nights</small>
                    <small className="booking-list-payment">Payment: {booking.paymentStatus} · {money(booking.totalAmount)}</small>
                  </span>
                  <span className={`status-badge status-${statusClass(booking.status)}`}>{booking.status}</span>
                </button>
              ))}
              {visibleBookings.length === 0 && <p className="empty-state">No bookings match this filter.</p>}
            </div>
          </div>

          <div className="booking-detail-panel panel-block">
            {selectedBooking ? (
              <>
                <div className="booking-detail-header">
                  <div>
                    <div className="section-title">
                      <CalendarCheck size={18} />
                      <h2>Booking Detail</h2>
                    </div>
                    <p>Booking #{shortId(selectedBooking.id)}</p>
                  </div>
                  <div className="booking-amount-card">
                    <span>Total</span>
                    <strong>{money(selectedBooking.totalAmount)}</strong>
                  </div>
                  <div className="booking-status-stack">
                    <span className={`status-badge status-${statusClass(selectedBooking.status)}`}>{selectedBooking.status}</span>
                    <span className={`status-badge status-${statusClass(selectedBooking.paymentStatus)}`}>{selectedBooking.paymentStatus}</span>
                  </div>
                </div>

                <div className="booking-timeline">
                  {["Created", "Payment", "Final State"].map((step, index) => {
                    const isDone = index + 1 <= selectedProgress;
                    return (
                      <span key={step} className={isDone ? "done" : ""}>
                        {index + 1}. {step}
                      </span>
                    );
                  })}
                </div>

                <div className="booking-section-title">Stay Details</div>
                <div className="booking-detail-grid">
                  <div className="booking-detail-item">
                    <span>Stay Dates</span>
                    <strong>{formatDate(selectedBooking.checkInDate)} - {formatDate(selectedBooking.checkOutDate)}</strong>
                  </div>
                  <div className="booking-detail-item">
                    <span>Guests / Nights</span>
                    <strong>{selectedBooking.guests} guests · {selectedBooking.nights} nights</strong>
                  </div>
                  <div className="booking-detail-item">
                    <span>Total Amount</span>
                    <strong>{money(selectedBooking.totalAmount)}</strong>
                  </div>
                  <div className="booking-detail-item">
                    <span>Created</span>
                    <strong>{formatDateTime(selectedBooking.createdAt)}</strong>
                  </div>
                </div>

                <div className="booking-section-title">Resource References</div>
                <div className="booking-detail-grid">
                  <div className="booking-detail-item">
                    <span>Hotel ID</span>
                    <strong title={selectedBooking.hotelId}>{shortId(selectedBooking.hotelId)}</strong>
                  </div>
                  <div className="booking-detail-item">
                    <span>Room ID</span>
                    <strong title={selectedBooking.roomId}>{shortId(selectedBooking.roomId)}</strong>
                  </div>
                  {(activeRole === "ADMIN" || activeRole === "SUPERADMIN") && (
                    <>
                      <div className="booking-detail-item">
                        <span>User ID</span>
                        <strong title={selectedBooking.userId}>{shortId(selectedBooking.userId)}</strong>
                      </div>
                      <div className="booking-detail-item">
                        <span>Owner ID</span>
                        <strong title={selectedBooking.ownerId}>{shortId(selectedBooking.ownerId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedBooking.lockExpiresAt && (
                    <div className="booking-detail-item">
                      <span>Room Lock Expires</span>
                      <strong>{formatDateTime(selectedBooking.lockExpiresAt)}</strong>
                    </div>
                  )}
                  {selectedBooking.failureReason && (
                    <div className="booking-detail-item issue">
                      <span>Failure Reason</span>
                      <strong>{selectedBooking.failureReason}</strong>
                    </div>
                  )}
                </div>

                <div className="booking-detail-actions">
                  <button type="button" className="icon-button" onClick={() => domainApi.bookings.getPaymentStatus(selectedBooking.id).then((payload) => setNotice(`Payment: ${payload.paymentStatus}; Booking: ${payload.status}`)).catch((error) => setNotice(error.message))}>
                    <CreditCard size={16} />
                    <span>Check Payment</span>
                  </button>
                  {["PENDING_PAYMENT", "CONFIRMED"].includes(selectedBooking.status) && (
                    <button type="button" className="icon-button" onClick={() => cancelBooking(selectedBooking.id)} disabled={loading}>
                      <Trash2 size={16} />
                      <span>Cancel Booking</span>
                    </button>
                  )}
                  <button type="button" className="primary-button" onClick={() => navigate("hotels")}>
                    Book Another Room
                  </button>
                </div>
              </>
            ) : (
              <p className="empty-state">No bookings yet. Create a booking from the hotel screen.</p>
            )}
          </div>
        </div>

        <div className="panel-block booking-table-panel">
          <div className="section-title">
            <CreditCard size={18} />
            <h2>Booking Ledger</h2>
          </div>
          <div className="booking-ledger">
            <div className="booking-ledger-head">
              <span>Booking</span>
              <span>Dates</span>
              <span>Payment</span>
              <span>Amount</span>
            </div>
            {visibleBookings.map((booking) => (
              <button key={booking.id} type="button" className="booking-ledger-row" onClick={() => setSelectedBookingId(booking.id)}>
                <span>{booking.id}</span>
                <span>{formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}</span>
                <span className={`status-badge status-${statusClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                <strong>{money(booking.totalAmount)}</strong>
              </button>
            ))}
            {visibleBookings.length === 0 && <p className="empty-state">No ledger rows for this filter.</p>}
          </div>
        </div>
      </div>
    );
  }
  function renderWalletPage() {
    return (
      <div className="single-page page-stack">
        <div className="panel-block narrow-panel">
          <div className="section-title">
            <Wallet size={18} />
            <h2>Wallet</h2>
          </div>
          <div className="metric">${wallet?.balance?.toFixed?.(2) || "0.00"}</div>
          <div className="inline-controls">
            <input type="number" min="1" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} />
            <button className="icon-button filled" onClick={topUp} title="Top up wallet" disabled={!token || loading}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="panel-block">
          <div className="section-title">
            <CreditCard size={18} />
            <h2>Transactions</h2>
          </div>
          <div className="table-list">
            {transactions.slice(0, 20).map((transaction) => (
              <div className="table-row" key={transaction.id}>
                <span>{transaction.type}</span>
                <strong>${transaction.amount}</strong>
                <span className={`status-badge status-${transaction.status.toLowerCase()}`}>{transaction.status}</span>
              </div>
            ))}
            {transactions.length === 0 && <p>No transactions yet.</p>}
          </div>
        </div>
      </div>
    );
  }

  function renderProfilePage() {
    return (
      <div className="single-page">
        <form className="panel-block narrow-panel" onSubmit={saveProfile}>
          <div className="section-title">
            <User size={18} />
            <h2>Profile</h2>
          </div>
          <input value={profileForm.name} placeholder="Name" onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} disabled={!token} />
          <input value={profileForm.phone} placeholder="Phone" onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} disabled={!token} />
          <input value={user?.email || ""} placeholder="Email" disabled />
          <input value={activeRole} placeholder="Role" disabled />
          <button className="primary-button" disabled={!token || profileLoading}>
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    );
  }

  function renderServicesPage() {
    return (
      <div className="single-page">
        <div className="panel-block">
          <div className="section-title">
            <Building2 size={18} />
            <h2>Gateway Service Flow</h2>
          </div>
          <pre className="service-flow">{SERVICE_FLOW}</pre>
        </div>
      </div>
    );
  }

  function renderInventoryPage() {
    if (!canAccessInventoryRoute) {
      return (
        <div className="single-page">
          <div className="panel-block narrow-panel">
            <div className="section-title">
              <Building2 size={18} />
              <h2>Inventory Access</h2>
            </div>
            <p>This page is available for admin and superadmin roles.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="single-page inventory-page">
        {userCrudLockedByBooking && (
          <div className="panel-block narrow-panel crud-lock-note">
            <div className="section-title">
              <CalendarCheck size={18} />
              <h2>Inventory Locked During Booking Payment</h2>
            </div>
            <p>For user role, hotel and room CRUD is disabled while payment is pending. Complete booking payment first.</p>
            <button type="button" className="primary-button" onClick={() => navigate("bookings")}>Open Bookings</button>
          </div>
        )}

        <div className="inventory-toolbar panel-block">
          <div className="section-title">
            <Building2 size={18} />
            <h2>Inventory Control</h2>
          </div>
          <div className="summary-grid inventory-summary">
            <div className="summary-tile">
              <span>Managed Hotels</span>
              <strong>{managerHotels.length}</strong>
            </div>
            <div className="summary-tile">
              <span>Selected Rooms</span>
              <strong>{managerRooms.length}</strong>
            </div>
            <div className="summary-tile">
              <span>Access</span>
              <strong>{activeRole}</strong>
            </div>
          </div>
        </div>

        <div className="owner-band inventory-grid">
          <form className="panel-block crud-panel" onSubmit={createHotel}>
            <div className="section-title">
              <Building2 size={18} />
              <h2>Hotels</h2>
            </div>
            <div className="crud-form-grid">
              <label>Hotel name<input placeholder="Hotel name" value={createHotelForm.name} onChange={(event) => setCreateHotelForm({ ...createHotelForm, name: event.target.value })} disabled={userCrudLockedByBooking} /></label>
              <label>City<input placeholder="City" value={createHotelForm.city} onChange={(event) => setCreateHotelForm({ ...createHotelForm, city: event.target.value })} disabled={userCrudLockedByBooking} /></label>
              <label>Country<input placeholder="Country" value={createHotelForm.country} onChange={(event) => setCreateHotelForm({ ...createHotelForm, country: event.target.value })} disabled={userCrudLockedByBooking} /></label>
              <label>Address<input placeholder="Address" value={createHotelForm.address} onChange={(event) => setCreateHotelForm({ ...createHotelForm, address: event.target.value })} disabled={userCrudLockedByBooking} /></label>
              <label className="wide-field">Description<input placeholder="Description" value={createHotelForm.description} onChange={(event) => setCreateHotelForm({ ...createHotelForm, description: event.target.value })} disabled={userCrudLockedByBooking} /></label>
              <label className="wide-field">Amenities<input placeholder="Wifi, parking, breakfast" value={createHotelForm.amenities} onChange={(event) => setCreateHotelForm({ ...createHotelForm, amenities: event.target.value })} disabled={userCrudLockedByBooking} /></label>
            </div>
            <button className="primary-button" disabled={loading || userCrudLockedByBooking}>Create Hotel</button>

            <div className="table-list manager-list">
              {managerHotels.map((hotel) => {
                const edit = hotelEdits[hotel.id];
                return (
                  <div className={selectedHotelId === hotel.id ? "manager-card selected" : "manager-card"} key={hotel.id}>
                    {edit ? (
                      <>
                        <input value={edit.name} onChange={(event) => setHotelField(hotel.id, "name", event.target.value)} />
                        <input value={edit.city} onChange={(event) => setHotelField(hotel.id, "city", event.target.value)} />
                        <input value={edit.country} onChange={(event) => setHotelField(hotel.id, "country", event.target.value)} />
                        <input value={edit.address} onChange={(event) => setHotelField(hotel.id, "address", event.target.value)} />
                        <input value={edit.description} onChange={(event) => setHotelField(hotel.id, "description", event.target.value)} />
                        <input value={edit.amenities} onChange={(event) => setHotelField(hotel.id, "amenities", event.target.value)} />
                        <div className="row-actions">
                          <button type="button" className="icon-button filled" onClick={() => saveHotelEdit(hotel.id)} title="Save hotel">
                            <RefreshCw size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setHotelEdits((current) => {
                              const next = { ...current };
                              delete next[hotel.id];
                              return next;
                            })}
                            title="Cancel edit"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>{hotel.name}</strong>
                        <span>{hotel.city}, {hotel.country}</span>
                        <span>{hotel.address || "No address"}</span>
                        <span className={hotel.isActive ? "inventory-state active" : "inventory-state inactive"}>{hotel.isActive ? "Active" : "Inactive"}</span>
                        <div className="row-actions">
                          <button
                            type="button"
                            className={selectedHotelId === hotel.id ? "icon-button filled" : "icon-button"}
                            onClick={() => {
                              setSelectedHotelId(hotel.id);
                              loadManagerRooms(hotel.id).catch((error) => setNotice(error.message));
                            }}
                            title="Manage rooms"
                          >
                            Rooms
                          </button>
                          <button type="button" className="icon-button" onClick={() => beginEditHotel(hotel)} title="Edit hotel">
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-button" onClick={() => setHotelActive(hotel.id, !hotel.isActive)} title={hotel.isActive ? "Deactivate hotel" : "Activate hotel"} disabled={userCrudLockedByBooking || loading}>
                            {hotel.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" className="icon-button" onClick={() => removeHotel(hotel.id)} title="Deactivate hotel and rooms" disabled={userCrudLockedByBooking}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {managerHotels.length === 0 && <p className="empty-state">No managed hotels yet. Create a hotel to start adding rooms.</p>}
            </div>
          </form>

          <form className="panel-block crud-panel" onSubmit={createRoom}>
            <div className="section-title">
              <BedDouble size={18} />
              <h2>Rooms</h2>
            </div>
            <label>Hotel
              <select value={selectedHotelId} onChange={(event) => setSelectedHotelId(event.target.value)} disabled={userCrudLockedByBooking}>
                <option value="">Select hotel</option>
                {managerHotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>
                ))}
              </select>
            </label>
            <div className="crud-form-grid">
              <label>Room number<input placeholder="101" value={createRoomForm.roomNumber} onChange={(event) => setCreateRoomForm({ ...createRoomForm, roomNumber: event.target.value })} disabled={userCrudLockedByBooking || !selectedHotelId} /></label>
              <label>Type
                <select value={createRoomForm.type} onChange={(event) => setCreateRoomForm({ ...createRoomForm, type: event.target.value })} disabled={userCrudLockedByBooking || !selectedHotelId}>
                  <option value="STANDARD">Standard</option>
                  <option value="DELUXE">Deluxe</option>
                  <option value="SUITE">Suite</option>
                </select>
              </label>
              <label>Capacity<input type="number" min="1" value={createRoomForm.capacity} onChange={(event) => setCreateRoomForm({ ...createRoomForm, capacity: event.target.value })} disabled={userCrudLockedByBooking || !selectedHotelId} /></label>
              <label>Price/night<input type="number" min="1" value={createRoomForm.pricePerNight} onChange={(event) => setCreateRoomForm({ ...createRoomForm, pricePerNight: event.target.value })} disabled={userCrudLockedByBooking || !selectedHotelId} /></label>
              <label className="wide-field">Amenities<input placeholder="Balcony, desk, minibar" value={createRoomForm.amenities} onChange={(event) => setCreateRoomForm({ ...createRoomForm, amenities: event.target.value })} disabled={userCrudLockedByBooking || !selectedHotelId} /></label>
            </div>
            <button className="primary-button" disabled={loading || !selectedHotelId || userCrudLockedByBooking}>Create Room</button>

            <div className="table-list manager-list">
              {managerRooms.map((room) => {
                const edit = roomEdits[room.id];
                return (
                  <div className="manager-card" key={room.id}>
                    {edit ? (
                      <>
                        <input value={edit.roomNumber} onChange={(event) => setRoomField(room.id, "roomNumber", event.target.value)} />
                        <select value={edit.type} onChange={(event) => setRoomField(room.id, "type", event.target.value)}>
                          <option value="STANDARD">Standard</option>
                          <option value="DELUXE">Deluxe</option>
                          <option value="SUITE">Suite</option>
                        </select>
                        <input type="number" min="1" value={edit.capacity} onChange={(event) => setRoomField(room.id, "capacity", event.target.value)} />
                        <input type="number" min="1" value={edit.pricePerNight} onChange={(event) => setRoomField(room.id, "pricePerNight", event.target.value)} />
                        <input value={edit.amenities} onChange={(event) => setRoomField(room.id, "amenities", event.target.value)} />
                        <div className="row-actions">
                          <button type="button" className="icon-button filled" onClick={() => saveRoomEdit(room.id)} title="Save room">
                            <RefreshCw size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setRoomEdits((current) => {
                              const next = { ...current };
                              delete next[room.id];
                              return next;
                            })}
                            title="Cancel edit"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>#{room.roomNumber} · {room.type}</strong>
                        <span>{room.capacity} guests · ${room.pricePerNight}/night</span>
                        <span>{toAmenitiesText(room.amenities) || "No amenities"}</span>
                        <span className={room.isActive ? "inventory-state active" : "inventory-state inactive"}>{room.isActive ? "Active" : "Inactive"}</span>
                        <div className="row-actions">
                          <button type="button" className="icon-button" onClick={() => beginEditRoom(room)} title="Edit room">
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-button" onClick={() => setRoomActive(room.id, !room.isActive)} title={room.isActive ? "Deactivate room" : "Activate room"} disabled={userCrudLockedByBooking || loading}>
                            {room.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" className="icon-button" onClick={() => removeRoom(room.id)} title="Deactivate room" disabled={userCrudLockedByBooking}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {selectedHotelId && managerRooms.length === 0 && <p className="empty-state">No rooms yet for this hotel.</p>}
              {!selectedHotelId && <p className="empty-state">Select a hotel to manage rooms.</p>}
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderCurrentPage() {
    const routeMeta = ROUTES.find((item) => item.id === route);
    if (!canAccessRoute(routeMeta)) {
      return token ? renderOverviewPage() : renderAuthPage();
    }

    switch (route) {
      case "auth":
        return renderAuthPage();
      case "hotels":
        return renderHotelsPage();
      case "bookings":
        return renderBookingsPage();
      case "wallet":
        return renderWalletPage();
      case "profile":
        return renderProfilePage();
      case "inventory":
        return renderInventoryPage();
      case "services":
        return renderServicesPage();
      default:
        return renderOverviewPage();
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Building2 size={18} />
          </span>
          <span className="brand-copy">
            <strong>StayFlow</strong>
            <small>Hotel Operations Dashboard</small>
          </span>
        </div>
        <div className="account">
          <span className="api-pill">API {domainApi.baseUrl || "same origin"}</span>
          {user ? (
            <>
              <span className="user-pill">
                <span className="user-avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</span>
                <span className="user-meta">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </span>
              </span>
              <button className="icon-button" onClick={logout} title="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <span className="guest-pill">Guest session</span>
          )}
        </div>
      </nav>

      <div className="page-nav">
        {(token ? ROUTES.filter((item) => item.id !== "auth") : ROUTES.filter((item) => item.id === "auth"))
          .filter((item) => canAccessRoute(item))
          .map((item) => {
          const disabled = !canAccessRoute(item);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={route === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              title={disabled ? "Sign in or switch role to access" : undefined}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {notice && <div className="notice">{notice}</div>}

      <section className="page-content">{renderCurrentPage()}</section>

      {bookingConfirmedPopup && (
        <div className="booking-popup-backdrop">
          <div className="booking-popup">
            <div className="section-title">
              <CalendarCheck size={18} />
              <h2>Your Booking Is Confirmed</h2>
            </div>
            <p>Booking ID: {bookingConfirmedPopup.id}</p>
            <p>{bookingConfirmedPopup.hotelName}</p>
            <p>Room Type: {bookingConfirmedPopup.roomType}</p>
            <p>
              {new Date(bookingConfirmedPopup.checkInDate).toLocaleDateString()} to {new Date(bookingConfirmedPopup.checkOutDate).toLocaleDateString()}
            </p>
            <p>Total paid: ${bookingConfirmedPopup.totalAmount}</p>
            <div className="booking-flow-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => setBookingConfirmedPopup(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setBookingConfirmedPopup(null);
                  navigate("bookings");
                }}
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingFailedPopup && (
        <div className="booking-popup-backdrop">
          <div className="booking-popup">
            <div className="section-title">
              <CalendarCheck size={18} />
              <h2>Payment Failed</h2>
            </div>
            <p>Your booking could not be confirmed.</p>
            <p>Booking ID: {bookingFailedPopup.bookingId}</p>
            <p>{bookingFailedPopup.hotelName}</p>
            <p>Reason: {bookingFailedPopup.reason}</p>
            <div className="booking-flow-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setBookingFailedPopup(null);
                  navigate("wallet");
                }}
              >
                Top Up Wallet
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setBookingFailedPopup(null);
                  resetBookingFlow();
                  navigate("hotels");
                }}
              >
                Try Again
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const bookingId = bookingFailedPopup.bookingId;
                  setBookingFailedPopup(null);
                  try {
                    await domainApi.bookings.cancel(bookingId);
                    await loadPrivateData();
                    setNotice("Booking cancelled.");
                    resetBookingFlow();
                    navigate("bookings");
                  } catch (error) {
                    setNotice(error.message);
                  }
                }}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

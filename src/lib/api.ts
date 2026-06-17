import { clearStoredSession, getStoredSession, storeSession } from '@/lib/auth-storage';

export const globalLoaderState = {
  activeRequests: 0,
  show() {
    this.activeRequests++;
    window.dispatchEvent(new CustomEvent('global-loader', { detail: true }));
  },
  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      window.dispatchEvent(new CustomEvent('global-loader', { detail: false }));
    }
  }
};
import type {
  ApiResponse,
  AuthSession,
  AssignUserRolesPayload,
  AvailableRoomType,
  Booking,
  BookingQuote,
  BulkCreateRoomsPayload,
  CancelBookingPayload,
  CheckoutBookingPayload,
  CreateBookingPayload,
  CreateRolePayload,
  CreateUserPayload,
  DashboardStats,
  ExtraService,
  HotelSummary,
  LoginPayload,
  Module,
  PageResponse,
  Permission,
  PermissionPayload,
  RatePlan,
  Role,
  Room,
  RoomImage,
  RoomType,
  RoomUpgrade,
  SendTestEmailPayload,
  EmailTestSendResult,
  EmailTestTemplateSample,
  GalleryImage,
  UpdateRolePayload,
  UpdateUserPayload,
  UpdateBookingPayload,
  UpsertModulePayload,
  UpsertGalleryImagePayload,
  UploadGalleryImagesPayload,
  UpsertRoomPayload,
  UpsertRoomTypePayload,
  UserAccess,
  User,
} from '@/lib/api-types';

import { getApiBaseUrl } from '@/config/env';

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  retry?: boolean;
};

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || payload?.success === false) {
    const validationMessage = payload?.errors
      ? Object.entries(payload.errors)
          .filter(([field]) => field !== 'errorCode')
          .flatMap(([, messages]) => messages)
          .find(Boolean)
      : undefined;
    const fallbackMessage =
      response.status === 401
        ? 'Authentication is required. Please log in and try again.'
        : response.status === 403
          ? 'You do not have permission to perform this action.'
          : response.status >= 500
            ? 'The server could not complete the request. Please try again.'
            : 'The request could not be completed. Please check the entered values.';
    throw new ApiError(payload?.message || validationMessage || fallbackMessage, response.status, payload?.errors);
  }
  return payload ?? { success: true, code: response.status, message: response.statusText };
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const session = getStoredSession();
      if (!session?.refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        clearStoredSession();
        return null;
      }

      const payload = await parseResponse<AuthSession>(response);
      if (!payload.data?.token) return null;

      const nextSession = { ...session, ...payload.data };
      storeSession(nextSession);
      return nextSession.token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const isMutation = options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE';
  if (isMutation) globalLoaderState.show();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401 && !options.skipAuth && options.retry !== false) {
      const token = await refreshAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        return (await parseResponse<T>(retryResponse)).data as T;
      }
      clearStoredSession();
    }

    return (await parseResponse<T>(response)).data as T;
  } finally {
    if (isMutation) globalLoaderState.hide();
  }
}

export const api = {
  login(payload: LoginPayload) {
    return apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  register(payload: CreateUserPayload) {
    return apiRequest<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  profile() {
    return apiRequest<UserAccess>('/auth/profile');
  },
  listUsers(page = 0, size = 20) {
    return apiRequest<PageResponse<User>>(`/users?page=${page}&size=${size}&sortBy=createdAt&sortDir=desc`);
  },
  getUser(id: number) {
    return apiRequest<User>(`/users/${id}`);
  },
  createUser(payload: CreateUserPayload) {
    return apiRequest<User>('/users', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateUser(id: number, payload: UpdateUserPayload) {
    return apiRequest<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteUser(id: number) {
    return apiRequest<void>(`/users/${id}`, { method: 'DELETE' });
  },
  getUserAccess(id: number) {
    return apiRequest<UserAccess>(`/users/${id}/access`);
  },
  assignUserRoles(id: number, payload: AssignUserRolesPayload) {
    return apiRequest<UserAccess>(`/users/${id}/roles`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  listRoles() {
    return apiRequest<Role[]>('/roles');
  },
  getRole(id: number) {
    return apiRequest<Role>(`/roles/${id}`);
  },
  createRole(payload: CreateRolePayload) {
    return apiRequest<Role>('/roles', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateRole(id: number, payload: UpdateRolePayload) {
    return apiRequest<Role>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteRole(id: number) {
    return apiRequest<void>(`/roles/${id}`, { method: 'DELETE' });
  },
  listModules() {
    return apiRequest<Module[]>('/modules');
  },
  getModule(id: number) {
    return apiRequest<Module>(`/modules/${id}`);
  },
  createModule(payload: UpsertModulePayload) {
    return apiRequest<Module>('/modules', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateModule(id: number, payload: UpsertModulePayload) {
    return apiRequest<Module>(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteModule(id: number) {
    return apiRequest<void>(`/modules/${id}`, { method: 'DELETE' });
  },
  listPermissions(roleId: number) {
    return apiRequest<Permission[]>(`/roles/${roleId}/permissions`);
  },
  savePermission(roleId: number, payload: PermissionPayload, existing: Permission | undefined) {
    const method = existing ? 'PUT' : 'POST';
    const path = existing ? `/roles/${roleId}/permissions/${payload.moduleId}` : `/roles/${roleId}/permissions`;
    return apiRequest<Permission>(path, { method, body: JSON.stringify(payload) });
  },
  deletePermission(roleId: number, moduleId: number) {
    return apiRequest<void>(`/roles/${roleId}/permissions/${moduleId}`, { method: 'DELETE' });
  },
  listRooms(filters: {
    page?: number;
    size?: number;
    hotelId?: number;
    roomTypeId?: number;
    roomNumber?: string;
    roomStatus?: number;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 10),
    });
    if (filters.hotelId) params.set('hotelId', String(filters.hotelId));
    if (filters.roomTypeId) params.set('roomTypeId', String(filters.roomTypeId));
    if (filters.roomNumber?.trim()) params.set('roomNumber', filters.roomNumber.trim());
    if (filters.roomStatus) params.set('roomStatus', String(filters.roomStatus));
    return apiRequest<PageResponse<Room>>(`/rooms?${params.toString()}`);
  },
  getRoom(id: number) {
    return apiRequest<Room>(`/rooms/${id}`);
  },
  createRoom(payload: UpsertRoomPayload) {
    return apiRequest<Room>('/rooms', { method: 'POST', body: JSON.stringify(payload) });
  },
  createRooms(payload: BulkCreateRoomsPayload) {
    return apiRequest<Room[]>('/rooms/bulk', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateRoom(id: number, payload: UpsertRoomPayload) {
    return apiRequest<Room>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteRoom(id: number) {
    return apiRequest<void>(`/rooms/${id}`, { method: 'DELETE' });
  },
  deleteRooms(roomIds: number[]) {
    return apiRequest<void>('/rooms/bulk', { method: 'DELETE', body: JSON.stringify({ roomIds }) });
  },
  listHotels() {
    return apiRequest<HotelSummary[]>('/rooms/hotels');
  },
  listRoomTypes(hotelId?: number) {
    return apiRequest<RoomType[]>(hotelId ? `/room-types?hotelId=${hotelId}` : '/room-types');
  },
  getRoomType(id: number) {
    return apiRequest<RoomType>(`/room-types/${id}`);
  },
  createRoomType(payload: UpsertRoomTypePayload, images?: File[]) {
    const body = new FormData();
    body.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (images) {
      images.forEach((img) => body.append('images', img));
    }
    return apiRequest<RoomType>('/room-types', { method: 'POST', body });
  },
  updateRoomType(id: number, payload: UpsertRoomTypePayload, images?: File[]) {
    const body = new FormData();
    body.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (images) {
      images.forEach((img) => body.append('images', img));
    }
    return apiRequest<RoomType>(`/room-types/${id}`, { method: 'PUT', body });
  },
  deleteRoomType(id: number) {
    return apiRequest<void>(`/room-types/${id}`, { method: 'DELETE' });
  },
  listBookings(filters: {
    page?: number;
    size?: number;
    hotelId?: number;
    bookingStatus?: number;
    guestName?: string;
    checkInFrom?: string;
    checkInTo?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 10),
    });
    if (filters.hotelId) params.set('hotelId', String(filters.hotelId));
    if (filters.bookingStatus) params.set('bookingStatus', String(filters.bookingStatus));
    if (filters.guestName?.trim()) params.set('guestName', filters.guestName.trim());
    if (filters.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
    if (filters.checkInTo) params.set('checkInTo', filters.checkInTo);
    return apiRequest<PageResponse<Booking>>(`/bookings?${params.toString()}`);
  },
  getBooking(id: number) {
    return apiRequest<Booking>(`/bookings/${id}`);
  },
  createBooking(payload: CreateBookingPayload) {
    return apiRequest<Booking>('/bookings', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateBooking(id: number, payload: UpdateBookingPayload) {
    return apiRequest<Booking>(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  cancelBooking(id: number, payload: CancelBookingPayload = {}) {
    return apiRequest<Booking>(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) });
  },
  searchAvailability(params: {
    hotelId: number;
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
    rooms?: number;
  }) {
    const query = new URLSearchParams({
      hotelId: String(params.hotelId),
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: String(params.adults ?? 2),
      children: String(params.children ?? 0),
      rooms: String(params.rooms ?? 1),
    });
    return apiRequest<AvailableRoomType[]>(`/bookings/availability?${query.toString()}`);
  },
  getRatePlans(roomTypeId: number, params: { checkIn: string; checkOut: string; rooms?: number }) {
    const query = new URLSearchParams({
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: String(params.rooms ?? 1),
    });
    return apiRequest<RatePlan[]>(`/bookings/room-types/${roomTypeId}/rate-plans?${query.toString()}`);
  },
  getExtraServices(hotelId: number) {
    return apiRequest<ExtraService[]>(`/bookings/extra-services?hotelId=${hotelId}`);
  },
  getRoomUpgrades(params: {
    hotelId: number;
    roomTypeId: number;
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
  }) {
    const query = new URLSearchParams({
      hotelId: String(params.hotelId),
      roomTypeId: String(params.roomTypeId),
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: String(params.adults ?? 2),
      children: String(params.children ?? 0),
    });
    return apiRequest<RoomUpgrade[]>(`/bookings/room-upgrades?${query.toString()}`);
  },
  quoteBooking(payload: CheckoutBookingPayload) {
    return apiRequest<BookingQuote>('/bookings/quote', { method: 'POST', body: JSON.stringify(payload) });
  },
  checkoutBooking(payload: CheckoutBookingPayload) {
    return apiRequest<Booking>('/bookings/checkout', { method: 'POST', body: JSON.stringify(payload) });
  },
  getDashboardStats() {
    return apiRequest<DashboardStats>('/dashboard/stats');
  },
  getEmailTestSamples() {
    return apiRequest<EmailTestTemplateSample[]>('/emails/test/samples');
  },
  sendTestEmail(payload: SendTestEmailPayload) {
    return apiRequest<EmailTestSendResult>('/emails/test/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listGalleryImages(filters: {
    page?: number;
    size?: number;
    category?: string;
    type?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 12),
    });
    if (filters.category?.trim()) params.set('category', filters.category.trim());
    else if (filters.type?.trim()) params.set('type', filters.type.trim());
    return apiRequest<PageResponse<GalleryImage>>(`/gallery?${params.toString()}`);
  },
  getGalleryImage(id: number) {
    return apiRequest<GalleryImage>(`/gallery/${id}`);
  },
  uploadGalleryImages(payload: UploadGalleryImagesPayload, files: File[]) {
    const body = new FormData();
    body.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    files.forEach((file) => body.append('files', file));
    return apiRequest<GalleryImage[]>('/gallery', { method: 'POST', body });
  },
  updateGalleryImage(id: number, payload: UpsertGalleryImagePayload) {
    return apiRequest<GalleryImage>(`/gallery/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteGalleryImage(id: number) {
    return apiRequest<void>(`/gallery/${id}`, { method: 'DELETE' });
  },
  reorderGalleryImages(orderedIds: number[]) {
    return apiRequest<GalleryImage[]>('/gallery/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    });
  },
};

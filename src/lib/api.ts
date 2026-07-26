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
  Booking,
  BulkCreateRoomsPayload,
  BulkDeleteRoomsPayload,
  CancelBookingPayload,
  CancellationPolicyConfig,
  CancellationQuote,
  CreateRolePayload,
  CreateUserPayload,
  DashboardStats,
  DashboardStatsFilter,
  DashboardCalendar,
  HotelSummary,
  LoginPayload,
  Module,
  PageResponse,
  Permission,
  PermissionPayload,
  ForgotPasswordRequestOtpPayload,
  ForgotPasswordVerifyOtpPayload,
  RequestPasswordOtpResponse,
  ResendSetupEmailPayload,
  ResendSetupEmailResponse,
  ResetPasswordPayload,
  Role,
  Room,
  RoomType,
  GalleryImage,
  SetPasswordPayload,
  SetupTokenValidation,
  UpdateRolePayload,
  UpdateUserPayload,
  UpdateBookingPayload,
  UpsertModulePayload,
  UpsertGalleryImagePayload,
  UploadGalleryImagesPayload,
  Coupon,
  CouponUsage,
  CouponValidation,
  UpsertCouponPayload,
  ValidateCouponPayload,
  PricingConfig,
  UpdateCancellationPolicyPayload,
  UpdatePricingConfigPayload,
  UpsertRoomPayload,
  UpsertRoomTypePayload,
  UserAccess,
  User,
  VerifyPasswordOtpPayload,
  VerifyPasswordOtpResponse,
  InventoryGrid,
  InventoryDayUpsert,
  RatePlanDayUpsert,
  BulkInventoryPayload,
  InventoryBlockPayload,
  InventoryBlockedRanges,
  TransactionListItem,
  TransactionDetail,
  TransactionSummary,
  SettlementListItem,
  SettlementDetail,
  SettlementDashboard,
  SettlementSyncResult,
  InstantSettlementPayload,
} from '@/lib/api-types';

import { getApiBaseUrl } from '@/config/env';

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: unknown;

  constructor(message: string, status: number, errors?: Record<string, string[]>, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  /** First stable machine code from `errors.errorCode`, if present. */
  get code(): string | undefined {
    const codes = this.errors?.errorCode;
    if (!codes?.length) return undefined;
    return codes.find(Boolean);
  }

  hasCode(code: string): boolean {
    return (this.errors?.errorCode ?? []).includes(code);
  }
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  /** When true, do not toggle the full-screen global loader (caller shows its own busy state). */
  skipGlobalLoader?: boolean;
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
    throw new ApiError(payload?.message || validationMessage || fallbackMessage, response.status, payload?.errors, payload?.data);
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
  const showLoader = isMutation && !options.skipGlobalLoader;
  if (showLoader) globalLoaderState.show();

  try {
    const { skipAuth: _skipAuth, skipGlobalLoader: _skipLoader, retry: _retry, ...fetchOptions } = options;
    const response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });

    if (response.status === 401 && !options.skipAuth && options.retry !== false) {
      const token = await refreshAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
        return (await parseResponse<T>(retryResponse)).data as T;
      }
      clearStoredSession();
    }

    return (await parseResponse<T>(response)).data as T;
  } finally {
    if (showLoader) globalLoaderState.hide();
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
  validateSetupToken(token: string) {
    const params = new URLSearchParams({ token });
    return apiRequest<SetupTokenValidation>(`/auth/setup-token/validate?${params.toString()}`, {
      skipAuth: true,
    });
  },
  setPassword(payload: SetPasswordPayload) {
    return apiRequest<void>('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  resendSetupEmail(payload: ResendSetupEmailPayload) {
    return apiRequest<ResendSetupEmailResponse>('/auth/resend-setup-email', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  requestPasswordOtp() {
    return apiRequest<RequestPasswordOtpResponse>('/profile/password/request-otp', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  verifyPasswordOtp(payload: VerifyPasswordOtpPayload) {
    return apiRequest<VerifyPasswordOtpResponse>('/profile/password/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<void>('/profile/password/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  forgotPasswordRequestOtp(payload: ForgotPasswordRequestOtpPayload) {
    return apiRequest<RequestPasswordOtpResponse>('/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  forgotPasswordVerifyOtp(payload: ForgotPasswordVerifyOtpPayload) {
    return apiRequest<VerifyPasswordOtpResponse>('/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },
  forgotPasswordReset(payload: ResetPasswordPayload) {
    return apiRequest<void>('/auth/forgot-password/reset', {
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
  listRooms(filters: {
    page?: number;
    size?: number;
    hotelId?: number;
    roomTypeId?: number;
    roomNumber?: string;
    roomStatus?: number;
    checkIn?: string;
    checkOut?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 10),
    });
    if (filters.hotelId) params.set('hotelId', String(filters.hotelId));
    if (filters.roomTypeId) params.set('roomTypeId', String(filters.roomTypeId));
    if (filters.roomNumber?.trim()) params.set('roomNumber', filters.roomNumber.trim());
    if (filters.roomStatus) params.set('roomStatus', String(filters.roomStatus));
    if (filters.checkIn) params.set('checkIn', filters.checkIn);
    if (filters.checkOut) params.set('checkOut', filters.checkOut);
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
  deleteRooms(payload: BulkDeleteRoomsPayload) {
    return apiRequest<void>('/rooms/bulk', { method: 'DELETE', body: JSON.stringify(payload) });
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
    bookingStatuses?: number[];
    guestName?: string;
    checkInFrom?: string;
    checkInTo?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 10),
    });
    if (filters.hotelId) params.set('hotelId', String(filters.hotelId));
    for (const status of filters.bookingStatuses ?? []) {
      params.append('bookingStatuses', String(status));
    }
    if (filters.guestName?.trim()) params.set('guestName', filters.guestName.trim());
    if (filters.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
    if (filters.checkInTo) params.set('checkInTo', filters.checkInTo);
    return apiRequest<PageResponse<Booking>>(`/bookings?${params.toString()}`);
  },
  checkOutBooking(id: number) {
    return apiRequest<Booking>(`/bookings/${id}/check-out`, { method: 'POST' });
  },
  getBooking(id: number) {
    return apiRequest<Booking>(`/bookings/${id}`);
  },
  updateBooking(id: number, payload: UpdateBookingPayload) {
    return apiRequest<Booking>(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  cancelBooking(id: number, payload: CancelBookingPayload) {
    return apiRequest<Booking>(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) });
  },
  getCancellationQuote(id: number) {
    return apiRequest<CancellationQuote>(`/bookings/${id}/cancellation-quote`);
  },
  requestCancelOtp(id: number) {
    return apiRequest<null>(`/bookings/${id}/cancel/request-otp`, { method: 'POST' });
  },
  getDashboardStats(filter: DashboardStatsFilter = {}) {
    const params = new URLSearchParams();
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    const query = params.toString();
    return apiRequest<DashboardStats>(`/dashboard/stats${query ? `?${query}` : ''}`);
  },
  getDashboardCalendar(filter: { from?: string; to?: string } = {}) {
    const params = new URLSearchParams();
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    const query = params.toString();
    return apiRequest<DashboardCalendar>(`/dashboard/calendar${query ? `?${query}` : ''}`);
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
  listCoupons(filters: {
    tab?: 'active' | 'deactivated';
    search?: string;
    page?: number;
    size?: number;
  } = {}) {
    const params = new URLSearchParams({
      tab: filters.tab ?? 'active',
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 10),
    });
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    return apiRequest<PageResponse<Coupon>>(`/coupons?${params.toString()}`);
  },
  getCoupon(id: number) {
    return apiRequest<Coupon>(`/coupons/${id}`);
  },
  listCouponUsages(id: number, page = 0, size = 10) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    return apiRequest<PageResponse<CouponUsage>>(`/coupons/${id}/usages?${params.toString()}`);
  },
  createCoupon(payload: UpsertCouponPayload) {
    return apiRequest<Coupon>('/coupons', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateCoupon(id: number, payload: UpsertCouponPayload) {
    return apiRequest<Coupon>(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteCoupon(id: number) {
    return apiRequest<void>(`/coupons/${id}`, { method: 'DELETE' });
  },
  validateCoupon(payload: ValidateCouponPayload) {
    return apiRequest<CouponValidation>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getPricingConfig() {
    return apiRequest<PricingConfig>('/config/pricing');
  },
  updatePricingConfig(payload: UpdatePricingConfigPayload) {
    return apiRequest<PricingConfig>('/config/pricing', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  getCancellationPolicy() {
    return apiRequest<CancellationPolicyConfig>('/config/cancellation-policy');
  },
  updateCancellationPolicy(payload: UpdateCancellationPolicyPayload) {
    return apiRequest<CancellationPolicyConfig>('/config/cancellation-policy', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  getInventoryGrid(hotelId: number, from: string, to: string) {
    const params = new URLSearchParams({
      hotelId: String(hotelId),
      from,
      to,
    });
    return apiRequest<InventoryGrid>(`/inventory?${params.toString()}`);
  },
  upsertInventory(items: InventoryDayUpsert[]) {
    return apiRequest<InventoryGrid>('/inventory', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },
  upsertRatePlanInventory(items: RatePlanDayUpsert[]) {
    return apiRequest<InventoryGrid>('/inventory/rate-plan-price', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },
  bulkUpdateInventory(payload: BulkInventoryPayload) {
    return apiRequest<InventoryGrid>('/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipGlobalLoader: true,
    });
  },
  blockInventory(payload: InventoryBlockPayload) {
    return apiRequest<void>('/inventory/block', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  unblockInventory(payload: InventoryBlockPayload) {
    return apiRequest<void>('/inventory/unblock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getBlockedInventory(hotelId: number, from: string, to: string) {
    const params = new URLSearchParams({
      hotelId: String(hotelId),
      from,
      to,
    });
    return apiRequest<InventoryBlockedRanges>(`/inventory/blocked?${params.toString()}`);
  },
  listTransactions(filters: {
    page?: number;
    size?: number;
    type?: string;
    bookingCode?: string;
    gatewayId?: string;
    status?: string;
    from?: string;
    to?: string;
    amountMin?: number;
    amountMax?: number;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 20),
    });
    if (filters.type) params.set('type', filters.type);
    if (filters.bookingCode?.trim()) params.set('bookingCode', filters.bookingCode.trim());
    if (filters.gatewayId?.trim()) params.set('gatewayId', filters.gatewayId.trim());
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.amountMin != null) params.set('amountMin', String(filters.amountMin));
    if (filters.amountMax != null) params.set('amountMax', String(filters.amountMax));
    return apiRequest<PageResponse<TransactionListItem>>(`/transactions?${params.toString()}`);
  },
  getTransaction(id: string) {
    return apiRequest<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`);
  },
  getTransactionSummary() {
    return apiRequest<TransactionSummary>('/transactions/summary');
  },
  getSettlementDashboard(filter: { from?: string; to?: string } = {}) {
    const params = new URLSearchParams();
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    const query = params.toString();
    return apiRequest<SettlementDashboard>(`/settlements/dashboard${query ? `?${query}` : ''}`);
  },
  listSettlements(filters: {
    page?: number;
    size?: number;
    kind?: string;
    status?: string;
    from?: string;
    to?: string;
  } = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 0),
      size: String(filters.size ?? 20),
    });
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return apiRequest<PageResponse<SettlementListItem>>(`/settlements?${params.toString()}`);
  },
  getSettlement(id: number) {
    return apiRequest<SettlementDetail>(`/settlements/${id}`);
  },
  syncSettlements() {
    return apiRequest<SettlementSyncResult>('/settlements/sync', { method: 'POST' });
  },
  createInstantSettlement(payload: InstantSettlementPayload, idempotencyKey: string) {
    return apiRequest<SettlementListItem>('/settlements/instant', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};

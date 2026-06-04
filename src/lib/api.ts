import { clearStoredSession, getStoredSession, storeSession } from '@/lib/auth-storage';
import type {
  ApiResponse,
  AuthSession,
  CreateRolePayload,
  CreateUserPayload,
  AssignUserRolesPayload,
  HotelSummary,
  LoginPayload,
  Module,
  PageResponse,
  Permission,
  PermissionPayload,
  Role,
  Room,
  RoomType,
  UpdateRolePayload,
  UpdateUserPayload,
  UpsertRoomPayload,
  UserAccess,
  User,
} from '@/lib/api-types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1.0.0').replace(/\/$/, '');

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
    throw new ApiError(payload?.message ?? response.statusText, response.status, payload?.errors);
  }
  return payload ?? { success: true, code: response.status, message: response.statusText };
}

async function refreshAccessToken(): Promise<string | null> {
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
    return apiRequest<AuthSession>('/auth/profile');
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
  listRooms() {
    return apiRequest<Room[]>('/rooms');
  },
  getRoom(id: number) {
    return apiRequest<Room>(`/rooms/${id}`);
  },
  createRoom(payload: UpsertRoomPayload) {
    return apiRequest<Room>('/rooms', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateRoom(id: number, payload: UpsertRoomPayload) {
    return apiRequest<Room>(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteRoom(id: number) {
    return apiRequest<void>(`/rooms/${id}`, { method: 'DELETE' });
  },
  listHotels() {
    return apiRequest<HotelSummary[]>('/rooms/hotels');
  },
  listRoomTypes(hotelId?: number) {
    return apiRequest<RoomType[]>(hotelId ? `/rooms/types?hotelId=${hotelId}` : '/rooms/types');
  },
};

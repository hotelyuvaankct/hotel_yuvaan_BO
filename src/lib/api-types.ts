export type ApiMeta = {
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: ApiMeta;
  timestamp?: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type PermissionSet = {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

export type User = {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: number;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Role = {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole?: boolean;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Module = {
  id: number;
  moduleName: string;
  slug: string;
  order?: number;
  isActive?: boolean;
  onApp?: boolean;
};

export type Permission = {
  id: number;
  roleId: number;
  roleName: string;
  moduleId: number;
  moduleName: string;
  moduleSlug: string;
  isAddAccess: boolean;
  isUpdateAccess: boolean;
  isDeleteAccess: boolean;
  isListAccess: boolean;
  isOnApp: boolean;
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  user?: User;
  perms?: Record<string, PermissionSet>;
};

export type AssignedRole = {
  id: number;
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  hotelId?: number;
  status?: number;
};

export type UserAccess = {
  user: User;
  roles: AssignedRole[];
  perms: Record<string, PermissionSet>;
};

export type HotelSummary = {
  id: number;
  name: string;
  city?: string;
  state?: string;
  status?: number;
};

export type RoomType = {
  id: number;
  hotelId: number;
  name: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  basePrice?: number;
  totalRooms?: number;
  amenities?: string;
  status?: number;
};

export type Room = {
  id: number;
  hotelId: number;
  hotelName: string;
  roomTypeId: number;
  roomTypeName: string;
  roomNumber: string;
  floor?: number;
  roomStatus?: number;
  status?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type CreateUserPayload = LoginPayload & {
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: number;
};

export type UpdateUserPayload = {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: number;
  status?: number;
};

export type AssignUserRolesPayload = {
  roleIds: number[];
  hotelId?: number;
};

export type CreateRolePayload = {
  name: string;
  displayName: string;
  description?: string;
};

export type UpdateRolePayload = {
  displayName?: string;
  description?: string;
  status?: number;
};

export type PermissionPayload = {
  moduleId: number;
  isAddAccess: boolean;
  isUpdateAccess: boolean;
  isDeleteAccess: boolean;
  isListAccess: boolean;
  isOnApp: boolean;
};

export type UpsertRoomPayload = {
  hotelId: number;
  roomTypeId: number;
  roomNumber: string;
  floor?: number;
  roomStatus?: number;
  status?: number;
  notes?: string;
};

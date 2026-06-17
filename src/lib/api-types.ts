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
  roles?: string[];
  uid?: number;
};

export type AuthTokenClaims = {
  sub?: string;
  uid?: number;
  roles?: string[];
  perms?: Record<string, PermissionSet>;
  iat?: number;
  exp?: number;
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
  hotelName?: string;
  name: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  basePrice?: number;
  totalRooms?: number;
  amenities?: string;
  status?: number;
  images?: RoomImage[];
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
  images?: RoomImage[];
  createdAt?: string;
  updatedAt?: string;
};

export type RoomImage = {
  id: number;
  objectKey: string;
  publicUrl: string;
  primary: boolean;
  displayOrder: number;
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

export type UpsertModulePayload = {
  moduleName: string;
  slug: string;
  order?: number;
  isActive?: boolean;
  onApp?: boolean;
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

export type BulkCreateRoomsPayload = Omit<UpsertRoomPayload, 'roomNumber'> & {
  roomNumbers: string[];
};

export type UpsertRoomTypePayload = {
  hotelId: number;
  name: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  basePrice: number;
  amenities?: string;
  status?: number;
  deletedImageIds?: number[];
};

export type BookingRoomLine = {
  id?: number;
  roomTypeId: number;
  roomTypeName?: string;
  roomId?: number;
  roomNumber?: string;
  quantity?: number;
  pricePerNight?: number;
  totalNights?: number;
  lineTotal?: number;
};

export type Booking = {
  id: number;
  bookingCode: string;
  hotelId: number;
  hotelName?: string;
  userId?: number;
  source?: number;
  bookingStatus?: number;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  totalRooms?: number;
  totalGuests?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  status?: number;
  rooms?: BookingRoomLine[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBookingPayload = {
  hotelId: number;
  source?: number;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  totalGuests?: number;
  notes?: string;
  rooms: Array<{
    roomTypeId: number;
    quantity?: number;
    pricePerNight?: number;
  }>;
};

export type UpdateBookingPayload = {
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  totalGuests?: number;
  bookingStatus?: number;
  notes?: string;
};

export type CancelBookingPayload = {
  cancellationReason?: string;
};

export type DashboardStats = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalRooms: number;
  totalRoomTypes: number;
  totalRevenue: number;
  recentBookings: Booking[];
};

export type AvailableRoomType = {
  roomTypeId: number;
  name: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  maxGuests?: number;
  availableRooms?: number;
  totalRooms?: number;
  basePricePerNight?: number;
  fromPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  totalNights?: number;
  primaryImageUrl?: string;
  amenities?: string[];
  badges?: string[];
};

export type RatePlan = {
  code: string;
  label: string;
  features?: string[];
  pricePerNight?: number;
  totalPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  totalNights?: number;
};

export type ExtraService = {
  id: number;
  name: string;
  description?: string;
  price?: number;
  free?: boolean;
  forAllGuests?: boolean;
};

export type RoomUpgrade = {
  roomTypeId: number;
  name: string;
  description?: string;
  maxGuests?: number;
  availableRooms?: number;
  upgradePrice?: number;
  primaryImageUrl?: string;
  amenities?: string[];
  badges?: string[];
};

export type BookingQuote = {
  hotelId: number;
  hotelName?: string;
  checkIn: string;
  checkOut: string;
  totalNights?: number;
  adults?: number;
  children?: number;
  rooms?: number;
  roomTypeId: number;
  roomTypeName?: string;
  ratePlanCode?: string;
  ratePlanLabel?: string;
  roomSubtotal?: number;
  extrasSubtotal?: number;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  selectedExtras?: ExtraService[];
};

export type CheckoutBookingPayload = {
  hotelId: number;
  checkIn: string;
  checkOut: string;
  roomTypeId: number;
  ratePlanCode: string;
  adults?: number;
  children?: number;
  rooms?: number;
  extraServiceIds?: number[];
  upgradeRoomTypeId?: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
};

export type EmailTestTemplateKey =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_CANCELLATION'
  | 'BOOKING_CHECK_IN_REMINDER'
  | 'WELCOME_USER'
  | 'PASSWORD_RESET';

export type EmailTestTemplateSample = {
  template: EmailTestTemplateKey;
  label: string;
  htmlFile: string;
  brevoTemplateId: number;
  senderEmail: string;
  subject: string;
  previewText: string;
  sampleData: Record<string, string | number | boolean | null>;
};

export type SendTestEmailPayload = {
  template: EmailTestTemplateKey;
  recipientEmail: string;
};

export type EmailTestSendResult = {
  template: EmailTestTemplateKey;
  recipientEmail: string;
  brevoTemplateId: number;
  message: string;
};

export type GalleryImage = {
  id: number;
  title: string;
  category: string;
  publicUrl: string;
  displayOrder: number;
  status?: number;
};

export type UpsertGalleryImagePayload = {
  title: string;
  category: string;
  displayOrder?: number;
  status?: number;
};

export type UploadGalleryImagesPayload = {
  title?: string;
  category: string;
  displayOrder?: number;
  status?: number;
};

export type ReorderGalleryImagesPayload = {
  orderedIds: number[];
};

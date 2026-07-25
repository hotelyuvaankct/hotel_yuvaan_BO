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
  passwordSet?: boolean;
  passwordUpdatedAt?: string;
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

export type OccupancyPrice = {
  guestCount: number;
  price: number;
};

export type RoomTypeRatePlan = {
  id?: number;
  code: string;
  label: string;
  description?: string;
  features?: string[];
  sortOrder?: number;
  isDefault?: boolean;
  occupancyPrices?: OccupancyPrice[];
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
  sortOrder?: number;
  amenities?: string;
  status?: number;
  images?: RoomImage[];
  ratePlans?: RoomTypeRatePlan[];
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
  availabilityStatus?: number;
  availabilityFrom?: string;
  availabilityTo?: string;
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

export type CreateUserPayload = {
  email: string;
  fullName: string;
  roleId: number;
  hotelId?: number;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: number;
};

export type SetupTokenValidation = {
  valid: boolean;
  maskedEmail?: string;
  reason?: string;
};

export type SetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type ResendSetupEmailPayload = {
  email: string;
};

export type ResendSetupEmailResponse = {
  message?: string;
};

export type RequestPasswordOtpResponse = {
  maskedEmail?: string;
  message?: string;
};

export type VerifyPasswordOtpPayload = {
  otp: string;
};

export type VerifyPasswordOtpResponse = {
  resetToken: string;
};

export type ResetPasswordPayload = {
  resetToken: string;
  newPassword: string;
};

export type PasswordLifecycleErrorCode =
  | 'ERR_105'
  | 'ERR_106'
  | 'ERR_107'
  | 'ERR_108'
  | 'ERR_109'
  | 'ERR_110'
  | 'ERR_111'
  | 'ERR_112'
  | 'ERR_113'
  | 'ERR_114'
  | 'ERR_115'
  | 'ERR_116';

export type UpdateUserPayload = {
  fullName?: string;
  roleId?: number;
  hotelId?: number;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: number;
  status?: number;
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

export type BulkDeleteRoomsPayload = {
  selectAll?: boolean;
  hotelId?: number;
  roomTypeId?: number;
  roomNumber?: string;
  roomStatus?: number;
  excludeRoomIds?: number[];
  roomIds?: number[];
};

export type UpsertRoomTypePayload = {
  hotelId: number;
  name: string;
  description?: string;
  maxAdults?: number;
  maxChildren?: number;
  basePrice: number;
  sortOrder?: number;
  amenities?: string;
  status?: number;
  deletedImageIds?: number[];
  ratePlans?: RoomTypeRatePlan[];
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
  refund?: BookingRefund;
  status?: number;
  rooms?: BookingRoomLine[];
  createdAt?: string;
  updatedAt?: string;
};

export type BookingRefund = {
  id?: number;
  amount?: number;
  percent?: number;
  status?: string;
  channel?: string;
  cancelledBy?: string;
  hoursBeforeCheckIn?: number;
  initiatedAt?: string;
  completedAt?: string;
  note?: string;
  failureReason?: string;
  paymentRefunded?: boolean;
};

export type CancellationQuote = {
  bookingId: number;
  bookingCode: string;
  paidAmount?: number;
  refundPercent?: number;
  refundAmount?: number;
  hoursBeforeCheckIn?: number;
  matchedMinHoursBeforeCheckIn?: number;
  cancelledBy?: string;
  note?: string;
  refundable?: boolean;
};

export type CancellationPolicyTier = {
  id?: number;
  minHoursBeforeCheckIn: number;
  refundPercent: number;
  sortOrder?: number;
};

export type CancellationPolicyConfig = {
  tiers: CancellationPolicyTier[];
  adminCancelRefundPercent: number;
  cancelOtpExpiryMinutes?: number;
};

export type UpdateCancellationPolicyPayload = {
  tiers: Array<{
    minHoursBeforeCheckIn: number;
    refundPercent: number;
    sortOrder?: number;
  }>;
  adminCancelRefundPercent: number;
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
  otpCode: string;
  cancellationReason?: string;
};

export type DashboardStats = {
  rangeStart?: string;
  rangeEnd?: string;
  totalBookings: number;
  totalRooms: number;
  totalRoomTypes: number;
  totalBackofficeUsers: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  bookingsThisMonth: number;
  totalRevenue: number;
  rangeBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  checkedOutBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  rangeRevenue: number;
  completionRatio: number;
  cancellationRatio: number;
  recentBookings: Booking[];
};

export type DashboardCalendarEvent = {
  bookingId: number;
  bookingCode: string;
  guestName: string;
  hotelName: string;
  bookingStatus: number;
  source: number;
  checkIn: string;
  checkOut: string;
  totalRooms?: number;
  totalGuests?: number;
  totalAmount?: number;
};

export type DashboardCalendar = {
  from: string;
  to: string;
  totalEvents: number;
  events: DashboardCalendarEvent[];
};

export type DashboardStatsFilter = {
  from?: string;
  to?: string;
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
  sortOrder?: number;
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
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
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
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
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

export type Coupon = {
  id: number;
  hotelId?: number;
  hotelName?: string;
  code: string;
  title: string;
  description?: string;
  couponType: number;
  discountType: number;
  discountValue: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate: string;
  expiryDate: string;
  totalUsageLimit?: number;
  perUserUsageLimit?: number;
  isSystemOnly?: boolean;
  status?: number;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CouponUsage = {
  id: number;
  couponId: number;
  couponCode?: string;
  bookingId?: number;
  bookingCode?: string;
  userId?: number;
  userEmail?: string;
  guestName?: string;
  guestEmail?: string;
  discountAmount?: number;
  usedAt?: string;
};

export type UpsertCouponPayload = {
  hotelId?: number;
  code: string;
  title: string;
  description?: string;
  couponType: number;
  discountType: number;
  discountValue: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate: string;
  expiryDate: string;
  totalUsageLimit?: number;
  perUserUsageLimit?: number;
  status?: number;
};

export type ValidateCouponPayload = {
  code: string;
  hotelId: number;
  bookingAmount: number;
  guestEmail?: string;
};

export type CouponValidation = {
  valid: boolean;
  message?: string;
  couponId?: number;
  code?: string;
  title?: string;
  discountAmount?: number;
};

export type PricingConfig = {
  roomTaxPercent: number;
  processingFeePercent: number;
  processingFeeGstPercent: number;
  hotelGstin?: string;
  invoiceHsnSac?: string;
};

export type UpdatePricingConfigPayload = {
  roomTaxPercent: number;
  processingFeePercent: number;
  processingFeeGstPercent: number;
  hotelGstin?: string;
  invoiceHsnSac?: string;
};

export type InventoryRatePlanMeta = {
  ratePlanId: number;
  code: string;
  label: string;
  guestCounts?: number[];
};

export type InventoryOccupancyDayCell = {
  guestCount: number;
  absolutePrice?: number | null;
  effectivePrice?: number | null;
  hasOverride?: boolean;
};

export type InventoryRatePlanDayCell = {
  ratePlanCode: string;
  absolutePrice?: number | null;
  effectivePrice?: number | null;
  isStopSell?: boolean;
  stopSellReason?: string | null;
  hasOverride?: boolean;
  occupancyPrices?: InventoryOccupancyDayCell[];
};

export type InventoryDayCell = {
  date: string;
  configured: boolean;
  totalInventory?: number;
  ownWebsiteBooked?: number;
  netBooked?: number;
  remaining?: number;
  price?: number;
  isStopSell?: boolean;
  stopSellReason?: string | null;
  exceedsPhysical?: boolean;
  ratePlans?: InventoryRatePlanDayCell[];
};

export type InventoryRoomTypeRow = {
  roomTypeId: number;
  roomTypeName: string;
  sortOrder?: number;
  physicalRoomCount?: number;
  maxGuests?: number;
  inventoryExceedsPhysical?: boolean;
  ratePlans?: InventoryRatePlanMeta[];
  days: InventoryDayCell[];
};

export type InventoryGrid = {
  hotelId: number;
  fromDate: string;
  toDate: string;
  inventoryFromDate?: string | null;
  inventoryToDate?: string | null;
  roomTypes: InventoryRoomTypeRow[];
};

export type InventoryDayUpsert = {
  roomTypeId: number;
  date: string;
  totalInventory: number;
  price?: number;
  isStopSell?: boolean;
  stopSellReason?: string;
};

export type RatePlanDayUpsert = {
  roomTypeId: number;
  ratePlanCode: string;
  date: string;
  guestCount?: number;
  price?: number | null;
  isStopSell?: boolean;
  stopSellReason?: string;
};

export type BulkInventoryPayload = {
  roomTypeId: number;
  fromDate: string;
  toDate: string;
  daysOfWeek?: number[];
  totalInventory?: number;
  price?: number;
  isStopSell?: boolean;
  stopSellReason?: string;
  ratePlanCode?: string;
  guestCount?: number;
  ratePlanPrice?: number;
  ratePlanStopSell?: boolean;
  ratePlanStopSellReason?: string;
};

export type InventoryBlockPayload = {
  hotelId: number;
  fromDate: string;
  toDate: string;
  reason?: string;
};

export type InventoryBlockConflict = {
  bookingId: number;
  bookingCode: string;
  checkIn: string;
  checkOut: string;
  ratePlanCode?: string;
  guestName?: string;
};

export type InventoryBlockedRange = {
  roomTypeId: number;
  roomTypeName: string;
  ratePlanCode?: string;
  ratePlanLabel?: string;
  fromDate: string;
  toDate: string;
  reason?: string;
};

export type InventoryBlockedRanges = {
  ranges: InventoryBlockedRange[];
};

export type TransactionListItem = {
  id: string;
  type: 'PAYMENT' | 'REFUND' | 'ORDER' | string;
  sourceId: number;
  bookingId?: number;
  bookingCode?: string;
  guestName?: string;
  guestEmail?: string;
  amount: number;
  currency?: string;
  statusLabel?: string;
  statusCode?: number;
  gateway?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewayRefundId?: string;
  settled?: boolean;
  gatewaySettlementId?: string;
  occurredAt?: string;
  warning?: string;
};

export type TransactionDetail = TransactionListItem & {
  guestPhone?: string;
  settledAt?: string;
  failureReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
  initiatedAt?: string;
  completedAt?: string;
  paymentMethodLabel?: string;
  paymentMethod?: number;
  refundPercent?: number;
  hoursBeforeCheckIn?: number;
  cancelledBy?: string;
  channel?: string;
  receipt?: string;
  paymentId?: number;
  policySnapshot?: string;
  bookingMoney?: {
    subtotalAmount?: number;
    discountAmount?: number;
    taxAmount?: number;
    processingFeeAmount?: number;
    processingFeeGstAmount?: number;
    totalAmount?: number;
  };
  linkedRefunds?: Array<{
    id: number;
    amount: number;
    status?: number;
    statusLabel?: string;
    gatewayRefundId?: string;
    refundPercent?: number;
    cancelledBy?: string;
    createdAt?: string;
    completedAt?: string;
  }>;
};

export type TransactionSummary = {
  successfulPayments: number;
  successfulPaymentAmount: number;
  failedPayments: number;
  refundCount: number;
  refundedAmount: number;
  todayCaptures: number;
  todayCaptureAmount: number;
  openOrders: number;
};

export type SettlementListItem = {
  id: number;
  gatewaySettlementId: string;
  kind: string;
  status: string;
  amount: number;
  fees: number;
  tax: number;
  netAmount: number;
  currency?: string;
  utr?: string;
  triggeredBy?: number;
  gatewayCreatedAt?: string;
  lastSyncedAt?: string;
};

export type SettlementItem = {
  id: number;
  entityId: string;
  entityType: string;
  amount: number;
  fee: number;
  tax: number;
  credit: number;
  debit: number;
  settled?: boolean;
  onHold?: boolean;
  paymentId?: number;
  refundId?: number;
  bookingId?: number;
  bookingCode?: string;
  settledAt?: string;
};

export type SettlementDetail = SettlementListItem & {
  amountRequested?: number;
  amountSettled?: number;
  amountPending?: number;
  amountReversed?: number;
  settleFullBalance?: boolean;
  description?: string;
  bankCreditNote?: string;
  items: SettlementItem[];
};

export type SettlementDashboard = {
  settledAmount: number;
  pendingUnsettledEstimate: number;
  pendingNote?: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
  instantSettlementsEnabled?: boolean;
  processedCount: number;
  failedCount: number;
  inFlightInstantCount: number;
  recentSettlements: SettlementListItem[];
};

export type SettlementSyncResult = {
  lastSyncedAt?: string;
  settlementsUpserted: number;
  itemsUpserted: number;
  message?: string;
  instantSettlementsEnabled?: boolean;
};

export type InstantSettlementPayload = {
  amount?: number;
  settleFullBalance: boolean;
  description?: string;
};


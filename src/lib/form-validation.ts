export function isBlank(value?: string) {
  return !value || !value.trim();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function parseIsoDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(value: string, days: number) {
  const date = parseIsoDate(value);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function validateDateRange(checkIn: string, checkOut: string) {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (!start) return 'Check-in date is required.';
  if (!end) return 'Check-out date is required.';
  if (end <= start) return 'Check-out date must be after check-in date.';
  return '';
}

export function getRoomDateFilterErrors(checkIn: string, checkOut: string) {
  const errors: Record<string, string> = {};
  const rangeError = validateDateRange(checkIn, checkOut);
  if (!rangeError) return errors;

  if (!checkIn) {
    errors.checkIn = 'Check-in date is required.';
  } else if (!checkOut) {
    errors.checkOut = 'Check-out date is required.';
  } else {
    errors.checkOut = rangeError;
  }

  return errors;
}

export function normalizeRoomDateFilters(checkIn: string, checkOut: string) {
  if (!checkIn) {
    return { checkIn, checkOut };
  }

  const nextCheckOut =
    !checkOut || checkOut <= checkIn ? addDaysIso(checkIn, 1) : checkOut;

  return { checkIn, checkOut: nextCheckOut };
}

export type BookingFormValues = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalGuests: string;
  roomTypeId: string;
  roomQuantity: string;
};

export function validateBookingForm(values: BookingFormValues, isEdit: boolean) {
  const errors: Record<string, string> = {};

  if (!isEdit && isBlank(values.hotelId)) {
    errors.hotelId = 'Select a hotel.';
  }
  if (!isEdit && isBlank(values.roomTypeId)) {
    errors.roomTypeId = 'Select a room type.';
  }
  if (!isEdit) {
    const rooms = Number(values.roomQuantity);
    if (!Number.isInteger(rooms) || rooms < 1) {
      errors.roomQuantity = 'Enter at least 1 room.';
    }
  }

  const dateError = validateDateRange(values.checkIn, values.checkOut);
  if (dateError) {
    if (!values.checkIn) errors.checkIn = 'Check-in date is required.';
    else if (!values.checkOut) errors.checkOut = 'Check-out date is required.';
    else errors.checkOut = dateError;
  }

  if (!isEdit && values.checkIn && values.checkIn < todayIso()) {
    errors.checkIn = 'Check-in cannot be in the past.';
  }

  if (isBlank(values.guestName)) {
    errors.guestName = 'Guest name is required.';
  } else if (values.guestName.trim().length < 2) {
    errors.guestName = 'Guest name must be at least 2 characters.';
  }

  if (!isBlank(values.guestEmail) && !isValidEmail(values.guestEmail)) {
    errors.guestEmail = 'Enter a valid email address.';
  }

  if (!isBlank(values.guestPhone) && !isValidPhone(values.guestPhone)) {
    errors.guestPhone = 'Enter a valid phone number (10–15 digits).';
  }

  if (isBlank(values.guestEmail) && isBlank(values.guestPhone)) {
    errors.guestPhone = 'Provide guest email or phone.';
    errors.guestEmail = 'Provide guest email or phone.';
  }

  const guests = Number(values.totalGuests);
  if (!Number.isInteger(guests) || guests < 1) {
    errors.totalGuests = 'Enter at least 1 guest.';
  }

  return errors;
}

export function validateRequiredSelect(value: string, message = 'Please select an option.') {
  return isBlank(value) ? message : '';
}

export function validatePositiveNumber(value: string, message = 'Enter a valid number.') {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? '' : message;
}

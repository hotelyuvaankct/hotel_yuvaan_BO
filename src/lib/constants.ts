export const API_BASE_URL = 'https://api.hotelyuvaan.com/api/v1.0.0';
// export const API_BASE_URL = 'http://localhost:8080/api/v1.0.0';

export enum Status {
    ACTIVE = 1,
    INACTIVE = 2,
    DELETED = 3,
    PENDING = 4,
    PROCESSING = 5,
    SUCCESS = 6,
    FAILED = 7,
    COMPLETED = 8,
    CANCELLED = 9,
    BLOCKED = 10,
    REFUNDED = 11,
    EXPIRED = 12,
    PARTIAL_REFUND = 13,
    INSERT = 14,
    UPDATE = 15
}

export const SYSTEM_ROLE_NAMES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
} as const;

export enum RoomStatus {
    AVAILABLE = 1,
    OCCUPIED = 2,
    MAINTENANCE = 3,
    BLOCKED = 4
}
    

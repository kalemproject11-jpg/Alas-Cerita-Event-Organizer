/**
 * EventPass Data Models & Types
 * Matching Laravel 11/12 Schema & System Architecture
 */

export type UserRole = 'super_admin' | 'customer' | 'gate_staff' | 'gate_supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  staffGate?: string; // for gate staff (e.g. 'Gate A - VIP', 'Gate B - Regular')
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string; // e.g. 'Early Bird', 'Presale', 'Regular', 'VIP Pass', 'VVIP Lounge'
  price: number; // in IDR
  quota: number; // maximum total quota
  availableQuota: number; // remaining quota
  heldQuota: number; // currently held in pending checkouts
  saleStart: string; // ISO date
  saleEnd: string; // ISO date
  description: string;
  perks: string[];
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  venue: string;
  city: string;
  startTime: string; // ISO date
  endTime: string; // ISO date
  posterUrl: string;
  status: 'published' | 'draft' | 'archived';
  category: 'Music' | 'Technology' | 'Sports' | 'Conference' | 'Arts';
  organizer: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed';
export type PaymentMethod = 'qris' | 'shopeepay' | 'bri' | string;

export interface Booking {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventId: string;
  invoiceCode: string; // e.g. 'INV-20261112-8821'
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentProofUrl?: string;
  senderName?: string;
  proofUploadedAt?: string;
  verificationStatus?: 'pending_verification' | 'verified';
  verifiedAt?: string;
  verifiedBy?: string;
  paymentUrl?: string;
  createdAt: string;
  expiresAt: string; // 30-minute hold window
  paidAt?: string;
  ticketTypeId: string;
  quantity: number;
}

export type TicketStatus = 'valid' | 'checked-in' | 'revoked';

export interface IssuedTicket {
  id: string;
  bookingId: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  attendeeNik: string; // NIK (Nomor Induk Kependudukan)
  attendeeIdLast4?: string; // fallback / last digits
  packageName?: string; // 'Single' | 'Couple' | 'Circle'
  packageMemberIndex?: number; // e.g. 1, 2, 3
  packageTotalMembers?: number; // e.g. 1, 2, 3
  packageGroupName?: string; // e.g. 'Paket Couple (2 Orang)'
  ticketNumber: string; // 8-char visual code, e.g. 'TCK-8H3P' (no 0/O, 1/I)
  qrToken: string; // Cryptographic UUID v4 (36 chars)
  status: TicketStatus;
  verificationStatus?: 'pending_verification' | 'verified';
  verifiedAt?: string;
  verifiedBy?: string;
  checkedInAt?: string;
  checkedInBy?: string; // Staff ID or Name
  gateName?: string;
  seat_or_gate?: string;
  checkInMethod?: 'qr_scanner' | 'manual_supervisor';
  notes?: string;
}

export type CheckInMethod = 'qr_scanner' | 'manual_supervisor';
export type CheckInResult = 'success' | 'duplicate_scan' | 'invalid_token' | 'unpaid' | 'rate_limited';

export interface CheckInLog {
  id: string;
  issuedTicketId?: string;
  ticketNumber?: string;
  attendeeName?: string;
  staffId: string;
  staffName: string;
  method: CheckInMethod;
  result: CheckInResult;
  message: string;
  deviceInfo: string;
  scannedAt: string;
  gateName: string;
}

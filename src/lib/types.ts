export interface Client {
  id: string;
  companyName: string;
  picName: string;
  picPhone: string;
  createdAt: string;
  isActive?: boolean;
}

export interface Submission {
  id: string;
  clientId: string;
  companyName: string;
  activityName: string;
  stage: number; // 1-9
  roomCodes: string[];
  totalAreaSqm: number;
  eventDays: number;
  loadingDays: number;
  estimatedCost: number;
  notes?: string;
  picInternal: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingType = 'TENTATIVE' | 'CONFIRMED' | 'UNAVAILABLE';

export interface Booking {
  id: string;
  submissionId?: string;
  type: BookingType;
  roomCodes: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  activityName: string;
  notes?: string;
}

export interface Survey {
  id: string;
  submissionId: string;
  companyName: string;
  date: string; // YYYY-MM-DD
  timeSlot: '10:00' | '14:00';
  picInternal: string;
  guestCount: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
}

export interface ClosedSurveySlot {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: '10:00' | '14:00';
  reason: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

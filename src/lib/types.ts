export interface Client {
  id: string;
  companyName: string;
  picName: string;
  picPhone: string;
  picTitle: string; // e.g. "Producer Summerland"
  createdAt: string;
  isActive?: boolean;
  institutionName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
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
  
  // Revised LOI fields
  institutionName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  eventName?: string;
  objectDescription?: string;
  areaText?: string;
  eventDate?: string;
  applicationLetterNo?: string;
  applicationLetterDate?: string;
  applicationSubject?: string;
  offerValue?: number;

  // Custom LOI Fields
  loiNomorSurat?: string;
  loiNomorSuratPemohon?: string;
  loiTanggalSuratPemohon?: string;
  loiPerihalSuratPemohon?: string;
  loiTautanPerjanjian?: string;
  loiTautanTataTertib?: string;
  loiLuasAreaCustom?: string;
  loiVerified?: boolean;
  loiOfficialName?: string;
  loiOfficialTitle?: string;
  
  // PRJ Official Snapshot fields
  prjOfficialName?: string;
  prjOfficialTitle?: string;
  prjOfficialOrderNo?: string;
  prjOfficialOrderDate?: string;
  prjOfficialMandateNo?: string;
  prjOfficialMandateTitle?: string;
  prjAgreementDate?: string;
  prjPaymentDeadline?: string;
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
  submissionId?: string;
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

export interface Official {
  id: string;
  name: string;
  title: string;
  ordinanceNumber: string;
  ordinanceDate: string;
  isActive: boolean;
  officialOrderNo?: string;
  officialOrderDate?: string;
  officialMandateNo?: string;
  officialMandateTitle?: string;
}


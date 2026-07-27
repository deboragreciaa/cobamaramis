'use server';

import { db } from '@/lib/firebase';
import { Room, staticRooms } from '@/lib/rooms-data';
import { Client, Submission, Booking, Survey, ClosedSurveySlot, AuditLog } from '@/lib/types';
import { validateBookingLock } from '@/lib/validation';

export interface SystemSettings {
  fairValuePerSqm: number;
  loadingFactor: number;
  ppnRate: number;
  returnRate: number;
  riskFactor: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  fairValuePerSqm: 50000,
  loadingFactor: 0.30,
  ppnRate: 0.11,
  returnRate: 1.00, // 100% return rate (markup 15% would be 1.15)
  riskFactor: 1.00,
};

// Check if Firebase is fully configured in environment
const isFirebaseConfigured = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

/**
 * Seeds the Firestore database with the 52 rooms and default settings if not already present.
 */
export async function seedDatabase() {
  if (!isFirebaseConfigured) {
    console.log('Firebase not configured. Seeding skipped, running in mock mode.');
    return { success: true, message: 'Mock mode active (no database connection).' };
  }

  try {
    // 1. Seed settings
    const settingsDoc = await db.collection('settings').doc('system').get();
    if (!settingsDoc.exists) {
      await db.collection('settings').doc('system').set(DEFAULT_SETTINGS);
      console.log('Seeded system settings.');
    }

    // 2. Seed rooms
    const roomsSnapshot = await db.collection('rooms').limit(1).get();
    if (roomsSnapshot.empty) {
      const batch = db.batch();
      staticRooms.forEach((room) => {
        // Use random photo url as placeholder
        const photoUrl = `/images/rooms/${room.code.toLowerCase()}.webp`;
        const roomRef = db.collection('rooms').doc(room.code);
        batch.set(roomRef, {
          ...room,
          photoUrl,
        });
      });
      await batch.commit();
      console.log(`Seeded ${staticRooms.length} rooms.`);
    }

    // 3. Seed default active official LMAN
    const officialsSnapshot = await db.collection('officials').limit(1).get();
    if (officialsSnapshot.empty) {
      await db.collection('officials').add({
        name: 'Mahdi',
        title: 'Pelaksana Tugas Direktur Pengembangan dan Pendayagunaan LMAN',
        ordinanceNumber: 'PRIN-10/LMAN/2024',
        ordinanceDate: '2024-10-09',
        isActive: true,
      });
      console.log('Seeded default LMAN official.');
    }

    return { success: true, message: 'Database successfully seeded.' };
  } catch (error: any) {
    console.error('Failed to seed database:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches rooms from Firestore (falls back to static rooms if database is not configured or fails)
 */
export async function getRooms(): Promise<Room[]> {
  if (!isFirebaseConfigured) {
    return staticRooms.map((r) => ({
      ...r,
      photoUrl: `/images/rooms/${r.code.toLowerCase()}.webp`,
    }));
  }

  try {
    const snapshot = await db.collection('rooms').get();
    if (snapshot.empty) {
      // Seed first
      await seedDatabase();
      const freshSnapshot = await db.collection('rooms').get();
      return freshSnapshot.docs.map((doc) => doc.data() as Room);
    }
    return snapshot.docs.map((doc) => doc.data() as Room);
  } catch (error) {
    console.error('Failed to fetch rooms from Firestore, falling back to static data:', error);
    return staticRooms.map((r) => ({
      ...r,
      photoUrl: `/images/rooms/${r.code.toLowerCase()}.webp`,
    }));
  }
}

/**
 * Fetches settings from Firestore (falls back to default settings)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  if (!isFirebaseConfigured) {
    return DEFAULT_SETTINGS;
  }

  try {
    const doc = await db.collection('settings').doc('system').get();
    if (doc.exists) {
      return doc.data() as SystemSettings;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to fetch settings from Firestore, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Updates settings in Firestore
 */
export async function updateSystemSettings(settings: SystemSettings) {
  if (!isFirebaseConfigured) {
    return { success: true, message: 'Mock settings updated (in-memory only).' };
  }

  try {
    await db.collection('settings').doc('system').set(settings);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    return { success: false, error: error.message };
  }
}

// Server-side mock stores (in-memory) for demo mode
let mockClients: Client[] = [];
let mockSubmissions: Submission[] = [];
let mockBookings: Booking[] = [];
let mockSurveys: Survey[] = [];
let mockClosedSlots: ClosedSurveySlot[] = [];
let mockAuditLogs: AuditLog[] = [];

/**
 * Clients actions
 */
export async function getClients(): Promise<Client[]> {
  if (!isFirebaseConfigured) {
    return mockClients;
  }
  try {
    const snapshot = await db.collection('clients').orderBy('companyName', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
  } catch (error) {
    console.error('Failed to get clients:', error);
    return mockClients;
  }
}

export async function createClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const newClient: Omit<Client, 'id'> = {
    ...clientData,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured) {
    const client: Client = {
      id: 'mock-client-' + Math.random().toString(36).substring(2, 11),
      ...newClient
    };
    mockClients.push(client);
    return client;
  }

  try {
    const docRef = await db.collection('clients').add(newClient);
    return {
      id: docRef.id,
      ...newClient
    };
  } catch (error) {
    console.error('Failed to create client in Firestore, falling back to mock:', error);
    const client: Client = {
      id: 'mock-client-fallback-' + Math.random().toString(36).substring(2, 11),
      ...newClient
    };
    mockClients.push(client);
    return client;
  }
}

export async function updateClient(id: string, clientData: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<boolean> {
  const performMockUpdate = () => {
    const idx = mockClients.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockClients[idx] = { ...mockClients[idx], ...clientData };
    }
    return true;
  };

  if (!isFirebaseConfigured) {
    return performMockUpdate();
  }
  try {
    await db.collection('clients').doc(id).update(clientData);
    return true;
  } catch (error) {
    console.error('Failed to update client in Firestore, falling back to mock:', error);
    return performMockUpdate();
  }
}

export async function deleteClientPermanently(id: string): Promise<boolean> {
  const performMockDelete = () => {
    mockClients = mockClients.filter(c => c.id !== id);
    return true;
  };

  if (!isFirebaseConfigured) {
    return performMockDelete();
  }
  try {
    await db.collection('clients').doc(id).delete();
    return true;
  } catch (error) {
    console.error('Failed to delete client permanently in Firestore, falling back to mock:', error);
    return performMockDelete();
  }
}

export async function createAuditLog(action: string, details: string): Promise<AuditLog> {
  const log: Omit<AuditLog, 'id'> = {
    action,
    details,
    createdAt: new Date().toISOString(),
  };
  
  if (!isFirebaseConfigured) {
    const newLog: AuditLog = {
      id: 'mock-log-' + Math.random().toString(36).substring(2, 11),
      ...log
    };
    mockAuditLogs.push(newLog);
    console.log(`[AUDIT LOG] ${action}: ${details}`);
    return newLog;
  }
  
  try {
    const docRef = await db.collection('audit_logs').add(log);
    return {
      id: docRef.id,
      ...log
    };
  } catch (error) {
    console.error('Failed to create audit log in Firestore:', error);
    // Return fallback log instead of throwing to prevent crashing main client flows
    return {
      id: 'mock-log-fallback-' + Math.random().toString(36).substring(2, 11),
      ...log
    };
  }
}

/**
 * Submissions actions
 */
export async function getSubmissions(): Promise<Submission[]> {
  if (!isFirebaseConfigured) {
    return mockSubmissions;
  }
  try {
    const snapshot = await db.collection('submissions').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
  } catch (error) {
    console.error('Failed to get submissions:', error);
    return mockSubmissions;
  }
}

export async function createSubmission(submissionData: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Submission> {
  const now = new Date().toISOString();
  const newSubmission: Omit<Submission, 'id'> = {
    ...submissionData,
    createdAt: now,
    updatedAt: now,
  };

  if (!isFirebaseConfigured) {
    const submission: Submission = {
      id: 'mock-sub-' + Math.random().toString(36).substring(2, 11),
      ...newSubmission
    };
    mockSubmissions.push(submission);
    return submission;
  }

  try {
    const docRef = await db.collection('submissions').add(newSubmission);
    return {
      id: docRef.id,
      ...newSubmission
    };
  } catch (error) {
    console.error('Failed to create submission in Firestore, falling back to mock:', error);
    const submission: Submission = {
      id: 'mock-sub-fallback-' + Math.random().toString(36).substring(2, 11),
      ...newSubmission
    };
    mockSubmissions.push(submission);
    return submission;
  }
}

export async function updateSubmissionStage(id: string, stage: number): Promise<boolean> {
  const now = new Date().toISOString();
  const performMockUpdate = () => {
    const sub = mockSubmissions.find(s => s.id === id);
    if (sub) {
      sub.stage = stage;
      sub.updatedAt = now;
    }
    return true;
  };

  if (!isFirebaseConfigured) {
    return performMockUpdate();
  }
  try {
    await db.collection('submissions').doc(id).update({ stage, updatedAt: now });
    return true;
  } catch (error) {
    console.error('Failed to update submission stage in Firestore, falling back to mock:', error);
    return performMockUpdate();
  }
}

export async function updateSubmission(id: string, data: Partial<Submission>): Promise<boolean> {
  const now = new Date().toISOString();
  const updateData = { ...data, updatedAt: now };
  const performMockUpdate = () => {
    const idx = mockSubmissions.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockSubmissions[idx] = { ...mockSubmissions[idx], ...updateData };
    }
    return true;
  };

  if (!isFirebaseConfigured) {
    return performMockUpdate();
  }
  try {
    await db.collection('submissions').doc(id).update(updateData);
    return true;
  } catch (error) {
    console.error('Failed to update submission in Firestore, falling back to mock:', error);
    return performMockUpdate();
  }
}

/**
 * Bookings actions
 */
export async function getBookings(): Promise<Booking[]> {
  if (!isFirebaseConfigured) {
    return mockBookings;
  }
  try {
    const snapshot = await db.collection('bookings').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return mockBookings;
  }
}

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking | { error: string }> {
  // A4 & F5 Reservation Lock Validation
  if (bookingData.type === 'CONFIRMED' && bookingData.submissionId) {
    const sub = await getSubmissionById(bookingData.submissionId);
    if (sub && !validateBookingLock(bookingData.type, sub.stage)) {
      return { error: 'Status Terkunci hanya diperbolehkan jika pengajuan mencapai minimal Tahap 5' };
    }
  }

  if (!isFirebaseConfigured) {
    const booking: Booking = {
      id: 'mock-booking-' + Math.random().toString(36).substring(2, 11),
      ...bookingData
    };
    mockBookings.push(booking);
    return booking;
  }

  try {
    const docRef = await db.collection('bookings').add(bookingData);
    return {
      id: docRef.id,
      ...bookingData
    };
  } catch (error) {
    console.error('Failed to create booking in Firestore, falling back to mock:', error);
    const booking: Booking = {
      id: 'mock-booking-fallback-' + Math.random().toString(36).substring(2, 11),
      ...bookingData
    };
    mockBookings.push(booking);
    return booking;
  }
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<{ success: boolean; error?: string }> {
  // A4 & F5 Validation if status becomes CONFIRMED
  if (data.type === 'CONFIRMED') {
    const submissionId = data.submissionId || (await getBookingById(id))?.submissionId;
    if (submissionId) {
      const sub = await getSubmissionById(submissionId);
      if (sub && !validateBookingLock(data.type, sub.stage)) {
        return { success: false, error: 'Status Terkunci hanya diperbolehkan jika pengajuan mencapai minimal Tahap 5' };
      }
    }
  }

  if (!isFirebaseConfigured) {
    const idx = mockBookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      mockBookings[idx] = { ...mockBookings[idx], ...data };
      return { success: true };
    }
    return { success: false, error: 'Booking tidak ditemukan' };
  }
  try {
    await db.collection('bookings').doc(id).update(data);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update booking:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBooking(id: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    const initialLen = mockBookings.length;
    mockBookings = mockBookings.filter(b => b.id !== id);
    return mockBookings.length < initialLen;
  }
  try {
    await db.collection('bookings').doc(id).delete();
    return true;
  } catch (error) {
    console.error('Failed to delete booking from Firestore, falling back to mock:', error);
    const initialLen = mockBookings.length;
    mockBookings = mockBookings.filter(b => b.id !== id);
    return true; // Fallback success to allow client state sync
  }
}

// Helpers
export async function getSubmissionById(id: string): Promise<Submission | null> {
  if (!isFirebaseConfigured) {
    return mockSubmissions.find(s => s.id === id) || null;
  }
  try {
    const doc = await db.collection('submissions').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as Submission;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (!isFirebaseConfigured) {
    return mockBookings.find(b => b.id === id) || null;
  }
  try {
    const doc = await db.collection('bookings').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as Booking;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Surveys actions
 */
export async function getSurveys(): Promise<Survey[]> {
  if (!isFirebaseConfigured) {
    return mockSurveys;
  }
  try {
    const snapshot = await db.collection('surveys').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
  } catch (error) {
    console.error('Failed to get surveys:', error);
    return mockSurveys;
  }
}

export async function createSurvey(surveyData: Omit<Survey, 'id'>): Promise<Survey> {
  if (!isFirebaseConfigured) {
    const survey: Survey = {
      id: 'mock-survey-' + Math.random().toString(36).substring(2, 11),
      ...surveyData
    };
    mockSurveys.push(survey);
    return survey;
  }
  try {
    const docRef = await db.collection('surveys').add(surveyData);
    return {
      id: docRef.id,
      ...surveyData
    };
  } catch (error) {
    console.error('Failed to create survey in Firestore, falling back to mock:', error);
    const survey: Survey = {
      id: 'mock-survey-fallback-' + Math.random().toString(36).substring(2, 11),
      ...surveyData
    };
    mockSurveys.push(survey);
    return survey;
  }
}

export async function updateSurveyStatus(id: string, status: Survey['status']): Promise<boolean> {
  const performMockUpdate = () => {
    const survey = mockSurveys.find(s => s.id === id);
    if (survey) {
      survey.status = status;
    }
    return true;
  };

  if (!isFirebaseConfigured) {
    return performMockUpdate();
  }
  try {
    await db.collection('surveys').doc(id).update({ status });
    return true;
  } catch (error) {
    console.error('Failed to update survey status in Firestore, falling back to mock:', error);
    return performMockUpdate();
  }
}

export async function getClosedSurveySlots(): Promise<ClosedSurveySlot[]> {
  if (!isFirebaseConfigured) {
    return mockClosedSlots;
  }
  try {
    const snapshot = await db.collection('closed_survey_slots').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClosedSurveySlot));
  } catch (error) {
    console.error('Failed to get closed survey slots:', error);
    return mockClosedSlots;
  }
}

export async function closeSurveySlot(slot: Omit<ClosedSurveySlot, 'id'>): Promise<ClosedSurveySlot> {
  if (!isFirebaseConfigured) {
    const newSlot: ClosedSurveySlot = {
      id: 'mock-closed-' + Math.random().toString(36).substring(2, 11),
      ...slot
    };
    mockClosedSlots.push(newSlot);
    return newSlot;
  }
  try {
    const docRef = await db.collection('closed_survey_slots').add(slot);
    return {
      id: docRef.id,
      ...slot
    };
  } catch (error) {
    console.error('Failed to close survey slot in Firestore, falling back to mock:', error);
    const newSlot: ClosedSurveySlot = {
      id: 'mock-closed-fallback-' + Math.random().toString(36).substring(2, 11),
      ...slot
    };
    mockClosedSlots.push(newSlot);
    return newSlot;
  }
}

export async function openSurveySlot(id: string): Promise<boolean> {
  const performMockDelete = () => {
    const initialLen = mockClosedSlots.length;
    mockClosedSlots = mockClosedSlots.filter(s => s.id !== id);
    return mockClosedSlots.length < initialLen;
  };

  if (!isFirebaseConfigured) {
    return performMockDelete();
  }
  try {
    await db.collection('closed_survey_slots').doc(id).delete();
    return true;
  } catch (error) {
    console.error('Failed to delete closed slot in Firestore, falling back to mock:', error);
    return performMockDelete();
  }
}


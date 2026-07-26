'use server';

import { db } from '@/lib/firebase';
import { Room, staticRooms } from '@/lib/rooms-data';

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

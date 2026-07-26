export interface Room {
  code: string;
  name?: string;
  building: string;
  floor: number;
  areaSqm: number;
  capacity: number;
  dailyRate: number;
  photoUrl?: string;
  isPrimary: boolean;
  needsVerification: boolean;
  isActive: boolean;
}

export const staticRooms: Omit<Room, 'photoUrl'>[] = [
  { code: 'A1.1', building: 'A', floor: 1, areaSqm: 55, capacity: 30, dailyRate: 3219000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A1.2', building: 'A', floor: 1, areaSqm: 83, capacity: 50, dailyRate: 4884000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A1.3', building: 'A', floor: 1, areaSqm: 55, capacity: 30, dailyRate: 3219000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A1.4-5', building: 'A', floor: 1, areaSqm: 68, capacity: 40, dailyRate: 3996000, isPrimary: false, needsVerification: true, isActive: true }, // marked needsVerification
  { code: 'A1.6', building: 'A', floor: 1, areaSqm: 57, capacity: 30, dailyRate: 3330000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A1.7', building: 'A', floor: 1, areaSqm: 84, capacity: 50, dailyRate: 4995000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A1.8', building: 'A', floor: 1, areaSqm: 186, capacity: 130, dailyRate: 10878000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.1', building: 'A', floor: 2, areaSqm: 55, capacity: 30, dailyRate: 3552000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.2', building: 'A', floor: 2, areaSqm: 83, capacity: 50, dailyRate: 5328000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.3', building: 'A', floor: 2, areaSqm: 55, capacity: 30, dailyRate: 3552000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.4', building: 'A', floor: 2, areaSqm: 68, capacity: 40, dailyRate: 4440000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.6', building: 'A', floor: 2, areaSqm: 57, capacity: 30, dailyRate: 3663000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.7', building: 'A', floor: 2, areaSqm: 75, capacity: 50, dailyRate: 4884000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.9', building: 'A', floor: 2, areaSqm: 85, capacity: 50, dailyRate: 5439000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A2.10', building: 'A', floor: 2, areaSqm: 111, capacity: 70, dailyRate: 7104000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A3.1', building: 'A', floor: 3, areaSqm: 55, capacity: 30, dailyRate: 3441000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A3.2', building: 'A', floor: 3, areaSqm: 83, capacity: 50, dailyRate: 5106000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A3.3', building: 'A', floor: 3, areaSqm: 84, capacity: 50, dailyRate: 5217000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'A3.4', building: 'A', floor: 3, areaSqm: 57, capacity: 30, dailyRate: 3552000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.2', building: 'C', floor: 1, areaSqm: 84, capacity: 50, dailyRate: 4995000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.3', building: 'C', floor: 1, areaSqm: 80, capacity: 50, dailyRate: 4662000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.4', building: 'C', floor: 1, areaSqm: 287, capacity: 200, dailyRate: 16761000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.5', building: 'C', floor: 1, areaSqm: 78, capacity: 50, dailyRate: 4551000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.6', building: 'C', floor: 1, areaSqm: 83, capacity: 50, dailyRate: 4884000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.8', building: 'C', floor: 1, areaSqm: 56, capacity: 30, dailyRate: 3330000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.9', building: 'C', floor: 1, areaSqm: 195, capacity: 130, dailyRate: 11433000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.10', building: 'C', floor: 1, areaSqm: 56, capacity: 30, dailyRate: 3330000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.12', building: 'C', floor: 1, areaSqm: 125, capacity: 80, dailyRate: 7326000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.13', building: 'C', floor: 1, areaSqm: 38, capacity: 20, dailyRate: 2220000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.14', building: 'C', floor: 1, areaSqm: 87, capacity: 60, dailyRate: 5106000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.15', building: 'C', floor: 1, areaSqm: 85, capacity: 50, dailyRate: 4995000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.16', building: 'C', floor: 1, areaSqm: 87, capacity: 60, dailyRate: 5106000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.17', building: 'C', floor: 1, areaSqm: 37, capacity: 20, dailyRate: 2220000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C1.18-19', building: 'C', floor: 1, areaSqm: 125, capacity: 70, dailyRate: 7437000, isPrimary: false, needsVerification: true, isActive: true }, // marked needsVerification
  { code: 'C2.2', name: 'Mataram', building: 'C', floor: 2, areaSqm: 164, capacity: 110, dailyRate: 10545000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C2.3', name: 'Sriwijaya', building: 'C', floor: 2, areaSqm: 287, capacity: 200, dailyRate: 18426000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C2.4', name: 'Bone', building: 'C', floor: 2, areaSqm: 161, capacity: 110, dailyRate: 10323000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C2.7', building: 'C', floor: 2, areaSqm: 56, capacity: 30, dailyRate: 3663000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C2.8', building: 'C', floor: 2, areaSqm: 195, capacity: 130, dailyRate: 12543000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C2.9', building: 'C', floor: 2, areaSqm: 56, capacity: 30, dailyRate: 3663000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C2.11', name: 'Ternate', building: 'C', floor: 2, areaSqm: 125, capacity: 80, dailyRate: 7992000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C2.12', name: 'Majapahit', building: 'C', floor: 2, areaSqm: 318, capacity: 220, dailyRate: 20313000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C2.13', name: 'Kutai', building: 'C', floor: 2, areaSqm: 125, capacity: 80, dailyRate: 7992000, isPrimary: true, needsVerification: false, isActive: true },
  { code: 'C3.1', building: 'C', floor: 3, areaSqm: 74, capacity: 50, dailyRate: 4551000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.2', building: 'C', floor: 3, areaSqm: 164, capacity: 110, dailyRate: 10101000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.3', building: 'C', floor: 3, areaSqm: 287, capacity: 200, dailyRate: 17538000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.5', building: 'C', floor: 3, areaSqm: 161, capacity: 110, dailyRate: 9879000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.6', building: 'C', floor: 3, areaSqm: 74, capacity: 50, dailyRate: 4551000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.8', building: 'C', floor: 3, areaSqm: 496, capacity: 340, dailyRate: 30303000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.11', building: 'C', floor: 3, areaSqm: 125, capacity: 80, dailyRate: 7659000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.12', building: 'C', floor: 3, areaSqm: 318, capacity: 220, dailyRate: 19425000, isPrimary: false, needsVerification: false, isActive: true },
  { code: 'C3.13', building: 'C', floor: 3, areaSqm: 125, capacity: 80, dailyRate: 7659000, isPrimary: false, needsVerification: false, isActive: true },
];

/**
 * Validates whether a daily rate is a multiple of Rp111.000.
 * Returns true if valid, false if it deviates.
 */
export function validateRateMultiple(rate: number): boolean {
  return rate % 111000 === 0;
}

/**
 * Predefined Quick Packages.
 * The areas are calculated dynamically from the static room list to ensure they adapt to modifications.
 */
export interface QuickPackage {
  id: string;
  name: string;
  areaSqm: number;
  roomCodes: string[];
}

export function getQuickPackages(roomsList: Room[]): QuickPackage[] {
  const filterAndSum = (filterFn: (r: Room) => boolean) => {
    const filtered = roomsList.filter(filterFn);
    return filtered.map(r => r.code);
  };

  const codesA1 = filterAndSum(r => r.building === 'A' && r.floor === 1);
  const codesA2 = filterAndSum(r => r.building === 'A' && r.floor === 2);
  const codesA3 = filterAndSum(r => r.building === 'A' && r.floor === 3);
  const codesA = filterAndSum(r => r.building === 'A');

  const codesC1 = filterAndSum(r => r.building === 'C' && r.floor === 1);
  const codesC2 = filterAndSum(r => r.building === 'C' && r.floor === 2);
  const codesC3 = filterAndSum(r => r.building === 'C' && r.floor === 3);
  const codesC = filterAndSum(r => r.building === 'C');

  const codesAll = filterAndSum(r => r.building === 'A' || r.building === 'C');

  return [
    { id: 'A-lt1', name: 'Gedung A Lantai 1', areaSqm: 671, roomCodes: codesA1 },
    { id: 'A-lt2', name: 'Gedung A Lantai 2', areaSqm: 519, roomCodes: codesA2 },
    { id: 'A-lt3', name: 'Gedung A Lantai 3', areaSqm: 663, roomCodes: codesA3 },
    { id: 'A-all', name: 'Seluruh Gedung A', areaSqm: 1853, roomCodes: codesA }, // 671 + 519 + 663
    { id: 'C-lt1', name: 'Gedung C Lantai 1', areaSqm: 1850, roomCodes: codesC1 },
    { id: 'C-lt2', name: 'Gedung C Lantai 2', areaSqm: 1531, roomCodes: codesC2 },
    { id: 'C-lt3', name: 'Gedung C Lantai 3', areaSqm: 1807, roomCodes: codesC3 },
    { id: 'C-all', name: 'Seluruh Gedung C', areaSqm: 5188, roomCodes: codesC }, // 1850 + 1531 + 1807
    { id: 'AC-all', name: 'Gedung A dan C', areaSqm: 7041, roomCodes: codesAll }, // 1853 + 5188
  ];
}

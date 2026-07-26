export interface CalculatorInput {
  areaSqm: number;
  purposeFactor: number; // e.g., 1.00 for Business, 0.75 for Non-Business
  returnRate: number;    // e.g., 1.00 for 100% base, 1.15 for 15% markup
  riskFactor: number;    // e.g., 1.00
  eventDays: number;
  loadingDays: number;
  fairValuePerSqm: number; // e.g., 50000
  loadingFactor: number;   // e.g., 0.30 (30%)
  ppnRate: number;         // e.g., 0.11 (11%)
}

export interface CalculatorResult {
  sewa: number;
  ppnSewa: number;
  loading: number;
  ppnLoading: number;
  total: number;
}

/**
 * Calculates rental and loading fees based on PMK 144 formulas.
 */
export function calculatePenawaran(input: CalculatorInput): CalculatorResult {
  const {
    areaSqm,
    purposeFactor,
    returnRate,
    riskFactor,
    eventDays,
    loadingDays,
    fairValuePerSqm,
    loadingFactor,
    ppnRate,
  } = input;

  // Sewa = fairValuePerSqm * luas * faktorTujuan * returnRate * riskFactor * hariAcara
  const sewa = fairValuePerSqm * areaSqm * purposeFactor * returnRate * riskFactor * eventDays;
  const ppnSewa = sewa * ppnRate;

  // Loading = fairValuePerSqm * luas * loadingFactor * returnRate * riskFactor * hariLoading
  // Note: loadingFactor (30%) replaces purposeFactor for loading component
  const loading = fairValuePerSqm * areaSqm * loadingFactor * returnRate * riskFactor * loadingDays;
  const ppnLoading = loading * ppnRate;

  const total = sewa + ppnSewa + loading + ppnLoading;

  return {
    sewa: Math.round(sewa),
    ppnSewa: Math.round(ppnSewa),
    loading: Math.round(loading),
    ppnLoading: Math.round(ppnLoading),
    total: Math.round(total),
  };
}

/**
 * Helper to format currency in Rupiah (e.g., Rp3.219.000)
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace('IDR', 'Rp');
}

/**
 * List of purpose factor options with ranges and defaults
 */
export interface PurposeOption {
  key: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
}

export const PURPOSE_OPTIONS: PurposeOption[] = [
  { key: 'bisnis', label: 'Bisnis / Komersil', min: 1.00, max: 1.00, defaultValue: 1.00 },
  { key: 'koperasi', label: 'Koperasi', min: 0.50, max: 1.00, defaultValue: 1.00 },
  { key: 'umkm', label: 'UMKM', min: 0.25, max: 1.00, defaultValue: 1.00 },
  { key: 'non_bisnis', label: 'Non Bisnis / Non Komersil', min: 0.25, max: 0.75, defaultValue: 0.75 },
  { key: 'tupoksi_gov', label: 'Tugas & Fungsi Pemerintahan', min: 0.00, max: 0.50, defaultValue: 0.50 },
  { key: 'infrastruktur', label: 'Infrastruktur', min: 0.01, max: 0.90, defaultValue: 0.90 },
  { key: 'sosial_perorangan', label: 'Mitra Perorangan Sosial / Non Bisnis', min: 0.05, max: 0.50, defaultValue: 0.50 },
];

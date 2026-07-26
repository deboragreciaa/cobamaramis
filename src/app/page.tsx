'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { getRooms, getSystemSettings, SystemSettings } from '@/app/actions/db';
import { Room, getQuickPackages, QuickPackage } from '@/lib/rooms-data';
import { calculatePenawaran, formatRupiah, PURPOSE_OPTIONS, PurposeOption } from '@/lib/calculator';
import {
  Search,
  Filter,
  Check,
  LogOut,
  Calculator,
  BookOpen,
  FileText,
  Settings,
  AlertCircle,
  Info,
  Layers,
  MapPin,
  Users,
  Maximize2,
  Copy,
  ChevronDown,
  Building,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface QuickPackageNew {
  id: string;
  floor: number;
  label: string;
  areaSqm: number;
}

const EXCEL_PACKAGES: QuickPackageNew[] = [
  // Lantai 1
  { id: 'L1-GA', floor: 1, label: 'Gedung A', areaSqm: 671 },
  { id: 'L1-GC', floor: 1, label: 'Gedung C', areaSqm: 1850 },
  { id: 'L1-GE', floor: 1, label: 'Gedung E', areaSqm: 699 },
  { id: 'L1-Total', floor: 1, label: 'Total Lantai 1', areaSqm: 3220 },
  
  // Lantai 2
  { id: 'L2-GA', floor: 2, label: 'Gedung A', areaSqm: 519 },
  { id: 'L2-GC', floor: 2, label: 'Gedung C', areaSqm: 1531 },
  { id: 'L2-GE', floor: 2, label: 'Gedung E', areaSqm: 574 },
  { id: 'L2-Total', floor: 2, label: 'Total Lantai 2', areaSqm: 2624 },
  
  // Lantai 3
  { id: 'L3-GA', floor: 3, label: 'Gedung A', areaSqm: 663 },
  { id: 'L3-GB', floor: 3, label: 'Gedung B', areaSqm: 107 },
  { id: 'L3-GC', floor: 3, label: 'Gedung C', areaSqm: 1807 },
  { id: 'L3-GD', floor: 3, label: 'Gedung D', areaSqm: 107 },
  { id: 'L3-GE', floor: 3, label: 'Gedung E', areaSqm: 658 },
  { id: 'L3-Total', floor: 3, label: 'Total Lantai 3', areaSqm: 3342 },
];

export default function Home() {
  const { user, role, loading, error, login, selectRole, logout, isMock } = useAuth();
  
  // App States
  const [emailInput, setEmailInput] = useState('team@maramis.go.id');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'calculator' | 'documents'>('catalog');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  
  // Database States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    fairValuePerSqm: 50000,
    loadingFactor: 0.30,
    ppnRate: 0.11,
    returnRate: 1.00,
    riskFactor: 1.00,
  });
  const [dbLoading, setDbLoading] = useState(false);

  // F1 Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterMinCapacity, setFilterMinCapacity] = useState<string>('0');
  const [sortBy, setSortBy] = useState<'capacity' | 'rate' | 'area'>('capacity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // F2 Calculator Inputs
  const [selectedRoomCodes, setSelectedRoomCodes] = useState<string[]>([]);
  const [eventDays, setEventDays] = useState<string>('1');
  const [loadingDays, setLoadingDays] = useState<string>('1');
  const [selectedPurposeKey, setSelectedPurposeKey] = useState<string>('bisnis');
  const [customPurposeFactor, setCustomPurposeFactor] = useState<string>('100'); // in percent
  const [customReturnRate, setCustomReturnRate] = useState<string>('100'); // in percent (115% for 15% markup)
  const [customRiskFactor, setCustomRiskFactor] = useState<string>('100'); // in percent
  
  // F2 Calc Mode (auto vs manual)
  const [calcMode, setCalcMode] = useState<'auto' | 'manual'>('auto');
  const [manualSewa, setManualSewa] = useState<string>('');
  const [manualPPNSewa, setManualPPNSewa] = useState<string>('');
  const [manualLoading, setManualLoading] = useState<string>('');
  const [manualPPNLoading, setManualPPNLoading] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch Rooms and Settings on mount/auth
  useEffect(() => {
    if (user && role) {
      setDbLoading(true);
      Promise.all([getRooms(), getSystemSettings()])
        .then(([fetchedRooms, fetchedSettings]) => {
          setRooms(fetchedRooms);
          setSystemSettings(fetchedSettings);
          
          // Seed the calculator factors with default settings
          setCustomReturnRate(fetchedSettings.returnRate * 100);
          setCustomRiskFactor(fetchedSettings.riskFactor * 100);
        })
        .catch((err) => console.error('Error fetching data:', err))
        .finally(() => setDbLoading(false));
    }
  }, [user, role]);

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(passwordInput, emailInput);
  };

  // Helper: Use Demo Password
  const useDemoPassword = () => {
    setPasswordInput('maramis2026');
  };

  // F1: Filtered & Sorted Rooms
  const filteredRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        const matchesSearch =
          room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (room.name && room.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesBuilding = filterBuilding === 'all' || room.building === filterBuilding;
        const matchesFloor = filterFloor === 'all' || room.floor.toString() === filterFloor;
        const matchesCapacity = room.capacity >= (parseInt(filterMinCapacity) || 0);
        return matchesSearch && matchesBuilding && matchesFloor && matchesCapacity;
      })
      .sort((a, b) => {
        let fieldA = 0;
        let fieldB = 0;
        if (sortBy === 'capacity') {
          fieldA = a.capacity;
          fieldB = b.capacity;
        } else if (sortBy === 'rate') {
          fieldA = a.dailyRate;
          fieldB = b.dailyRate;
        } else if (sortBy === 'area') {
          fieldA = a.areaSqm;
          fieldB = b.areaSqm;
        }

        if (sortOrder === 'asc') return fieldA - fieldB;
        return fieldB - fieldA;
      });
  }, [rooms, searchQuery, filterBuilding, filterFloor, filterMinCapacity, sortBy, sortOrder]);

  // Main Rooms of Building C, Floor 2 (Mataram, Sriwijaya, Bone, Ternate, Majapahit, Kutai)
  const primaryRooms = useMemo(() => {
    return rooms.filter((r) => r.isPrimary);
  }, [rooms]);

  const isAllPrimarySelected = useMemo(() => {
    if (primaryRooms.length === 0) return false;
    return primaryRooms.every((r) => selectedRoomCodes.includes(r.code));
  }, [primaryRooms, selectedRoomCodes]);

  const toggleSelectAllPrimary = () => {
    setSelectedPackageIds([]); // clear package selection!
    const primaryCodes = primaryRooms.map((r) => r.code);
    if (isAllPrimarySelected) {
      // Deselect all primary rooms
      setSelectedRoomCodes((prev) => prev.filter((code) => !primaryCodes.includes(code)));
    } else {
      // Select all primary rooms, avoiding duplicates
      setSelectedRoomCodes((prev) => Array.from(new Set([...prev, ...primaryCodes])));
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredRooms.length === 0) return false;
    return filteredRooms.every((room) => selectedRoomCodes.includes(room.code));
  }, [filteredRooms, selectedRoomCodes]);

  const toggleSelectAllFiltered = () => {
    setSelectedPackageIds([]); // clear package selection!
    const filteredCodes = filteredRooms.map((room) => room.code);
    if (isAllFilteredSelected) {
      // Deselect all filtered rooms
      setSelectedRoomCodes((prev) => prev.filter((code) => !filteredCodes.includes(code)));
    } else {
      // Select all filtered rooms, avoiding duplicates
      setSelectedRoomCodes((prev) => Array.from(new Set([...prev, ...filteredCodes])));
    }
  };

  // Quick Packages List
  const quickPackages = useMemo(() => {
    return getQuickPackages(rooms);
  }, [rooms]);

  // Apply Quick Package (decoupled selection, supporting multiple selections)
  const applyQuickPackage = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
    setSelectedRoomCodes([]); // clear individual room selections!
  };

  // F2: Calculator Operations
  const selectedRooms = useMemo(() => {
    return rooms.filter((r) => selectedRoomCodes.includes(r.code));
  }, [rooms, selectedRoomCodes]);

  // Check if current selection uses Excel quick packages
  const activePackages = useMemo(() => {
    return EXCEL_PACKAGES.filter((pkg) => selectedPackageIds.includes(pkg.id));
  }, [selectedPackageIds]);

  const activePackageRoomsCount = useMemo(() => {
    if (activePackages.length === 0) return 0;
    const matchedRooms = rooms.filter((room) => {
      return activePackages.some((pkg) => {
        if (pkg.id.endsWith('-Total')) {
          return room.floor === pkg.floor;
        }
        const buildingCode = pkg.id.slice(-2); // e.g. 'GA', 'GC'
        const bChar = buildingCode.charAt(1);
        return room.floor === pkg.floor && room.building === bChar;
      });
    });
    return matchedRooms.length;
  }, [rooms, activePackages]);

  const totalSelectedArea = useMemo(() => {
    if (activePackages.length > 0) {
      return activePackages.reduce((sum, pkg) => sum + pkg.areaSqm, 0); // Sum of Excel package areas!
    }
    return selectedRooms.reduce((sum, r) => sum + r.areaSqm, 0);
  }, [selectedRooms, activePackages]);

  const totalSelectedCapacity = useMemo(() => {
    return selectedRooms.reduce((sum, r) => sum + r.capacity, 0);
  }, [selectedRooms]);

  const activePurposeOption = useMemo(() => {
    return PURPOSE_OPTIONS.find((o) => o.key === selectedPurposeKey) || PURPOSE_OPTIONS[0];
  }, [selectedPurposeKey]);

  // Update default factor when purpose changes
  useEffect(() => {
    setCustomPurposeFactor((activePurposeOption.defaultValue * 100).toString());
  }, [selectedPurposeKey, activePurposeOption]);

  // Verify if custom value is outside PMK 144 range
  const isPurposeFactorDeviating = useMemo(() => {
    const factorDecimal = (parseFloat(customPurposeFactor) || 0) / 100;
    return factorDecimal < activePurposeOption.min || factorDecimal > activePurposeOption.max;
  }, [customPurposeFactor, activePurposeOption]);

  const calculatorResults = useMemo(() => {
    if (calcMode === 'manual') {
      const sewaVal = parseFloat(manualSewa) || 0;
      const ppnSewaVal = parseFloat(manualPPNSewa) || 0;
      const loadingVal = parseFloat(manualLoading) || 0;
      const ppnLoadingVal = parseFloat(manualPPNLoading) || 0;
      return {
        sewa: sewaVal,
        ppnSewa: ppnSewaVal,
        loading: loadingVal,
        ppnLoading: ppnLoadingVal,
        total: sewaVal + ppnSewaVal + loadingVal + ppnLoadingVal,
      };
    }

    const parsedEventDays = Math.max(1, parseInt(eventDays) || 1);
    const parsedLoadingDays = Math.max(0, parseInt(loadingDays) || 0);
    const parsedPurposeFactor = (parseFloat(customPurposeFactor) || 0) / 100;
    const parsedReturnRate = (parseFloat(customReturnRate) || 0) / 100;
    const parsedRiskFactor = (parseFloat(customRiskFactor) || 0) / 100;

    return calculatePenawaran({
      areaSqm: totalSelectedArea,
      purposeFactor: parsedPurposeFactor,
      returnRate: parsedReturnRate,
      riskFactor: parsedRiskFactor,
      eventDays: parsedEventDays,
      loadingDays: parsedLoadingDays,
      fairValuePerSqm: systemSettings.fairValuePerSqm,
      loadingFactor: systemSettings.loadingFactor,
      ppnRate: systemSettings.ppnRate,
    });
  }, [
    calcMode,
    totalSelectedArea,
    customPurposeFactor,
    customReturnRate,
    customRiskFactor,
    eventDays,
    loadingDays,
    systemSettings,
    manualSewa,
    manualPPNSewa,
    manualLoading,
    manualPPNLoading,
  ]);

  const handleCopyResults = () => {
    const details = `RINCIAN ESTIMASI PENAWARAN - GD. A.A. MARAMIS (PMK 144)
-----------------------------------------------
Ruangan/Paket: ${
      activePackages.length > 0
        ? activePackages.map((pkg) => `${pkg.label} (Lt. ${pkg.floor} - ${pkg.areaSqm} m²)`).join(', ')
        : selectedRooms.map((r) => `${r.code} (${r.name || 'Tanpa nama'})`).join(', ') || 'Belum dipilih'
    }
Total Luas: ${totalSelectedArea} m²
Hari Acara: ${parseInt(eventDays) || 1} hari | Hari Loading: ${parseInt(loadingDays) || 0} hari
Mode: ${calcMode === 'auto' ? 'Hitung Otomatis' : 'Isi Manual'}

Sewa Acara    : ${formatRupiah(calculatorResults.sewa)}
PPN Sewa      : ${formatRupiah(calculatorResults.ppnSewa)}
Loading       : ${formatRupiah(calculatorResults.loading)}
PPN Loading   : ${formatRupiah(calculatorResults.ppnLoading)}
-----------------------------------------------
TOTAL TARIF   : ${formatRupiah(calculatorResults.total)}

*Catatan: Hasil hitung otomatis bersifat usulan internal, bukan penawaran resmi sampai ditetapkan tim.`;

    navigator.clipboard.writeText(details);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Toggle selection for individual room
  const toggleRoomSelection = (code: string) => {
    setSelectedPackageIds([]); // clear package selection!
    setSelectedRoomCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // F10: Documents list with versions
  const documentsList = [
    { name: 'Booklet Informasi Gedung A.A. Maramis', version: '2026-05', desc: 'Informasi lengkap kapasitas, denah, dan foto ruangan.', type: 'PDF' },
    { name: 'Layout Gedung A, B & C Lengkap', version: '2026-04', desc: 'Denah arsitektur PDF berskala untuk kebutuhan mitigasi.', type: 'ZIP' },
    { name: 'Tata Tertib Pengunjung Gedung', version: '2025-11', desc: 'Aturan umum untuk seluruh pengunjung dan tamu undangan.', type: 'PDF' },
    { name: 'Tata Tertib Mitra Pemanfaatan', version: '2026-01', desc: 'Ketentuan teknis operasional loading barang, kelistrikan, dan kebersihan bagi penyelenggara.', type: 'PDF' },
    { name: 'Template Surat Permohonan Sewa', version: '2026-03', desc: 'Draft surat resmi pengajuan sewa untuk dikirimkan oleh pemohon.', type: 'DOCX' },
    { name: 'Formulir Operasional Acara', version: '2026-02', desc: 'Form checklist loading barang, izin keramaian, dan checklist kebersihan.', type: 'ZIP' },
  ];

  // Render Spinner
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        <p className="mt-4 text-slate-400 text-sm">Memuat autentikasi...</p>
      </div>
    );
  }

  // SCREEN 1: LOGIN FORM
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 text-amber-500">
              <Building className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-center text-white tracking-wide">Gedung A.A. Maramis</h1>
            <p className="text-slate-400 text-xs mt-1 text-center font-medium">SISTEM KELOLA SEWA INTERNAL — LMAN</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Tim</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Masukkan email tim terdaftar"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <span className="text-[10px] text-slate-500 block">Satu akun bersama untuk seluruh tim pengelola.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Kata Sandi</label>
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi tim"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-amber-500/15"
            >
              Masuk Gerbang Kata Sandi
            </button>
          </form>

          {isMock && (
            <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
              <p className="text-xs text-slate-500 mb-2">Aplikasi berjalan dalam mode demo offline.</p>
              <button
                onClick={useDemoPassword}
                className="text-xs font-bold text-amber-500/80 hover:text-amber-500 underline decoration-dotted transition-colors"
              >
                Gunakan sandi demo default ("maramis2026")
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 2: ROLE SELECTION
  if (user && !role) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-xl backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-xl font-bold text-white tracking-wide">Pilih Peran Sesi Anda</h1>
            <p className="text-slate-400 text-xs mt-1">Gedung A.A. Maramis — LMAN</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {/* PENGINPUT BUTTON */}
            <button
              onClick={() => selectRole('PENGINPUT')}
              className="group text-left p-6 bg-slate-950 hover:bg-amber-500/[0.02] border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="text-white font-bold group-hover:text-amber-400 transition-colors">Penginput</h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Akses penuh untuk input data klien, survei, booking, kelola parameter hitungan, membuat LOI/Perjanjian, serta mengunduh dokumen.
                </p>
              </div>
              <span className="text-[10px] text-amber-500/80 font-semibold tracking-wider uppercase mt-4 block">PILIH PENGINPUT &rarr;</span>
            </button>

            {/* PEREVIEW BUTTON */}
            <button
              onClick={() => selectRole('PEREVIEW')}
              className="group text-left p-6 bg-slate-950 hover:bg-blue-500/[0.02] border border-slate-800 hover:border-blue-500/40 rounded-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors">Pereview</h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Akses pantau dan monitoring saja. Melihat progres tahap pemesanan, melihat katalog ruangan, dan menggunakan kalkulator penawaran.
                </p>
              </div>
              <span className="text-[10px] text-blue-500/80 font-semibold tracking-wider uppercase mt-4 block">PILIH PEREVIEW &rarr;</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-800/60 mt-4">
            <span className="text-[11px] text-slate-500">
              Sesi aktif: <span className="font-semibold">{user.email}</span>
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3: MAIN APPLICATION DASHBOARD
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* HEADER BANNER */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-lg">Aplikasi Gedung A.A. Maramis</h1>
              <p className="text-[11px] text-slate-400 font-medium">Lembaga Manajemen Aset Negara (LMAN)</p>
            </div>
          </div>

          {/* User Session Info / Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {isMock && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> DEMO MODE
              </span>
            )}
            
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <span className="px-2.5 py-1 text-slate-400 font-medium select-none">Peran:</span>
              <span className={`px-2.5 py-1 rounded font-bold ${
                role === 'PENGINPUT' 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {role === 'PENGINPUT' ? 'Penginput' : 'Pereview'}
              </span>
              <button
                onClick={() => selectRole(role === 'PENGINPUT' ? 'PEREVIEW' : 'PENGINPUT')}
                className="ml-2 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1"
                title="Beralih peran"
              >
                <RefreshCw className="h-3 w-3" /> Ganti
              </button>
            </div>

            <button
              onClick={logout}
              className="text-xs bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* NAV TABS */}
        <div className="flex border-b border-slate-900">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Katalog Ruangan (F1)
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'calculator'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Kalkulator Penawaran (F2)
            {selectedRoomCodes.length > 0 && (
              <span className="bg-amber-500 text-slate-950 rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold">
                {selectedRoomCodes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Dokumen Operasional (F10)
          </button>
          
          {role === 'PENGINPUT' && (
            <div className="ml-auto hidden md:flex items-center text-[10px] text-slate-500 italic bg-slate-950/40 border border-slate-900 rounded px-2.5 py-1">
              Mode Pengeditan Aktif (Tahap 1)
            </div>
          )}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 flex flex-col gap-6">

          {/* TAB 1: KATALOG RUANGAN */}
          {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
              
              {/* LEFT COLUMN: PRIMARY ROOMS WIDGET */}
              <div className="lg:col-span-1">
                <div className="backdrop-blur-md bg-amber-500/[0.02] border border-amber-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col gap-4 h-full min-h-[460px]">
                  <div className="absolute top-0 right-0 p-2 bg-amber-500/10 border-b border-l border-amber-500/20 rounded-bl-xl text-amber-400 text-[8px] font-bold tracking-wider uppercase select-none">
                    6 RUANG UTAMA (GD. C LT. 2)
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 shrink-0 animate-pulse" /> Aula Utama C Lt. 2
                    </h2>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                      Enam aula acara bernama di Gedung C lantai 2 (Mataram, Sriwijaya, Bone, Ternate, Majapahit, Kutai). Bila digabung, total luasnya <strong>1.180 m²</strong> (satu lantai penuh).
                    </p>
                    
                    <button
                      onClick={toggleSelectAllPrimary}
                      className={`w-full py-2 mb-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isAllPrimarySelected
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {isAllPrimarySelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {isAllPrimarySelected ? 'Batalkan Semua' : 'Pilih Semua (1.180 m²)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {primaryRooms.length === 0 ? (
                      <p className="text-[10px] text-slate-500 col-span-full py-2">Memuat data...</p>
                    ) : (
                      primaryRooms.map((room) => {
                        const isSelected = selectedRoomCodes.includes(room.code);
                        return (
                          <div
                            key={room.code}
                            onClick={() => toggleRoomSelection(room.code)}
                            className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                                : 'bg-slate-950 hover:bg-slate-900 border-slate-900'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] text-slate-500 font-bold">{room.code}</span>
                              <div className={`h-2.5 w-2.5 rounded-sm border flex items-center justify-center ${
                                isSelected ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-850 bg-slate-950'
                              }`}>
                                {isSelected && <Check className="h-1.5 w-1.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="font-bold text-[10px] text-slate-200 truncate">{room.name}</div>
                            <div className="text-[8px] text-slate-500 mt-0.5">{room.areaSqm} m²</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: FILTERS, TABLE LIST & QUICK PACKAGES */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                
                {/* QUICK PACKAGES (EXCEL SALEABLE AREA TOTALS) */}
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-amber-500" /> Paket Ruang Cepat (Saleable Area Total)
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-1">Pilih cepat berdasarkan luas gedung & lantai dari data Excel (Pilihan ini terpisah dari list di bawah)</p>
                    </div>
                    {selectedPackageIds.length > 0 && (
                      <button
                        onClick={() => setSelectedPackageIds([])}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        Batal Pilih Paket ({selectedPackageIds.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Lantai 1 */}
                    <div className="p-3 bg-slate-950/60 border border-slate-900/60 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-slate-400 mb-1 border-b border-slate-900 pb-1 uppercase tracking-wider">Lantai 1 (Total: 3.220 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 1).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/60 text-amber-400 font-bold shadow-md'
                                  : 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-300'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-500 mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 2 */}
                    <div className="p-3 bg-slate-950/60 border border-slate-900/60 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-slate-400 mb-1 border-b border-slate-900 pb-1 uppercase tracking-wider">Lantai 2 (Total: 2.624 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 2).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/60 text-amber-400 font-bold shadow-md'
                                  : 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-300'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-500 mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 3 */}
                    <div className="p-3 bg-slate-950/60 border border-slate-900/60 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-slate-400 mb-1 border-b border-slate-900 pb-1 uppercase tracking-wider">Lantai 3 (Total: 3.342 m²)</h3>
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          {EXCEL_PACKAGES.filter(p => p.floor === 3 && p.id !== 'L3-Total').map(pkg => {
                            const isSelected = selectedPackageIds.includes(pkg.id);
                            return (
                              <button
                                key={pkg.id}
                                onClick={() => applyQuickPackage(pkg.id)}
                                className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-amber-500/60 text-amber-400 font-bold shadow-md'
                                    : 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-300'
                                }`}
                              >
                                <span className="text-[10px] truncate">{pkg.label}</span>
                                <span className="font-mono text-[9px] text-slate-500 mt-0.5">{pkg.areaSqm} m²</span>
                              </button>
                            );
                          })}
                        </div>
                        {EXCEL_PACKAGES.filter(p => p.id === 'L3-Total').map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-center transition-all border flex justify-between items-center ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/60 text-amber-400 font-bold shadow-md'
                                  : 'bg-slate-900 hover:bg-slate-850 border-slate-850 text-slate-300'
                              }`}
                            >
                              <span className="text-[10px]">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-500">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTER BAR */}
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
                  {/* Search */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari kode atau nama ruang..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Gedung:</span>
                      <select
                        value={filterBuilding}
                        onChange={(e) => setFilterBuilding(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="all">Semua</option>
                        <option value="A">Gedung A</option>
                        <option value="C">Gedung C</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Lantai:</span>
                      <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="all">Semua</option>
                        <option value="1">Lantai 1</option>
                        <option value="2">Lantai 2</option>
                        <option value="3">Lantai 3</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Kapasitas &ge;:</span>
                      <input
                        type="number"
                        min="0"
                        value={filterMinCapacity}
                        onChange={(e) => setFilterMinCapacity(e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
                    <span className="text-[11px] text-slate-500 shrink-0">Urutkan:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="capacity">Kapasitas</option>
                      <option value="rate">Tarif Booklet</option>
                      <option value="area">Luas Ruang</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors"
                    >
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* COMPACT ROOMS LIST (TABLE) */}
                <div className="backdrop-blur-md bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden shadow-lg p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-500" /> Daftar Ruangan Individual (Opsional)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Pilih ruangan secara manual di bawah jika penyewa ingin menyewa ruangan tertentu, bukan satu gedung penuh.</p>
                    </div>
                    {selectedRoomCodes.length > 0 && (
                      <button
                        onClick={() => setSelectedRoomCodes([])}
                        className="text-xs font-bold text-red-400 hover:text-red-355 transition-colors flex items-center gap-1 bg-slate-950 border border-slate-850 hover:bg-slate-900 hover:border-slate-800 px-3 py-1 rounded-lg"
                      >
                        Batal Pilih Semua Ruang ({selectedRoomCodes.length})
                      </button>
                    )}
                  </div>
                  
                  {dbLoading ? (
                    <div className="py-12 text-center text-slate-500 text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
                      Memuat katalog ruangan...
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="py-12 text-center text-slate-600 text-sm border border-dashed border-slate-900 rounded-xl">
                      Tidak ada ruangan yang cocok dengan filter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-950 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-400 font-semibold select-none">
                            <th className="p-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={toggleSelectAllFiltered}
                                className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                  isAllFilteredSelected
                                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                                    : 'border-slate-800 bg-slate-950 text-transparent hover:border-slate-600'
                                }`}
                                title={isAllFilteredSelected ? "Deselect All" : "Select All"}
                              >
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </button>
                            </th>
                            <th className="p-3.5">Kode Ruang</th>
                            <th className="p-3.5">Nama Ruang</th>
                            <th className="p-3.5">Gedung</th>
                            <th className="p-3.5 text-center">Lantai</th>
                            <th className="p-3.5 text-right">Luas</th>
                            <th className="p-3.5 text-right">Kapasitas</th>
                            <th className="p-3.5 text-right">Tarif Booklet (Acuan)</th>
                            <th className="p-3.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-950">
                          {filteredRooms.map((room) => {
                            const isSelected = selectedRoomCodes.includes(room.code);
                            return (
                              <tr
                                key={room.code}
                                onClick={() => toggleRoomSelection(room.code)}
                                className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-amber-500/[0.03]' : ''
                                }`}
                              >
                                <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => toggleRoomSelection(room.code)}
                                    className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                                        : 'border-slate-800 bg-slate-950 text-transparent hover:border-slate-600'
                                    }`}
                                  >
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </button>
                                </td>
                                <td className="p-3.5 font-bold text-white tracking-wide">{room.code}</td>
                                <td className="p-3.5 text-slate-250 font-medium">{room.name || '—'}</td>
                                <td className="p-3.5 text-slate-400">Gedung {room.building}</td>
                                <td className="p-3.5 text-center text-slate-400">{room.floor}</td>
                                <td className="p-3.5 text-right text-slate-300 font-mono">{room.areaSqm} m²</td>
                                <td className="p-3.5 text-right text-slate-300 font-mono">{room.capacity} pax</td>
                                <td className="p-3.5 text-right font-extrabold text-amber-500 font-mono">
                                  {formatRupiah(room.dailyRate)}
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex justify-center gap-1.5">
                                    {room.needsVerification && (
                                      <span className="text-[9px] bg-red-550/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Belum Verifikasi
                                      </span>
                                    )}
                                    {room.isPrimary && (
                                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Utama
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: KALKULATOR PENAWARAN */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT & MIDDLE: SETTINGS & INPUTS */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* SELECTED ROOMS SUMMARY */}
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">1. Ruangan Terpilih</h2>
                      <p className="text-xs text-slate-400 mt-1">Estimasi dihitung dari luas meter persegi ruangan terpilih</p>
                    </div>
                    {(selectedRoomCodes.length > 0 || selectedPackageIds.length > 0) && (
                      <button
                        onClick={() => {
                          setSelectedRoomCodes([]);
                          setSelectedPackageIds([]);
                        }}
                        className="text-xs text-red-400 hover:text-red-350 transition-colors font-medium"
                      >
                        Hapus Semua Pilihan
                      </button>
                    )}
                  </div>

                  {selectedRooms.length === 0 && activePackages.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500">Belum ada ruangan atau paket terpilih.</p>
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className="mt-2 text-xs font-bold text-amber-500 hover:underline"
                      >
                        Pilih dari Katalog Ruangan &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Render Active Packages Summary if any */}
                      {activePackages.length > 0 && (
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {activePackages.map((pkg) => (
                              <span
                                key={pkg.id}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-lg"
                              >
                                <Layers className="h-3 w-3" />
                                {pkg.label} (Lt. {pkg.floor}) — {pkg.areaSqm} m²
                                <button
                                  onClick={() => applyQuickPackage(pkg.id)}
                                  className="text-red-400 hover:text-red-300 font-bold ml-1.5"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Render Individual Rooms Summary if any */}
                      {selectedRooms.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block mb-2 uppercase tracking-wider">Ruangan Individual</span>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-950/60 border border-slate-950 rounded-lg">
                            {selectedRooms.map((room) => (
                              <span
                                key={room.code}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300 pl-2 pr-1 py-0.5 rounded-full"
                              >
                                {room.code} {room.name ? `(${room.name})` : ''}
                                <button
                                  onClick={() => toggleRoomSelection(room.code)}
                                  className="text-slate-500 hover:text-slate-350 ml-1 hover:bg-slate-800 rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-950 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Jumlah Ruang</span>
                          <span className="text-base font-bold text-white">
                            {activePackages.length > 0 ? `${activePackageRoomsCount} unit` : `${selectedRooms.length} unit`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Akumulasi Luas</span>
                          <span className="text-base font-bold text-amber-500">{totalSelectedArea} m²</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Akumulasi Kapasitas</span>
                          <span className="text-base font-bold text-white">
                            {activePackages.length > 0 ? 'Sesuai Layanan Paket' : `${totalSelectedCapacity} orang`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PMK 144 ADJUSTMENT PARAMETERS */}
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5">
                  <h2 className="text-base font-bold text-white mb-4">2. Parameter Penyesuai & Hari Sewa</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Days Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1.5">Hari Acara</label>
                        <input
                          type="number"
                          min="1"
                          value={eventDays}
                          onChange={(e) => setEventDays(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1.5">Hari Loading (Persiapan & Bongkar)</label>
                        <input
                          type="number"
                          min="0"
                          value={loadingDays}
                          onChange={(e) => setLoadingDays(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500/40"
                        />
                      </div>
                    </div>

                    {/* PMK 144 Purpose & Custom factors */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1.5">Tujuan Sewa Guna (Rentang PMK 144)</label>
                        <select
                          value={selectedPurposeKey}
                          onChange={(e) => setSelectedPurposeKey(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-amber-500/40"
                        >
                          {PURPOSE_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label} ({opt.min * 100}%–{opt.max * 100}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Faktor Tujuan (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customPurposeFactor}
                            onChange={(e) => setCustomPurposeFactor(e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none ${
                              isPurposeFactorDeviating ? 'border-yellow-500/50' : 'border-slate-850'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Tingkat Pengembalian (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customReturnRate}
                            onChange={(e) => setCustomReturnRate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-amber-500/40"
                            placeholder="Markup 15% = 115%"
                          />
                        </div>
                      </div>

                      {/* Warnings and alerts */}
                      {isPurposeFactorDeviating && (
                        <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-[10px] flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>
                            Nilai di luar rekomendasi PMK 144 ({activePurposeOption.min * 100}%–{activePurposeOption.max * 100}%). Pengetikan diizinkan untuk negosiasi khusus.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CONSTANT/SYSTEM SETTINGS DISPLAY */}
                <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-amber-500/80 shrink-0" />
                    <span>Konstanta System (Settings): Nilai Wajar = {formatRupiah(systemSettings.fairValuePerSqm)}/m² · Faktor Loading = {systemSettings.loadingFactor * 100}% · PPN = {systemSettings.ppnRate * 100}%</span>
                  </div>
                  {role === 'PENGINPUT' && (
                    <span className="text-[10px] text-slate-500 shrink-0 italic">
                      Dapat diubah di bagian kelola parameter (Fase 2)
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: RESULTS BOARD */}
              <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5 flex flex-col justify-between h-fit gap-6 shadow-xl sticky top-24">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-bold text-white">Hasil Kalkulasi</h2>
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-950 border border-slate-900 rounded p-0.5 text-[10px]">
                      <button
                        onClick={() => setCalcMode('auto')}
                        className={`px-2 py-1 rounded font-bold ${
                          calcMode === 'auto'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Otomatis
                      </button>
                      <button
                        onClick={() => setCalcMode('manual')}
                        className={`px-2 py-1 rounded font-bold ${
                          calcMode === 'manual'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {calcMode === 'manual' ? (
                    <div className="space-y-3 my-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">Sewa Acara (Rp)</label>
                        <input
                          type="number"
                          placeholder="Masukkan nilai sewa"
                          value={manualSewa}
                          onChange={(e) => setManualSewa(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">PPN Sewa (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Sewa"
                          value={manualPPNSewa}
                          onChange={(e) => setManualPPNSewa(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">Sewa Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="Nilai loading"
                          value={manualLoading}
                          onChange={(e) => setManualLoading(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">PPN Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Loading"
                          value={manualPPNLoading}
                          onChange={(e) => setManualPPNLoading(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded py-1 px-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 my-6">
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-950">
                        <span className="text-slate-400">Sewa Acara ({eventDays} hari)</span>
                        <span className="font-semibold text-white">{formatRupiah(calculatorResults.sewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-950">
                        <span className="text-slate-400">PPN Sewa ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-semibold text-white">{formatRupiah(calculatorResults.ppnSewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-950">
                        <span className="text-slate-400">Loading ({loadingDays} hari)</span>
                        <span className="font-semibold text-white">{formatRupiah(calculatorResults.loading)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-950">
                        <span className="text-slate-400">PPN Loading ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-semibold text-white">{formatRupiah(calculatorResults.ppnLoading)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-950">
                  <div className="flex justify-between items-baseline mb-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL ESTIMASI</span>
                    <span className="text-xl font-black text-amber-500 tracking-tight">
                      {formatRupiah(calculatorResults.total)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCopyResults}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {copySuccess ? 'Berhasil Disalin!' : 'Salin Rincian Tarif'}
                    </button>
                    <span className="text-[9px] text-slate-500 text-center block leading-normal pt-1">
                      *Hasil di atas bersifat rekomendasi usulan tarif. Tarif final disahkan oleh Kepala LMAN pada surat penawaran resmi.
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DOKUMEN OPERASIONAL */}
          {activeTab === 'documents' && (
            <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-base font-bold text-white">Pusat Dokumen Operasional</h2>
                <p className="text-xs text-slate-400 mt-1">Unduh berkas resmi operasional penyewaan Gedung A.A. Maramis. Data diperbarui berkala sesuai versi terbaru.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentsList.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/60 border border-slate-850 hover:border-amber-500/20 rounded-xl flex items-center justify-between gap-4 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 group-hover:text-amber-500 transition-colors mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{doc.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{doc.desc}</p>
                        <span className="inline-block text-[9px] bg-slate-900 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded font-semibold mt-2.5">
                          Versi: {doc.version}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => alert(`Simulasi mengunduh berkas: ${doc.name} (${doc.type})`)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 hover:border-transparent rounded-lg text-[10px] font-bold text-slate-300 transition-all shrink-0"
                    >
                      Unduh {doc.type}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[10px] text-slate-600">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2026 Lembaga Manajemen Aset Negara (LMAN). Hak Cipta Dilindungi.</p>
          <p className="mt-1">Aplikasi Internal Tim Pengelola Gedung A.A. Maramis. Tidak untuk penggunaan publik.</p>
        </div>
      </footer>
    </div>
  );
}

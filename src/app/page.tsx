'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import {
  getRooms,
  getSystemSettings,
  SystemSettings,
  getClients,
  createClient,
  updateClient,
  deleteClientPermanently,
  createAuditLog,
  getSubmissions,
  createSubmission,
  updateSubmissionStage,
  updateSubmission,
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getSurveys,
  createSurvey,
  updateSurveyStatus,
  getClosedSurveySlots,
  closeSurveySlot,
  openSurveySlot
} from '@/app/actions/db';
import { Room, getQuickPackages, QuickPackage } from '@/lib/rooms-data';
import { calculatePenawaran, formatRupiah, PURPOSE_OPTIONS, PurposeOption } from '@/lib/calculator';
import { Client, Submission, Booking, Survey, ClosedSurveySlot, BookingType } from '@/lib/types';
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
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight
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
  
  const [timeStr, setTimeStr] = useState('09:06');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // App States
  const [emailInput, setEmailInput] = useState('team@maramis.go.id');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'calculator' | 'clients' | 'submissions' | 'calendar' | 'surveys' | 'documents'>('catalog');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Database States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [closedSlots, setClosedSlots] = useState<ClosedSurveySlot[]>([]);
  
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
  
  // F3 Client Form States
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [clientPicName, setClientPicName] = useState('');
  const [clientPicPhone, setClientPicPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  
  const activeClients = useMemo(() => {
    return clients.filter((c) => c.isActive !== false);
  }, [clients]);
  
  // F4 Submission Form States
  const [subClientId, setSubClientId] = useState('');
  const [subActivityName, setSubActivityName] = useState('');
  const [subPicInternal, setSubPicInternal] = useState('Tim LMAN');
  const [subNotes, setSubNotes] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  
  // F5 Booking Form States
  const [bookingType, setBookingType] = useState<BookingType>('TENTATIVE');
  const [bookingRoomCodes, setBookingRoomCodes] = useState<string[]>([]);
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingActivityName, setBookingActivityName] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmissionId, setBookingSubmissionId] = useState('');
  
  // F6 Survey Form States
  const [surveySubmissionId, setSurveySubmissionId] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyTimeSlot, setSurveyTimeSlot] = useState<'10:00' | '14:00'>('10:00');
  const [surveyPicInternal, setSurveyPicInternal] = useState('Tim LMAN');
  const [surveyGuestCount, setSurveyGuestCount] = useState('5');
  
  // F6 Close Slot States
  const [closeSlotDate, setCloseSlotDate] = useState('');
  const [closeSlotTimeSlot, setCloseSlotTimeSlot] = useState<'10:00' | '14:00'>('10:00');
  const [closeSlotReason, setCloseSlotReason] = useState('');

  // Calendar Month Navigation
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

  // Save states to localStorage when they change to survive refreshes/restarts
  useEffect(() => {
    if (typeof window !== 'undefined' && clients.length > 0) {
      localStorage.setItem('maramis_clients', JSON.stringify(clients));
    }
  }, [clients]);

  useEffect(() => {
    if (typeof window !== 'undefined' && submissions.length > 0) {
      localStorage.setItem('maramis_submissions', JSON.stringify(submissions));
    }
  }, [submissions]);

  useEffect(() => {
    if (typeof window !== 'undefined' && bookings.length > 0) {
      localStorage.setItem('maramis_bookings', JSON.stringify(bookings));
    }
  }, [bookings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && surveys.length > 0) {
      localStorage.setItem('maramis_surveys', JSON.stringify(surveys));
    }
  }, [surveys]);

  useEffect(() => {
    if (typeof window !== 'undefined' && closedSlots.length > 0) {
      localStorage.setItem('maramis_closed_slots', JSON.stringify(closedSlots));
    }
  }, [closedSlots]);

  // Load from localStorage immediately on mount (before network requests resolve)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localClients = localStorage.getItem('maramis_clients');
      const localSubs = localStorage.getItem('maramis_submissions');
      const localBookings = localStorage.getItem('maramis_bookings');
      const localSurveys = localStorage.getItem('maramis_surveys');
      const localClosedSlots = localStorage.getItem('maramis_closed_slots');

      if (localClients) setClients(JSON.parse(localClients));
      if (localSubs) setSubmissions(JSON.parse(localSubs));
      if (localBookings) setBookings(JSON.parse(localBookings));
      if (localSurveys) setSurveys(JSON.parse(localSurveys));
      if (localClosedSlots) setClosedSlots(JSON.parse(localClosedSlots));
    }
  }, []);

  // Fetch Rooms and Settings on mount/auth
  useEffect(() => {
    if (user && role) {
      setDbLoading(true);
      Promise.all([
        getRooms(),
        getSystemSettings(),
        getClients(),
        getSubmissions(),
        getBookings(),
        getSurveys(),
        getClosedSurveySlots()
      ])
        .then(([fetchedRooms, fetchedSettings, fetchedClients, fetchedSubmissions, fetchedBookings, fetchedSurveys, fetchedClosedSlots]) => {
          setRooms(fetchedRooms);
          setSystemSettings(fetchedSettings);
          
          // Merge fetched database items with current client-side state synchronously
          const localSubs = typeof window !== 'undefined' ? localStorage.getItem('maramis_submissions') : null;
          const currentSubs: Submission[] = localSubs ? JSON.parse(localSubs) : [];
          const mergedSubs = [...currentSubs];
          fetchedSubmissions.forEach(s => {
            if (!mergedSubs.some(m => m.id === s.id)) mergedSubs.push(s);
          });
          setSubmissions(mergedSubs);

          const localClients = typeof window !== 'undefined' ? localStorage.getItem('maramis_clients') : null;
          const currentClients: Client[] = localClients ? JSON.parse(localClients) : [];
          const mergedClients = [...currentClients];
          fetchedClients.forEach(c => {
            if (!mergedClients.some(m => m.id === c.id)) mergedClients.push(c);
          });

          // Reconstruct missing clients from submissions list
          mergedSubs.forEach(sub => {
            if (sub.clientId && !mergedClients.some(c => c.id === sub.clientId)) {
              mergedClients.push({
                id: sub.clientId,
                companyName: sub.companyName,
                picName: 'PIC Kontak ' + sub.companyName,
                picPhone: '08123456789',
                createdAt: sub.createdAt || new Date().toISOString(),
                isActive: true
              });
            }
          });
          
          setClients(mergedClients.sort((a, b) => a.companyName.localeCompare(b.companyName)));

          setBookings(prev => {
            const merged = [...prev];
            fetchedBookings.forEach(b => {
              if (!merged.some(m => m.id === b.id)) merged.push(b);
            });
            return merged;
          });

          setSurveys(prev => {
            const merged = [...prev];
            fetchedSurveys.forEach(s => {
              if (!merged.some(m => m.id === s.id)) merged.push(s);
            });
            return merged;
          });

          setClosedSlots(prev => {
            const merged = [...prev];
            fetchedClosedSlots.forEach(s => {
              if (!merged.some(m => m.id === s.id)) merged.push(s);
            });
            return merged;
          });
          
          // Seed the calculator factors with default settings
          setCustomReturnRate((fetchedSettings.returnRate * 100).toString());
          setCustomRiskFactor((fetchedSettings.riskFactor * 100).toString());
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

  // F3 Client Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCompanyName || !clientPicName || !clientPicPhone) {
      alert('Semua field wajib diisi.');
      return;
    }
    try {
      const newClient = await createClient({
        companyName: clientCompanyName,
        picName: clientPicName,
        picPhone: clientPicPhone,
      });
      setClients((prev) => [...prev, newClient].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      // Reset form
      setClientCompanyName('');
      setClientPicName('');
      setClientPicPhone('');
      alert('Klien baru berhasil ditambahkan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan klien.');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientId) return;
    if (!clientCompanyName || !clientPicName || !clientPicPhone) {
      alert('Semua field wajib diisi.');
      return;
    }
    try {
      const success = await updateClient(editingClientId, {
        companyName: clientCompanyName,
        picName: clientPicName,
        picPhone: clientPicPhone,
      });
      if (success) {
        await createAuditLog(
          'Edit Klien',
          `Mengubah data klien ID ${editingClientId}: ${clientCompanyName} (PIC: ${clientPicName})`
        );
        setClients((prev) =>
          prev.map((c) =>
            c.id === editingClientId
              ? {
                  ...c,
                  companyName: clientCompanyName,
                  picName: clientPicName,
                  picPhone: clientPicPhone,
                }
              : c
          ).sort((a, b) => a.companyName.localeCompare(b.companyName))
        );
        // Reset form
        setClientCompanyName('');
        setClientPicName('');
        setClientPicPhone('');
        setEditingClientId(null);
        alert('Perubahan data klien berhasil disimpan!');
      } else {
        alert('Gagal menyimpan perubahan klien.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan klien.');
    }
  };

  const handleDeleteClient = async (client: Client) => {
    const confirmDelete = window.confirm(`Yakin hapus klien ${client.companyName}?`);
    if (!confirmDelete) return;

    const hasSubmissions = submissions.some((sub) => sub.clientId === client.id);

    if (hasSubmissions) {
      const confirmDeactivate = window.confirm(
        `Klien "${client.companyName}" tidak bisa dihapus permanen karena masih memiliki pengajuan sewa terkait.\n\nApakah Anda bersedia menonaktifkan klien ini saja? (Klien akan diarsipkan lunak dan disembunyikan dari daftar utama)`
      );
      if (!confirmDeactivate) return;

      try {
        const success = await updateClient(client.id, { isActive: false });
        if (success) {
          await createAuditLog(
            'Deaktivasi Klien (Soft Delete)',
            `Menonaktifkan klien ID ${client.id}: ${client.companyName}`
          );
          setClients((prev) =>
            prev.map((c) => (c.id === client.id ? { ...c, isActive: false } : c))
          );
          alert(`Klien ${client.companyName} dinonaktifkan.`);
        } else {
          alert('Gagal menonaktifkan klien.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal menonaktifkan klien.');
      }
    } else {
      try {
        const success = await deleteClientPermanently(client.id);
        if (success) {
          await createAuditLog(
            'Hapus Klien Permanen',
            `Menghapus klien permanen ID ${client.id}: ${client.companyName}`
          );
          setClients((prev) => prev.filter((c) => c.id !== client.id));
          alert(`Klien ${client.companyName} berhasil dihapus permanen.`);
        } else {
          alert('Gagal menghapus klien.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus klien.');
      }
    }
  };

  // F4 Submission Handlers
  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subClientId || !subActivityName) {
      alert('Pilih klien dan masukkan nama kegiatan.');
      return;
    }
    const client = clients.find((c) => c.id === subClientId);
    if (!client) return;

    // Use current F2 calculator settings
    const currentCost = calculatorResults.total;
    const currentRooms = activePackages.length > 0
      ? EXCEL_PACKAGES.filter((pkg) => selectedPackageIds.includes(pkg.id)).map((p) => p.label)
      : selectedRoomCodes;

    if (currentRooms.length === 0) {
      alert('Silakan pilih minimal 1 ruangan atau paket di tab Kalkulator/Katalog terlebih dahulu.');
      return;
    }

    try {
      const newSub = await createSubmission({
        clientId: subClientId,
        companyName: client.companyName,
        activityName: subActivityName,
        stage: 1, // Start at stage 1
        roomCodes: currentRooms,
        totalAreaSqm: totalSelectedArea,
        eventDays: parseInt(eventDays) || 1,
        loadingDays: parseInt(loadingDays) || 0,
        estimatedCost: currentCost,
        notes: subNotes,
        picInternal: subPicInternal,
      });
      setSubmissions((prev) => [newSub, ...prev]);
      setSubClientId('');
      setSubActivityName('');
      setSubNotes('');
      alert('Pengajuan sewa baru berhasil dicatat!');
      setActiveTab('submissions'); // Switch tab to view it
    } catch (err) {
      console.error(err);
      alert('Gagal membuat pengajuan.');
    }
  };

  const handleUpdateStage = async (subId: string, newStage: number) => {
    try {
      const success = await updateSubmissionStage(subId, newStage);
      if (success) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === subId ? { ...sub, stage: newStage, updatedAt: new Date().toISOString() } : sub))
        );
        alert(`Tahap berhasil diperbarui menjadi: Tahap ${newStage}`);
      } else {
        alert('Gagal memperbarui tahap.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // F5 Booking Handlers
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingStartDate || !bookingEndDate) {
      alert('Isi tanggal mulai dan tanggal selesai.');
      return;
    }

    let resolvedActivityName = 'Internal / Tidak Tersedia';
    let roomsToBook = bookingRoomCodes.length > 0 ? bookingRoomCodes : selectedRoomCodes;

    if (bookingSubmissionId) {
      const selectedSub = submissions.find(s => s.id === bookingSubmissionId);
      if (selectedSub) {
        resolvedActivityName = selectedSub.activityName;
        if (roomsToBook.length === 0) {
          roomsToBook = selectedSub.roomCodes;
        }
      }
    } else if (bookingType === 'UNAVAILABLE') {
      resolvedActivityName = 'Kebutuhan Internal / Pemeliharaan';
    } else {
      resolvedActivityName = 'Pemanfaatan Ruang (Umum)';
    }

    if (roomsToBook.length === 0 && bookingType !== 'UNAVAILABLE') {
      alert('Pilih minimal satu ruangan atau paket di tab Kalkulator/Katalog terlebih dahulu.');
      return;
    }

    // F5 Conflict Detection (Warnings only, does not block booking except for locked)
    const isConflict = bookings.some((b) => {
      const startCollide = bookingStartDate <= b.endDate && bookingStartDate >= b.startDate;
      const endCollide = bookingEndDate <= b.endDate && bookingEndDate >= b.startDate;
      const wrapCollide = bookingStartDate <= b.startDate && bookingEndDate >= b.endDate;
      const hasOverlap = startCollide || endCollide || wrapCollide;
      if (!hasOverlap) return false;
      
      // If room overlaps
      return roomsToBook.some((rCode) => b.roomCodes.includes(rCode));
    });

    if (isConflict) {
      const proceed = window.confirm('Peringatan: Jadwal bentrok dengan booking yang sudah ada. Tetap lanjutkan?');
      if (!proceed) return;
    }

    try {
      const res = await createBooking({
        submissionId: bookingSubmissionId || undefined,
        type: bookingType,
        roomCodes: roomsToBook,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
        activityName: resolvedActivityName,
        notes: bookingNotes,
      });

      if ('error' in res) {
        alert(`Error: ${res.error}`);
        return;
      }

      setBookings((prev) => [...prev, res]);
      // Reset form
      setBookingStartDate('');
      setBookingEndDate('');
      setBookingActivityName('');
      setBookingNotes('');
      setBookingSubmissionId('');
      setBookingRoomCodes([]);
      alert('Pemesanan tanggal berhasil dicatat!');
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat pemesanan.');
    }
  };

  const handleDeleteBooking = async (bId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus booking ini?')) return;
    try {
      const success = await deleteBooking(bId);
      if (success) {
        setBookings((prev) => prev.filter((b) => b.id !== bId));
        alert('Booking berhasil dihapus.');
      } else {
        alert('Gagal menghapus booking.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // F6 Survey Handlers
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveySubmissionId || !surveyDate) {
      alert('Pilih pengajuan dan tanggal survei.');
      return;
    }

    const sub = submissions.find((s) => s.id === surveySubmissionId);
    if (!sub) return;

    // Check if slot is closed
    const isClosed = closedSlots.some((slot) => slot.date === surveyDate);
    if (isClosed) {
      alert('Slot ini telah ditutup untuk kunjungan survei. Silakan pilih tanggal lain.');
      return;
    }

    try {
      const newSurvey = await createSurvey({
        submissionId: surveySubmissionId,
        companyName: sub.companyName,
        date: surveyDate,
        timeSlot: '10:00',
        picInternal: 'Tim LMAN',
        guestCount: 5,
        status: 'SCHEDULED',
      });

      setSurveys((prev) => [...prev, newSurvey]);
      setSurveyDate('');
      setSurveySubmissionId('');
      alert('Jadwal survei berhasil dicatat!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSurvey = async (sId: string, status: Survey['status']) => {
    try {
      const success = await updateSurveyStatus(sId, status);
      if (success) {
        setSurveys((prev) => prev.map((s) => (s.id === sId ? { ...s, status } : s)));
        alert(`Status survei berhasil diperbarui ke: ${status}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeSlotDate) {
      alert('Masukkan tanggal slot.');
      return;
    }
    try {
      const newSlot = await closeSurveySlot({
        date: closeSlotDate,
        timeSlot: closeSlotTimeSlot,
        reason: closeSlotReason || 'Kegiatan Internal LMAN',
      });
      setClosedSlots((prev) => [...prev, newSlot]);
      setCloseSlotDate('');
      setCloseSlotReason('');
      alert('Slot berhasil ditutup.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSlot = async (slotId: string) => {
    try {
      const success = await openSurveySlot(slotId);
      if (success) {
        setClosedSlots((prev) => prev.filter((s) => s.id !== slotId));
        alert('Slot dibuka kembali untuk umum.');
      }
    } catch (err) {
      console.error(err);
    }
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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f6f9] text-[#0073C2] font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0073C2] mb-4"></div>
        <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Memuat Autentikasi...</p>
      </div>
    );
  }

  // SCREEN 1: LOGIN FORM
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[#f4f6f9] relative overflow-hidden font-sans">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-50 border border-blue-150 rounded-xl mb-4 text-[#0073C2]">
              <Building className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#0073C2] tracking-wide">Gedung A.A. Maramis</h1>
            <p className="text-slate-500 text-xs mt-1 text-center font-bold tracking-wider">SISTEM KELOLA SEWA INTERNAL — LMAN</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Email Tim</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Masukkan email tim terdaftar"
                className="w-full bg-white border border-slate-300 rounded-lg py-2.5 px-3 text-slate-800 text-sm focus:outline-none focus:border-[#0073C2] focus:ring-1 focus:ring-[#0073C2] transition-colors"
              />
              <span className="text-[10px] text-slate-400 block">Satu akun bersama untuk seluruh tim pengelola.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Kata Sandi</label>
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi tim"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-2.5 px-3 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#0073C2] focus:ring-1 focus:ring-[#0073C2] transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#facc15] hover:bg-[#eab308] active:bg-[#ca8a04] text-slate-900 font-extrabold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
              Masuk Gerbang Kata Sandi
            </button>
          </form>

          {isMock && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 mb-2">Aplikasi berjalan dalam mode demo offline.</p>
              <button
                onClick={useDemoPassword}
                className="text-xs font-bold text-[#0073C2] hover:text-[#0284c7] underline decoration-dotted transition-colors"
              >
                Gunakan sandi demo default (&quot;maramis2026&quot;)
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
      <div className="flex-1 flex items-center justify-center p-4 bg-[#f4f6f9] relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-8 z-10">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-xl font-bold text-[#0073C2] tracking-wide">Pilih Peran Sesi Anda</h1>
            <p className="text-slate-500 text-xs mt-1 font-semibold">Gedung A.A. Maramis — LMAN</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {/* PENGINPUT BUTTON */}
            <button
              onClick={() => selectRole('PENGINPUT')}
              className="group text-left p-6 bg-slate-50/50 hover:bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-650 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="text-slate-800 font-bold group-hover:text-amber-600 transition-colors">Penginput</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                  Akses penuh untuk input data klien, survei, booking, kelola parameter hitungan, membuat LOI/Perjanjian, serta mengunduh dokumen.
                </p>
              </div>
              <span className="text-[10px] text-amber-600 font-bold tracking-wider uppercase mt-4 block">PILIH PENGINPUT &rarr;</span>
            </button>

            {/* PEREVIEW BUTTON */}
            <button
              onClick={() => selectRole('PEREVIEW')}
              className="group text-left p-6 bg-slate-50/50 hover:bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-650 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-slate-800 font-bold group-hover:text-[#0073C2] transition-colors">Pereview</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed font-medium">
                  Akses pantau dan monitoring saja. Melihat progres tahap pemesanan, melihat katalog ruangan, dan menggunakan kalkulator penawaran.
                </p>
              </div>
              <span className="text-[10px] text-[#0073C2] font-bold tracking-wider uppercase mt-4 block">PILIH PEREVIEW &rarr;</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-4">
            <span className="text-[11px] text-slate-500 font-medium">
              Sesi aktif: <span className="font-semibold text-slate-800">{user.email}</span>
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-650 transition-colors flex items-center gap-1.5 font-bold"
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
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-800 font-sans min-h-screen">
      {/* HEADER BANNER - Blue Kemenkeu style */}
      <header className="border-b border-[#0060a3] bg-[#0073C2] text-white sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Logo style: White door/book shape */}
            <div className="h-7 w-6 bg-white rounded-r-md flex items-center justify-center relative shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0073C2]"></div>
              <div className="w-1.5 h-3 bg-[#0073C2]/20 rounded-sm"></div>
            </div>
            <span className="text-base font-extrabold tracking-tight text-white select-none">
              Gedung AA Maramis
            </span>
          </div>
        </div>

        {/* User Session Info / Controls */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1 text-sky-100 font-semibold font-mono text-sm">
            <Clock className="h-4 w-4 text-sky-200" />
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY CONTAINER (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR NAVIGATION - Satu Kemenkeu style */}
        <aside className={`bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-[calc(100vh-53px)] sticky top-[53px] transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72'}`}>
          <div className="flex flex-col overflow-y-auto">
            {/* User Profile Header Blue Card */}
            <div className="p-4 bg-[#0073C2] text-white relative flex items-center justify-between gap-3 shadow-md select-none">
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-xs tracking-wide truncate">
                  {role === 'PENGINPUT' ? 'TIM PENGINPUT LMAN' : 'TIM PEREVIEW LMAN'}
                </div>
                <div className="text-[10px] text-sky-200 font-mono mt-0.5 tracking-wider truncate">
                  {user?.email || 'team@maramis.go.id'}
                </div>
                <div className="text-[9px] text-white/80 mt-1.5 leading-relaxed">
                  Divisi Pengembangan dan Pendayagunaan Properti 1, Lembaga Manajemen Aset Negara
                </div>
              </div>
            </div>

            {/* Nav list */}
            <div className="py-4 flex flex-col gap-1">
              <div className="text-[9px] font-bold text-slate-400 tracking-wider px-4 py-2 uppercase mt-2 select-none">
                MENU UTAMA SEWA
              </div>
              
              <button
                onClick={() => setActiveTab('catalog')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                  activeTab === 'catalog'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Layers className={`h-4 w-4 shrink-0 ${activeTab === 'catalog' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                <span>Katalog Ruangan</span>
              </button>

              <button
                onClick={() => setActiveTab('calculator')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'calculator'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`h-4 w-4 shrink-0 ${activeTab === 'calculator' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                  <span>Kalkulator Sewa</span>
                </div>
                {selectedRoomCodes.length > 0 && (
                  <span className="bg-[#0073C2] text-white rounded-full h-4.5 w-4.5 flex items-center justify-center text-[9px] font-extrabold">
                    {selectedRoomCodes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'clients'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`h-4 w-4 shrink-0 ${activeTab === 'clients' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                  <span>Basis Data Klien</span>
                </div>
                {activeClients.length > 0 && (
                  <span className="bg-slate-100 text-slate-500 rounded px-1 text-[9px] font-extrabold">
                    {activeClients.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('submissions')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'submissions'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`h-4 w-4 shrink-0 ${activeTab === 'submissions' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                  <span>Pengajuan Sewa</span>
                </div>
                {submissions.length > 0 && (
                  <span className="bg-slate-100 text-slate-500 rounded px-1 text-[9px] font-extrabold">
                    {submissions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                  activeTab === 'calendar'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <MapPin className={`h-4 w-4 shrink-0 ${activeTab === 'calendar' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                <span>Kalender Kegiatan</span>
              </button>



              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                  activeTab === 'documents'
                    ? 'bg-[#e0f2fe] text-[#0073C2]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 ${activeTab === 'documents' ? 'text-[#0073C2]' : 'text-slate-400'}`} />
                <span>Pusat Dokumen</span>
              </button>
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col gap-3 select-none">
            <button
              onClick={logout}
              className="w-full py-1.5 border border-red-200 hover:bg-red-50 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* Collapsible toggle button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-6 h-7 w-7 rounded-full bg-white border border-slate-200 text-[#0073C2] flex items-center justify-center shadow-md hover:bg-slate-50 transition-all duration-300 z-50"
          style={{ left: isSidebarCollapsed ? '12px' : '274px' }}
          title={isSidebarCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* MAIN PANEL CONTENT - White scrollable area */}
        <main className="flex-1 bg-[#f8fafc] overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight select-none">
              {activeTab === 'catalog' && 'Katalog Ruangan & Gedung'}
              {activeTab === 'calculator' && 'Sasaran Perhitungan Tarif Penawaran'}
              {activeTab === 'clients' && 'Basis Data Kelola Klien'}
              {activeTab === 'submissions' && 'Daftar Pengajuan & Papan Pemantauan'}
              {activeTab === 'calendar' && 'Kalender Penjadwalan & Reservasi'}
              {activeTab === 'surveys' && 'Jadwal Survei Lapangan'}
              {activeTab === 'documents' && 'Dokumen Operasional Sewa'}
            </h2>
            
            {role === 'PENGINPUT' && (
              <div className="text-[10px] text-[#0073C2] font-bold bg-[#e0f2fe] border border-[#bae6fd] rounded-full px-3 py-1 tracking-wider uppercase">
                Mode Pengeditan Aktif
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
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-4 h-full min-h-[460px]">
                  <div>
                    <h2 className="text-sm font-bold text-[#0073C2] flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#f59e0b] animate-pulse" /> Aula Utama C Lt. 2
                    </h2>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                      Enam aula acara bernama di Gedung C lantai 2 (Mataram, Sriwijaya, Bone, Ternate, Majapahit, Kutai). Bila digabung, total luasnya <strong>1.180 m²</strong> (satu lantai penuh).
                    </p>
                    
                    <button
                      onClick={toggleSelectAllPrimary}
                      className={`w-full py-2 mb-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isAllPrimarySelected
                          ? 'bg-[#0073C2] text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isAllPrimarySelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {isAllPrimarySelected ? 'Batalkan Semua' : 'Pilih Semua (1.180 m²)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {primaryRooms.length === 0 ? (
                      <p className="text-[10px] text-slate-400 col-span-full py-2">Memuat data...</p>
                    ) : (
                      primaryRooms.map((room) => {
                        const isSelected = selectedRoomCodes.includes(room.code);
                        return (
                          <div
                            key={room.code}
                            onClick={() => toggleRoomSelection(room.code)}
                            className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-sky-50 border-[#0073C2]/60 shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] text-[#0073C2] font-extrabold">{room.code}</span>
                              <div className={`h-2.5 w-2.5 rounded-sm border flex items-center justify-center ${
                                isSelected ? 'bg-[#0073C2] border-[#0073C2] text-white' : 'border-slate-350 bg-white'
                              }`}>
                                {isSelected && <Check className="h-1.5 w-1.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="font-bold text-[10px] text-slate-800 truncate">{room.name}</div>
                            <div className="text-[8px] text-slate-400 mt-0.5">{room.areaSqm} m²</div>
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
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#0073C2]" /> Paket Ruang Cepat (Saleable Area Total)
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-1">Pilih cepat berdasarkan luas gedung & lantai dari data Excel (Pilihan ini terpisah dari list di bawah)</p>
                    </div>
                    {selectedPackageIds.length > 0 && (
                      <button
                        onClick={() => setSelectedPackageIds([])}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        Batal Pilih Paket ({selectedPackageIds.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Lantai 1 */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#0073C2] mb-1 border-b border-slate-200 pb-1 uppercase tracking-wider">Lantai 1 (Total: 3.220 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 1).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#e0f2fe] border-[#0073C2] text-[#0073C2] font-bold shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-400 mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 2 */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#0073C2] mb-1 border-b border-slate-200 pb-1 uppercase tracking-wider">Lantai 2 (Total: 2.624 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 2).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#e0f2fe] border-[#0073C2] text-[#0073C2] font-bold shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-400 mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 3 */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#0073C2] mb-1 border-b border-slate-200 pb-1 uppercase tracking-wider">Lantai 3 (Total: 3.342 m²)</h3>
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
                                    ? 'bg-[#e0f2fe] border-[#0073C2] text-[#0073C2] font-bold shadow-sm'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className="text-[10px] truncate">{pkg.label}</span>
                                <span className="font-mono text-[9px] text-slate-400 mt-0.5">{pkg.areaSqm} m²</span>
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
                                  ? 'bg-[#e0f2fe] border-[#0073C2] text-[#0073C2] font-bold shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-[10px]">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-slate-400">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                        {/* FILTER BAR */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                  {/* Search */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari kode atau nama ruang..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#0073C2] transition-colors"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Gedung:</span>
                      <select
                        value={filterBuilding}
                        onChange={(e) => setFilterBuilding(e.target.value)}
                        className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0073C2]"
                      >
                        <option value="all">Semua</option>
                        <option value="A">Gedung A</option>
                        <option value="C">Gedung C</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Lantai:</span>
                      <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0073C2]"
                      >
                        <option value="all">Semua</option>
                        <option value="1">Lantai 1</option>
                        <option value="2">Lantai 2</option>
                        <option value="3">Lantai 3</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Kapasitas &ge;:</span>
                      <input
                        type="number"
                        min="0"
                        value={filterMinCapacity}
                        onChange={(e) => setFilterMinCapacity(e.target.value)}
                        className="w-16 bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#0073C2]"
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
                    <span className="text-[11px] text-slate-500 shrink-0 font-medium">Urutkan:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0073C2]"
                    >
                      <option value="capacity">Kapasitas</option>
                      <option value="rate">Tarif Booklet</option>
                      <option value="area">Luas Ruang</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded text-xs transition-colors"
                    >
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* COMPACT ROOMS LIST (TABLE) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#0073C2] flex items-center gap-2">
                        <Building className="h-4 w-4 text-[#0073C2]" /> Daftar Ruangan Individual (Opsional)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Pilih ruangan secara manual di bawah jika penyewa ingin menyewa ruangan tertentu, bukan satu gedung penuh.</p>
                    </div>
                    {selectedRoomCodes.length > 0 && (
                      <button
                        onClick={() => setSelectedRoomCodes([])}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 bg-white border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg"
                      >
                        Batal Pilih Semua Ruang ({selectedRoomCodes.length})
                      </button>
                    )}
                  </div>
                  
                  {dbLoading ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0073C2] mx-auto mb-3"></div>
                      Memuat katalog ruangan...
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
                      Tidak ada ruangan yang cocok dengan filter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold select-none">
                            <th className="p-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={toggleSelectAllFiltered}
                                className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                  isAllFilteredSelected
                                    ? 'bg-[#0073C2] border-[#0073C2] text-white'
                                    : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
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
                        <tbody className="divide-y divide-slate-100">
                          {filteredRooms.map((room) => {
                            const isSelected = selectedRoomCodes.includes(room.code);
                            return (
                              <tr
                                key={room.code}
                                onClick={() => toggleRoomSelection(room.code)}
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-sky-50/50' : 'bg-white'
                                }`}
                              >
                                <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => toggleRoomSelection(room.code)}
                                    className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-[#0073C2] border-[#0073C2] text-white'
                                        : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
                                    }`}
                                  >
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </button>
                                </td>
                                <td className="p-3.5 font-extrabold text-slate-800 tracking-wide">{room.code}</td>
                                <td className="p-3.5 text-slate-650 font-semibold">{room.name || '—'}</td>
                                <td className="p-3.5 text-slate-500">Gedung {room.building}</td>
                                <td className="p-3.5 text-center text-slate-500">{room.floor}</td>
                                <td className="p-3.5 text-right text-slate-600 font-semibold font-mono">{room.areaSqm} m²</td>
                                <td className="p-3.5 text-right text-slate-600 font-semibold font-mono">{room.capacity} pax</td>
                                <td className="p-3.5 text-right font-extrabold text-[#f59e0b] font-mono">
                                  {formatRupiah(room.dailyRate)}
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex justify-center gap-1.5">
                                    {room.needsVerification && (
                                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Belum Verifikasi
                                      </span>
                                    )}
                                    {room.isPrimary && (
                                      <span className="text-[9px] bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
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
            </div>
          )}

          {/* TAB 2: KALKULATOR PENAWARAN */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* SELECTED ROOMS SUMMARY */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">1. Ruangan Terpilih</h2>
                      <p className="text-xs text-slate-500 mt-1">Estimasi dihitung dari luas meter persegi ruangan terpilih</p>
                    </div>
                    {(selectedRoomCodes.length > 0 || selectedPackageIds.length > 0) && (
                      <button
                        onClick={() => {
                          setSelectedRoomCodes([]);
                          setSelectedPackageIds([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium"
                      >
                        Hapus Semua Pilihan
                      </button>
                    )}
                  </div>

                  {selectedRooms.length === 0 && activePackages.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                      <p className="text-xs text-slate-400">Belum ada ruangan atau paket terpilih.</p>
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className="mt-2 text-xs font-bold text-[#0073C2] hover:underline"
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
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#e0f2fe] border border-[#bae6fd] text-[#0073C2] px-3 py-1 rounded-lg"
                              >
                                <Layers className="h-3 w-3" />
                                {pkg.label} (Lt. {pkg.floor}) — {pkg.areaSqm} m²
                                <button
                                  onClick={() => applyQuickPackage(pkg.id)}
                                  className="text-red-500 hover:text-red-600 font-bold ml-1.5"
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
                          <span className="text-[10px] text-slate-400 font-bold block mb-2 uppercase tracking-wider">Ruangan Individual</span>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            {selectedRooms.map((room) => (
                              <span
                                key={room.code}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 text-slate-700 pl-2 pr-1 py-0.5 rounded-full shadow-sm"
                              >
                                {room.code} {room.name ? `(${room.name})` : ''}
                                <button
                                  onClick={() => toggleRoomSelection(room.code)}
                                  className="text-slate-400 hover:text-red-500 ml-1 hover:bg-slate-100 rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Jumlah Ruang</span>
                          <span className="text-base font-bold text-slate-800">
                            {activePackages.length > 0 ? `${activePackageRoomsCount} unit` : `${selectedRooms.length} unit`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Akumulasi Luas</span>
                          <span className="text-base font-bold text-[#0073C2]">{totalSelectedArea} m²</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Akumulasi Kapasitas</span>
                          <span className="text-base font-bold text-slate-800">
                            {activePackages.length > 0 ? 'Sesuai Layanan Paket' : `${totalSelectedCapacity} orang`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PMK 144 ADJUSTMENT PARAMETERS */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-800 mb-4">2. Parameter Penyesuai & Hari Sewa</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Days Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">Hari Acara</label>
                        <input
                          type="number"
                          min="1"
                          value={eventDays}
                          onChange={(e) => setEventDays(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">Hari Loading (Persiapan & Bongkar)</label>
                        <input
                          type="number"
                          min="0"
                          value={loadingDays}
                          onChange={(e) => setLoadingDays(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                    </div>

                    {/* PMK 144 Purpose & Custom factors */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">Tujuan Sewa Guna (Rentang PMK 144)</label>
                        <select
                          value={selectedPurposeKey}
                          onChange={(e) => setSelectedPurposeKey(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-[#0073C2]"
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
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Faktor Tujuan (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customPurposeFactor}
                            onChange={(e) => setCustomPurposeFactor(e.target.value)}
                            className={`w-full bg-white border rounded-lg py-1.5 px-2.5 text-slate-800 text-xs focus:outline-none ${
                              isPurposeFactorDeviating ? 'border-yellow-500 focus:border-yellow-500' : 'border-slate-200 focus:border-[#0073C2]'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Tingkat Pengembalian (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customReturnRate}
                            onChange={(e) => setCustomReturnRate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#0073C2]"
                            placeholder="Markup 15% = 115%"
                          />
                        </div>
                      </div>

                      {/* Warnings and alerts */}
                      {isPurposeFactorDeviating && (
                        <div className="p-2.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-[10px] flex items-start gap-1.5">
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
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center text-xs text-slate-500 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-[#0073C2] shrink-0" />
                    <span>Konstanta System (Settings): Nilai Wajar = {formatRupiah(systemSettings.fairValuePerSqm)}/m² · Faktor Loading = {systemSettings.loadingFactor * 100}% · PPN = {systemSettings.ppnRate * 100}%</span>
                  </div>
                  {role === 'PENGINPUT' && (
                    <span className="text-[10px] text-slate-400 shrink-0 italic">
                      Dapat diubah di bagian kelola parameter (Fase 2)
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: RESULTS BOARD */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-fit gap-6 shadow-sm sticky top-24 text-slate-700">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-bold text-slate-800">Hasil Kalkulasi</h2>
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 border border-slate-200 rounded p-0.5 text-[10px]">
                      <button
                        onClick={() => setCalcMode('auto')}
                        className={`px-2 py-1 rounded font-bold transition-all ${
                          calcMode === 'auto'
                            ? 'bg-[#0073C2] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Otomatis
                      </button>
                      <button
                        onClick={() => setCalcMode('manual')}
                        className={`px-2 py-1 rounded font-bold transition-all ${
                          calcMode === 'manual'
                            ? 'bg-[#0073C2] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {calcMode === 'manual' ? (
                    <div className="space-y-3 my-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Sewa Acara (Rp)</label>
                        <input
                          type="number"
                          placeholder="Masukkan nilai sewa"
                          value={manualSewa}
                          onChange={(e) => setManualSewa(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded py-1 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">PPN Sewa (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Sewa"
                          value={manualPPNSewa}
                          onChange={(e) => setManualPPNSewa(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded py-1 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Sewa Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="Nilai loading"
                          value={manualLoading}
                          onChange={(e) => setManualLoading(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded py-1 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">PPN Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Loading"
                          value={manualPPNLoading}
                          onChange={(e) => setManualPPNLoading(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded py-1 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 my-6">
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Sewa Acara ({eventDays} hari)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(calculatorResults.sewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="text-slate-500">PPN Sewa ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(calculatorResults.ppnSewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="text-slate-500">Loading ({loadingDays} hari)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(calculatorResults.loading)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="text-slate-500">PPN Loading ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(calculatorResults.ppnLoading)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-baseline mb-6">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL ESTIMASI</span>
                    <span className="text-xl font-black text-[#f59e0b] tracking-tight">
                      {formatRupiah(calculatorResults.total)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCopyResults}
                      className="w-full bg-[#0073C2] hover:bg-[#0284c7] text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
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

          {/* TAB: CLIENTS (F3) */}
          {activeTab === 'clients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* LEFT: Client Form (Penginput Only) */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    {editingClientId ? (
                      <>
                        <Settings className="h-4 w-4 text-yellow-500" />
                        <span>Edit Klien</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-[#0073C2]" />
                        <span>Tambah Klien Baru</span>
                      </>
                    )}
                  </h2>
                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-slate-500 italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={editingClientId ? handleUpdateClient : handleCreateClient} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Nama Instansi / Badan Usaha</label>
                        <input
                          type="text"
                          required
                          value={clientCompanyName}
                          onChange={(e) => setClientCompanyName(e.target.value)}
                          placeholder="e.g., PT. Media Nusantara"
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Nama PIC Kontak</label>
                        <input
                          type="text"
                          required
                          value={clientPicName}
                          onChange={(e) => setClientPicName(e.target.value)}
                          placeholder="e.g., Budi Santoso"
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Nomor Telepon PIC</label>
                        <input
                          type="text"
                          required
                          value={clientPicPhone}
                          onChange={(e) => setClientPicPhone(e.target.value)}
                          placeholder="e.g., 08123456789"
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>
                      <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[9px] leading-relaxed">
                        ⚠️ <strong>Perlindungan Data Klien (A3)</strong>: Dilarang keras menginput identitas pribadi sensitif seperti NIK, data KTP, paspor, tanggal lahir, atau alamat pribadi.
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          type="submit"
                          className={`w-full font-bold py-2 rounded-lg text-xs transition-colors shadow-sm ${
                            editingClientId 
                              ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                              : 'bg-[#0073C2] hover:bg-[#0284c7] text-white'
                          }`}
                        >
                          {editingClientId ? 'Simpan Perubahan' : 'Simpan Data Klien'}
                        </button>
                        
                        {editingClientId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClientId(null);
                              setClientCompanyName('');
                              setClientPicName('');
                              setClientPicPhone('');
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs transition-colors"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT: Client List & Submission History */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  <h2 className="text-sm font-bold text-slate-800">Daftar Instansi Klien</h2>
                  {activeClients.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada data klien terdaftar.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3">Nama Instansi</th>
                            <th className="p-3">Nama PIC</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeClients.map((c) => (
                            <tr
                              key={c.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                selectedClientId === c.id ? 'bg-sky-50/50' : 'bg-white'
                              }`}
                            >
                              <td className="p-3 font-bold text-slate-800">{c.companyName}</td>
                              <td className="p-3 text-slate-600">{c.picName}</td>
                              <td className="p-3 text-slate-500">
                                <div>{c.picPhone}</div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedClientId(c.id === selectedClientId ? null : c.id)}
                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold transition-all text-[10px]"
                                  >
                                    {selectedClientId === c.id ? 'Tutup Riwayat' : 'Lihat Riwayat'}
                                  </button>
                                  
                                  {role === 'PENGINPUT' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingClientId(c.id);
                                          setClientCompanyName(c.companyName);
                                          setClientPicName(c.picName);
                                          setClientPicPhone(c.picPhone);
                                        }}
                                        className="px-2.5 py-1 rounded bg-yellow-400 hover:bg-yellow-500 text-black font-bold transition-all text-[10px]"
                                      >
                                        Edit
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDeleteClient(c)}
                                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold transition-all text-[10px]"
                                      >
                                        Hapus
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Submissions History for Selected Client */}
                {selectedClientId && (() => {
                  const client = clients.find((c) => c.id === selectedClientId);
                  const clientSubs = submissions.filter((s) => s.clientId === selectedClientId);
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-fadeIn text-slate-700">
                      <h3 className="text-xs font-bold text-[#0073C2] mb-3">
                        Riwayat Pengajuan Sewa: {client?.companyName}
                      </h3>
                      {clientSubs.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4">Belum ada pengajuan sewa tercatat untuk instansi ini.</p>
                      ) : (
                        <div className="space-y-3">
                          {clientSubs.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4"
                            >
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{sub.activityName}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Ruang: {sub.roomCodes.join(', ')} · Durasi: {sub.eventDays} hari (Loading: {sub.loadingDays} hari)
                                </p>
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  Dibuat pada: {new Date(sub.createdAt).toLocaleDateString('id-ID')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-mono font-bold text-[#0073C2]">
                                  {formatRupiah(sub.estimatedCost)}
                                </div>
                                <span className="inline-block text-[9px] bg-[#e0f2fe] text-[#0073C2] border border-[#bae6fd] px-2 py-0.5 rounded font-bold mt-1.5">
                                  Tahap {sub.stage}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: SUBMISSIONS (F4 & F9) */}
          {activeTab === 'submissions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* LEFT COLUMN: Record New Submission (Penginput only) / Statistics (Pereview) */}
              <div className="lg:col-span-1">
                {role === 'PENGINPUT' ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <FileText className="h-4 w-4 text-[#0073C2]" />
                      Catat Pengajuan Sewa Baru
                    </h2>
                    
                    {selectedRoomCodes.length === 0 && selectedPackageIds.length === 0 ? (
                      <div className="p-3.5 bg-amber-50 border border-yellow-200 text-yellow-750 rounded-lg text-xs flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Perhatian:</strong> Silakan pilih ruangan/paket dan set waktu di tab <strong>Kalkulator</strong> terlebih dahulu untuk menautkan tarif estimasi.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-2 text-slate-700">
                        <div className="font-bold text-slate-500">Data Kalkulator Tertaut:</div>
                        <div>Ruangan: <span className="font-semibold text-slate-800">{activePackages.length > 0 ? activePackages.map(p=>p.label).join(', ') : selectedRoomCodes.join(', ')}</span></div>
                        <div>Total Luas: <span className="font-semibold text-slate-800">{totalSelectedArea} m²</span></div>
                        <div>Estimasi Tarif: <span className="font-semibold text-[#0073C2]">{formatRupiah(calculatorResults.total)}</span></div>
                      </div>
                    )}

                    <form onSubmit={handleCreateSubmission} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Pilih Klien Instansi</label>
                        <select
                          required
                          value={subClientId}
                          onChange={(e) => setSubClientId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        >
                          <option value="">-- Pilih Instansi --</option>
                          {activeClients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.companyName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Nama Kegiatan (Acara)</label>
                        <input
                          type="text"
                          required
                          value={subActivityName}
                          onChange={(e) => setSubActivityName(e.target.value)}
                          placeholder="e.g., Produksi Film / Rapat Umum"
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">PIC Internal Pendamping</label>
                        <input
                          type="text"
                          required
                          value={subPicInternal}
                          onChange={(e) => setSubPicInternal(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Catatan Tambahan</label>
                        <textarea
                          value={subNotes}
                          onChange={(e) => setSubNotes(e.target.value)}
                          rows={3}
                          placeholder="e.g., Kebutuhan khusus kelistrikan, detail panggung."
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={selectedRoomCodes.length === 0 && selectedPackageIds.length === 0}
                        className="w-full bg-[#0073C2] disabled:bg-slate-100 disabled:text-slate-400 hover:bg-[#0284c7] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Buat Pengajuan Sewa
                      </button>
                    </form>
                  </div>
                ) : (
                  // Pereview Board Statistics Dashboard
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Layers className="h-4 w-4 text-[#0073C2]" />
                      Statistik Papan Pemantauan
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Klien</span>
                        <div className="text-xl font-bold text-slate-800 mt-1">{activeClients.length}</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Pengajuan</span>
                        <div className="text-xl font-bold text-slate-800 mt-1">{submissions.length}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sebaran Pengajuan Per Tahap</h4>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                        const count = submissions.filter((s) => s.stage === t).length;
                        const percent = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                        return (
                          <div key={t} className="text-[10px] space-y-1">
                            <div className="flex justify-between font-mono text-slate-500">
                              <span>Tahap {t}</span>
                              <span className="font-bold text-slate-700">{count} pengajuan</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded overflow-hidden border border-slate-200">
                              <div className="bg-[#0073C2] h-full rounded" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Submissions List & Checklist Detail */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  <h2 className="text-sm font-bold text-slate-800">Daftar Aktif Pengajuan Sewa</h2>
                  {submissions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada pengajuan sewa tercatat.</p>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map((sub) => {
                        const lastUpdate = new Date(sub.updatedAt);
                        const diffTime = Math.abs(new Date().getTime() - lastUpdate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const isStalled = diffDays > 14;

                        return (
                          <div
                            key={sub.id}
                            className={`p-4 bg-white border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                              selectedSubmissionId === sub.id
                                ? 'border-[#0073C2] bg-sky-50/20'
                                : 'border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-extrabold text-xs text-slate-800">{sub.companyName}</span>
                                {isStalled && (
                                  <span className="text-[8px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 animate-pulse">
                                    ⚠️ TERSENDAT ({diffDays} HARI)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-650 font-semibold">{sub.activityName}</div>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Ruang: {sub.roomCodes.join(', ')} · Estimasi: <span className="font-mono font-bold text-slate-600">{formatRupiah(sub.estimatedCost)}</span>
                              </p>
                              <div className="text-[9px] text-slate-400 font-mono">
                                Diperbarui: {lastUpdate.toLocaleDateString('id-ID')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] bg-[#e0f2fe] text-[#0073C2] border border-[#bae6fd] px-2 py-1 rounded font-bold text-center">
                                  Tahap {sub.stage}/9
                                </span>
                                {role === 'PENGINPUT' && (
                                  <select
                                    value={sub.stage}
                                    onChange={(e) => handleUpdateStage(sub.id, parseInt(e.target.value))}
                                    className="bg-white border border-slate-200 text-[10px] py-1 px-1.5 rounded text-slate-700 focus:outline-none font-bold focus:border-[#0073C2]"
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                                      <option key={s} value={s}>
                                        Set Tahap {s}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              
                              <button
                                onClick={() => setSelectedSubmissionId(sub.id === selectedSubmissionId ? null : sub.id)}
                                className="px-3 py-2 rounded bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                              >
                                {selectedSubmissionId === sub.id ? 'Tutup Detail' : 'Tampilkan Checklist'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* F9 Checklist visualizer */}
                {selectedSubmissionId && (() => {
                  const sub = submissions.find((s) => s.id === selectedSubmissionId);
                  if (!sub) return null;

                  // Sample date warnings
                  const bookedDates = bookings.filter(b => b.submissionId === sub.id);
                  const firstBook = bookedDates.length > 0 ? bookedDates[0] : null;
                  const showTMWarning = sub.stage === 7 && firstBook && (() => {
                    const eventStart = new Date(firstBook.startDate);
                    const tmDate = new Date(eventStart.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return new Date() >= tmDate;
                  })();

                  const stagesInfo = [
                    { t: 1, label: 'Konsultasi Awal', desc: 'Melakukan diskusi awal perihal kebutuhan ruangan, kapasitas, dan tanggal acara.' },
                    { t: 2, label: 'Perhitungan Tarif & Penawaran', desc: 'Mempersiapkan rincian tarif menggunakan rumus PMK 144.' },
                    { t: 3, label: 'Penerbitan Letter of Intent (LOI)', desc: 'Menerbitkan LOI minat pemanfaatan ruang.' },
                    { t: 4, label: 'Survei Lokasi', desc: 'Penjadwalan survei lapangan bersama perwakilan instansi.' },
                    { t: 5, label: 'Surat Permohonan Resmi', desc: 'Menerima surat permohonan resmi pemohon (Syarat utama Tanggal Terkunci).' },
                    { t: 6, label: 'Perjanjian Sewa Guna', desc: 'Penyusunan draf kontrak perjanjian kerjasama pemanfaatan.' },
                    { t: 7, label: 'Technical Meeting (H-7)', desc: 'Koordinasi operasional loading, kelistrikan, & rundown acara.' },
                    { t: 8, label: 'Pembayaran & Pelaksanaan Kegiatan', desc: 'Verifikasi pelunasan PNBP sewa dan pelaksanaan hari-H acara.' },
                    { t: 9, label: 'Dokumentasi & Evaluasi', desc: 'Pemberesan pasca acara, evaluasi kebersihan, dan pengarsipan.' },
                  ];

                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-fadeIn flex flex-col gap-4 text-slate-700">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-[#0073C2]">
                            Daftar Periksa 9-Tahap Pengajuan
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Pengajuan: {sub.activityName} ({sub.companyName})</p>
                        </div>
                        {showTMWarning && (
                          <div className="p-2 bg-red-50 border border-red-200 text-red-650 rounded-lg text-[9px] font-bold animate-pulse">
                            ⚠️ H-7 TECHNICAL MEETING JATUH TEMPO
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 mt-1">
                        {stagesInfo.map((st) => {
                          const isDone = sub.stage >= st.t;
                          const isActive = sub.stage === st.t;
                          return (
                            <div
                              key={st.t}
                              className={`p-3 rounded-lg flex items-start gap-3 border transition-colors ${
                                isActive
                                  ? 'bg-sky-50/50 border-[#0073C2]/40 text-slate-800'
                                  : isDone
                                  ? 'bg-slate-50 border-slate-100 text-slate-400'
                                  : 'bg-slate-50/20 border-slate-100 text-slate-350'
                              }`}
                            >
                              <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                                isDone 
                                  ? 'bg-[#0073C2] border-[#0073C2] text-white'
                                  : 'border-slate-300'
                              }`}>
                                {isDone ? '✓' : st.t}
                              </div>
                              <div>
                                <h4 className={`text-[11px] font-bold ${isActive ? 'text-[#0073C2]' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                                  {st.label}
                                </h4>
                                <p className="text-[10px] mt-0.5 leading-normal">{st.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: CALENDAR (F5) */}
          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* LEFT COLUMN: Reserve Date Form (Penginput only) */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <MapPin className="h-4 w-4 text-[#0073C2]" />
                    Pencatatan Booking Tanggal
                  </h2>

                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-slate-500 italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={handleCreateBooking} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Pilih Pengajuan Terkait (Opsional)</label>
                        <select
                          value={bookingSubmissionId}
                          onChange={(e) => setBookingSubmissionId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        >
                          <option value="">-- Tidak Dikaitkan (e.g. UNAVAILABLE) --</option>
                          {submissions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.companyName} - {s.activityName} (Tahap {s.stage})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Status Reservasi</label>
                        <select
                          value={bookingType}
                          onChange={(e) => setBookingType(e.target.value as BookingType)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        >
                          <option value="TENTATIVE">Tentatif (Tahap 1-4)</option>
                          <option value="CONFIRMED">Terkunci / Confirmed (Tahap 5+)</option>
                          <option value="UNAVAILABLE">Tidak Tersedia / Internal</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tanggal Mulai</label>
                          <input
                            type="date"
                            required
                            value={bookingStartDate}
                            onChange={(e) => setBookingStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tanggal Selesai</label>
                          <input
                            type="date"
                            required
                            value={bookingEndDate}
                            onChange={(e) => setBookingEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                          />
                        </div>
                      </div>



                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Ruangan Di-Booking</label>
                        {selectedRoomCodes.length > 0 ? (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-800 font-medium">
                            {selectedRoomCodes.join(', ')}
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-400 italic">
                            Belum ada ruang dipilih. Silakan klik ruang di tab Kalkulator/Katalog.
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-yellow-50 border border-yellow-250 text-yellow-800 rounded-lg text-[9.5px] leading-normal">
                        🚨 <strong>Validasi F5</strong>: Status *Terkunci* wajib divalidasi sistem. Tanggal tidak dapat dikonfirmasi/dikunci jika pengajuan belum mencapai minimal Tahap 5 (Surat Resmi Diterima).
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0073C2] hover:bg-[#0284c7] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Catat Booking Tanggal
                      </button>
                    </form>
                  )}
                </div>

                {/* Penjadwalan Survei Lokasi Form */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <CheckSquare className="h-4 w-4 text-indigo-650" />
                    Penjadwalan Survei Lokasi
                  </h2>
                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-slate-500 italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={handleCreateSurvey} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Pilih Pengajuan Terkait</label>
                        <select
                          required
                          value={surveySubmissionId}
                          onChange={(e) => setSurveySubmissionId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        >
                          <option value="">-- Pilih Pengajuan --</option>
                          {submissions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.companyName} - {s.activityName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tanggal Kunjungan Survei</label>
                        <input
                          type="date"
                          required
                          value={surveyDate}
                          onChange={(e) => setSurveyDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0073C2]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0073C2] hover:bg-[#0284c7] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Simpan Jadwal Survei
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Grid Calendar View */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-700">
                  {/* Calendar Month Selector Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-800">Grid Kalender Pemakaian</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (currentMonth === 0) {
                            setCurrentMonth(11);
                            setCurrentYear(c => c - 1);
                          } else {
                            setCurrentMonth(m => m - 1);
                          }
                        }}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-bold transition-colors"
                      >
                        &larr;
                      </button>
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">
                        {new Date(currentYear, currentMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => {
                          if (currentMonth === 11) {
                            setCurrentMonth(0);
                            setCurrentYear(c => c + 1);
                          } else {
                            setCurrentMonth(m => m + 1);
                          }
                        }}
                        className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-bold transition-colors"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  {(() => {
                    // Calculate calendar days
                    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sunday) to 6 (Saturday)
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    
                    const daysArray = [];
                    // Pad previous month days
                    const daysToPad = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // start week on Monday
                    for (let i = 0; i < daysToPad; i++) {
                      daysArray.push(null);
                    }
                    // Current month days
                    for (let i = 1; i <= daysInMonth; i++) {
                      daysArray.push(i);
                    }

                    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {weekDays.map((wd) => (
                            <div key={wd} className="py-1 bg-slate-100 rounded">{wd}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5">
                          {daysArray.map((day, idx) => {
                            if (day === null) {
                              return <div key={`empty-${idx}`} className="aspect-square bg-slate-50 rounded-lg border border-dashed border-slate-100"></div>;
                            }

                            const padZero = (n: number) => n.toString().padStart(2, '0');
                            const dateStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(day)}`;
                            
                            // Find bookings that fall on this day
                            const dayBookings = bookings.filter((b) => dateStr >= b.startDate && dateStr <= b.endDate);
                            // Find surveys on this day
                            const daySurveys = surveys.filter((s) => s.date === dateStr && s.status !== 'CANCELLED');

                            let cellBg = 'bg-white border-slate-200 hover:border-slate-350';
                            let numColor = 'text-slate-400';
                            
                            if (dayBookings.length > 0) {
                              cellBg = 'bg-[#e0f2fe] border-sky-300 text-sky-950 hover:bg-sky-200';
                              numColor = 'text-sky-700 font-extrabold';
                            } else if (daySurveys.length > 0) {
                              cellBg = 'bg-[#fef08a] border-yellow-350 text-yellow-950 hover:bg-yellow-200';
                              numColor = 'text-yellow-750 font-extrabold';
                            }

                            return (
                              <div
                                key={`day-${day}`}
                                className={`aspect-square p-1 border rounded-lg flex flex-col justify-between overflow-hidden shadow-sm transition-all ${cellBg}`}
                              >
                                <span className={`text-[10px] font-mono ${numColor}`}>{day}</span>
                                <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto scrollbar-none">
                                  {dayBookings.map((b) => {
                                    return (
                                      <div
                                        key={b.id}
                                        title={`${b.activityName} (${b.roomCodes.join(', ')})`}
                                        className="text-[7.5px] px-1 py-0.5 rounded border border-sky-200/50 bg-white/80 text-sky-900 leading-none font-bold truncate"
                                      >
                                        {b.activityName}
                                      </div>
                                    );
                                  })}

                                  {daySurveys.map((s) => (
                                    <div
                                      key={s.id}
                                      title={`Survei: ${s.companyName} (Status: ${s.status})`}
                                      className="text-[7.5px] px-1 py-0.5 rounded border border-yellow-250 bg-white/80 text-yellow-900 leading-none font-bold truncate"
                                    >
                                      🕵️ {s.companyName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Calendar Bookings List View */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-3">Daftar Aktif Booking Tanggal</h4>
                    {bookings.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">Belum ada booking terdaftar.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {bookings.map((b) => (
                          <div
                            key={b.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs text-slate-700"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{b.activityName}</span>
                                <span className={`text-[8px] border px-1.5 py-0.5 rounded font-extrabold ${
                                  b.type === 'CONFIRMED'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-750'
                                    : b.type === 'TENTATIVE'
                                    ? 'bg-amber-50 border-amber-250 text-amber-750'
                                    : 'bg-red-50 border-red-200 text-red-750'
                                }`}>
                                  {b.type}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Ruang: {b.roomCodes.join(', ')} | Periode: {b.startDate} s/d {b.endDate}
                              </p>
                              {b.notes && <p className="text-[9px] text-slate-400 italic mt-1">&quot;{b.notes}&quot;</p>}
                            </div>

                            {role === 'PENGINPUT' && (
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="text-[10px] text-red-500 hover:text-red-700 font-bold transition-colors"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Calendar Surveys List View */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-3">Daftar Jadwal Survei Lokasi</h4>
                    {surveys.filter(s => s.status !== 'CANCELLED').length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">Belum ada survei terjadwal.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {surveys.filter(s => s.status !== 'CANCELLED').map((s) => (
                          <div
                            key={s.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs text-slate-700"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{s.companyName}</span>
                                <span className={`text-[8px] border px-1.5 py-0.5 rounded font-extrabold ${
                                  s.status === 'SCHEDULED'
                                    ? 'bg-blue-50 border-blue-200 text-blue-750'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-750'
                                }`}>
                                  {s.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Tanggal Kunjungan: {s.date} · Waktu Slot: 10:00 WIB
                              </p>
                            </div>

                            {role === 'PENGINPUT' && s.status === 'SCHEDULED' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateSurvey(s.id, 'COMPLETED')}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold transition-colors"
                                >
                                  Selesai
                                </button>
                                <button
                                  onClick={() => handleUpdateSurvey(s.id, 'CANCELLED')}
                                  className="text-[10px] text-red-500 hover:text-red-700 font-bold transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
      </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOKUMEN OPERASIONAL */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-slate-700">
              <div className="mb-6">
                <h2 className="text-base font-bold text-slate-800">Pusat Dokumen Operasional</h2>
                <p className="text-xs text-slate-500 mt-1">Unduh berkas resmi operasional penyewaan Gedung A.A. Maramis. Data diperbarui berkala sesuai versi terbaru.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentsList.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-[#0073C2]/45 rounded-xl flex items-center justify-between gap-4 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 group-hover:text-[#0073C2] transition-colors mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{doc.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{doc.desc}</p>
                        <span className="inline-block text-[9px] bg-white text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-semibold mt-2.5">
                          Versi: {doc.version}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => alert(`Simulasi mengunduh berkas: ${doc.name} (${doc.type})`)}
                      className="px-3 py-1.5 bg-white hover:bg-[#0073C2] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-all shrink-0 shadow-sm"
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
      </div>

      {/* FOOTER BAR - Satu Kemenkeu style */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-slate-400 text-[10px] flex justify-between items-center select-none shadow-sm z-10 shrink-0">
        <div>© 2026 Lembaga Manajemen Aset Negara (LMAN). Hak Cipta Dilindungi.</div>
        <div className="flex items-center gap-1.5 font-semibold text-slate-500">
          <span>Digital Signature Supported By BSSN</span>
          <div className="h-4 w-4 bg-[#0073C2] rounded-full flex items-center justify-center text-[7px] text-white font-extrabold">B</div>
        </div>
      </footer>
    </div>
  );
}

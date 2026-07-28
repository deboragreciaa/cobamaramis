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
  updateSurvey,
  updateSurveyStatus,
  getClosedSurveySlots,
  closeSurveySlot,
  openSurveySlot,
  deleteSubmission,
  getOfficials,
  createOfficial,
  updateOfficial,
  setActiveOfficial
} from '@/app/actions/db';
import { Room, getQuickPackages, QuickPackage } from '@/lib/rooms-data';
import { buildLoiText, buildPerjanjianText, formatTanggalIndo, formatTanggalPanjang, formatJangkaWaktu, hitungDurasiHari, terbilang, formatRupiahTerbilang, pisahPpn } from '@/lib/documents';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { calculatePenawaran, formatRupiah, PURPOSE_OPTIONS, PurposeOption } from '@/lib/calculator';
import { Client, Submission, Booking, Survey, ClosedSurveySlot, BookingType, Official } from '@/lib/types';
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
  ChevronRight,
  X,
  Award
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

// Strips the internal fixed domain so users only ever see the username they typed.
const toUsernameDisplay = (email?: string | null) => email?.replace(/@maramis\.local$/, '') || '';

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
  const [usernameInput, setUsernameInput] = useState('maramis');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'calculator' | 'clients' | 'submissions' | 'calendar_booking' | 'calendar_survey' | 'calendar_recap' | 'documents' | 'doc_loi' | 'doc_prj'>('catalog');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  
  // Database States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [closedSlots, setClosedSlots] = useState<ClosedSurveySlot[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  
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
  const [clientPicTitle, setClientPicTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Official settings states
  const [editingOfficialId, setEditingOfficialId] = useState<string | null>(null);
  const [officialName, setOfficialName] = useState('');
  const [officialTitle, setOfficialTitle] = useState('');
  const [officialOrdinanceNumber, setOfficialOrdinanceNumber] = useState('');
  const [officialOrdinanceDate, setOfficialOrdinanceDate] = useState('');
  
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
  
  // F6 Survey Form States (manual entry — survey is scheduled before a rental submission exists)
  const [surveyCompanyName, setSurveyCompanyName] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyTimeSlot, setSurveyTimeSlot] = useState<'10:00' | '14:00'>('10:00');
  const [surveyPicInternal, setSurveyPicInternal] = useState('Tim LMAN');
  const [surveyGuestCount, setSurveyGuestCount] = useState('5');

  // F6 Close Slot States
  const [closeSlotDate, setCloseSlotDate] = useState('');
  const [closeSlotTimeSlot, setCloseSlotTimeSlot] = useState<'10:00' | '14:00'>('10:00');
  const [closeSlotReason, setCloseSlotReason] = useState('');

  // Calendar sidebar submenu + edit modals
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editBookingType, setEditBookingType] = useState<BookingType>('TENTATIVE');
  const [editBookingStartDate, setEditBookingStartDate] = useState('');
  const [editBookingEndDate, setEditBookingEndDate] = useState('');
  const [editBookingRoomCodes, setEditBookingRoomCodes] = useState('');
  const [editBookingNotes, setEditBookingNotes] = useState('');

  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editSurveyCompanyName, setEditSurveyCompanyName] = useState('');
  const [editSurveyDate, setEditSurveyDate] = useState('');
  const [editSurveyTimeSlot, setEditSurveyTimeSlot] = useState<'10:00' | '14:00'>('10:00');
  const [editSurveyPicInternal, setEditSurveyPicInternal] = useState('');
  const [editSurveyGuestCount, setEditSurveyGuestCount] = useState('5');
  const [editSurveyStatus, setEditSurveyStatus] = useState<Survey['status']>('SCHEDULED');

  // F7 & F8 Document Generator States
  const [activeLoiSubmission, setActiveLoiSubmission] = useState<Submission | null>(null);
  const [loiNomorSurat, setLoiNomorSurat] = useState('');
  const [loiNomorSuratPemohon, setLoiNomorSuratPemohon] = useState('');
  const [loiNamaPenandatangan, setLoiNamaPenandatangan] = useState('Tim LMAN');
  const [loiJabatanPenandatangan, setLoiJabatanPenandatangan] = useState('Divisi Pengembangan dan Pendayagunaan Properti 1');
  const [loiTautanPerjanjian, setLoiTautanPerjanjian] = useState('');
  const [loiTautanTataTertib, setLoiTautanTataTertib] = useState('s.kemenkeu.go.id/TataTertibMaramis');
  const [loiVerified, setLoiVerified] = useState(false);
  const [loiTanggalSuratPemohon, setLoiTanggalSuratPemohon] = useState('');
  const [loiPerihalSuratPemohon, setLoiPerihalSuratPemohon] = useState('');
  const [loiLuasAreaCustom, setLoiLuasAreaCustom] = useState('');

  const activeOfficial = useMemo(() => {
    return officials.find((o) => o.isActive);
  }, [officials]);

  useEffect(() => {
    if (activeLoiSubmission) {
      const client = clients.find(c => c.id === activeLoiSubmission.clientId);
      const subBookings = bookings.filter(b => b.submissionId === activeLoiSubmission.id);
      const startDate = subBookings.length > 0 ? subBookings[0].startDate : '2026-01-30';
      const cleanDate = startDate.replace(/-/g, '');
      const cleanCompany = client ? client.companyName.replace(/\s+/g, '') : 'Summerland';
      
      // Load custom inputs if saved, otherwise load default
      setLoiNomorSurat(activeLoiSubmission.loiNomorSurat || '');
      setLoiNomorSuratPemohon(activeLoiSubmission.loiNomorSuratPemohon || activeLoiSubmission.applicationLetterNo || '');
      setLoiTanggalSuratPemohon(activeLoiSubmission.loiTanggalSuratPemohon || activeLoiSubmission.applicationLetterDate || activeLoiSubmission.createdAt.split('T')[0]);
      setLoiPerihalSuratPemohon(activeLoiSubmission.loiPerihalSuratPemohon || activeLoiSubmission.applicationSubject || 'Surat Permohonan Perizinan Lokasi Syuting');
      setLoiLuasAreaCustom(activeLoiSubmission.loiLuasAreaCustom || activeLoiSubmission.areaText || `±${new Intl.NumberFormat('id-ID').format(activeLoiSubmission.totalAreaSqm)} m2`);
      setLoiTautanPerjanjian(activeLoiSubmission.loiTautanPerjanjian || `s.kemenkeu.go.id/${cleanCompany.toLowerCase()}${cleanDate}`);
      setLoiTautanTataTertib(activeLoiSubmission.loiTautanTataTertib || 's.kemenkeu.go.id/TataTertibMaramis');
      setLoiVerified(activeLoiSubmission.loiVerified || false);

      // Load official snapshot if saved, otherwise load current active LMAN official
      if (activeLoiSubmission.loiOfficialName) {
        setLoiNamaPenandatangan(activeLoiSubmission.loiOfficialName);
        setLoiJabatanPenandatangan(activeLoiSubmission.loiOfficialTitle || '');
      } else if (activeOfficial) {
        setLoiNamaPenandatangan(activeOfficial.name);
        setLoiJabatanPenandatangan(activeOfficial.title);
      } else {
        setLoiNamaPenandatangan('Mahdi');
        setLoiJabatanPenandatangan('Pelaksana Tugas Direktur Pengembangan dan Pendayagunaan LMAN');
      }
    }
  }, [activeLoiSubmission, clients, bookings, activeOfficial]);

  const [activeAgreementSubmission, setActiveAgreementSubmission] = useState<Submission | null>(null);
  const [agreementNomor, setAgreementNomor] = useState('');
  const [agreementPihakPertama, setAgreementPihakPertama] = useState('Tim LMAN');
  const [agreementJabatanPihakPertama, setAgreementJabatanPihakPertama] = useState('Divisi Pengembangan dan Pendayagunaan Properti 1');

  // F8 DOCX Generator — Surat Penawaran reference + client address, filled manually by Penginput
  const [agreementOfferLetterNo, setAgreementOfferLetterNo] = useState('');
  const [agreementOfferLetterDate, setAgreementOfferLetterDate] = useState('');
  const [agreementInstitutionAddress, setAgreementInstitutionAddress] = useState('');

  // F7 & F8 Generated Memos
  const loiTextGenerated = useMemo(() => {
    if (!activeLoiSubmission) return '';
    const client = clients.find(c => c.id === activeLoiSubmission.clientId);
    if (!client) return '';

    const subBookings = bookings.filter(b => b.submissionId === activeLoiSubmission.id);
    const startDate = subBookings.length > 0 ? subBookings[0].startDate : new Date().toISOString().split('T')[0];
    const endDate = subBookings.length > 0 ? subBookings[subBookings.length - 1].endDate : new Date().toISOString().split('T')[0];

    const dpp = activeLoiSubmission.estimatedCost / (1 + systemSettings.ppnRate);
    const ppn = activeLoiSubmission.estimatedCost - dpp;

    return buildLoiText({
      nomorSurat: loiNomorSurat || '001/LMAN-P3/2026',
      tanggalSurat: new Date().toISOString().split('T')[0],
      namaPemohon: client.signatoryName || client.picName,
      jabatanPemohon: client.signatoryTitle || client.picTitle || ('Perwakilan ' + (client.institutionName || client.companyName)),
      instansiPemohon: client.institutionName || client.companyName,
      nomorSuratPemohon: loiNomorSuratPemohon || '123/EXT/2026',
      tanggalSuratPemohon: loiTanggalSuratPemohon || activeLoiSubmission.createdAt.split('T')[0],
      perihalSuratPemohon: loiPerihalSuratPemohon || 'Permohonan Pemanfaatan Gedung A.A. Maramis',
      objekPemanfaatan: activeLoiSubmission.objectDescription || activeLoiSubmission.roomCodes.join(', '),
      luasAreaSqm: activeLoiSubmission.totalAreaSqm,
      luasAreaCustom: loiLuasAreaCustom,
      peruntukan: activeLoiSubmission.eventName || activeLoiSubmission.activityName,
      tanggalMulai: startDate,
      tanggalSelesai: endDate,
      tarifDpp: dpp,
      ppn: ppn,
      totalTarif: activeLoiSubmission.estimatedCost,
      ppnRatePersen: systemSettings.ppnRate * 100,
      tautanPerjanjian: loiTautanPerjanjian || `s.kemenkeu.go.id/${(client.institutionName || client.companyName).replace(/\s+/g, '').toLowerCase()}${startDate.replace(/-/g, '')}`,
      tautanTataTertib: loiTautanTataTertib || 's.kemenkeu.go.id/TataTertibMaramis',
      namaPenandatangan: loiNamaPenandatangan,
      jabatanPenandatangan: loiJabatanPenandatangan
    });
  }, [
    activeLoiSubmission,
    clients,
    bookings,
    systemSettings,
    loiNomorSurat,
    loiNomorSuratPemohon,
    loiTanggalSuratPemohon,
    loiPerihalSuratPemohon,
    loiLuasAreaCustom,
    loiNamaPenandatangan,
    loiJabatanPenandatangan,
    loiTautanPerjanjian,
    loiTautanTataTertib
  ]);

  const agreementTextGenerated = useMemo(() => {
    if (!activeAgreementSubmission) return '';
    const client = clients.find(c => c.id === activeAgreementSubmission.clientId);
    if (!client) return '';

    const subBookings = bookings.filter(b => b.submissionId === activeAgreementSubmission.id);
    const startDate = subBookings.length > 0 ? subBookings[0].startDate : new Date().toISOString().split('T')[0];
    const endDate = subBookings.length > 0 ? subBookings[subBookings.length - 1].endDate : new Date().toISOString().split('T')[0];

    return buildPerjanjianText({
      nomorPerjanjian: agreementNomor || '002/SPG/LMAN/2026',
      tanggalPerjanjian: new Date().toISOString().split('T')[0],
      nomorSuratPenawaran: loiNomorSurat || '001/LMAN-P3/2026',
      tanggalSuratPenawaran: activeAgreementSubmission.createdAt.split('T')[0],
      nomorSuratPermohonan: loiNomorSuratPemohon || '123/EXT/2026',
      tanggalSuratPermohonan: activeAgreementSubmission.createdAt.split('T')[0],
      namaPihakPertama: agreementPihakPertama,
      jabatanPihakPertama: agreementJabatanPihakPertama,
      namaPihakKedua: client.picName,
      jabatanPihakKedua: 'Direktur Utama',
      instansiPihakKedua: client.companyName,
      alamatPihakKedua: 'Gedung Keuangan Instansi Pihak Kedua',
      teleponPihakKedua: client.picPhone,
      objekDeskripsi: 'Ruang Acara Gedung A.A. Maramis (' + activeAgreementSubmission.roomCodes.join(', ') + ')',
      luasAreaSqm: activeAgreementSubmission.roomCodes.length * 150,
      peruntukan: activeAgreementSubmission.activityName,
      tanggalMulai: startDate,
      tanggalSelesai: endDate,
      uangSewa: activeAgreementSubmission.estimatedCost,
      batasBayar: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      securityDeposit: activeAgreementSubmission.estimatedCost * 0.10
    });
  }, [activeAgreementSubmission, clients, bookings, agreementNomor, loiNomorSurat, loiNomorSuratPemohon, agreementPihakPertama, agreementJabatanPihakPertama]);

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
        getClosedSurveySlots(),
        getOfficials()
      ])
        .then(([fetchedRooms, fetchedSettings, fetchedClients, fetchedSubmissions, fetchedBookings, fetchedSurveys, fetchedClosedSlots, fetchedOfficials]) => {
          setRooms(fetchedRooms);
          setSystemSettings(fetchedSettings);
          setOfficials(fetchedOfficials);
          
          // Merge fetched database items with current client-side state synchronously (Database overrides localStorage)
          const localSubs = typeof window !== 'undefined' ? localStorage.getItem('maramis_submissions') : null;
          const currentSubs: Submission[] = localSubs ? JSON.parse(localSubs) : [];
          const mergedSubs = [...fetchedSubmissions];
          currentSubs.forEach(s => {
            if (!mergedSubs.some(m => m.id === s.id)) mergedSubs.push(s);
          });
          setSubmissions(mergedSubs);

          const localClients = typeof window !== 'undefined' ? localStorage.getItem('maramis_clients') : null;
          const currentClients: Client[] = localClients ? JSON.parse(localClients) : [];
          const mergedClients = [...fetchedClients];
          currentClients.forEach(c => {
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
                picTitle: 'Pimpinan / Perwakilan ' + sub.companyName,
                institutionName: sub.companyName,
                signatoryName: 'PIC Kontak ' + sub.companyName,
                signatoryTitle: 'Pimpinan / Perwakilan ' + sub.companyName,
                createdAt: sub.createdAt || new Date().toISOString(),
                isActive: true
              });
            }
          });
          
          setClients(mergedClients.sort((a, b) => a.companyName.localeCompare(b.companyName)));

          const localBookings = typeof window !== 'undefined' ? localStorage.getItem('maramis_bookings') : null;
          const currentBookings: Booking[] = localBookings ? JSON.parse(localBookings) : [];
          const mergedBookings = [...fetchedBookings];
          currentBookings.forEach(b => {
            if (!mergedBookings.some(m => m.id === b.id)) mergedBookings.push(b);
          });
          setBookings(mergedBookings);

          const localSurveys = typeof window !== 'undefined' ? localStorage.getItem('maramis_surveys') : null;
          const currentSurveys: Survey[] = localSurveys ? JSON.parse(localSurveys) : [];
          const mergedSurveys = [...fetchedSurveys];
          currentSurveys.forEach(s => {
            if (!mergedSurveys.some(m => m.id === s.id)) mergedSurveys.push(s);
          });
          setSurveys(mergedSurveys);

          const localClosedSlots = typeof window !== 'undefined' ? localStorage.getItem('maramis_closed_slots') : null;
          const currentClosedSlots: ClosedSurveySlot[] = localClosedSlots ? JSON.parse(localClosedSlots) : [];
          const mergedClosedSlots = [...fetchedClosedSlots];
          currentClosedSlots.forEach(s => {
            if (!mergedClosedSlots.some(m => m.id === s.id)) mergedClosedSlots.push(s);
          });
          setClosedSlots(mergedClosedSlots);
          
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
    await login(passwordInput, usernameInput);
  };

  // F3 Client Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientCompanyName || !clientPicName || !clientPicPhone || !clientPicTitle) {
      alert('Semua field wajib diisi.');
      return;
    }
    try {
      const newClient = await createClient({
        companyName: clientCompanyName,
        picName: clientPicName,
        picPhone: clientPicPhone,
        picTitle: clientPicTitle,
        institutionName: clientCompanyName,
        signatoryName: clientPicName,
        signatoryTitle: clientPicTitle
      });
      setClients((prev) => [...prev, newClient].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      // Reset form
      setClientCompanyName('');
      setClientPicName('');
      setClientPicPhone('');
      setClientPicTitle('');
      alert('Klien baru berhasil ditambahkan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan klien.');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientId) return;
    if (!clientCompanyName || !clientPicName || !clientPicPhone || !clientPicTitle) {
      alert('Semua field wajib diisi.');
      return;
    }
    try {
      const success = await updateClient(editingClientId, {
        companyName: clientCompanyName,
        picName: clientPicName,
        picPhone: clientPicPhone,
        picTitle: clientPicTitle,
        institutionName: clientCompanyName,
        signatoryName: clientPicName,
        signatoryTitle: clientPicTitle
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
                  picTitle: clientPicTitle,
                  institutionName: clientCompanyName,
                  signatoryName: clientPicName,
                  signatoryTitle: clientPicTitle
                }
              : c
          ).sort((a, b) => a.companyName.localeCompare(b.companyName))
        );
        // Reset form
        setClientCompanyName('');
        setClientPicName('');
        setClientPicPhone('');
        setClientPicTitle('');
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

  // LMAN Official Handlers
  const handleCreateOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialName || !officialTitle || !officialOrdinanceNumber || !officialOrdinanceDate) {
      alert('Semua field pejabat wajib diisi.');
      return;
    }
    try {
      const newOfficial = await createOfficial({
        name: officialName,
        title: officialTitle,
        ordinanceNumber: officialOrdinanceNumber,
        ordinanceDate: officialOrdinanceDate,
        isActive: officials.length === 0
      });
      setOfficials((prev) => [...prev, newOfficial]);
      setOfficialName('');
      setOfficialTitle('');
      setOfficialOrdinanceNumber('');
      setOfficialOrdinanceDate('');
      alert('Pejabat LMAN baru berhasil ditambahkan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan pejabat.');
    }
  };

  const handleUpdateOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfficialId) return;
    if (!officialName || !officialTitle || !officialOrdinanceNumber || !officialOrdinanceDate) {
      alert('Semua field pejabat wajib diisi.');
      return;
    }
    try {
      const success = await updateOfficial(editingOfficialId, {
        name: officialName,
        title: officialTitle,
        ordinanceNumber: officialOrdinanceNumber,
        ordinanceDate: officialOrdinanceDate,
      });
      if (success) {
        setOfficials((prev) =>
          prev.map((o) =>
            o.id === editingOfficialId
              ? {
                  ...o,
                  name: officialName,
                  title: officialTitle,
                  ordinanceNumber: officialOrdinanceNumber,
                  ordinanceDate: officialOrdinanceDate,
                }
              : o
          )
        );
        setEditingOfficialId(null);
        setOfficialName('');
        setOfficialTitle('');
        setOfficialOrdinanceNumber('');
        setOfficialOrdinanceDate('');
        alert('Perubahan data pejabat berhasil disimpan!');
      } else {
        alert('Gagal menyimpan perubahan pejabat.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan pejabat.');
    }
  };

  const handleToggleActiveOfficial = async (id: string, name: string) => {
    try {
      const success = await setActiveOfficial(id);
      if (success) {
        setOfficials((prev) =>
          prev.map((o) => ({
            ...o,
            isActive: o.id === id
          }))
        );
        await createAuditLog('Ubah Pejabat LMAN Aktif', `Menetapkan ${name} sebagai pejabat aktif LMAN`);
        alert(`${name} sekarang ditetapkan sebagai pejabat aktif.`);
      } else {
        alert('Gagal mengubah pejabat aktif.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah pejabat aktif.');
    }
  };

  const handleSaveLoiParams = async (sub: Submission) => {
    try {
      const client = clients.find(c => c.id === sub.clientId);
      const subBookings = bookings.filter(b => b.submissionId === sub.id);
      const startDate = subBookings.length > 0 ? subBookings[0].startDate : new Date().toISOString().split('T')[0];
      const endDate = subBookings.length > 0 ? subBookings[subBookings.length - 1].endDate : new Date().toISOString().split('T')[0];

      const inputData = {
        loiNomorSurat: loiNomorSurat || sub.loiNomorSurat || '',
        loiNomorSuratPemohon: loiNomorSuratPemohon || sub.applicationLetterNo || '',
        loiTanggalSuratPemohon: loiTanggalSuratPemohon || sub.applicationLetterDate || sub.createdAt.split('T')[0],
        loiPerihalSuratPemohon: loiPerihalSuratPemohon || sub.applicationSubject || '',
        loiTautanPerjanjian: loiTautanPerjanjian || `s.kemenkeu.go.id/${(client ? (client.institutionName || client.companyName) : sub.companyName).replace(/\s+/g, '').toLowerCase()}${startDate.replace(/-/g, '')}`,
        loiTautanTataTertib: loiTautanTataTertib || 's.kemenkeu.go.id/TataTertibMaramis',
        loiLuasArea: loiLuasAreaCustom || sub.areaText || `±${new Intl.NumberFormat('id-ID').format(sub.totalAreaSqm)} m2`,
        loiNamaPenandatangan: loiNamaPenandatangan || sub.loiOfficialName || '',
      };

      const updatedSub = {
        ...sub,
        loiNomorSurat: inputData.loiNomorSurat,
        loiNomorSuratPemohon: inputData.loiNomorSuratPemohon,
        loiTanggalSuratPemohon: inputData.loiTanggalSuratPemohon,
        loiPerihalSuratPemohon: inputData.loiPerihalSuratPemohon,
        loiTautanPerjanjian: inputData.loiTautanPerjanjian,
        loiTautanTataTertib: inputData.loiTautanTataTertib,
        loiLuasAreaCustom: inputData.loiLuasArea,
        loiVerified: loiVerified,
        loiOfficialName: inputData.loiNamaPenandatangan,
        loiOfficialTitle: loiJabatanPenandatangan || 'Pelaksana Tugas Direktur Pengembangan dan Pendayagunaan LMAN',
        
        // Sync revised prompt fields
        institutionName: client ? (client.institutionName || client.companyName) : sub.companyName,
        signatoryName: client ? (client.signatoryName || client.picName) : (sub.signatoryName || ''),
        signatoryTitle: client ? (client.signatoryTitle || client.picTitle) : (sub.signatoryTitle || ''),
        eventName: sub.eventName || sub.activityName,
        objectDescription: sub.objectDescription || sub.roomCodes.join(', '),
        areaText: inputData.loiLuasArea,
        eventDate: sub.eventDate || formatJangkaWaktu(startDate, endDate),
        applicationLetterNo: inputData.loiNomorSuratPemohon,
        applicationLetterDate: inputData.loiTanggalSuratPemohon,
        applicationSubject: inputData.loiPerihalSuratPemohon,
        offerValue: sub.offerValue || sub.estimatedCost
      };

      await updateSubmission(sub.id, updatedSub);
      setSubmissions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));
      alert('Parameter LOI berhasil disimpan ke data pengajuan sewa!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan parameter LOI.');
    }
  };

  // F7 DOCX Download Handler — fills LOI_Template_Placeholder.docx with {{...}} tokens
  const handleDownloadLoiDocx = async (sub: Submission) => {
    try {
      const client = clients.find(c => c.id === sub.clientId);
      const subBookings = bookings.filter(b => b.submissionId === sub.id);
      const startDate = subBookings.length > 0 ? subBookings[0].startDate : sub.createdAt.split('T')[0];
      const endDate = subBookings.length > 0 ? subBookings[subBookings.length - 1].endDate : startDate;

      const { dpp, ppn, total } = pisahPpn(sub.estimatedCost, systemSettings.ppnRate);

      const data = {
        signatoryName: (client?.signatoryName || client?.picName || '').trim(),
        signatoryTitle: (client?.signatoryTitle || client?.picTitle || '').trim(),
        applicationLetterNo: (loiNomorSuratPemohon || sub.applicationLetterNo || '').trim(),
        applicationLetterDate: formatTanggalIndo(loiTanggalSuratPemohon || sub.applicationLetterDate || ''),
        applicationSubject: (loiPerihalSuratPemohon || sub.applicationSubject || '').trim(),
        objectDescription: (sub.objectDescription || sub.roomCodes.join(', ')).trim(),
        areaText: (loiLuasAreaCustom || sub.areaText || '').trim(),
        eventName: (sub.eventName || sub.activityName || '').trim(),
        eventDate: (sub.eventDate || formatJangkaWaktu(startDate, endDate) || '').trim(),
        tarifDasar: formatRupiahTerbilang(dpp),
        tarifPPN: formatRupiahTerbilang(ppn),
        tarifTotal: formatRupiahTerbilang(total),
        linkPerjanjian: (loiTautanPerjanjian || '').trim(),
        linkTataTertib: (loiTautanTataTertib || '').trim(),
        officialName: (loiNamaPenandatangan || '').trim(),
      };

      const FIELD_LABELS: Record<keyof typeof data, string> = {
        signatoryName: 'Nama Penanda Tangan Klien',
        signatoryTitle: 'Jabatan/Sebutan Klien',
        applicationLetterNo: 'Nomor Surat Permohonan',
        applicationLetterDate: 'Tanggal Surat Permohonan',
        applicationSubject: 'Perihal Surat Permohonan',
        objectDescription: 'Objek Pemanfaatan',
        areaText: 'Luas Area',
        eventName: 'Peruntukan/Nama Kegiatan',
        eventDate: 'Jangka Waktu Pemanfaatan',
        tarifDasar: 'Tarif Dasar',
        tarifPPN: 'PPN',
        tarifTotal: 'Total Tarif',
        linkPerjanjian: 'Tautan Perjanjian',
        linkTataTertib: 'Tautan Tata Tertib',
        officialName: 'Nama Pejabat LMAN Aktif',
      };

      const missingFields = (Object.keys(data) as (keyof typeof data)[])
        .filter((key) => !data[key] || data[key] === '-')
        .map((key) => FIELD_LABELS[key]);

      if (missingFields.length > 0) {
        alert(`Tidak dapat membuat draf LOI. Field berikut belum diisi:\n\n- ${missingFields.join('\n- ')}`);
        return;
      }

      const response = await fetch('/LOI_Template_Placeholder.docx');
      if (!response.ok) throw new Error('Template LOI_Template_Placeholder.docx tidak ditemukan');
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      doc.render(data);

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Save snapshots and revised fields to database
      const updatedSub = {
        ...sub,
        loiNomorSurat: loiNomorSurat || sub.loiNomorSurat || '',
        loiNomorSuratPemohon: data.applicationLetterNo,
        loiTanggalSuratPemohon: loiTanggalSuratPemohon || sub.applicationLetterDate || sub.createdAt.split('T')[0],
        loiPerihalSuratPemohon: data.applicationSubject,
        loiTautanPerjanjian: data.linkPerjanjian,
        loiTautanTataTertib: data.linkTataTertib,
        loiLuasAreaCustom: data.areaText,
        loiVerified: true,
        loiOfficialName: data.officialName,
        loiOfficialTitle: loiJabatanPenandatangan || sub.loiOfficialTitle || '',

        // Sync revised prompt fields
        institutionName: client ? (client.institutionName || client.companyName) : sub.companyName,
        signatoryName: data.signatoryName,
        signatoryTitle: data.signatoryTitle,
        eventName: data.eventName,
        objectDescription: data.objectDescription,
        areaText: data.areaText,
        eventDate: data.eventDate,
        applicationLetterNo: data.applicationLetterNo,
        applicationLetterDate: loiTanggalSuratPemohon || sub.applicationLetterDate || sub.createdAt.split('T')[0],
        applicationSubject: data.applicationSubject,
        offerValue: sub.estimatedCost
      };
      await updateSubmission(sub.id, updatedSub);
      setSubmissions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));
      setLoiVerified(true);

      const sanitizeForFilename = (s: string) =>
        s.replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);

      const url = window.URL.createObjectURL(out);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `DRAF_LOI_${sanitizeForFilename(data.signatoryName)}_${sanitizeForFilename(data.eventDate)}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating DOCX:', err);
      alert('Gagal membuat file Word: ' + err);
    }
  };

  // F8 DOCX Download Handler — fills PRJ_Template_Placeholder.docx with {{...}} tokens
  const handleDownloadAgreementDocx = async (sub: Submission) => {
    try {
      const client = clients.find(c => c.id === sub.clientId);
      const subBookings = bookings.filter(b => b.submissionId === sub.id);
      const startDate = subBookings.length > 0 ? subBookings[0].startDate : sub.createdAt.split('T')[0];
      const endDate = subBookings.length > 0 ? subBookings[subBookings.length - 1].endDate : startDate;

      const durasiHari = hitungDurasiHari(startDate, endDate);
      const eventDuration = durasiHari > 0 ? `${durasiHari} (${terbilang(durasiHari)}) hari` : '';
      const eventDateRange = durasiHari > 1
        ? `${formatTanggalIndo(startDate)} sampai dengan ${formatTanggalIndo(endDate)}`
        : formatTanggalIndo(startDate);

      const offerLetterNo = (agreementOfferLetterNo || loiNomorSurat || '').trim();
      const offerLetterDate = agreementOfferLetterDate ? formatTanggalIndo(agreementOfferLetterDate) : '';
      const offerLetterNoDate = offerLetterNo && offerLetterDate ? `${offerLetterNo} tanggal ${offerLetterDate}` : '';

      const paymentDeadlineIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const areaText = `${new Intl.NumberFormat('id-ID').format(sub.totalAreaSqm)} meter`;
      const objectDescriptionBase = (sub.objectDescription || sub.roomCodes.join(', ')).trim();

      const officialOrdinanceLegalBasis = activeOfficial
        ? `berdasarkan Surat Perintah Direktur Utama Lembaga Manajemen Aset Negara Nomor ${activeOfficial.ordinanceNumber} tanggal ${formatTanggalIndo(activeOfficial.ordinanceDate)} dan dalam kapasitasnya bertindak untuk dan atas nama Direktur Utama Lembaga Manajemen Aset Negara berdasarkan Keputusan Direktur Utama Lembaga Manajemen Aset Negara Nomor 45/LMAN/2025 tentang Pelimpahan Sebagian Kewenangan Direktur Utama Dalam Bentuk Mandat Kepada Direktur dan Kepala Divisi di Lingkungan Lembaga Manajemen Aset Negara Untuk dan Atas Nama Direktur Utama Lembaga Manajemen Aset Negara Menandatangani Dokumen Dalam Rangka Pelaksanaan Tugas dan Fungsi`
        : '';

      const data = {
        offerLetterNoDate,
        signatureDateWords: formatTanggalPanjang(new Date().toISOString().split('T')[0]).replace(/^hari /, ''),
        officialName: (activeOfficial?.name || '').trim(),
        officialTitle: activeOfficial ? `${activeOfficial.title} ${officialOrdinanceLegalBasis}`.trim() : '',
        signatoryName: (client?.signatoryName || client?.picName || '').trim(),
        signatoryTitle: (client?.signatoryTitle || client?.picTitle || '').trim(),
        applicationLetterNo: (loiNomorSuratPemohon || sub.applicationLetterNo || '').trim(),
        applicationLetterDate: formatTanggalIndo(loiTanggalSuratPemohon || sub.applicationLetterDate || ''),
        eventName: (sub.eventName || sub.activityName || '').trim(),
        objectDescription: objectDescriptionBase ? `${objectDescriptionBase}, dengan luas ${areaText}` : '',
        eventDuration,
        eventDate: eventDateRange,
        nilaiSewa: formatRupiahTerbilang(sub.offerValue || sub.estimatedCost),
        paymentDeadline: formatTanggalIndo(paymentDeadlineIso),
        institutionName: (client ? (client.institutionName || client.companyName) : sub.companyName).trim(),
        institutionAddress: agreementInstitutionAddress.trim(),
      };

      const FIELD_LABELS: Record<keyof typeof data, string> = {
        offerLetterNoDate: 'Nomor & Tanggal Surat Penawaran',
        signatureDateWords: 'Tanggal Tanda Tangan',
        officialName: 'Nama Pejabat LMAN Aktif',
        officialTitle: 'Jabatan Pejabat LMAN Aktif',
        signatoryName: 'Nama Penanda Tangan Klien',
        signatoryTitle: 'Jabatan/Sebutan Klien',
        applicationLetterNo: 'Nomor Surat Permohonan',
        applicationLetterDate: 'Tanggal Surat Permohonan',
        eventName: 'Nama Kegiatan',
        objectDescription: 'Objek Sewa',
        eventDuration: 'Durasi Pelaksanaan',
        eventDate: 'Tanggal Pelaksanaan',
        nilaiSewa: 'Nilai Sewa',
        paymentDeadline: 'Batas Pembayaran',
        institutionName: 'Nama Instansi Klien',
        institutionAddress: 'Alamat Instansi Klien',
      };

      const missingFields = (Object.keys(data) as (keyof typeof data)[])
        .filter((key) => !data[key] || data[key] === '-')
        .map((key) => FIELD_LABELS[key]);

      if (missingFields.length > 0) {
        alert(`Tidak dapat membuat draf Perjanjian. Field berikut belum diisi:\n\n- ${missingFields.join('\n- ')}`);
        return;
      }

      const response = await fetch('/PRJ_Template_Placeholder.docx');
      if (!response.ok) throw new Error('Template PRJ_Template_Placeholder.docx tidak ditemukan');
      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      doc.render(data);

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const sanitizeForFilename = (s: string) =>
        s.replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);

      const url = window.URL.createObjectURL(out);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `DRAF_PRJ_${sanitizeForFilename(data.signatoryName)}_${sanitizeForFilename(data.eventDate)}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating DOCX:', err);
      alert('Gagal membuat file Word: ' + err);
    }
  };

  const handleDeleteSubmission = async (id: string, companyName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengajuan sewa dari "${companyName}" secara permanen? Tindakan ini juga akan menghapus reservasi jadwal terkait.`)) {
      return;
    }
    try {
      const success = await deleteSubmission(id);
      if (success) {
        await createAuditLog(
          'Hapus Pengajuan Sewa',
          `Menghapus pengajuan sewa ID ${id} dari ${companyName}`
        );
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        setBookings((prev) => prev.filter((b) => b.submissionId !== id));
        if (selectedSubmissionId === id) {
          setSelectedSubmissionId(null);
        }
        alert('Pengajuan sewa berhasil dihapus.');
      } else {
        alert('Gagal menghapus pengajuan sewa.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus pengajuan sewa.');
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
        institutionName: client.companyName,
        signatoryName: client.picName,
        signatoryTitle: client.picTitle,
        eventName: subActivityName,
        objectDescription: currentRooms.join(', '),
        areaText: `±${new Intl.NumberFormat('id-ID').format(totalSelectedArea)} m2`,
        offerValue: currentCost,
        applicationLetterNo: '',
        applicationLetterDate: '',
        applicationSubject: 'Surat Permohonan Perizinan Lokasi Syuting',
        eventDate: '',
        loiNomorSurat: '',
        loiNomorSuratPemohon: '',
        loiTanggalSuratPemohon: '',
        loiPerihalSuratPemohon: 'Surat Permohonan Perizinan Lokasi Syuting',
        loiTautanPerjanjian: '',
        loiTautanTataTertib: 's.kemenkeu.go.id/TataTertibMaramis',
        loiLuasAreaCustom: `±${new Intl.NumberFormat('id-ID').format(totalSelectedArea)} m2`
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
      
      if (bookingSubmissionId) {
        const formattedDateRange = formatJangkaWaktu(bookingStartDate, bookingEndDate);
        const subToUpdate = submissions.find(s => s.id === bookingSubmissionId);
        if (subToUpdate) {
          const updated = {
            ...subToUpdate,
            eventDate: formattedDateRange
          };
          await updateSubmission(bookingSubmissionId, { eventDate: formattedDateRange });
          setSubmissions(prev => prev.map(s => s.id === bookingSubmissionId ? updated : s));
        }
      }

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

  // F6 Survey Handlers — the requesting party is typed manually because a site
  // survey is scheduled before the client's rental submission (and client record) exist.
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyCompanyName.trim() || !surveyDate) {
      alert('Isi nama pihak pengaju dan tanggal survei.');
      return;
    }

    // Check if slot is closed
    const isClosed = closedSlots.some((slot) => slot.date === surveyDate);
    if (isClosed) {
      alert('Slot ini telah ditutup untuk kunjungan survei. Silakan pilih tanggal lain.');
      return;
    }

    try {
      const newSurvey = await createSurvey({
        companyName: surveyCompanyName.trim(),
        date: surveyDate,
        timeSlot: surveyTimeSlot,
        picInternal: surveyPicInternal || 'Tim LMAN',
        guestCount: parseInt(surveyGuestCount, 10) || 1,
        status: 'SCHEDULED',
      });

      setSurveys((prev) => [...prev, newSurvey]);
      setSurveyCompanyName('');
      setSurveyDate('');
      setSurveyTimeSlot('10:00');
      setSurveyPicInternal('Tim LMAN');
      setSurveyGuestCount('5');
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

  // Edit modal handlers — Booking
  const handleOpenEditBooking = (b: Booking) => {
    setEditingBooking(b);
    setEditBookingType(b.type);
    setEditBookingStartDate(b.startDate);
    setEditBookingEndDate(b.endDate);
    setEditBookingRoomCodes(b.roomCodes.join(', '));
    setEditBookingNotes(b.notes || '');
  };

  const handleSaveEditBooking = async () => {
    if (!editingBooking) return;
    if (!editBookingStartDate || !editBookingEndDate) {
      alert('Tanggal mulai dan tanggal selesai wajib diisi.');
      return;
    }

    const roomCodes = editBookingRoomCodes.split(',').map((r) => r.trim()).filter(Boolean);
    const data: Partial<Booking> = {
      type: editBookingType,
      startDate: editBookingStartDate,
      endDate: editBookingEndDate,
      roomCodes,
      notes: editBookingNotes,
    };

    try {
      const result = await updateBooking(editingBooking.id, data);
      if (!result.success) {
        alert(`Gagal memperbarui booking: ${result.error || 'Terjadi kesalahan'}`);
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === editingBooking.id ? { ...b, ...data } : b)));
      setEditingBooking(null);
      alert('Booking berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui booking.');
    }
  };

  // Edit modal handlers — Survey
  const handleOpenEditSurvey = (s: Survey) => {
    setEditingSurvey(s);
    setEditSurveyCompanyName(s.companyName);
    setEditSurveyDate(s.date);
    setEditSurveyTimeSlot(s.timeSlot);
    setEditSurveyPicInternal(s.picInternal);
    setEditSurveyGuestCount(String(s.guestCount));
    setEditSurveyStatus(s.status);
  };

  const handleSaveEditSurvey = async () => {
    if (!editingSurvey) return;
    if (!editSurveyCompanyName.trim() || !editSurveyDate) {
      alert('Nama pihak pengaju dan tanggal survei wajib diisi.');
      return;
    }

    const data: Partial<Survey> = {
      companyName: editSurveyCompanyName.trim(),
      date: editSurveyDate,
      timeSlot: editSurveyTimeSlot,
      picInternal: editSurveyPicInternal || 'Tim LMAN',
      guestCount: parseInt(editSurveyGuestCount, 10) || 1,
      status: editSurveyStatus,
    };

    try {
      const success = await updateSurvey(editingSurvey.id, data);
      if (!success) {
        alert('Gagal memperbarui jadwal survei.');
        return;
      }
      setSurveys((prev) => prev.map((s) => (s.id === editingSurvey.id ? { ...s, ...data } : s)));
      setEditingSurvey(null);
      alert('Jadwal survei berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui jadwal survei.');
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

  // Reusable calendar grid + list renderers shared by the Booking Tanggal, Penjadwalan
  // Survei, and Rekap Penjadwalan sub-pages so the calendar and the two lists stay
  // in sync everywhere they appear instead of drifting across copy-pasted blocks.
  const renderCalendarGrid = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sunday) to 6 (Saturday)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysArray: (number | null)[] = [];
    const daysToPad = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // start week on Monday
    for (let i = 0; i < daysToPad; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }

    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
        {/* Calendar Month Selector Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h2 className="text-sm font-bold text-foreground">Grid Kalender Pemakaian</h2>
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
              className="p-1.5 bg-card border border-border rounded hover:bg-muted text-muted-foreground font-bold transition-colors"
            >
              &larr;
            </button>
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider font-mono">
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
              className="p-1.5 bg-card border border-border rounded hover:bg-muted text-muted-foreground font-bold transition-colors"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {weekDays.map((wd) => (
              <div key={wd} className="py-1 bg-muted rounded">{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square bg-muted rounded-lg border border-dashed border-border"></div>;
              }

              const padZero = (n: number) => n.toString().padStart(2, '0');
              const dateStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(day)}`;

              // Find bookings that fall on this day
              const dayBookings = bookings.filter((b) => dateStr >= b.startDate && dateStr <= b.endDate);
              // Find surveys on this day
              const daySurveys = surveys.filter((s) => s.date === dateStr && s.status !== 'CANCELLED');

              let cellBg = 'bg-card border-border hover:border-border';
              let numColor = 'text-muted-foreground';

              if (dayBookings.length > 0) {
                cellBg = 'bg-[#9a1a35]/10 border-[#9a1a35]/60 dark:border-[#600018] text-[#800020] dark:text-[#9a1a35] hover:bg-[#9a1a35]/20';
                numColor = 'text-[#800020] dark:text-[#9a1a35] font-extrabold';
              } else if (daySurveys.length > 0) {
                cellBg = 'bg-[#fef08a] border-yellow-350 text-yellow-950 dark:text-yellow-200 hover:bg-yellow-200';
                numColor = 'text-yellow-750 dark:text-yellow-200 font-extrabold';
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
                          className="text-[7.5px] px-1 py-0.5 rounded border border-[#9a1a35]/40 dark:border-[#600018] bg-card/80 text-[#800020] dark:text-[#9a1a35] leading-none font-bold truncate"
                        >
                          {b.activityName}
                        </div>
                      );
                    })}

                    {daySurveys.map((s) => (
                      <div
                        key={s.id}
                        title={`Survei: ${s.companyName} (Status: ${s.status})`}
                        className="text-[7.5px] px-1 py-0.5 rounded border border-yellow-250 dark:border-yellow-900 bg-card/80 text-yellow-900 dark:text-yellow-200 leading-none font-bold truncate"
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
      </div>
    );
  };

  const renderBookingsList = () => (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm text-foreground">
      <h4 className="text-xs font-bold text-muted-foreground mb-3">Daftar Aktif Booking Tanggal</h4>
      {bookings.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Belum ada booking terdaftar.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-3 bg-muted border border-border rounded-xl flex items-center justify-between gap-4 text-xs text-foreground"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{b.activityName}</span>
                  <span className={`text-[8px] border px-1.5 py-0.5 rounded font-extrabold ${
                    b.type === 'CONFIRMED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-750'
                      : b.type === 'TENTATIVE'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-250 dark:border-amber-900 text-amber-750 dark:text-amber-200'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-750 dark:text-red-300'
                  }`}>
                    {b.type}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ruang: {b.roomCodes.join(', ')} | Periode: {b.startDate} s/d {b.endDate}
                </p>
                {b.notes && <p className="text-[9px] text-muted-foreground italic mt-1">&quot;{b.notes}&quot;</p>}
              </div>

              {role === 'PENGINPUT' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditBooking(b)}
                    className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border text-[10px] font-bold transition-all shadow-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBooking(b.id)}
                    className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 text-[10px] font-bold transition-all shadow-sm"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSurveysList = () => (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm text-foreground">
      <h4 className="text-xs font-bold text-muted-foreground mb-3">Daftar Jadwal Survei Lokasi</h4>
      {surveys.filter(s => s.status !== 'CANCELLED').length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Belum ada survei terjadwal.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {surveys.filter(s => s.status !== 'CANCELLED').map((s) => (
            <div
              key={s.id}
              className="p-3 bg-muted border border-border rounded-xl flex items-center justify-between gap-4 text-xs text-foreground"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{s.companyName}</span>
                  <span className={`text-[8px] border px-1.5 py-0.5 rounded font-extrabold ${
                    s.status === 'SCHEDULED'
                      ? 'bg-[#9a1a35]/10 dark:bg-[#600018]/30 border-[#9a1a35]/40 dark:border-[#600018] text-[#800020] dark:text-[#9a1a35]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-750'
                  }`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Tanggal Kunjungan: {s.date} · Waktu Slot: {s.timeSlot} WIB
                </p>
              </div>

              {role === 'PENGINPUT' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditSurvey(s)}
                    className="px-2.5 py-1 rounded bg-card hover:bg-muted text-foreground border border-border text-[10px] font-bold transition-all shadow-sm"
                  >
                    Edit
                  </button>
                  {s.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => handleUpdateSurvey(s.id, 'COMPLETED')}
                        className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-[10px] font-bold transition-all shadow-sm"
                      >
                        Selesai
                      </button>
                      <button
                        onClick={() => handleUpdateSurvey(s.id, 'CANCELLED')}
                        className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-650 dark:text-red-300 border border-red-200 dark:border-red-900 text-[10px] font-bold transition-all shadow-sm"
                      >
                        Batal
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
    const primaryCodes = primaryRooms.map((r) => r.code);
    if (isAllPrimarySelected) {
      // Deselect all primary rooms
      setSelectedRoomCodes((prev) => prev.filter((code) => !primaryCodes.includes(code)));
    } else {
      // Select all primary rooms, avoiding duplicates
      setSelectedRoomCodes((prev) => Array.from(new Set([...prev, ...primaryCodes])));
      // Deselect Total Lantai 2 package
      setSelectedPackageIds((prevIds) => prevIds.filter((id) => id !== 'L2-Total'));
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredRooms.length === 0) return false;
    return filteredRooms.every((room) => selectedRoomCodes.includes(room.code));
  }, [filteredRooms, selectedRoomCodes]);

  const toggleSelectAllFiltered = () => {
    const filteredCodes = filteredRooms.map((room) => room.code);
    if (isAllFilteredSelected) {
      // Deselect all filtered rooms
      setSelectedRoomCodes((prev) => prev.filter((code) => !filteredCodes.includes(code)));
    } else {
      // Select all filtered rooms, avoiding duplicates
      setSelectedRoomCodes((prev) => Array.from(new Set([...prev, ...filteredCodes])));
      // Deselect Total Lantai packages for any floor represented in the selected rooms
      const floorsToDeselect = Array.from(new Set(filteredRooms.map((r) => r.floor)));
      setSelectedPackageIds((prevIds) =>
        prevIds.filter((id) => {
          if (id.endsWith('-Total')) {
            const f = parseInt(id.charAt(1));
            return !floorsToDeselect.includes(f);
          }
          return true;
        })
      );
    }
  };

  // Quick Packages List
  const quickPackages = useMemo(() => {
    return getQuickPackages(rooms);
  }, [rooms]);

  // Apply Quick Package (decoupled selection, supporting multiple selections with mutual exclusivity for total floor)
  const applyQuickPackage = (pkgId: string) => {
    setSelectedPackageIds((prev) => {
      const exists = prev.includes(pkgId);
      let nextSelected = exists ? prev.filter((id) => id !== pkgId) : [...prev, pkgId];

      if (!exists) {
        const floorPrefix = pkgId.substring(0, 3); // e.g. "L1-", "L2-", "L3-"
        if (pkgId.endsWith('-Total')) {
          // Deselect other individual building packages on this floor
          nextSelected = nextSelected.filter(id => !id.startsWith(floorPrefix) || id === pkgId);
        } else {
          // Deselect the Total package on this floor
          const totalId = `${floorPrefix}Total`;
          nextSelected = nextSelected.filter(id => id !== totalId);
        }
      }
      return nextSelected;
    });

    // If we are selecting a new Total Lantai X package, deselect individual rooms on that floor
    if (!selectedPackageIds.includes(pkgId) && pkgId.endsWith('-Total')) {
      const floor = parseInt(pkgId.charAt(1)); // "L1-Total" -> 1
      setSelectedRoomCodes((prevCodes) =>
        prevCodes.filter((code) => {
          const r = rooms.find((room) => room.code === code);
          return r ? r.floor !== floor : true;
        })
      );
    }
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
    const isSelecting = !selectedRoomCodes.includes(code);
    setSelectedRoomCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );

    if (isSelecting) {
      const room = rooms.find((r) => r.code === code);
      if (room) {
        // Deselect the Total package for this room's floor
        const totalId = `L${room.floor}-Total`;
        setSelectedPackageIds((prevIds) => prevIds.filter((id) => id !== totalId));
      }
    }
  };

  // F10: Documents list with versions
  const documentsList = [
    {
      name: 'Booklet Informasi Gedung A.A. Maramis',
      version: '2026-05',
      desc: 'Informasi lengkap kapasitas, denah, dan foto ruangan.',
      type: 'PDF',
      fileUrl: '/Booklet_Gedung_AA_Maramis_-_Updated_2026.pdf',
      available: true
    },
    {
      name: 'Layout Gedung A, B & C Lengkap',
      version: '2026-04',
      desc: 'Denah arsitektur PDF berskala untuk kebutuhan mitigasi.',
      type: 'PDF',
      fileUrl: '/Layout_Gedung_AA_Maramis.pdf',
      available: true
    },
    {
      name: 'Alur Penyewaan',
      version: '2026-06',
      desc: 'Bagan alur proses pengajuan sewa, survei lokasi, hingga persetujuan pemanfaatan.',
      type: 'PNG',
      fileUrl: '/Alur_Penyewaan_AA_Maramis.png',
      available: true
    },
    {
      name: 'Tata Tertib Pengunjung Gedung',
      version: '2025-11',
      desc: 'Aturan umum untuk seluruh pengunjung dan tamu undangan.',
      type: 'PDF',
      available: false
    },
    {
      name: 'Tata Tertib Mitra Pemanfaatan',
      version: '2026-01',
      desc: 'Ketentuan teknis operasional loading barang, kelistrikan, dan kebersihan bagi penyelenggara.',
      type: 'PDF',
      available: false
    },
    {
      name: 'Template Surat Permohonan Sewa',
      version: '2026-03',
      desc: 'Draft surat resmi pengajuan sewa untuk dikirimkan oleh pemohon.',
      type: 'DOCX',
      available: false
    },
    {
      name: 'Formulir Operasional Acara',
      version: '2026-02',
      desc: 'Form checklist loading barang, izin keramaian, dan checklist kebersihan.',
      type: 'ZIP',
      available: false
    },
  ];

  // Render Spinner
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f6f9] dark:bg-background text-[#800020] dark:text-[#9a1a35] font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800020] mb-4"></div>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Memuat Autentikasi...</p>
      </div>
    );
  }

  // SCREEN 1: LOGIN FORM
  if (!user) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-4 relative overflow-hidden font-sans bg-cover bg-center"
        style={{ backgroundImage: "url('/foto_aa_maramis_2.webp')" }}
      >
        {/* Readability overlay over background photo */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)] pointer-events-none"></div>

        <div
          className="w-full max-w-md border border-border rounded-2xl shadow-xl p-8 z-10"
          style={{ background: 'rgba(30, 30, 30, 0.70)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div className="flex flex-col items-center mb-8">
            <img
              src="/logo_aa_maramis_hitam.png"
              alt="Logo Gedung A.A. Maramis"
              className="block dark:hidden w-[300px] h-auto mb-4"
            />
            <img
              src="/logo_aa_maramis_putih.png"
              alt="Logo Gedung A.A. Maramis"
              className="hidden dark:block w-[300px] h-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-center text-[#800020] dark:text-[#9a1a35] tracking-wide">Gedung A.A. Maramis</h1>
            <p className="text-muted-foreground text-xs mt-1 text-center font-bold tracking-wider">SISTEM KELOLA SEWA INTERNAL — LMAN</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/90 uppercase tracking-wider block">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-card border border-border rounded-lg py-2.5 px-3 text-foreground text-sm focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition-colors"
              />
              <span className="text-[10px] text-muted-foreground block">Satu akun bersama untuk seluruh tim pengelola.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/90 uppercase tracking-wider block">Kata Sandi</label>
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi tim"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-card border border-border rounded-lg py-2.5 px-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020] transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#facc15] hover:bg-[#eab308] active:bg-[#ca8a04] text-foreground font-extrabold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
              Masuk Gerbang Kata Sandi
            </button>
          </form>

          {isMock && (
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground mb-2">Aplikasi berjalan dalam mode demo offline.</p>
              <button
                onClick={useDemoPassword}
                className="text-xs font-bold text-[#800020] dark:text-[#9a1a35] hover:text-[#600018] underline decoration-dotted transition-colors"
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
      <div
        className="flex-1 flex items-center justify-center p-4 relative overflow-hidden font-sans bg-cover bg-center"
        style={{ backgroundImage: "url('/foto_aa_maramis_2.webp')" }}
      >
        {/* Readability overlay over background photo */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)] pointer-events-none"></div>

        <div
          className="w-full max-w-xl border border-border rounded-2xl shadow-xl p-8 z-10"
          style={{ background: 'rgba(30, 30, 30, 0.70)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-xl font-bold text-[#800020] dark:text-[#9a1a35] tracking-wide">Pilih Peran Sesi Anda</h1>
            <p className="text-muted-foreground text-xs mt-1 font-semibold">Gedung A.A. Maramis — LMAN</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {/* PENGINPUT BUTTON */}
            <button
              onClick={() => selectRole('PENGINPUT')}
              className="group text-left p-6 border border-border hover:border-amber-400 hover:shadow-md rounded-xl transition-all duration-300 flex flex-col justify-between"
              style={{ background: 'rgba(30, 30, 30, 0.70)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-650 dark:text-amber-200 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="text-white/90 font-bold group-hover:text-amber-600 dark:text-amber-300 transition-colors">Penginput</h3>
                <p className="text-muted-foreground text-xs mt-2 leading-relaxed font-medium">
                  Akses penuh untuk input data klien, survei, booking, kelola parameter hitungan, membuat LOI/Perjanjian, serta mengunduh dokumen.
                </p>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold tracking-wider uppercase mt-4 block">PILIH PENGINPUT &rarr;</span>
            </button>

            {/* PEREVIEW BUTTON */}
            <button
              onClick={() => selectRole('PEREVIEW')}
              className="group text-left p-6 border border-border hover:border-[#800020] hover:shadow-md rounded-xl transition-all duration-300 flex flex-col justify-between"
              style={{ background: 'rgba(30, 30, 30, 0.70)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            >
              <div>
                <div className="h-10 w-10 rounded-lg bg-[#9a1a35]/10 dark:bg-[#600018]/30 border border-[#9a1a35]/40 dark:border-[#600018] text-[#800020] dark:text-[#9a1a35] flex items-center justify-center mb-4 group-hover:bg-[#9a1a35]/15 transition-colors">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-white/90 font-bold group-hover:text-[#800020] dark:text-[#9a1a35] transition-colors">Pereview</h3>
                <p className="text-muted-foreground text-xs mt-2 leading-relaxed font-medium">
                  Akses pantau dan monitoring saja. Melihat progres tahap pemesanan, melihat katalog ruangan, dan menggunakan kalkulator penawaran.
                </p>
              </div>
              <span className="text-[10px] text-[#800020] dark:text-[#9a1a35] font-bold tracking-wider uppercase mt-4 block">PILIH PEREVIEW &rarr;</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-border mt-4">
            <span className="text-[11px] text-muted-foreground font-medium">
              Sesi aktif: <span className="font-semibold text-white/90">{toUsernameDisplay(user.email)}</span>
            </span>
            <button
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-red-650 dark:text-red-300 transition-colors flex items-center gap-1.5 font-bold"
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
    <div className="flex-1 flex flex-col bg-background text-foreground font-sans min-h-screen">
      {/* HEADER BANNER - Maroon Kemenkeu style */}
      <header className="border-b border-[#600018] dark:border-[#600018] bg-[#800020] dark:bg-[#600018] text-white sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo-lman-remove-bg.png"
              alt="Logo LMAN"
              className="h-8 w-auto"
            />
            <span className="text-base font-extrabold tracking-tight text-white select-none">
              Gedung A.A. Maramis
            </span>
          </div>
        </div>

        {/* User Session Info / Controls */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1 text-white/90 font-semibold font-mono text-sm">
            <Clock className="h-4 w-4 text-white/80" />
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY CONTAINER (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR NAVIGATION - Satu Kemenkeu style */}
        <aside className={`bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between shrink-0 h-full transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72'}`}>
          <div className="flex flex-col overflow-y-auto">
            {/* User Profile Header Blue Card */}
            <div className="p-4 bg-[#800020] dark:bg-[#600018] text-white relative flex items-center justify-between gap-3 shadow-md select-none">
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-xs tracking-wide truncate">
                  {role === 'PENGINPUT' ? 'TIM PENGINPUT LMAN' : 'TIM PEREVIEW LMAN'}
                </div>
                <div className="text-[10px] text-white/80 font-mono mt-0.5 tracking-wider truncate">
                  {toUsernameDisplay(user?.email) || 'maramis'}
                </div>
                <div className="text-[9px] text-white/80 mt-1.5 leading-relaxed">
                  Divisi Pengembangan dan Pendayagunaan Properti 1, Lembaga Manajemen Aset Negara
                </div>
              </div>
            </div>

            {/* Nav list */}
            <div className="py-4 flex flex-col gap-1">
              <div className="text-[9px] font-bold text-muted-foreground tracking-wider px-4 py-2 uppercase mt-2 select-none">
                MENU UTAMA SEWA
              </div>
              
              <button
                onClick={() => setActiveTab('catalog')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                  activeTab === 'catalog'
                    ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Layers className={`h-4 w-4 shrink-0 ${activeTab === 'catalog' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                <span>Katalog Ruangan</span>
              </button>

              <button
                onClick={() => setActiveTab('calculator')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'calculator'
                    ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`h-4 w-4 shrink-0 ${activeTab === 'calculator' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                  <span>Kalkulator Sewa</span>
                </div>
                {selectedRoomCodes.length > 0 && (
                  <span className="bg-[#800020] text-white rounded-full h-4.5 w-4.5 flex items-center justify-center text-[9px] font-extrabold">
                    {selectedRoomCodes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'clients'
                    ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`h-4 w-4 shrink-0 ${activeTab === 'clients' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                  <span>Basis Data Klien</span>
                </div>
                {activeClients.length > 0 && (
                  <span className="bg-muted text-muted-foreground rounded px-1 text-[9px] font-extrabold">
                    {activeClients.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('submissions')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  activeTab === 'submissions'
                    ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`h-4 w-4 shrink-0 ${activeTab === 'submissions' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                  <span>Pengajuan Sewa</span>
                </div>
                {submissions.length > 0 && (
                  <span className="bg-muted text-muted-foreground rounded px-1 text-[9px] font-extrabold">
                    {submissions.length}
                  </span>
                )}
              </button>

              {/* Kalender Kegiatan collapsible menu */}
              <div className="mx-2.5 my-0.5">
                <button
                  onClick={() => setIsCalendarMenuOpen(!isCalendarMenuOpen)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                    activeTab === 'calendar_booking' || activeTab === 'calendar_survey' || activeTab === 'calendar_recap'
                      ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`h-4 w-4 shrink-0 ${activeTab === 'calendar_booking' || activeTab === 'calendar_survey' || activeTab === 'calendar_recap' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                    <span>Kalender Kegiatan</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCalendarMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {(isCalendarMenuOpen || activeTab === 'calendar_booking' || activeTab === 'calendar_survey' || activeTab === 'calendar_recap') && (
                  <div className="pl-4 pr-1 mt-1 space-y-1 border-l-2 border-[#800020]/20 ml-6 flex flex-col">
                    <button
                      onClick={() => setActiveTab('calendar_booking')}
                      className={`w-full text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'calendar_booking'
                          ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'calendar_booking' ? 'bg-[#800020]' : 'bg-muted'}`} />
                      Booking Tanggal
                    </button>
                    <button
                      onClick={() => setActiveTab('calendar_survey')}
                      className={`w-full text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'calendar_survey'
                          ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'calendar_survey' ? 'bg-[#800020]' : 'bg-muted'}`} />
                      Penjadwalan Survei
                    </button>
                    <button
                      onClick={() => setActiveTab('calendar_recap')}
                      className={`w-full text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'calendar_recap'
                          ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'calendar_recap' ? 'bg-[#800020]' : 'bg-muted'}`} />
                      Rekap Penjadwalan
                    </button>
                  </div>
                )}
              </div>

              {/* Pembuatan Dokumen collapsible menu */}
              <div className="mx-2.5 my-0.5">
                <button
                  onClick={() => setIsDocMenuOpen(!isDocMenuOpen)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                    activeTab === 'doc_loi' || activeTab === 'doc_prj'
                      ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`h-4 w-4 shrink-0 ${activeTab === 'doc_loi' || activeTab === 'doc_prj' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                    <span>Pembuatan Dokumen</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDocMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {(isDocMenuOpen || activeTab === 'doc_loi' || activeTab === 'doc_prj') && (
                  <div className="pl-4 pr-1 mt-1 space-y-1 border-l-2 border-[#800020]/20 ml-6 flex flex-col">
                    <button
                      onClick={() => setActiveTab('doc_loi')}
                      className={`w-full text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'doc_loi'
                          ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'doc_loi' ? 'bg-[#800020]' : 'bg-muted'}`} />
                      LOI (Letter of Intent)
                    </button>
                    <button
                      onClick={() => setActiveTab('doc_prj')}
                      className={`w-full text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'doc_prj'
                          ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${activeTab === 'doc_prj' ? 'bg-[#800020]' : 'bg-muted'}`} />
                      PRJ (Perjanjian)
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2.5 px-4 mx-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                  activeTab === 'documents'
                    ? 'bg-[#9a1a35]/10 dark:bg-muted text-[#800020] dark:text-[#9a1a35]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 ${activeTab === 'documents' ? 'text-[#800020] dark:text-[#9a1a35]' : 'text-muted-foreground'}`} />
                <span>Pusat Dokumen</span>
              </button>
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border flex flex-col gap-3 select-none">
            <button
              onClick={logout}
              className="w-full py-1.5 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar Sesi
            </button>
          </div>
        </aside>

        {/* Collapsible toggle button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-6 h-7 w-7 rounded-full bg-card border border-border text-[#800020] dark:text-[#9a1a35] flex items-center justify-center shadow-md hover:bg-muted transition-all duration-300 z-50"
          style={{ left: isSidebarCollapsed ? '12px' : '274px' }}
          title={isSidebarCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* MAIN PANEL CONTENT - White scrollable area */}
        <main className="flex-1 bg-[#f8fafc] dark:bg-background overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground tracking-tight select-none">
              {activeTab === 'catalog' && 'Katalog Ruangan & Gedung'}
              {activeTab === 'calculator' && 'Sasaran Perhitungan Tarif Penawaran'}
              {activeTab === 'clients' && 'Basis Data Kelola Klien'}
              {activeTab === 'submissions' && 'Daftar Pengajuan & Papan Pemantauan'}
              {activeTab === 'calendar_booking' && 'Kalender — Booking Tanggal'}
              {activeTab === 'calendar_survey' && 'Kalender — Penjadwalan Survei'}
              {activeTab === 'calendar_recap' && 'Kalender — Rekap Penjadwalan'}
              {activeTab === 'documents' && 'Dokumen Operasional Sewa'}
            </h2>
            
            {role === 'PENGINPUT' && (
              <div className="text-[10px] text-[#800020] dark:text-[#9a1a35] font-bold bg-[#9a1a35]/10 border border-[#9a1a35]/30 rounded-full px-3 py-1 tracking-wider uppercase">
                Mode Pengeditan Aktif
              </div>
            )}
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 flex flex-col gap-6">

          {/* TAB 1: KATALOG RUANGAN */}
          {activeTab === 'catalog' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* LEFT COLUMN: PRIMARY ROOMS WIDGET */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-4 h-fit">
                  <div>
                    <h2 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#f59e0b] animate-pulse" /> Aula Utama C Lt. 2
                    </h2>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                      Enam aula acara bernama di Gedung C lantai 2 (Mataram, Sriwijaya, Bone, Ternate, Majapahit, Kutai). Bila digabung, total luasnya <strong>1.180 m²</strong> (satu lantai penuh).
                    </p>
                    
                    <button
                      onClick={toggleSelectAllPrimary}
                      className={`w-full py-2 mb-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isAllPrimarySelected
                          ? 'bg-[#800020] text-white shadow-md'
                          : 'bg-muted hover:bg-muted text-foreground border border-border'
                      }`}
                    >
                      {isAllPrimarySelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {isAllPrimarySelected ? 'Batalkan Semua' : 'Pilih Semua (1.180 m²)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {primaryRooms.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground col-span-full py-2">Memuat data...</p>
                    ) : (
                      primaryRooms.map((room) => {
                        const isSelected = selectedRoomCodes.includes(room.code);
                        return (
                          <div
                            key={room.code}
                            onClick={() => toggleRoomSelection(room.code)}
                            className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#9a1a35]/10 dark:bg-[#600018]/30 border-[#800020]/60 shadow-sm'
                                : 'bg-card hover:bg-muted border-border'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] text-[#800020] dark:text-[#9a1a35] font-extrabold">{room.code}</span>
                              <div className={`h-2.5 w-2.5 rounded-sm border flex items-center justify-center ${
                                isSelected ? 'bg-[#800020] border-[#800020] text-white' : 'border-border bg-card'
                              }`}>
                                {isSelected && <Check className="h-1.5 w-1.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="font-bold text-[10px] text-foreground truncate">{room.name}</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">{room.areaSqm} m²</div>
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
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" /> Paket Ruang Cepat (Saleable Area Total)
                      </h2>
                      <p className="text-[11px] text-muted-foreground mt-1">Pilih cepat berdasarkan luas gedung & lantai dari data Excel (Pilihan ini terpisah dari list di bawah)</p>
                    </div>
                    {selectedPackageIds.length > 0 && (
                      <button
                        onClick={() => setSelectedPackageIds([])}
                        className="text-xs font-bold text-red-500 dark:text-red-300 hover:text-red-600 dark:text-red-300 transition-colors"
                      >
                        Batal Pilih Paket ({selectedPackageIds.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Lantai 1 */}
                    <div className="p-3 bg-muted border border-border rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#800020] dark:text-[#9a1a35] mb-1 border-b border-border pb-1 uppercase tracking-wider">Lantai 1 (Total: 3.220 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 1).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#9a1a35]/10 border-[#800020] text-[#800020] dark:text-[#9a1a35] font-bold shadow-sm'
                                  : 'bg-card hover:bg-muted border-border text-foreground'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-muted-foreground mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 2 */}
                    <div className="p-3 bg-muted border border-border rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#800020] dark:text-[#9a1a35] mb-1 border-b border-border pb-1 uppercase tracking-wider">Lantai 2 (Total: 2.624 m²)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {EXCEL_PACKAGES.filter(p => p.floor === 2).map(pkg => {
                          const isSelected = selectedPackageIds.includes(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() => applyQuickPackage(pkg.id)}
                              className={`p-2 rounded text-left transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#9a1a35]/10 border-[#800020] text-[#800020] dark:text-[#9a1a35] font-bold shadow-sm'
                                  : 'bg-card hover:bg-muted border-border text-foreground'
                              }`}
                            >
                              <span className="text-[10px] truncate">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-muted-foreground mt-0.5">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lantai 3 */}
                    <div className="p-3 bg-muted border border-border rounded-xl flex flex-col gap-2">
                      <h3 className="text-[10px] font-extrabold text-[#800020] dark:text-[#9a1a35] mb-1 border-b border-border pb-1 uppercase tracking-wider">Lantai 3 (Total: 3.342 m²)</h3>
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
                                    ? 'bg-[#9a1a35]/10 border-[#800020] text-[#800020] dark:text-[#9a1a35] font-bold shadow-sm'
                                    : 'bg-card hover:bg-muted border-border text-foreground'
                                }`}
                              >
                                <span className="text-[10px] truncate">{pkg.label}</span>
                                <span className="font-mono text-[9px] text-muted-foreground mt-0.5">{pkg.areaSqm} m²</span>
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
                                  ? 'bg-[#9a1a35]/10 border-[#800020] text-[#800020] dark:text-[#9a1a35] font-bold shadow-sm'
                                  : 'bg-card hover:bg-muted border-border text-foreground'
                              }`}
                            >
                              <span className="text-[10px]">{pkg.label}</span>
                              <span className="font-mono text-[9px] text-muted-foreground">{pkg.areaSqm} m²</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTER BAR - Clean Full-width Search + 4 Inline Controls below */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
                  {/* Top Row: Full-width Search Bar */}
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Cari kode atau nama ruang..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg py-2.5 pl-9 pr-4 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-[#800020] transition-colors focus:bg-card"
                    />
                  </div>

                  {/* Bottom Row: 4 Controls (Grid layout that stacks on mobile, columns on desktop) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Control 1: Urutkan */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Urutkan</label>
                      <div className="flex gap-1.5">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        >
                          <option value="capacity">Kapasitas</option>
                          <option value="rate">Tarif Booklet</option>
                          <option value="area">Luas Ruang</option>
                        </select>
                        <button
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="px-2.5 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg text-xs transition-colors font-bold"
                          title={sortOrder === 'asc' ? 'Urutkan Naik' : 'Urutkan Turun'}
                        >
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Control 2: Gedung */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Gedung</label>
                      <select
                        value={filterBuilding}
                        onChange={(e) => setFilterBuilding(e.target.value)}
                        className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#800020] w-full"
                      >
                        <option value="all">Semua Gedung</option>
                        <option value="A">Gedung A</option>
                        <option value="C">Gedung C</option>
                      </select>
                    </div>

                    {/* Control 3: Lantai */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Lantai</label>
                      <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#800020] w-full"
                      >
                        <option value="all">Semua Lantai</option>
                        <option value="1">Lantai 1</option>
                        <option value="2">Lantai 2</option>
                        <option value="3">Lantai 3</option>
                      </select>
                    </div>

                    {/* Control 4: Kapasitas */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Kapasitas minimal</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-muted-foreground text-xs font-semibold">&ge;</span>
                        <input
                          type="number"
                          min="0"
                          value={filterMinCapacity}
                          onChange={(e) => setFilterMinCapacity(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 pl-6 pr-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPACT ROOMS LIST (TABLE) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-2">
                        <Building className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" /> Daftar Ruangan Individual (Opsional)
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1">Pilih ruangan secara manual di bawah jika penyewa ingin menyewa ruangan tertentu, bukan satu gedung penuh.</p>
                    </div>
                    {selectedRoomCodes.length > 0 && (
                      <button
                        onClick={() => setSelectedRoomCodes([])}
                        className="text-xs font-bold text-red-500 dark:text-red-300 hover:text-red-600 dark:text-red-300 transition-colors flex items-center gap-1 bg-card border border-red-200 dark:border-red-900 hover:bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-lg"
                      >
                        Batal Pilih Semua Ruang ({selectedRoomCodes.length})
                      </button>
                    )}
                  </div>
                  
                  {dbLoading ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800020] mx-auto mb-3"></div>
                      Memuat katalog ruangan...
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                      Tidak ada ruangan yang cocok dengan filter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-muted border-b border-border text-foreground font-extrabold select-none">
                            <th className="p-3.5 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={toggleSelectAllFiltered}
                                className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                  isAllFilteredSelected
                                    ? 'bg-[#800020] border-[#800020] text-white'
                                    : 'border-border bg-card text-transparent hover:border-foreground'
                                  }`}
                                title={isAllFilteredSelected ? "Deselect All" : "Select All"}
                              >
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </button>
                            </th>
                            <th className="p-3.5 text-center">Kode Ruang</th>
                            <th className="p-3.5 text-center">Nama Ruang</th>
                            <th className="p-3.5 text-center">Gedung</th>
                            <th className="p-3.5 text-center">Lantai</th>
                            <th className="p-3.5 text-center">Luas (m²)</th>
                            <th className="p-3.5 text-center">Kapasitas</th>
                            <th className="p-3.5 text-center">Tarif Booklet (Acuan)</th>
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
                                className={`hover:bg-muted cursor-pointer transition-colors ${
                                  isSelected ? 'bg-[#9a1a35]/10 dark:bg-[#600018]/30' : 'bg-card'
                                }`}
                              >
                                <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => toggleRoomSelection(room.code)}
                                    className={`mx-auto h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-[#800020] border-[#800020] text-white'
                                        : 'border-border bg-card text-transparent hover:border-foreground'
                                    }`}
                                  >
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </button>
                                </td>
                                <td className="p-3.5 text-center font-extrabold text-foreground tracking-wide">{room.code}</td>
                                <td className="p-3.5 text-center text-muted-foreground font-semibold">{room.name || '—'}</td>
                                <td className="p-3.5 text-center text-muted-foreground">{room.building}</td>
                                <td className="p-3.5 text-center text-muted-foreground">{room.floor}</td>
                                <td className="p-3.5 text-center text-muted-foreground font-semibold font-mono">{room.areaSqm}</td>
                                <td className="p-3.5 text-center text-muted-foreground font-semibold font-mono">{room.capacity} pax</td>
                                <td className="p-3.5 text-center font-extrabold text-[#f59e0b] font-mono">
                                  {formatRupiah(room.dailyRate)}
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex justify-center gap-1.5">
                                    {room.needsVerification && (
                                      <span className="text-[9px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
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
            )}

          {/* TAB 2: KALKULATOR PENAWARAN */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* SELECTED ROOMS SUMMARY */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">1. Ruangan Terpilih</h2>
                      <p className="text-xs text-muted-foreground mt-1">Estimasi dihitung dari luas meter persegi ruangan terpilih</p>
                    </div>
                    {(selectedRoomCodes.length > 0 || selectedPackageIds.length > 0) && (
                      <button
                        onClick={() => {
                          setSelectedRoomCodes([]);
                          setSelectedPackageIds([]);
                        }}
                        className="text-xs text-red-500 dark:text-red-300 hover:text-red-600 dark:text-red-300 transition-colors font-medium"
                      >
                        Hapus Semua Pilihan
                      </button>
                    )}
                  </div>

                  {selectedRooms.length === 0 && activePackages.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-border rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Belum ada ruangan atau paket terpilih.</p>
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className="mt-2 text-xs font-bold text-[#800020] dark:text-[#9a1a35] hover:underline"
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
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#9a1a35]/10 border border-[#9a1a35]/30 text-[#800020] dark:text-[#9a1a35] px-3 py-1 rounded-lg"
                              >
                                <Layers className="h-3 w-3" />
                                {pkg.label} (Lt. {pkg.floor}) — {pkg.areaSqm} m²
                                <button
                                  onClick={() => applyQuickPackage(pkg.id)}
                                  className="text-red-500 dark:text-red-300 hover:text-red-600 dark:text-red-300 font-bold ml-1.5"
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
                          <span className="text-[10px] text-muted-foreground font-bold block mb-2 uppercase tracking-wider">Ruangan Individual</span>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-muted border border-border rounded-lg">
                            {selectedRooms.map((room) => (
                              <span
                                key={room.code}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-card border border-border text-foreground pl-2 pr-1 py-0.5 rounded-full shadow-sm"
                              >
                                {room.code} {room.name ? `(${room.name})` : ''}
                                <button
                                  onClick={() => toggleRoomSelection(room.code)}
                                  className="text-muted-foreground hover:text-red-500 dark:text-red-300 ml-1 hover:bg-muted rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border text-center">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Jumlah Ruang</span>
                          <span className="text-base font-bold text-foreground">
                            {activePackages.length > 0 ? `${activePackageRoomsCount} unit` : `${selectedRooms.length} unit`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Akumulasi Luas</span>
                          <span className="text-base font-bold text-[#800020] dark:text-[#9a1a35]">{totalSelectedArea} m²</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Akumulasi Kapasitas</span>
                          <span className="text-base font-bold text-foreground">
                            {activePackages.length > 0 ? 'Sesuai Layanan Paket' : `${totalSelectedCapacity} orang`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PMK 144 ADJUSTMENT PARAMETERS */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h2 className="text-base font-bold text-foreground mb-4">2. Parameter Penyesuai & Hari Sewa</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Days Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Hari Acara</label>
                        <input
                          type="number"
                          min="1"
                          value={eventDays}
                          onChange={(e) => setEventDays(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-foreground text-sm focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Hari Loading (Persiapan & Bongkar)</label>
                        <input
                          type="number"
                          min="0"
                          value={loadingDays}
                          onChange={(e) => setLoadingDays(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-foreground text-sm focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>

                    {/* PMK 144 Purpose & Custom factors */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tujuan Sewa Guna (Rentang PMK 144)</label>
                        <select
                          value={selectedPurposeKey}
                          onChange={(e) => setSelectedPurposeKey(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-foreground text-sm focus:outline-none focus:border-[#800020]"
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
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Faktor Tujuan (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customPurposeFactor}
                            onChange={(e) => setCustomPurposeFactor(e.target.value)}
                            className={`w-full bg-card border rounded-lg py-1.5 px-2.5 text-foreground text-xs focus:outline-none ${
                              isPurposeFactorDeviating ? 'border-yellow-500 focus:border-yellow-500' : 'border-border focus:border-[#800020]'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Tingkat Pengembalian (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={customReturnRate}
                            onChange={(e) => setCustomReturnRate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-foreground text-xs focus:outline-none focus:border-[#800020]"
                            placeholder="Markup 15% = 115%"
                          />
                        </div>
                      </div>

                      {/* Warnings and alerts */}
                      {isPurposeFactorDeviating && (
                        <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-lg text-[10px] flex items-start gap-1.5">
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
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center text-xs text-muted-foreground shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-[#800020] dark:text-[#9a1a35] shrink-0" />
                    <span>Konstanta System (Settings): Nilai Wajar = {formatRupiah(systemSettings.fairValuePerSqm)}/m² · Faktor Loading = {systemSettings.loadingFactor * 100}% · PPN = {systemSettings.ppnRate * 100}%</span>
                  </div>
                  {role === 'PENGINPUT' && (
                    <span className="text-[10px] text-muted-foreground shrink-0 italic">
                      Dapat diubah di bagian kelola parameter (Fase 2)
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT: RESULTS BOARD */}
              <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-fit gap-6 shadow-sm sticky top-24 text-foreground">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-bold text-foreground">Hasil Kalkulasi</h2>
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-muted border border-border rounded p-0.5 text-[10px]">
                      <button
                        onClick={() => setCalcMode('auto')}
                        className={`px-2 py-1 rounded font-bold transition-all ${
                          calcMode === 'auto'
                            ? 'bg-[#800020] text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Otomatis
                      </button>
                      <button
                        onClick={() => setCalcMode('manual')}
                        className={`px-2 py-1 rounded font-bold transition-all ${
                          calcMode === 'manual'
                            ? 'bg-[#800020] text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {calcMode === 'manual' ? (
                    <div className="space-y-3 my-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Sewa Acara (Rp)</label>
                        <input
                          type="number"
                          placeholder="Masukkan nilai sewa"
                          value={manualSewa}
                          onChange={(e) => setManualSewa(e.target.value)}
                          className="w-full bg-card border border-border rounded py-1 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">PPN Sewa (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Sewa"
                          value={manualPPNSewa}
                          onChange={(e) => setManualPPNSewa(e.target.value)}
                          className="w-full bg-card border border-border rounded py-1 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Sewa Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="Nilai loading"
                          value={manualLoading}
                          onChange={(e) => setManualLoading(e.target.value)}
                          className="w-full bg-card border border-border rounded py-1 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">PPN Loading (Rp)</label>
                        <input
                          type="number"
                          placeholder="PPN Loading"
                          value={manualPPNLoading}
                          onChange={(e) => setManualPPNLoading(e.target.value)}
                          className="w-full bg-card border border-border rounded py-1 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 my-6">
                      <div className="flex justify-between text-xs pb-2 border-b border-border">
                        <span className="text-muted-foreground">Sewa Acara ({eventDays} hari)</span>
                        <span className="font-bold text-foreground">{formatRupiah(calculatorResults.sewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-border">
                        <span className="text-muted-foreground">PPN Sewa ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-bold text-foreground">{formatRupiah(calculatorResults.ppnSewa)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-border">
                        <span className="text-muted-foreground">Loading ({loadingDays} hari)</span>
                        <span className="font-bold text-foreground">{formatRupiah(calculatorResults.loading)}</span>
                      </div>
                      <div className="flex justify-between text-xs pb-2 border-b border-border">
                        <span className="text-muted-foreground">PPN Loading ({(systemSettings.ppnRate * 100)}%)</span>
                        <span className="font-bold text-foreground">{formatRupiah(calculatorResults.ppnLoading)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-baseline mb-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">TOTAL ESTIMASI</span>
                    <span className="text-xl font-black text-[#f59e0b] tracking-tight">
                      {formatRupiah(calculatorResults.total)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCopyResults}
                      className="w-full bg-[#800020] hover:bg-[#600018] text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Copy className="h-4 w-4" />
                      {copySuccess ? 'Berhasil Disalin!' : 'Salin Rincian Tarif'}
                    </button>
                    <span className="text-[9px] text-muted-foreground text-center block leading-normal pt-1">
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
              {/* LEFT: Client Form (Penginput Only) & LMAN Officials Settings */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Client Form Card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                    {editingClientId ? (
                      <>
                        <Settings className="h-4 w-4 text-yellow-500" />
                        <span>Edit Klien</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" />
                        <span>Tambah Klien Baru</span>
                      </>
                    )}
                  </h2>
                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-muted-foreground italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={editingClientId ? handleUpdateClient : handleCreateClient} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Instansi / Badan Usaha</label>
                        <input
                          type="text"
                          required
                          value={clientCompanyName}
                          onChange={(e) => setClientCompanyName(e.target.value)}
                          placeholder="e.g., PT. Media Nusantara"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama PIC Kontak</label>
                        <input
                          type="text"
                          required
                          value={clientPicName}
                          onChange={(e) => setClientPicName(e.target.value)}
                          placeholder="e.g., Budi Santoso"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Telepon PIC</label>
                        <input
                          type="text"
                          required
                          value={clientPicPhone}
                          onChange={(e) => setClientPicPhone(e.target.value)}
                          placeholder="e.g., 08123456789"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Sebutan/Jabatan PIC Klien (e.g. Producer Summerland)</label>
                        <input
                          type="text"
                          required
                          value={clientPicTitle}
                          onChange={(e) => setClientPicTitle(e.target.value)}
                          placeholder="e.g., Producer Summerland"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div className="p-2.5 bg-[#9a1a35]/10 dark:bg-[#600018]/30 border border-[#9a1a35]/40 dark:border-[#600018] text-[#800020] dark:text-[#9a1a35] rounded-lg text-[9px] leading-relaxed">
                        ⚠️ <strong>Perlindungan Data Klien (A3)</strong>: Dilarang keras menginput identitas pribadi sensitif seperti NIK, data KTP, paspor, tanggal lahir, atau alamat pribadi.
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          type="submit"
                          className={`w-full font-bold py-2 rounded-lg text-xs transition-colors shadow-sm ${
                            editingClientId 
                              ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                              : 'bg-[#800020] hover:bg-[#600018] text-white'
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
                              setClientPicTitle('');
                            }}
                            className="w-full bg-muted hover:bg-muted text-foreground font-bold py-2 rounded-lg text-xs transition-colors"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* LMAN Officials settings card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                    <Award className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" />
                    <span>Daftar Pejabat LMAN</span>
                  </h2>
                  
                  {activeOfficial ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-[9px] text-emerald-800 uppercase tracking-wider">Pejabat Aktif</span>
                        <span className="bg-emerald-200 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded">Aktif</span>
                      </div>
                      <div className="font-bold mt-1 text-foreground">{activeOfficial.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{activeOfficial.title}</div>
                      <div className="text-[9px] text-muted-foreground mt-1.5">SK: {activeOfficial.ordinanceNumber} ({formatTanggalIndo(activeOfficial.ordinanceDate)})</div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 rounded-xl text-xs italic">
                      Belum ada pejabat LMAN yang ditandai aktif. LOI akan menggunakan nama default.
                    </div>
                  )}

                  <div className="space-y-2 mt-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pilih Pejabat Penandatangan</h3>
                    {officials.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">Belum ada daftar pejabat.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {officials.map((o) => (
                          <div key={o.id} className="p-2.5 bg-muted border border-border rounded-lg flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-foreground truncate">{o.name}</div>
                              <div className="text-[9px] text-muted-foreground truncate">{o.title}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {o.isActive ? (
                                <span className="text-[8px] text-emerald-600 font-extrabold bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">Aktif</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleActiveOfficial(o.id, o.name)}
                                  className="px-2 py-0.5 text-[8px] font-bold bg-card border border-border hover:bg-muted text-foreground rounded transition-all shadow-sm"
                                >
                                  Aktifkan
                                </button>
                              )}
                              
                              {role === 'PENGINPUT' && (
                                <button
                                  onClick={() => {
                                    setEditingOfficialId(o.id);
                                    setOfficialName(o.name);
                                    setOfficialTitle(o.title);
                                    setOfficialOrdinanceNumber(o.ordinanceNumber);
                                    setOfficialOrdinanceDate(o.ordinanceDate);
                                  }}
                                  className="p-0.5 text-muted-foreground hover:text-muted-foreground transition-colors"
                                  title="Edit Data Pejabat"
                                >
                                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {role === 'PENGINPUT' && (
                    <form onSubmit={editingOfficialId ? handleUpdateOfficial : handleCreateOfficial} className="space-y-3 pt-3 border-t border-border">
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {editingOfficialId ? 'Edit Pejabat LMAN' : 'Tambah Pejabat LMAN'}
                      </h3>
                      <div>
                        <label className="text-[9px] font-semibold text-muted-foreground block mb-1">Nama Pejabat</label>
                        <input
                          type="text"
                          required
                          value={officialName}
                          onChange={(e) => setOfficialName(e.target.value)}
                          placeholder="e.g. Mahdi"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-muted-foreground block mb-1">Jabatan Resmi</label>
                        <input
                          type="text"
                          required
                          value={officialTitle}
                          onChange={(e) => setOfficialTitle(e.target.value)}
                          placeholder="e.g. Pelaksana Tugas Direktur Pengembangan..."
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-semibold text-muted-foreground block mb-1">Nomor SK / Ordinance</label>
                          <input
                            type="text"
                            required
                            value={officialOrdinanceNumber}
                            onChange={(e) => setOfficialOrdinanceNumber(e.target.value)}
                            placeholder="e.g. PRIN-10/LMAN/2024"
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-muted-foreground block mb-1">Tanggal SK</label>
                          <input
                            type="date"
                            required
                            value={officialOrdinanceDate}
                            onChange={(e) => setOfficialOrdinanceDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className={`flex-1 font-bold py-1.5 rounded-lg text-[10px] transition-colors shadow-sm ${
                            editingOfficialId 
                              ? 'bg-yellow-400 hover:bg-yellow-500 text-black' 
                              : 'bg-[#800020] hover:bg-[#600018] text-white'
                          }`}
                        >
                          {editingOfficialId ? 'Simpan Pejabat' : 'Tambah Pejabat'}
                        </button>
                        {editingOfficialId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOfficialId(null);
                              setOfficialName('');
                              setOfficialTitle('');
                              setOfficialOrdinanceNumber('');
                              setOfficialOrdinanceDate('');
                            }}
                            className="bg-muted hover:bg-muted text-foreground font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT: Client List & Submission History */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground">Daftar Instansi Klien</h2>
                  {activeClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-8 text-center">Belum ada data klien terdaftar.</p>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-muted">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-muted text-muted-foreground font-bold border-b border-border">
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
                              className={`hover:bg-muted transition-colors ${
                                selectedClientId === c.id ? 'bg-[#9a1a35]/10 dark:bg-[#600018]/30' : 'bg-card'
                              }`}
                            >
                              <td className="p-3 font-bold text-foreground">{c.companyName}</td>
                              <td className="p-3 text-muted-foreground">{c.picName}</td>
                              <td className="p-3 text-muted-foreground">
                                <div>{c.picPhone}</div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedClientId(c.id === selectedClientId ? null : c.id)}
                                    className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border text-foreground font-bold transition-all text-[10px]"
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
                                          setClientPicTitle(c.picTitle || '');
                                        }}
                                        className="px-2.5 py-1 rounded bg-yellow-400 hover:bg-yellow-500 text-black font-bold transition-all text-[10px]"
                                      >
                                        Edit
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDeleteClient(c)}
                                        className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 font-bold transition-all text-[10px]"
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
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-fadeIn text-foreground">
                      <h3 className="text-xs font-bold text-[#800020] dark:text-[#9a1a35] mb-3">
                        Riwayat Pengajuan Sewa: {client?.companyName}
                      </h3>
                      {clientSubs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4">Belum ada pengajuan sewa tercatat untuk instansi ini.</p>
                      ) : (
                        <div className="space-y-3">
                          {clientSubs.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-3.5 bg-muted border border-border rounded-xl flex items-center justify-between gap-4"
                            >
                              <div>
                                <h4 className="text-xs font-bold text-foreground">{sub.activityName}</h4>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Ruang: {sub.roomCodes.join(', ')} · Durasi: {sub.eventDays} hari (Loading: {sub.loadingDays} hari)
                                </p>
                                <div className="text-[9px] text-muted-foreground mt-0.5">
                                  Dibuat pada: {new Date(sub.createdAt).toLocaleDateString('id-ID')}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1.5">
                                <div className="text-xs font-mono font-bold text-[#800020] dark:text-[#9a1a35]">
                                  {formatRupiah(sub.estimatedCost)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block text-[9px] bg-[#9a1a35]/10 text-[#800020] dark:text-[#9a1a35] border border-[#9a1a35]/30 px-2 py-0.5 rounded font-bold">
                                    Tahap {sub.stage}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setActiveLoiSubmission(sub);
                                      setActiveTab('doc_loi');
                                    }}
                                    className="px-2 py-0.5 bg-[#800020] hover:bg-[#600018] text-white text-[9px] font-bold rounded transition-colors shadow-sm"
                                  >
                                    Buat LOI
                                  </button>
                                </div>
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
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                      <FileText className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" />
                      Catat Pengajuan Sewa Baru
                    </h2>
                    
                    {selectedRoomCodes.length === 0 && selectedPackageIds.length === 0 ? (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-yellow-200 dark:border-yellow-900 text-yellow-750 dark:text-yellow-200 rounded-lg text-xs flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Perhatian:</strong> Silakan pilih ruangan/paket dan set waktu di tab <strong>Kalkulator</strong> terlebih dahulu untuk menautkan tarif estimasi.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted border border-border rounded-lg text-[11px] space-y-2 text-foreground">
                        <div className="font-bold text-muted-foreground">Data Kalkulator Tertaut:</div>
                        <div>Ruangan: <span className="font-semibold text-foreground">{activePackages.length > 0 ? activePackages.map(p=>p.label).join(', ') : selectedRoomCodes.join(', ')}</span></div>
                        <div>Total Luas: <span className="font-semibold text-foreground">{totalSelectedArea} m²</span></div>
                        <div>Estimasi Tarif: <span className="font-semibold text-[#800020] dark:text-[#9a1a35]">{formatRupiah(calculatorResults.total)}</span></div>
                      </div>
                    )}

                    <form onSubmit={handleCreateSubmission} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Pilih Klien Instansi</label>
                        <select
                          required
                          value={subClientId}
                          onChange={(e) => setSubClientId(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
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
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Kegiatan (Acara)</label>
                        <input
                          type="text"
                          required
                          value={subActivityName}
                          onChange={(e) => setSubActivityName(e.target.value)}
                          placeholder="e.g., Produksi Film / Rapat Umum"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">PIC Internal Pendamping</label>
                        <input
                          type="text"
                          required
                          value={subPicInternal}
                          onChange={(e) => setSubPicInternal(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Catatan Tambahan</label>
                        <textarea
                          value={subNotes}
                          onChange={(e) => setSubNotes(e.target.value)}
                          rows={3}
                          placeholder="e.g., Kebutuhan khusus kelistrikan, detail panggung."
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={selectedRoomCodes.length === 0 && selectedPackageIds.length === 0}
                        className="w-full bg-[#800020] disabled:bg-muted disabled:text-muted-foreground hover:bg-[#600018] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Buat Pengajuan Sewa
                      </button>
                    </form>
                  </div>
                ) : (
                  // Pereview Board Statistics Dashboard
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                      <Layers className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" />
                      Statistik Papan Pemantauan
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted border border-border rounded-xl">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Total Klien</span>
                        <div className="text-xl font-bold text-foreground mt-1">{activeClients.length}</div>
                      </div>
                      <div className="p-3 bg-muted border border-border rounded-xl">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Total Pengajuan</span>
                        <div className="text-xl font-bold text-foreground mt-1">{submissions.length}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sebaran Pengajuan Per Tahap</h4>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                        const count = submissions.filter((s) => s.stage === t).length;
                        const percent = submissions.length > 0 ? (count / submissions.length) * 100 : 0;
                        return (
                          <div key={t} className="text-[10px] space-y-1">
                            <div className="flex justify-between font-mono text-muted-foreground">
                              <span>Tahap {t}</span>
                              <span className="font-bold text-foreground">{count} pengajuan</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded overflow-hidden border border-border">
                              <div className="bg-[#800020] h-full rounded" style={{ width: `${percent}%` }}></div>
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
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground">Daftar Aktif Pengajuan Sewa</h2>
                  {submissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-8 text-center">Belum ada pengajuan sewa tercatat.</p>
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
                            className={`p-4 bg-card border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                              selectedSubmissionId === sub.id
                                ? 'border-[#800020] bg-[#9a1a35]/10 dark:bg-[#600018]/30'
                                : 'border-border hover:border-border'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-extrabold text-xs text-foreground">{sub.companyName}</span>
                                {isStalled && (
                                  <span className="text-[8px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 animate-pulse">
                                    ⚠️ TERSENDAT ({diffDays} HARI)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-semibold">{sub.activityName}</div>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Ruang: {sub.roomCodes.join(', ')} · Estimasi: <span className="font-mono font-bold text-muted-foreground">{formatRupiah(sub.estimatedCost)}</span>
                              </p>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                Diperbarui: {lastUpdate.toLocaleDateString('id-ID')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] bg-[#9a1a35]/10 text-[#800020] dark:text-[#9a1a35] border border-[#9a1a35]/30 px-2 py-1 rounded font-bold text-center">
                                  Tahap {sub.stage}/9
                                </span>
                                {role === 'PENGINPUT' && (
                                  <select
                                    value={sub.stage}
                                    onChange={(e) => handleUpdateStage(sub.id, parseInt(e.target.value))}
                                    className="bg-card border border-border text-[10px] py-1 px-1.5 rounded text-foreground focus:outline-none font-bold focus:border-[#800020]"
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
                                 className="px-3 py-2 rounded bg-card hover:bg-muted border border-border text-xs font-bold text-foreground transition-colors shadow-sm"
                               >
                                 {selectedSubmissionId === sub.id ? 'Tutup Detail' : 'Tampilkan Checklist'}
                               </button>

                               {role === 'PENGINPUT' && (
                                 <button
                                   onClick={() => handleDeleteSubmission(sub.id, sub.companyName)}
                                   className="px-3 py-2 rounded bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-650 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-bold transition-all shadow-sm"
                                 >
                                   Hapus
                                 </button>
                               )}
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
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-fadeIn flex flex-col gap-4 text-foreground">
                      <div className="flex justify-between items-start border-b border-border pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-[#800020] dark:text-[#9a1a35]">
                            Daftar Periksa 9-Tahap Pengajuan
                          </h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Pengajuan: {sub.activityName} ({sub.companyName})</p>
                        </div>
                        {showTMWarning && (
                          <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-650 dark:text-red-300 rounded-lg text-[9px] font-bold animate-pulse">
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
                                  ? 'bg-[#9a1a35]/10 dark:bg-[#600018]/30 border-[#800020]/40 text-foreground'
                                  : isDone
                                  ? 'bg-muted border-border text-muted-foreground'
                                  : 'bg-muted/20 border-border text-muted-foreground'
                              }`}
                            >
                              <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                                isDone 
                                  ? 'bg-[#800020] border-[#800020] text-white'
                                  : 'border-border'
                              }`}>
                                {isDone ? '✓' : st.t}
                              </div>
                              <div>
                                <h4 className={`text-[11px] font-bold ${isActive ? 'text-[#800020] dark:text-[#9a1a35]' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {st.label}
                                </h4>
                                <p className="text-[10px] mt-0.5 leading-normal">{st.desc}</p>
                                
                                {st.t === 3 && (
                                  <button
                                    onClick={() => {
                                      setLoiNomorSurat('');
                                      setLoiNomorSuratPemohon('');
                                      setActiveLoiSubmission(sub);
                                    }}
                                    className="mt-2 px-2.5 py-1 rounded bg-[#800020] hover:bg-[#600018] text-white font-bold text-[9px] transition-all flex items-center gap-1 shadow-sm"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Buat / Lihat LOI (F7)
                                  </button>
                                )}

                                {st.t === 6 && (
                                  <button
                                    onClick={() => {
                                      setAgreementNomor('');
                                      setActiveAgreementSubmission(sub);
                                    }}
                                    className="mt-2 px-2.5 py-1 rounded bg-[#800020] hover:bg-[#600018] text-white font-bold text-[9px] transition-all flex items-center gap-1 shadow-sm"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Buat / Lihat Perjanjian (F8)
                                  </button>
                                )}
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

          {/* TAB: CALENDAR — BOOKING TANGGAL */}
          {activeTab === 'calendar_booking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* LEFT COLUMN: Reserve Date Form (Penginput only) */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                    <MapPin className="h-4 w-4 text-[#800020] dark:text-[#9a1a35]" />
                    Pencatatan Booking Tanggal
                  </h2>

                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-muted-foreground italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={handleCreateBooking} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Pilih Pengajuan Terkait (Opsional)</label>
                        <select
                          value={bookingSubmissionId}
                          onChange={(e) => setBookingSubmissionId(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
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
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Status Reservasi</label>
                        <select
                          value={bookingType}
                          onChange={(e) => setBookingType(e.target.value as BookingType)}
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        >
                          <option value="TENTATIVE">Tentatif (Tahap 1-4)</option>
                          <option value="CONFIRMED">Terkunci / Confirmed (Tahap 5+)</option>
                          <option value="UNAVAILABLE">Tidak Tersedia / Internal</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Mulai</label>
                          <input
                            type="date"
                            required
                            value={bookingStartDate}
                            onChange={(e) => setBookingStartDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Selesai</label>
                          <input
                            type="date"
                            required
                            value={bookingEndDate}
                            onChange={(e) => setBookingEndDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                      </div>



                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Ruangan Di-Booking</label>
                        {selectedRoomCodes.length > 0 ? (
                          <div className="p-2 bg-muted border border-border rounded text-[10px] text-foreground font-medium">
                            {selectedRoomCodes.join(', ')}
                          </div>
                        ) : (
                          <div className="p-2 bg-muted border border-border rounded text-[10px] text-muted-foreground italic">
                            Belum ada ruang dipilih. Silakan klik ruang di tab Kalkulator/Katalog.
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-250 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-[9.5px] leading-normal">
                        🚨 <strong>Validasi F5</strong>: Status *Terkunci* wajib divalidasi sistem. Tanggal tidak dapat dikonfirmasi/dikunci jika pengajuan belum mencapai minimal Tahap 5 (Surat Resmi Diterima).
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#800020] hover:bg-[#600018] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Catat Booking Tanggal
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Calendar + Bookings List (kept on this page per spec) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {renderCalendarGrid()}
                {renderBookingsList()}
              </div>
            </div>
          )}

          {/* TAB: CALENDAR — PENJADWALAN SURVEI */}
          {activeTab === 'calendar_survey' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* LEFT COLUMN: Survey Scheduling Form (Penginput only) */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 text-foreground">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                    <CheckSquare className="h-4 w-4 text-indigo-650" />
                    Penjadwalan Survei Lokasi
                  </h2>

                  {role !== 'PENGINPUT' ? (
                    <p className="text-xs text-muted-foreground italic">Peran Pereview hanya memiliki akses baca (Read-only).</p>
                  ) : (
                    <form onSubmit={handleCreateSurvey} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Pihak / Instansi Pengaju</label>
                        <input
                          type="text"
                          required
                          value={surveyCompanyName}
                          onChange={(e) => setSurveyCompanyName(e.target.value)}
                          placeholder="Ketik manual, mis. PT Contoh Sejahtera"
                          className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                        <span className="text-[10px] text-muted-foreground block mt-1">
                          Diisi manual: survei dijadwalkan sebelum ada permohonan sewa, sehingga pihak pengaju belum tercatat di Basis Data Klien dan belum tentu fix (bisa batal).
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1 min-h-[26px]">Tanggal Kunjungan Survei</label>
                          <input
                            type="date"
                            required
                            value={surveyDate}
                            onChange={(e) => setSurveyDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1 min-h-[26px]">Waktu Slot</label>
                          <select
                            value={surveyTimeSlot}
                            onChange={(e) => setSurveyTimeSlot(e.target.value as '10:00' | '14:00')}
                            className="w-full bg-card border border-border rounded-lg py-2 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          >
                            <option value="10:00">10:00 WIB</option>
                            <option value="14:00">14:00 WIB</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#800020] hover:bg-[#600018] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Simpan Jadwal Survei
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Calendar + Surveys List (kept on this page per spec) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {renderCalendarGrid()}
                {renderSurveysList()}
              </div>
            </div>
          )}

          {/* TAB: CALENDAR — REKAP PENJADWALAN */}
          {activeTab === 'calendar_recap' && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {renderCalendarGrid()}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderBookingsList()}
                {renderSurveysList()}
              </div>
            </div>
          )}

          {/* TAB 3: DOKUMEN OPERASIONAL */}
          {activeTab === 'documents' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-foreground">
              <div className="mb-6">
                <h2 className="text-base font-bold text-foreground">Pusat Dokumen Operasional</h2>
                <p className="text-xs text-muted-foreground mt-1">Unduh berkas resmi operasional penyewaan Gedung A.A. Maramis. Data diperbarui berkala sesuai versi terbaru.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentsList.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-muted border border-border hover:border-[#800020]/45 rounded-xl flex items-center justify-between gap-4 transition-all duration-300 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-card border border-border rounded-lg text-muted-foreground group-hover:text-[#800020] dark:text-[#9a1a35] transition-colors mt-0.5">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground group-hover:text-foreground transition-colors">{doc.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{doc.desc}</p>
                        <span className="inline-block text-[9px] bg-card text-muted-foreground border border-border px-1.5 py-0.5 rounded font-semibold mt-2.5">
                          Versi: {doc.version}
                        </span>
                      </div>
                    </div>
                    
                    {doc.available ? (
                      <a
                        href={doc.fileUrl}
                        download
                        className="px-3 py-1.5 bg-card hover:bg-[#800020] hover:text-white border border-border rounded-lg text-[10px] font-bold text-foreground transition-all shrink-0 shadow-sm inline-block text-center"
                      >
                        Unduh {doc.type}
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold px-3 py-1.5 select-none shrink-0">
                        Segera Tersedia
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DOC_LOI (F7) */}
          {activeTab === 'doc_loi' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-foreground animate-fadeIn flex flex-col gap-6">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#800020] dark:text-[#9a1a35]" />
                  Pembuatan Surat Penawaran Harga / Letter of Intent (LOI) [F7]
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih pengajuan sewa aktif di bawah ini untuk mengenerate naskah resmi LOI yang dapat diunduh atau disalin.
                </p>
              </div>

              {/* Selection Dropdown */}
              <div className="max-w-md">
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Pilih Pengajuan Sewa Terkait</label>
                <select
                  value={activeLoiSubmission?.id || ''}
                  onChange={(e) => {
                    const selected = submissions.find(s => s.id === e.target.value);
                    setActiveLoiSubmission(selected || null);
                  }}
                  className="w-full bg-card border border-border rounded-lg py-2.5 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                >
                  <option value="">-- Pilih Pengajuan / Acara --</option>
                  {submissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.companyName} - {sub.activityName} (Tahap {sub.stage})
                    </option>
                  ))}
                </select>
              </div>

              {activeLoiSubmission ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-border">
                  {/* Left Parameter Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sesuaikan Parameter LOI</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Penawaran</label>
                        <input
                          type="text"
                          value={loiNomorSurat}
                          onChange={(e) => setLoiNomorSurat(e.target.value)}
                          placeholder="e.g. 001/LMAN-P3/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Permohonan Klien</label>
                        <input
                          type="text"
                          value={loiNomorSuratPemohon}
                          onChange={(e) => setLoiNomorSuratPemohon(e.target.value)}
                          placeholder="e.g. 123/EXT/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Surat Permohonan Klien</label>
                        <input
                          type="date"
                          value={loiTanggalSuratPemohon}
                          onChange={(e) => setLoiTanggalSuratPemohon(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Perihal Surat Permohonan Klien</label>
                        <input
                          type="text"
                          value={loiPerihalSuratPemohon}
                          onChange={(e) => setLoiPerihalSuratPemohon(e.target.value)}
                          placeholder="e.g. Surat Permohonan Perizinan Lokasi Syuting"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Luas Area Pemanfaatan (Format Bebas)</label>
                        <input
                          type="text"
                          value={loiLuasAreaCustom}
                          onChange={(e) => setLoiLuasAreaCustom(e.target.value)}
                          placeholder="e.g. ±1.182 m2"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tautan Perjanjian (10.a)</label>
                        <input
                          type="text"
                          value={loiTautanPerjanjian}
                          onChange={(e) => setLoiTautanPerjanjian(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tautan Tata Tertib (10.b)</label>
                        <input
                          type="text"
                          value={loiTautanTataTertib}
                          onChange={(e) => setLoiTautanTataTertib(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Penandatangan LMAN</label>
                        <input
                          type="text"
                          value={loiNamaPenandatangan}
                          onChange={(e) => setLoiNamaPenandatangan(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jabatan Penandatangan LMAN</label>
                        <input
                          type="text"
                          value={loiJabatanPenandatangan}
                          onChange={(e) => setLoiJabatanPenandatangan(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-3.5 bg-[#9a1a35]/10 dark:bg-[#600018]/30 border border-[#9a1a35]/40 dark:border-[#600018] rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loiVerified}
                        onChange={(e) => setLoiVerified(e.target.checked)}
                        className="mt-1 h-3.5 w-3.5 rounded border-border text-[#800020] dark:text-[#9a1a35] focus:ring-[#800020]"
                      />
                      <div className="text-[10px] text-[#800020] dark:text-[#9a1a35] leading-normal font-medium">
                        <strong>Verifikasi Data & Terbilang (F7)</strong>: Saya menyatakan telah memeriksa kebenaran data LOI, perhitungan tarif dasar, PPN 11%, dan ejaan terbilang rupiah.
                      </div>
                    </label>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-250 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-[9px] leading-relaxed">
                      💡 <strong>Petunjuk F7</strong>: Nomor surat, tautan eksternal, dan tanda tangan elektronik akan dicantumkan secara otomatis pada keluaran naskah dinas LOI di sebelah kanan.
                    </div>
                  </div>

                  {/* Right Document Preview Panel */}
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pratinjau Naskah LOI</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLoiParams(activeLoiSubmission)}
                          className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-bold transition-colors shadow-sm"
                        >
                          Simpan Parameter
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(loiTextGenerated);
                            alert('Naskah LOI berhasil disalin ke clipboard!');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-[10px] font-bold text-foreground transition-colors shadow-sm"
                        >
                          Salin Teks
                        </button>
                        <button
                          onClick={() => {
                            const element = document.createElement("a");
                            const file = new Blob([loiTextGenerated], {type: 'text/plain'});
                            element.href = URL.createObjectURL(file);
                            element.download = `LOI_Gedung_Maramis_${activeLoiSubmission.companyName.replace(/\s+/g, '_')}.txt`;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-[10px] font-bold text-foreground transition-colors shadow-sm"
                        >
                          Unduh (.txt)
                        </button>
                        <button
                          disabled={!loiVerified}
                          onClick={() => handleDownloadLoiDocx(activeLoiSubmission)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
                            loiVerified
                              ? 'bg-[#800020] hover:bg-[#600018] text-white'
                              : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                          }`}
                          title={!loiVerified ? "Harap centang kotak verifikasi data & terbilang sewa terlebih dahulu" : "Unduh Surat LOI (.docx)"}
                        >
                          Unduh Word (.docx)
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={loiTextGenerated}
                      rows={20}
                      className="w-full bg-muted border border-border rounded-xl p-4 text-[10px] font-mono leading-normal text-foreground resize-y focus:outline-none scrollbar-thin"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted text-muted-foreground text-xs italic">
                  Silakan pilih salah satu pengajuan sewa aktif di atas untuk memuat data pratinjau dokumen.
                </div>
              )}
            </div>
          )}

          {/* TAB: DOC_PRJ (F8) */}
          {activeTab === 'doc_prj' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-foreground animate-fadeIn flex flex-col gap-6">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#800020] dark:text-[#9a1a35]" />
                  Penyusunan Perjanjian Sewa Guna / Kontrak (PRJ) [F8]
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih pengajuan sewa aktif di bawah ini untuk mengenerate naskah Perjanjian Sewa Guna 17 Pasal.
                </p>
              </div>

              {/* Selection Dropdown */}
              <div className="max-w-md">
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Pilih Pengajuan Sewa Terkait</label>
                <select
                  value={activeAgreementSubmission?.id || ''}
                  onChange={(e) => {
                    const selected = submissions.find(s => s.id === e.target.value);
                    setActiveAgreementSubmission(selected || null);
                  }}
                  className="w-full bg-card border border-border rounded-lg py-2.5 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                >
                  <option value="">-- Pilih Pengajuan / Acara --</option>
                  {submissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.companyName} - {sub.activityName} (Tahap {sub.stage})
                    </option>
                  ))}
                </select>
              </div>

              {activeAgreementSubmission ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-border">
                  {/* Left Parameter Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sesuaikan Ketentuan Kontrak</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Kontrak Perjanjian</label>
                        <input
                          type="text"
                          value={agreementNomor}
                          onChange={(e) => setAgreementNomor(e.target.value)}
                          placeholder="e.g. 002/SPG/LMAN/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Pihak Pertama (LMAN)</label>
                        <input
                          type="text"
                          value={agreementPihakPertama}
                          onChange={(e) => setAgreementPihakPertama(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jabatan Pihak Pertama</label>
                        <input
                          type="text"
                          value={agreementJabatanPihakPertama}
                          onChange={(e) => setAgreementJabatanPihakPertama(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Penawaran</label>
                          <input
                            type="text"
                            value={agreementOfferLetterNo}
                            onChange={(e) => setAgreementOfferLetterNo(e.target.value)}
                            placeholder="e.g. S-229/LMAN/LMAN.4/2026"
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Surat Penawaran</label>
                          <input
                            type="date"
                            value={agreementOfferLetterDate}
                            onChange={(e) => setAgreementOfferLetterDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Alamat Instansi Klien (Pihak Kedua)</label>
                        <input
                          type="text"
                          value={agreementInstitutionAddress}
                          onChange={(e) => setAgreementInstitutionAddress(e.target.value)}
                          placeholder="e.g. Jalan Lapangan Banteng Timur Nomor 2-4, Jakarta Pusat"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-250 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-[9px] leading-relaxed">
                      📑 <strong>Petunjuk F8</strong>: Draf ini memuat 17 pasal standar sewa LMAN termasuk klausul jaminan keamanan (*security deposit* 10%) dan kewajiban denda keterlambatan.
                    </div>
                  </div>

                  {/* Right Document Preview Panel */}
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pratinjau Naskah Perjanjian</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(agreementTextGenerated);
                            alert('Naskah Perjanjian berhasil disalin ke clipboard!');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-[10px] font-bold text-foreground transition-colors shadow-sm"
                        >
                          Salin Kontrak
                        </button>
                        <button
                          onClick={() => {
                            const element = document.createElement("a");
                            const file = new Blob([agreementTextGenerated], {type: 'text/plain'});
                            element.href = URL.createObjectURL(file);
                            element.download = `Kontrak_Sewa_Guna_${activeAgreementSubmission.companyName.replace(/\s+/g, '_')}.txt`;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted text-[10px] font-bold text-foreground transition-colors shadow-sm"
                        >
                          Unduh (.txt)
                        </button>
                        <button
                          onClick={() => handleDownloadAgreementDocx(activeAgreementSubmission)}
                          className="px-3 py-1.5 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-[10px] font-bold transition-colors shadow-sm"
                        >
                          Unduh Word (.docx)
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={agreementTextGenerated}
                      rows={20}
                      className="w-full bg-muted border border-border rounded-xl p-4 text-[10px] font-mono leading-normal text-foreground resize-y focus:outline-none scrollbar-thin"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted text-muted-foreground text-xs italic">
                  Silakan pilih salah satu pengajuan sewa aktif di atas untuk memuat data pratinjau perjanjian.
                </div>
              )}
            </div>
          )}

          {/* F7: LOI MODAL */}
          {activeLoiSubmission && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn text-foreground font-sans">
                {/* Modal Header */}
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted">
                  <div>
                    <h3 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Penerbitan Surat Penawaran Harga / LOI (F7)
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Instansi: {activeLoiSubmission.companyName} · Kegiatan: {activeLoiSubmission.activityName}</p>
                  </div>
                  <button
                    onClick={() => setActiveLoiSubmission(null)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Parameter Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sesuaikan Parameter LOI</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Penawaran</label>
                        <input
                          type="text"
                          value={loiNomorSurat}
                          onChange={(e) => setLoiNomorSurat(e.target.value)}
                          placeholder="e.g. 001/LMAN-P3/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Permohonan Klien</label>
                        <input
                          type="text"
                          value={loiNomorSuratPemohon}
                          onChange={(e) => setLoiNomorSuratPemohon(e.target.value)}
                          placeholder="e.g. 123/EXT/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Penandatangan LMAN</label>
                        <input
                          type="text"
                          value={loiNamaPenandatangan}
                          onChange={(e) => setLoiNamaPenandatangan(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Surat Permohonan Klien</label>
                        <input
                          type="date"
                          value={loiTanggalSuratPemohon}
                          onChange={(e) => setLoiTanggalSuratPemohon(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Perihal Surat Permohonan Klien</label>
                        <input
                          type="text"
                          value={loiPerihalSuratPemohon}
                          onChange={(e) => setLoiPerihalSuratPemohon(e.target.value)}
                          placeholder="e.g. Surat Permohonan Perizinan Lokasi Syuting"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Luas Area Pemanfaatan (Format Bebas)</label>
                        <input
                          type="text"
                          value={loiLuasAreaCustom}
                          onChange={(e) => setLoiLuasAreaCustom(e.target.value)}
                          placeholder="e.g. ±1.182 m2"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jabatan Penandatangan LMAN</label>
                        <input
                          type="text"
                          value={loiJabatanPenandatangan}
                          onChange={(e) => setLoiJabatanPenandatangan(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tautan Perjanjian (10.a)</label>
                        <input
                          type="text"
                          value={loiTautanPerjanjian}
                          onChange={(e) => setLoiTautanPerjanjian(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tautan Tata Tertib (10.b)</label>
                        <input
                          type="text"
                          value={loiTautanTataTertib}
                          onChange={(e) => setLoiTautanTataTertib(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-3.5 bg-[#9a1a35]/10 dark:bg-[#600018]/30 border border-[#9a1a35]/40 dark:border-[#600018] rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loiVerified}
                        onChange={(e) => setLoiVerified(e.target.checked)}
                        className="mt-1 h-3.5 w-3.5 rounded border-border text-[#800020] dark:text-[#9a1a35] focus:ring-[#800020]"
                      />
                      <div className="text-[10px] text-[#800020] dark:text-[#9a1a35] leading-normal font-medium">
                        <strong>Verifikasi Data & Terbilang (F7)</strong>: Saya menyatakan telah memeriksa kebenaran data LOI, perhitungan tarif dasar, PPN 11%, dan ejaan terbilang rupiah.
                      </div>
                    </label>

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-250 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-[9px] leading-relaxed">
                      💡 <strong>Petunjuk F7</strong>: Nomor surat, tautan eksternal, dan tanda tangan elektronik akan dicantumkan secara otomatis pada keluaran naskah dinas LOI di sebelah kanan.
                    </div>
                  </div>

                  {/* Right Document Preview Panel */}
                  <div className="lg:col-span-2 flex flex-col gap-3 h-[420px] lg:h-auto">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pratinjau Naskah LOI</h4>
                    <textarea
                      readOnly
                      value={loiTextGenerated}
                      className="flex-1 w-full bg-muted border border-border rounded-xl p-4 text-[10px] font-mono leading-normal text-foreground resize-none focus:outline-none scrollbar-thin"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loiTextGenerated);
                      alert('Naskah LOI berhasil disalin ke clipboard!');
                    }}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Salin Teks LOI
                  </button>
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([loiTextGenerated], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `LOI_Gedung_Maramis_${activeLoiSubmission.companyName.replace(/\s+/g, '_')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Unduh File LOI (.txt)
                  </button>
                   <button
                    disabled={!loiVerified}
                    onClick={() => handleDownloadLoiDocx(activeLoiSubmission)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      loiVerified
                        ? 'bg-[#800020] hover:bg-[#600018] text-white'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                    title={!loiVerified ? "Harap centang kotak verifikasi data & terbilang sewa terlebih dahulu" : "Unduh Surat LOI (.docx)"}
                  >
                    Unduh Word (.docx)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* F8: AGREEMENT MODAL */}
          {activeAgreementSubmission && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn text-foreground font-sans">
                {/* Modal Header */}
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted">
                  <div>
                    <h3 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Penyusunan Perjanjian Sewa Guna (F8)
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Instansi: {activeAgreementSubmission.companyName} · Kegiatan: {activeAgreementSubmission.activityName}</p>
                  </div>
                  <button
                    onClick={() => setActiveAgreementSubmission(null)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Parameter Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sesuaikan Ketentuan Kontrak</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Kontrak Perjanjian</label>
                        <input
                          type="text"
                          value={agreementNomor}
                          onChange={(e) => setAgreementNomor(e.target.value)}
                          placeholder="e.g. 002/SPG/LMAN/2026"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Pihak Pertama (LMAN)</label>
                        <input
                          type="text"
                          value={agreementPihakPertama}
                          onChange={(e) => setAgreementPihakPertama(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jabatan Pihak Pertama</label>
                        <input
                          type="text"
                          value={agreementJabatanPihakPertama}
                          onChange={(e) => setAgreementJabatanPihakPertama(e.target.value)}
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nomor Surat Penawaran</label>
                          <input
                            type="text"
                            value={agreementOfferLetterNo}
                            onChange={(e) => setAgreementOfferLetterNo(e.target.value)}
                            placeholder="e.g. S-229/LMAN/LMAN.4/2026"
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Surat Penawaran</label>
                          <input
                            type="date"
                            value={agreementOfferLetterDate}
                            onChange={(e) => setAgreementOfferLetterDate(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Alamat Instansi Klien (Pihak Kedua)</label>
                        <input
                          type="text"
                          value={agreementInstitutionAddress}
                          onChange={(e) => setAgreementInstitutionAddress(e.target.value)}
                          placeholder="e.g. Jalan Lapangan Banteng Timur Nomor 2-4, Jakarta Pusat"
                          className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-550 border border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-[9px] leading-relaxed">
                      📑 <strong>Petunjuk F8</strong>: Draf ini memuat 17 pasal standar sewa LMAN termasuk klausul jaminan keamanan (*security deposit* 10%) dan kewajiban denda keterlambatan.
                    </div>
                  </div>

                  {/* Right Document Preview Panel */}
                  <div className="lg:col-span-2 flex flex-col gap-3 h-[420px] lg:h-auto">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Pratinjau Naskah Perjanjian</h4>
                    <textarea
                      readOnly
                      value={agreementTextGenerated}
                      className="flex-1 w-full bg-muted border border-border rounded-xl p-4 text-[10px] font-mono leading-normal text-foreground resize-none focus:outline-none scrollbar-thin"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(agreementTextGenerated);
                      alert('Naskah Perjanjian berhasil disalin ke clipboard!');
                    }}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Salin Kontrak
                  </button>
                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([agreementTextGenerated], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `Kontrak_Sewa_Guna_${activeAgreementSubmission.companyName.replace(/\s+/g, '_')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Unduh Draf Kontrak (.txt)
                  </button>
                  <button
                    onClick={() => handleDownloadAgreementDocx(activeAgreementSubmission)}
                    className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Unduh Word (.docx)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT MODAL: Booking Tanggal */}
          {editingBooking && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground font-sans">
                <h3 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-2 border-b border-border pb-3">
                  <MapPin className="h-4 w-4" />
                  Edit Booking Tanggal
                </h3>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Status Reservasi</label>
                  <select
                    value={editBookingType}
                    onChange={(e) => setEditBookingType(e.target.value as BookingType)}
                    className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                  >
                    <option value="TENTATIVE">Tentatif (Tahap 1-4)</option>
                    <option value="CONFIRMED">Terkunci / Confirmed (Tahap 5+)</option>
                    <option value="UNAVAILABLE">Tidak Tersedia / Internal</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={editBookingStartDate}
                      onChange={(e) => setEditBookingStartDate(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={editBookingEndDate}
                      onChange={(e) => setEditBookingEndDate(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Ruangan Di-Booking (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    value={editBookingRoomCodes}
                    onChange={(e) => setEditBookingRoomCodes(e.target.value)}
                    placeholder="mis. R101, R102"
                    className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Catatan</label>
                  <textarea
                    value={editBookingNotes}
                    onChange={(e) => setEditBookingNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setEditingBooking(null)}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditBooking}
                    className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT MODAL: Penjadwalan Survei */}
          {editingSurvey && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground font-sans">
                <h3 className="text-sm font-bold text-[#800020] dark:text-[#9a1a35] flex items-center gap-2 border-b border-border pb-3">
                  <CheckSquare className="h-4 w-4" />
                  Edit Jadwal Survei
                </h3>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Nama Pihak / Instansi Pengaju</label>
                  <input
                    type="text"
                    required
                    value={editSurveyCompanyName}
                    onChange={(e) => setEditSurveyCompanyName(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1 min-h-[26px]">Tanggal Kunjungan Survei</label>
                    <input
                      type="date"
                      required
                      value={editSurveyDate}
                      onChange={(e) => setEditSurveyDate(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1 min-h-[26px]">Waktu Slot</label>
                    <select
                      value={editSurveyTimeSlot}
                      onChange={(e) => setEditSurveyTimeSlot(e.target.value as '10:00' | '14:00')}
                      className="w-full bg-card border border-border rounded-lg py-2 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    >
                      <option value="10:00">10:00 WIB</option>
                      <option value="14:00">14:00 WIB</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">PIC Internal</label>
                  <input
                    type="text"
                    value={editSurveyPicInternal}
                    onChange={(e) => setEditSurveyPicInternal(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Jumlah Tamu</label>
                    <input
                      type="number"
                      min={1}
                      value={editSurveyGuestCount}
                      onChange={(e) => setEditSurveyGuestCount(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Status</label>
                    <select
                      value={editSurveyStatus}
                      onChange={(e) => setEditSurveyStatus(e.target.value as Survey['status'])}
                      className="w-full bg-card border border-border rounded-lg py-2 px-2.5 text-xs text-foreground focus:outline-none focus:border-[#800020]"
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setEditingSurvey(null)}
                    className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditSurvey}
                    className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      </div>

      {/* FOOTER BAR - Satu Kemenkeu style */}
      <footer className="border-t border-border bg-card py-3 px-6 text-muted-foreground text-[10px] flex justify-between items-center select-none shadow-sm z-10 shrink-0">
        <div>© 2026 Lembaga Manajemen Aset Negara (LMAN). Hak Cipta Dilindungi.</div>
      </footer>
    </div>
  );
}

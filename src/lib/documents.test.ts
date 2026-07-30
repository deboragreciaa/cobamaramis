import { describe, it, expect } from 'vitest';
import {
  terbilang,
  formatTanggalIndo,
  formatTanggalPanjang,
  formatRupiahTerbilang,
  hitungDurasiHari,
  formatJangkaWaktu,
  pisahPpn,
  buildLoiText,
  buildPerjanjianText,
  slugifyNamaBerkas,
  LoiInput,
  PerjanjianInput,
} from './documents';

describe('F7/F8 Terbilang', () => {
  it('should spell out the amounts used in the official LOI', () => {
    expect(terbilang(9459459)).toBe(
      'sembilan juta empat ratus lima puluh sembilan ribu empat ratus lima puluh sembilan'
    );
    expect(terbilang(1040541)).toBe('satu juta empat puluh ribu lima ratus empat puluh satu');
    expect(terbilang(10500000)).toBe('sepuluh juta lima ratus ribu');
  });

  it('should spell out the amount used in the official Perjanjian', () => {
    expect(terbilang(45329625)).toBe(
      'empat puluh lima juta tiga ratus dua puluh sembilan ribu enam ratus dua puluh lima'
    );
  });

  it('should handle special Indonesian forms for teens, hundreds and thousands', () => {
    expect(terbilang(0)).toBe('nol');
    expect(terbilang(11)).toBe('sebelas');
    expect(terbilang(15)).toBe('lima belas');
    expect(terbilang(100)).toBe('seratus');
    expect(terbilang(105)).toBe('seratus lima');
    expect(terbilang(1000)).toBe('seribu');
    expect(terbilang(1500)).toBe('seribu lima ratus');
    expect(terbilang(2000)).toBe('dua ribu');
    expect(terbilang(2026)).toBe('dua ribu dua puluh enam');
  });

  it('should format currency with its spelled out form', () => {
    expect(formatRupiahTerbilang(10500000)).toBe('Rp10.500.000 (sepuluh juta lima ratus ribu rupiah)');
  });
});

describe('F7/F8 Date formatting', () => {
  it('should format an ISO date into Indonesian long date', () => {
    expect(formatTanggalIndo('2026-01-30')).toBe('30 Januari 2026');
    expect(formatTanggalIndo('2026-12-01')).toBe('1 Desember 2026');
  });

  it('should return a dash for empty or malformed dates', () => {
    expect(formatTanggalIndo('')).toBe('-');
    expect(formatTanggalIndo('30-01-2026')).toBe('-');
  });

  it('should spell out the signing date clause of the Perjanjian', () => {
    expect(formatTanggalPanjang('2026-01-21')).toBe(
      'hari Rabu, tanggal dua puluh satu bulan Januari dan tahun dua ribu dua puluh enam'
    );
  });
});

describe('F7/F8 Rental period', () => {
  it('should count days inclusively', () => {
    expect(hitungDurasiHari('2026-02-03', '2026-02-03')).toBe(1);
    expect(hitungDurasiHari('2026-02-03', '2026-02-05')).toBe(3);
    expect(hitungDurasiHari('2026-02-05', '2026-02-03')).toBe(0);
  });

  it('should phrase a single day period like the official template', () => {
    expect(formatJangkaWaktu('2026-02-03', '2026-02-03')).toBe(
      '1 (satu) hari yaitu tanggal 3 Februari 2026'
    );
  });

  it('should phrase a multi day period as a range', () => {
    expect(formatJangkaWaktu('2026-02-03', '2026-02-05')).toBe(
      '3 (tiga) hari yaitu tanggal 3 Februari 2026 sampai dengan 5 Februari 2026'
    );
  });
});

describe('F7 PPN split', () => {
  it('should split a PPN inclusive total into base and tax', () => {
    const { dpp, ppn, total } = pisahPpn(10500000, 0.11);
    expect(dpp).toBe(9459459);
    expect(ppn).toBe(1040541);
    expect(dpp + ppn).toBe(total);
  });

  it('should never lose a rupiah to rounding', () => {
    for (const value of [1, 999, 1234567, 45329625]) {
      const { dpp, ppn, total } = pisahPpn(value, 0.11);
      expect(dpp + ppn).toBe(total);
    }
  });
});

const LOI_SAMPLE: LoiInput = {
  nomorSurat: 'S-46/LMAN/LMAN.4/2026',
  tanggalSurat: '2026-01-20',
  namaPemohon: 'Razka Robby Ertanto',
  jabatanPemohon: 'Producer Summerland',
  instansiPemohon: 'Summerland',
  nomorSuratPemohon: 'SPL/017/140126/ROSE/SUMMERLAND',
  tanggalSuratPemohon: '2026-01-28',
  perihalSuratPemohon: 'Surat Permohonan Perizinan Lokasi Syuting',
  objekPemanfaatan: 'Ruangan pada Gedung A.A. Maramis',
  luasAreaSqm: 1182,
  peruntukan: 'Produksi Film Rose Pandanwangi',
  tanggalMulai: '2026-01-30',
  tanggalSelesai: '2026-01-30',
  tarifDpp: 9459459,
  ppn: 1040541,
  totalTarif: 10500000,
  ppnRatePersen: 11,
  tautanPerjanjian: 's.kemenkeu.go.id/FilmRosePandanwangi30Januari2026',
  tautanTataTertib: 's.kemenkeu.go.id/TataTertibMaramis',
  namaPenandatangan: 'Mahdi',
  jabatanPenandatangan: 'Plt. Direktur Pengembangan dan Pendayagunaan',
};

describe('F7 LOI generator', () => {
  const text = buildLoiText(LOI_SAMPLE);

  it('should address the applicant and cite their request letter', () => {
    expect(text).toContain('Yth. Sdr. Razka Robby Ertanto');
    expect(text).toContain('nomor SPL/017/140126/ROSE/SUMMERLAND tanggal 28 Januari 2026');
  });

  it('should list the object, area, purpose and period', () => {
    expect(text).toContain('±1.182 m2');
    expect(text).toContain('Produksi Film Rose Pandanwangi');
    expect(text).toContain('1 (satu) hari yaitu tanggal 30 Januari 2026');
  });

  it('should break down the tariff, PPN and total', () => {
    expect(text).toContain('Rp9.459.459 (sembilan juta empat ratus lima puluh sembilan ribu empat ratus lima puluh sembilan rupiah)');
    expect(text).toContain('PPN 11%');
    expect(text).toContain('Rp10.500.000 (sepuluh juta lima ratus ribu rupiah)');
  });

  it('should embed both mandatory links and the signer', () => {
    expect(text).toContain('s.kemenkeu.go.id/FilmRosePandanwangi30Januari2026');
    expect(text).toContain('s.kemenkeu.go.id/TataTertibMaramis');
    expect(text).toContain('Mahdi');
  });

  it('should leave no unresolved placeholder', () => {
    expect(text).not.toMatch(/undefined|\{\{|\bNaN\b/);
  });
});

const PERJANJIAN_SAMPLE: PerjanjianInput = {
  nomorPerjanjian: 'PRJ.B-7/LMAN/LMAN.4/2026',
  tanggalPerjanjian: '2026-01-21',
  nomorSuratPenawaran: 'S-46/LMAN/LMAN.4/2026',
  tanggalSuratPenawaran: '2026-01-20',
  nomorSuratPermohonan: 'S-2/EP.110/2026',
  tanggalSuratPermohonan: '2026-01-20',
  namaPihakPertama: 'MAHDI',
  jabatanPihakPertama: 'Plt. Direktur Pengembangan dan Pendayagunaan',
  officialOrderNo: 'PRIN-10/LMAN/2024',
  officialOrderDate: '9 Oktober 2024',
  officialMandateNo: '45/LMAN/2025',
  officialMandateTitle: 'Pelimpahan Sebagian Kewenangan',
  namaPihakKedua: 'Hudiyanto',
  jabatanPihakKedua: 'Direktur Departemen Pelindungan Konsumen',
  instansiPihakKedua: 'Otoritas Jasa Keuangan',
  alamatPihakKedua: 'Gedung Wisma Mulia 2 Lt.16, Jl. Jend Gatot Soebroto Kav 42.2A, Jakarta Selatan',
  teleponPihakKedua: '(021) 29600000',
  objekDeskripsi: 'sebagian Gedung A.A. Maramis, Gedung C lantai 2',
  luasAreaSqm: 1089,
  peruntukan: 'Ekspose dan Jumpa Pers',
  tanggalMulai: '2026-02-03',
  tanggalSelesai: '2026-02-03',
  uangSewa: 45329625,
  batasBayar: '2026-02-09',
  securityDeposit: 0,
};

describe('F8 Perjanjian generator', () => {
  const text = buildPerjanjianText(PERJANJIAN_SAMPLE);

  it('should carry the agreement number and signing date clause', () => {
    expect(text).toContain('Nomor: PRJ.B-7/LMAN/LMAN.4/2026');
    expect(text).toContain('hari Rabu, tanggal dua puluh satu bulan Januari dan tahun dua ribu dua puluh enam');
  });

  it('should name both parties', () => {
    expect(text).toContain('MAHDI');
    expect(text).toContain('Hudiyanto');
    expect(text).toContain('Otoritas Jasa Keuangan');
  });

  it('should state the object, period and payment terms', () => {
    expect(text).toContain('sebagian Gedung A.A. Maramis, Gedung C lantai 2');
    expect(text).toContain('1.089 meter persegi');
    expect(text).toContain('1 (satu) hari yaitu tanggal 3 Februari 2026');
    expect(text).toContain('Rp45.329.625 (empat puluh lima juta tiga ratus dua puluh sembilan ribu enam ratus dua puluh lima rupiah)');
    expect(text).toContain('Rp0 (nol rupiah)');
  });

  it('should contain all 17 pasal', () => {
    for (let i = 1; i <= 17; i++) {
      expect(text).toContain(`PASAL ${i}\n`);
    }
  });

  it('should leave no unresolved placeholder', () => {
    expect(text).not.toMatch(/undefined|\{\{|\bNaN\b/);
  });
});

describe('F7/F8 File naming', () => {
  it('should build a safe download file name', () => {
    expect(slugifyNamaBerkas('LOI', 'Produksi Film Rose Pandanwangi')).toBe(
      'LOI-Produksi-Film-Rose-Pandanwangi.doc'
    );
    expect(slugifyNamaBerkas('Perjanjian', 'Ekspose & Jumpa Pers / OJK')).toBe(
      'Perjanjian-Ekspose-Jumpa-Pers-OJK.doc'
    );
  });

  it('should fall back when the label has no usable characters', () => {
    expect(slugifyNamaBerkas('LOI', '///')).toBe('LOI-dokumen.doc');
  });
});

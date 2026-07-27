/**
 * F7 & F8 — Document generators.
 *
 * F7 produces the Surat Penawaran Harga / Letter of Intent (LOI) that LMAN sends
 * to an applicant. F8 produces the draft Perjanjian Sewa Guna that follows once
 * the LOI is signed. Both are pure string builders so they stay testable; the
 * page layer only handles clipboard/download.
 *
 * Wording follows the official LMAN templates for Gedung A.A. Maramis.
 */

export const ASET_NAMA = 'Gedung A.A. Maramis';
export const ASET_ALAMAT =
  'Jalan Lapangan Banteng Timur nomor 2 - 4, Kelurahan Pasar Baru, Kecamatan Sawah Besar, Kota Jakarta Pusat';

export const LMAN_ALAMAT =
  'Gedung Dhanadyaksa Hutama Nomor 62A, Jalan Diponegoro, Pegangsaan, Jakarta Pusat 10320';
export const LMAN_TELEPON = '(021) 21392822';
export const LMAN_FAKSIMILI = '(021) 21392823';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ANGKA = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan',
  'sembilan', 'sepuluh', 'sebelas',
];

/**
 * Converts a number into Indonesian words (e.g. 10500000 -> "sepuluh juta lima ratus ribu").
 * Used for the "Rp… (…rupiah)" phrasing that both documents require.
 */
export function terbilang(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (value < 0) return `minus ${terbilang(n)}`;
  if (n === 0) return 'nol';

  const sisa = (rest: number): string => (rest > 0 ? ` ${terbilang(rest)}` : '');

  if (n < 12) return ANGKA[n];
  if (n < 20) return `${ANGKA[n - 10]} belas`;
  if (n < 100) return `${ANGKA[Math.floor(n / 10)]} puluh${sisa(n % 10)}`;
  if (n < 200) return `seratus${sisa(n % 100)}`;
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${sisa(n % 100)}`;
  if (n < 2000) return `seribu${sisa(n % 1000)}`;
  if (n < 1_000_000) return `${terbilang(Math.floor(n / 1000))} ribu${sisa(n % 1000)}`;
  if (n < 1_000_000_000) return `${terbilang(Math.floor(n / 1_000_000))} juta${sisa(n % 1_000_000)}`;
  if (n < 1_000_000_000_000) {
    return `${terbilang(Math.floor(n / 1_000_000_000))} miliar${sisa(n % 1_000_000_000)}`;
  }
  return `${terbilang(Math.floor(n / 1_000_000_000_000))} triliun${sisa(n % 1_000_000_000_000)}`;
}

/** Parses a YYYY-MM-DD string without letting the host timezone shift the day. */
function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 2026-01-30 -> "30 Januari 2026" */
export function formatTanggalIndo(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return '-';
  return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * 2026-01-21 -> "hari Rabu, tanggal dua puluh satu bulan Januari dan tahun dua ribu dua puluh enam"
 * (the opening clause of the Perjanjian).
 */
export function formatTanggalPanjang(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return '-';
  return (
    `hari ${HARI[date.getDay()]}, tanggal ${terbilang(date.getDate())} ` +
    `bulan ${BULAN[date.getMonth()]} dan tahun ${terbilang(date.getFullYear())}`
  );
}

/** Formats plain rupiah without the currency symbol spacing quirks (e.g. "Rp9.459.459"). */
export function formatRupiahDoc(value: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(Math.round(value))}`;
}

/** "Rp9.459.459 (sembilan juta empat ratus lima puluh sembilan ribu empat ratus lima puluh sembilan rupiah)" */
export function formatRupiahTerbilang(value: number): string {
  return `${formatRupiahDoc(value)} (${terbilang(Math.round(value))} rupiah)`;
}

/** Inclusive day count between two YYYY-MM-DD dates. */
export function hitungDurasiHari(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff + 1;
}

/** "1 (satu) hari yaitu tanggal 3 Februari 2026" or a date range for multi-day events. */
export function formatJangkaWaktu(startIso: string, endIso: string): string {
  const durasi = hitungDurasiHari(startIso, endIso);
  if (durasi === 0) return '-';
  const label = `${durasi} (${terbilang(durasi)}) hari`;
  if (durasi === 1) return `${label} yaitu tanggal ${formatTanggalIndo(startIso)}`;
  return `${label} yaitu tanggal ${formatTanggalIndo(startIso)} sampai dengan ${formatTanggalIndo(endIso)}`;
}

/**
 * Splits a PPN-inclusive total into its taxable base and the tax itself.
 * Submissions only persist the grand total, so the LOI breakdown is derived here.
 */
export function pisahPpn(total: number, ppnRate: number): { dpp: number; ppn: number; total: number } {
  const bulat = Math.round(total);
  const dpp = Math.round(bulat / (1 + ppnRate));
  return { dpp, ppn: bulat - dpp, total: bulat };
}

/** Pads the label column so the numbered list in the LOI stays aligned. */
function baris(no: string, label: string, isi: string): string {
  return `${no.padEnd(4)}${label.padEnd(31)}: ${isi}`;
}

export interface LoiInput {
  nomorSurat: string;
  tanggalSurat: string; // YYYY-MM-DD
  namaPemohon: string;
  jabatanPemohon: string;
  instansiPemohon: string;
  nomorSuratPemohon: string;
  tanggalSuratPemohon: string; // YYYY-MM-DD
  perihalSuratPemohon: string;
  objekPemanfaatan: string;
  luasAreaSqm: number;
  peruntukan: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  tarifDpp: number;
  ppn: number;
  totalTarif: number;
  ppnRatePersen: number; // e.g. 11
  tautanPerjanjian: string;
  tautanTataTertib: string;
  namaPenandatangan: string;
  jabatanPenandatangan: string;
}

/** F7 — builds the Surat Penawaran Harga / LOI as plain text. */
export function buildLoiText(input: LoiInput): string {
  const luas = new Intl.NumberFormat('id-ID').format(input.luasAreaSqm);

  return `LEMBAGA MANAJEMEN ASET NEGARA
KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
DIREKTORAT JENDERAL KEKAYAAN NEGARA

Nomor    : ${input.nomorSurat}
Tanggal  : ${formatTanggalIndo(input.tanggalSurat)}
Hal      : Persetujuan Penawaran Sewa Guna atas ${ASET_NAMA} untuk Kegiatan ${input.peruntukan}

Yth. Sdr. ${input.namaPemohon}
${input.jabatanPemohon}

Sehubungan dengan Surat Saudara nomor ${input.nomorSuratPemohon} tanggal ${formatTanggalIndo(
    input.tanggalSuratPemohon
  )} perihal ${input.perihalSuratPemohon}, dapat kami sampaikan hal-hal sebagai berikut:

${baris('1.', 'Pemohon', input.namaPemohon)}
${baris('2.', 'Objek pemanfaatan', input.objekPemanfaatan)}
${baris('3.', 'Alamat aset', ASET_ALAMAT)}
${baris('4.', 'Luas area pemanfaatan', `±${luas} m2`)}
${baris('5.', 'Peruntukan', input.peruntukan)}
${baris('6.', 'Jangka waktu pemanfaatan', formatJangkaWaktu(input.tanggalMulai, input.tanggalSelesai))}
${baris('7.', 'Tarif pemanfaatan', formatRupiahTerbilang(input.tarifDpp))}
${baris('', `PPN ${input.ppnRatePersen}%`, formatRupiahTerbilang(input.ppn))}
${baris('', 'Total Tarif Pemanfaatan', formatRupiahTerbilang(input.totalTarif))}
8.  Pembayaran tarif pemanfaatan sebagaimana dimaksud pada angka 7 dilaksanakan berdasarkan
    tagihan/invoice yang disampaikan LMAN.
9.  LMAN dan ${input.instansiPemohon} memahami bahwa dokumen kepemilikan yang diterima untuk
    pendayagunaan aset adalah atas nama Pemerintah Republik Indonesia c.q. Kementerian Keuangan RI,
    serta memperhatikan Keputusan Direktur Jenderal Kekayaan Negara Nomor 117/KN/2023 tentang
    Penyerahkelolaan Barang Milik Negara pada Pengelola Barang kepada Lembaga Manajemen Aset Negara,
    maka aset dimaksud dalam penguasaan dan merupakan aset kelolaan Lembaga Manajemen Aset Negara.
10. Dengan menandatangani surat penawaran ini ${input.instansiPemohon} menyatakan:
    a. Sepakat pada seluruh ketentuan yang diatur dalam perjanjian pemanfaatan sebagaimana dapat
       diakses pada ${input.tautanPerjanjian}
    b. Menundukkan diri pada Tata Tertib Pemanfaatan ${ASET_NAMA} dan perubahannya sebagaimana
       dapat diakses pada ${input.tautanTataTertib}
11. Penawaran ini bersifat rahasia dan secara khusus dibuat untuk ${input.instansiPemohon}

Demikian kami sampaikan penawaran ini. Kami harap penawaran ini sesuai dengan kebutuhan Saudara.
Atas perhatian dan kerjasama Saudara kami ucapkan terima kasih.

Menyetujui,                             a.n. Direktur Utama
${input.jabatanPemohon.padEnd(40)}${input.jabatanPenandatangan}




${input.namaPemohon.padEnd(40)}${input.namaPenandatangan}
${''.padEnd(40)}Ditandatangani secara elektronik
`;
}

export interface PerjanjianInput {
  nomorPerjanjian: string;
  tanggalPerjanjian: string; // YYYY-MM-DD
  nomorSuratPenawaran: string;
  tanggalSuratPenawaran: string; // YYYY-MM-DD
  nomorSuratPermohonan: string;
  tanggalSuratPermohonan: string; // YYYY-MM-DD
  namaPihakPertama: string;
  jabatanPihakPertama: string;
  namaPihakKedua: string;
  jabatanPihakKedua: string;
  instansiPihakKedua: string;
  alamatPihakKedua: string;
  teleponPihakKedua: string;
  objekDeskripsi: string;
  luasAreaSqm: number;
  peruntukan: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  uangSewa: number; // PPN inclusive
  batasBayar: string; // YYYY-MM-DD
  securityDeposit: number;
}

/** F8 — builds the draft Perjanjian Sewa Guna as plain text (17 pasal). */
export function buildPerjanjianText(input: PerjanjianInput): string {
  const luas = new Intl.NumberFormat('id-ID').format(input.luasAreaSqm);

  return `Lampiran: Surat Penawaran Harga Nomor ${input.nomorSuratPenawaran} tanggal ${formatTanggalIndo(
    input.tanggalSuratPenawaran
  )}


PERJANJIAN SEWA GUNA
BARANG MILIK NEGARA
BERUPA GEDUNG A.A. MARAMIS
Nomor: ${input.nomorPerjanjian}


Perjanjian SEWA GUNA Barang Milik Negara ini (selanjutnya disebut "PERJANJIAN") dibuat dan
ditandatangani di Jakarta pada ${formatTanggalPanjang(
    input.tanggalPerjanjian
  )} sebagaimana Surat Penawaran Harga nomor ${input.nomorSuratPenawaran} tanggal ${formatTanggalIndo(
    input.tanggalSuratPenawaran
  )} ditandatangani, oleh dan antara pihak-pihak sebagai berikut:

1.  Lembaga Manajemen Aset Negara - Kementerian Keuangan Republik Indonesia, satuan kerja di
    lingkungan Direktorat Jenderal Kekayaan Negara Kementerian Keuangan yang memiliki tugas dan
    fungsi untuk menyelenggarakan pengelolaan aset berdasarkan Keputusan Menteri Keuangan Nomor
    1319/KMK.05/2015 tanggal 30 Desember 2015, berkedudukan di Jalan Pangeran Diponegoro No.62A,
    Pegangsaan, Jakarta Pusat 10320, dalam hal ini diwakili oleh ${input.namaPihakPertama},
    ${input.jabatanPihakPertama}, untuk selanjutnya disebut sebagai "PIHAK PERTAMA".

2.  ${input.namaPihakKedua} dalam PERJANJIAN ini bertindak dalam melakukan jabatannya selaku
    ${input.jabatanPihakKedua}, ${input.instansiPihakKedua}, yang memanfaatkan Barang Milik Negara
    berupa Ruangan ${ASET_NAMA} di ${ASET_ALAMAT}, selanjutnya dalam PERJANJIAN ini disebut sebagai
    "PIHAK KEDUA".

PIHAK PERTAMA dan PIHAK KEDUA secara sendiri-sendiri dapat disebut sebagai "PIHAK" dan secara
bersama-sama selanjutnya dalam PERJANJIAN ini disebut "PARA PIHAK".

Terlebih dahulu PARA PIHAK menerangkan hal-hal sebagai berikut:
a.  Menteri Keuangan Republik Indonesia merupakan Pengelola Barang atas Barang Milik Negara pada
    PIHAK PERTAMA dan telah melakukan pelimpahan kewenangan kepada pejabat struktural di lingkungan
    PIHAK PERTAMA dalam bentuk mandat.
b.  PIHAK KEDUA telah menyampaikan permohonan SEWA GUNA atas sebagian ${ASET_NAMA}, berdasarkan
    Surat Nomor ${input.nomorSuratPermohonan} tanggal ${formatTanggalIndo(input.tanggalSuratPermohonan)}.
c.  Menindaklanjuti permohonan PIHAK KEDUA, PIHAK PERTAMA menyampaikan surat penawaran nomor
    ${input.nomorSuratPenawaran} tanggal ${formatTanggalIndo(
    input.tanggalSuratPenawaran
  )} hal Persetujuan Penawaran Sewa Guna atas ${ASET_NAMA} untuk Kegiatan ${input.peruntukan} oleh
    ${input.instansiPihakKedua} (selanjutnya disebut Surat Penawaran Harga), yang dengan
    ditandatanganinya surat penawaran merupakan persetujuan dan kesepakatan penundukan diri pada
    seluruh ketentuan dalam PERJANJIAN ini.
d.  Bahwa PARA PIHAK mempertimbangkan pula ketentuan-ketentuan dalam:
    1)  Undang-Undang Nomor 11 Tahun 2020 tentang Cagar Budaya;
    2)  Peraturan Pemerintah Nomor 1 Tahun 2022 tentang Register Nasional dan Pelestarian Cagar Budaya;
    3)  Peraturan Menteri Pekerjaan Umum dan Perumahan Rakyat Nomor 19 Tahun 2021 tentang Pedoman
        Teknis Penyelenggaraan Bangunan Gedung Cagar Budaya yang Dilestarikan;
    4)  Peraturan Menteri Keuangan Nomor 144/PMK.06/2020 tentang Pengelolaan Barang Milik Negara
        Oleh Badan Layanan Umum Lembaga Manajemen Aset Negara;
    5)  Keputusan Menteri Keuangan Nomor 1319/KMK.05/2015;
    6)  Keputusan Direktur Jenderal Kekayaan Negara Nomor Kep-117/KN/2023 tanggal 31 Juli 2023;
    7)  Keputusan Direktur Utama Lembaga Manajemen Aset Negara Nomor 45/LMAN/2025.

Berdasarkan hal-hal tersebut di atas, PARA PIHAK menyatakan telah sepakat dan setuju untuk
mengikatkan diri dalam PERJANJIAN ini, dengan ketentuan dan syarat-syarat sebagaimana tercantum
dalam pasal-pasal di bawah ini:

PASAL 1
MAKSUD DAN TUJUAN
1.1 Maksud PERJANJIAN ini adalah mengoptimalkan daya guna dan hasil guna Aset Kelolaan untuk
    meningkatkan penerimaan negara dengan bentuk pemanfaatan berupa SEWA GUNA kepada PIHAK KEDUA.
1.2 Tujuan PERJANJIAN ini adalah dalam rangka tertib administrasi pengelolaan Barang Milik Negara
    oleh PIHAK PERTAMA dengan memperhatikan manfaat ekonomi dan/atau manfaat sosial bagi masyarakat.

PASAL 2
OBJEK SEWA GUNA
Objek SEWA GUNA dalam PERJANJIAN ini adalah Barang Milik Negara berupa ${input.objekDeskripsi},
dengan luas ${luas} meter persegi di ${ASET_ALAMAT}, selanjutnya disebut "OBJEK SEWA GUNA".

PASAL 3
RUANG LINGKUP
3.1 PIHAK KEDUA melakukan pemanfaatan atas OBJEK SEWA GUNA untuk tujuan ${input.peruntukan}.
3.2 PERJANJIAN ini tidak mengubah atau mengalihkan hak kepemilikan PIHAK PERTAMA sebagai pengelola
    yang sah atas OBJEK SEWA GUNA.
3.3 PIHAK KEDUA dilarang untuk melakukan pemindahtanganan, meminjampakaikan, melakukan SEWA GUNA
    kembali tanpa persetujuan tertulis PIHAK PERTAMA, atau menjadikan sebagai jaminan sebagian
    dan/atau seluruh OBJEK SEWA GUNA.

PASAL 4
TANGGUNG JAWAB
4.1 PIHAK KEDUA bertanggung jawab terhadap pemeliharaan dan pengamanan OBJEK SEWA GUNA berikut biaya
    yang ditimbulkan selama JANGKA WAKTU SEWA GUNA sampai dengan penyerahan kembali OBJEK SEWA GUNA
    kepada PIHAK PERTAMA.
4.2 PIHAK KEDUA bertanggung jawab atas segala kerugian yang diderita PIHAK PERTAMA yang timbul dari
    pelanggaran atas dan/atau tidak dilaksanakannya ketentuan PERJANJIAN ini, atau yang timbul dari
    kesalahan atau kelalaian PIHAK KEDUA dalam pelaksanaan PERJANJIAN ini.
4.3 PIHAK KEDUA menyediakan segala kebutuhan operasional yang diperlukan untuk kepentingan
    pelaksanaan SEWA GUNA.

PASAL 5
HAK DAN KEWAJIBAN PARA PIHAK
5.1 PIHAK PERTAMA memiliki hak sebagai berikut:
    5.1.1 Menerima pembayaran uang SEWA GUNA atas pemanfaatan OBJEK SEWA GUNA oleh PIHAK KEDUA.
    5.1.2 Melakukan pengawasan dan pengendalian terhadap pelaksanaan PERJANJIAN ini, baik secara
          berkala maupun sewaktu-waktu.
    5.1.3 Meminta secara tertulis kepada PIHAK KEDUA untuk melakukan penyesuaian atau pemblokiran
          akses penggunaan OBJEK SEWA GUNA dalam hal PIHAK KEDUA melakukan hal-hal yang tidak sesuai
          dengan PERJANJIAN ini dan/atau ketentuan peraturan perundang-undangan.
    5.1.4 Menyetujui atau menolak permohonan perpanjangan SEWA GUNA berdasarkan hasil penelitian atas
          pelaksanaan PERJANJIAN ini.
    5.1.5 Mengenakan sanksi kepada PIHAK KEDUA atas pelanggaran terhadap PERJANJIAN ini.
    5.1.6 Menerima kembali OBJEK SEWA GUNA dari PIHAK KEDUA dalam kondisi baik dan layak fungsi pada
          saat PERJANJIAN ini berakhir dengan berita acara.
    5.1.7 Melakukan pengosongan apabila PIHAK KEDUA tidak memenuhi kewajiban sebagaimana dimaksud
          dalam Pasal 5.1.3.
5.2 PIHAK PERTAMA memiliki kewajiban untuk menyerahkan OBJEK SEWA GUNA kepada PIHAK KEDUA dalam
    rangka pelaksanaan PERJANJIAN ini.
5.3 PIHAK KEDUA memiliki hak sebagai berikut:
    5.3.1 Menerima penyerahan OBJEK SEWA GUNA dari PIHAK PERTAMA.
    5.3.2 Menggunakan OBJEK SEWA GUNA sesuai dengan maksud, tujuan, dan ruang lingkup PERJANJIAN ini
          serta ketentuan peraturan perundang-undangan.
    5.3.3 Menempatkan media promosi berupa directional signage, polesign, maupun signage yang tidak
          menempel pada OBJEK SEWA GUNA.
5.4 PIHAK KEDUA memiliki kewajiban sebagai berikut:
    5.4.1 Membayar uang SEWA GUNA sebagaimana diatur dalam PERJANJIAN ini.
    5.4.2 Melakukan pengamanan dan pemeliharaan atas OBJEK SEWA GUNA sesuai maksud dan tujuan
          PERJANJIAN ini.
    5.4.3 Menanggung sepenuhnya biaya kebersihan, pemeliharaan, dan pengamanan OBJEK SEWA GUNA
          selama JANGKA WAKTU SEWA GUNA.
    5.4.4 Mematuhi tata tertib (house rules) pemanfaatan OBJEK SEWA GUNA sebagaimana ditautkan dalam
          Surat Penawaran Harga dan perubahannya.
    5.4.5 Mengajukan permohonan tertulis untuk perpanjangan JANGKA WAKTU SEWA GUNA paling lambat
          2 (dua) hari kerja sebelum PERJANJIAN berakhir.
    5.4.6 Mengembalikan OBJEK SEWA GUNA dalam kondisi baik sesuai kondisi awal setelah JANGKA WAKTU
          SEWA GUNA berakhir dengan berita acara.
    5.4.7 Melakukan perbaikan/penggantian atas OBJEK SEWA GUNA yang rusak/hilang akibat kesengajaan
          dan/atau kelalaian sesuai ketentuan peraturan perundang-undangan.

PASAL 6
JANGKA WAKTU SEWA GUNA
6.1 Jangka waktu SEWA GUNA adalah ${formatJangkaWaktu(
    input.tanggalMulai,
    input.tanggalSelesai
  )}, selanjutnya disebut "JANGKA WAKTU
    SEWA GUNA" dan dapat diperpanjang sesuai dengan kesepakatan PARA PIHAK, yang dituangkan dalam
    bentuk adendum yang merupakan bagian tidak terpisahkan dari PERJANJIAN ini.
6.2 Perpanjangan JANGKA WAKTU SEWA GUNA sebagaimana dimaksud pada Pasal 6.1 dilaksanakan berdasarkan
    persetujuan tertulis dari PIHAK PERTAMA dengan penyampaian Surat Penawaran Harga.

PASAL 7
UANG SEWA GUNA DAN KETENTUAN PEMBAYARAN
7.1 Uang SEWA GUNA ditetapkan sebesar ${formatRupiahTerbilang(input.uangSewa)},
    termasuk Pajak Pertambahan Nilai (PPN), yang wajib dibayarkan sekaligus paling lambat
    ${formatTanggalIndo(input.batasBayar)}.
7.2 Besaran kewajiban pembayaran uang jaminan (security deposit) adalah sebesar
    ${formatRupiahTerbilang(input.securityDeposit)}, yang wajib dibayarkan sekaligus paling lambat
    1 (satu) hari sebelum JANGKA WAKTU SEWA GUNA.
7.3 Pengembalian uang jaminan (security deposit) dilakukan PIHAK PERTAMA kepada PIHAK KEDUA tanpa
    bunga, setelah berakhirnya PERJANJIAN.
7.4 Pembayaran uang SEWA GUNA sebagaimana dimaksud pada ayat 7.1 dilakukan ke rekening PIHAK PERTAMA
    atau nomor virtual account sebagaimana disampaikan dalam tagihan (invoice).
7.5 Pembayaran uang jaminan (security deposit) sebagaimana dimaksud pada ayat 7.2 dilakukan ke
    rekening PIHAK PERTAMA atau nomor virtual account sebagaimana disampaikan dalam tagihan (invoice).
7.6 Dalam hal terdapat tagihan tunggakan kewajiban, kerusakan aset akibat kelalaian pemeliharaan oleh
    PIHAK KEDUA, dan/atau kerugian yang dialami PIHAK PERTAMA akibat kelalaian atau cidera janji oleh
    PIHAK KEDUA, maka pengembalian uang jaminan sebagaimana dimaksud dalam Pasal 7.3 dilakukan
    setelah memperhitungkan seluruh tunggakan/kewajiban/kerugian tersebut.
7.7 Dalam hal besaran uang jaminan tidak mencukupi untuk menyelesaikan kewajiban sebagaimana dimaksud
    pada ayat 7.6, maka PIHAK KEDUA berkewajiban membayar sisa biaya kewajiban tersebut.
7.8 Dalam hal dilakukan perpanjangan JANGKA WAKTU SEWA GUNA, besaran uang SEWA GUNA disampaikan
    berdasarkan Surat Penawaran Harga yang disampaikan PIHAK PERTAMA kepada PIHAK KEDUA.

PASAL 8
SANKSI DAN DENDA
8.1 PIHAK PERTAMA memberikan sanksi dan/atau denda kepada PIHAK KEDUA dalam hal PIHAK KEDUA:
    a.  melakukan penggunaan OBJEK SEWA GUNA tidak sesuai dengan maksud, tujuan, peruntukan dan ruang
        lingkup PERJANJIAN ini;
    b.  melakukan pembayaran uang SEWA GUNA melebihi batas waktu sebagaimana dimaksud dalam Pasal 7;
    c.  tidak melakukan perbaikan/penggantian atas OBJEK SEWA GUNA yang rusak/hilang sebagaimana
        dimaksud pada ayat 5.4.7; dan/atau
    d.  tidak melakukan kewajiban lainnya sebagaimana dimaksud dalam PERJANJIAN ini.
8.2 Sanksi dan/atau denda sebagaimana dimaksud pada ayat 8.1 berupa:
    a.  pembayaran selisih dari nilai penyesuaian atas besaran uang SEWA GUNA dan denda sebesar
        1 permil per hari maksimal 5% (lima persen) dari besaran selisih nilai penyesuaian tersebut
        terhitung sejak tanggal surat pemberitahuan, untuk pelanggaran pada ayat 8.1 huruf a;
    b.  denda sebesar 2% (dua persen) per bulan dengan pembulatan 1 bulan pada keterlambatan harian
        minimal 1 (satu) hari dengan maksimal 24 (dua puluh empat) bulan, dari nilai besaran uang
        SEWA GUNA yang harus dibayarkan sejak tanggal jatuh tempo, untuk pelanggaran pada ayat 8.1
        huruf b;
    c.  sanksi sebagaimana dimaksud dalam ketentuan peraturan perundang-undangan, untuk pelanggaran
        pada ayat 8.1 huruf c dan huruf d.
8.3 Dalam hal PIHAK KEDUA mengabaikan surat pemberitahuan dan/atau surat peringatan yang diterbitkan
    oleh PIHAK PERTAMA atas ketentuan sanksi dan/atau denda sebagaimana dalam Pasal ini, maka PIHAK
    PERTAMA melakukan pengosongan atas OBJEK SEWA GUNA.

PASAL 9
PAJAK
Semua pajak terkait dengan pelaksanaan PERJANJIAN ini menjadi tanggungan masing-masing PIHAK, kecuali
ditentukan lain dalam PERJANJIAN ini, sesuai ketentuan peraturan perundang-undangan di bidang
perpajakan yang berlaku di Indonesia.

PASAL 10
HUKUM YANG BERLAKU
PERJANJIAN ini beserta seluruh hak dan kewajiban PARA PIHAK di dalamnya tunduk pada dan ditafsirkan
berdasarkan hukum Indonesia dan ketentuan peraturan perundangan di wilayah Republik Indonesia.

PASAL 11
PENYELESAIAN PERSELISIHAN
11.1 Setiap perselisihan yang terjadi antara PARA PIHAK sehubungan dengan pelaksanaan PERJANJIAN ini
     diselesaikan secara musyawarah untuk mufakat.
11.2 Apabila tidak dapat tercapai kata mufakat, maka PARA PIHAK sepakat untuk menyelesaikan melalui
     Kepaniteraan Pengadilan Negeri Jakarta Pusat.

PASAL 12
KORESPONDENSI
12.1 Setiap surat menyurat atau pemberitahuan yang diberikan kepada salah satu PIHAK oleh PIHAK
     lainnya dibuat secara tertulis dan disampaikan ke alamat berikut:

     PIHAK PERTAMA
     KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
     DIREKTORAT JENDERAL KEKAYAAN NEGARA
     c.q. Direktur Pengembangan dan Pendayagunaan
     ${LMAN_ALAMAT}
     Telepon: ${LMAN_TELEPON}
     Faksimili: ${LMAN_FAKSIMILI}

     PIHAK KEDUA
     ${input.jabatanPihakKedua}
     ${input.instansiPihakKedua}
     ${input.alamatPihakKedua}
     Telepon: ${input.teleponPihakKedua}

12.2 Setiap PIHAK dapat mengubah alamatnya dengan memberikan pemberitahuan kepada PIHAK lain secara
     tertulis tanpa perlu membuat adendum PERJANJIAN.
12.3 Setiap pemberitahuan, permintaan atau komunikasi yang dialamatkan kepada salah satu PIHAK
     dianggap telah diterima apabila melalui komunikasi elektronik (e-mail) dengan bukti konfirmasi
     penerimaan; apabila dengan surat, pada saat diserahkan secara nyata ke alamat yang bersangkutan;
     atau apabila dengan faksimili, dengan bukti konfirmasi atas transmisi, dengan ketentuan apabila
     tanggal penerimaan bukan merupakan hari kerja, maka dianggap diterima pada hari kerja berikutnya.

PASAL 13
KEADAAN KAHAR
13.1 PARA PIHAK tidak bertanggung jawab atas kegagalan dalam memenuhi PERJANJIAN ini, baik langsung
     maupun tidak langsung, dikarenakan oleh keadaan di luar kendali dan kemampuannya, yang meliputi
     tetapi tidak terbatas pada perubahan peraturan yang diterbitkan oleh Pemerintah, bencana alam,
     banjir, pemogokan umum, perang, pemberontakan, revolusi, makar, huru-hara, terorisme, atau
     wabah/epidemik, yang selanjutnya disebut sebagai "KEADAAN KAHAR".
13.2 PIHAK yang mengalami KEADAAN KAHAR harus memberitahukan secara tertulis kepada PIHAK lainnya
     paling lambat 14 (empat belas) hari kalender setelah terjadinya KEADAAN KAHAR dengan melampirkan
     bukti dan surat keterangan resmi dari pejabat/instansi yang berwenang.
13.3 Jika KEADAAN KAHAR berlangsung lebih dari 30 (tiga puluh) hari kalender, maka PIHAK tersebut
     dapat mengusulkan perubahan ketentuan PERJANJIAN ini kepada PIHAK lainnya dengan pemberitahuan
     tertulis.
13.4 Hal-hal merugikan yang disebabkan oleh perbuatan kelalaian PIHAK PERTAMA atau PIHAK KEDUA tidak
     dapat digolongkan KEADAAN KAHAR.
13.5 Tindakan yang diambil untuk melaksanakan ketentuan PERJANJIAN akibat terjadinya KEADAAN KAHAR
     diserahkan kepada kesepakatan PARA PIHAK.
13.6 Kerugian yang diderita dan biaya yang dikeluarkan oleh PIHAK KEDUA akibat terjadinya KEADAAN
     KAHAR bukan menjadi tanggung jawab PIHAK PERTAMA, demikian pula sebaliknya.

PASAL 14
BERAKHIRNYA PERJANJIAN
14.1 PERJANJIAN ini dapat berakhir apabila terjadi salah satu keadaan berikut:
     a.  berakhirnya JANGKA WAKTU SEWA GUNA dan/atau PIHAK KEDUA tidak bermaksud menggunakan haknya
         untuk memperpanjang JANGKA WAKTU SEWA GUNA;
     b.  suatu kesepakatan tertulis dari PARA PIHAK untuk mengakhiri PERJANJIAN ini lebih awal;
     c.  pengakhiran perjanjian SEWA GUNA secara sepihak oleh PIHAK PERTAMA dalam hal PIHAK KEDUA
         tidak memenuhi kewajiban sebagaimana tertuang dalam perjanjian SEWA GUNA; atau
     d.  ketentuan lain sesuai peraturan perundang-undangan.
14.2 PARA PIHAK dengan ini secara tegas mengesampingkan ketentuan dalam Pasal 1266 Kitab
     Undang-Undang Hukum Perdata mengenai persyaratan dimintakannya suatu putusan pengadilan untuk
     mengakhiri PERJANJIAN ini.
14.3 Atas berakhirnya PERJANJIAN ini, tidak menghilangkan hak dan kewajiban PARA PIHAK yang timbul
     dan belum diselesaikan sampai PERJANJIAN ini berakhir.

PASAL 15
PERUBAHAN PERJANJIAN
Segala perubahan yang dilakukan serta hal-hal yang belum diatur dalam PERJANJIAN ini akan ditetapkan
kemudian secara musyawarah mufakat oleh PARA PIHAK dan akan dituangkan dalam suatu adendum yang
merupakan satu kesatuan dan menjadi bagian yang tidak terpisahkan dari PERJANJIAN ini.

PASAL 16
KETERPISAHAN
Dalam hal ketentuan yang terdapat dalam PERJANJIAN ini dinyatakan tidak sah atau tidak dapat
diberlakukan secara hukum, maka ketidaksahan atau ketidakberlakuan tersebut hanya berkaitan pada
ketentuan itu atau sebagian daripadanya saja, sedangkan ketentuan lainnya tetap berlaku dan mempunyai
kekuatan hukum secara penuh, kecuali jika terbukti ketentuan Pasal 1320 KUH Perdata tidak terpenuhi.

PASAL 17
PENUTUP
17.1 Segala ketentuan dan persyaratan dalam PERJANJIAN ini berlaku serta mengikat bagi PARA PIHAK.
17.2 Apabila terdapat ketentuan dalam PERJANJIAN ini atau dokumen yang dibuat sehubungan dengan
     PERJANJIAN ini menjadi tidak sah atau tidak dapat dilaksanakan, maka hal tersebut tidak
     mempengaruhi keabsahan, legalitas dan pelaksanaan ketentuan lain dalam PERJANJIAN ini.
17.3 Semua Lampiran PERJANJIAN ini merupakan satu kesatuan dan menjadi bagian yang tidak terpisahkan
     dari PERJANJIAN ini.
17.4 PERJANJIAN ini dibuat rangkap 2 (dua) dalam Bahasa Indonesia dan mempunyai kekuatan hukum yang
     sama, masing-masing bermeterai cukup, rangkap pertama untuk PIHAK PERTAMA sedangkan rangkap
     kedua untuk PIHAK KEDUA.
17.5 Demikian PERJANJIAN ini dibuat dan ditandatangani oleh PARA PIHAK pada hari, tanggal, bulan dan
     tahun sebagaimana tersebut di atas untuk dipergunakan sebagaimana mestinya.

PARA PIHAK telah menandatangani Surat Penawaran Harga Nomor ${input.nomorSuratPenawaran} tanggal
${formatTanggalIndo(
    input.tanggalSuratPenawaran
  )} dan berdasarkan Surat Penawaran Harga tersebut telah sepakat dan menundukkan
diri pada ketentuan dalam PERJANJIAN ini.


PIHAK PERTAMA                           PIHAK KEDUA
${input.jabatanPihakPertama.slice(0, 38).padEnd(40)}${input.jabatanPihakKedua}




${input.namaPihakPertama.padEnd(40)}${input.namaPihakKedua}
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Wraps generated text in a Word-compatible HTML document so it can be saved as
 * .doc and edited further by the team before signing.
 */
export function toWordHtml(title: string, text: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 2.5cm; }
body { font-family: 'Times New Roman', serif; font-size: 12pt; }
pre { font-family: 'Times New Roman', serif; font-size: 12pt; white-space: pre-wrap; }
</style></head>
<body><pre>${escapeHtml(text)}</pre></body></html>`;
}

/** Builds a safe file name, e.g. "LOI-Produksi-Film-Rose.doc". */
export function slugifyNamaBerkas(prefix: string, label: string): string {
  const slug = label
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${prefix}-${slug || 'dokumen'}.doc`;
}

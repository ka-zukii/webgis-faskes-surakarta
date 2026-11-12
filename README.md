<p align="center">
  <img src="docs/assets/logo-sehatmerata.png" alt="Logo SehatMerata" width="520" />
</p>

<h1 align="center">SehatMerata</h1>

<p align="center"><strong>3D WebGIS pemerataan fasilitas kesehatan Kota Surakarta.</strong></p>

SehatMerata menampilkan persebaran rumah sakit, puskesmas, klinik, dan apotek di atas peta 3D Kota Surakarta. Aplikasi ini membantu membaca apakah layanan kesehatan sudah merata antar kelurahan dan kecamatan, dengan indikator yang mengacu pada Permenkes No. 19 Tahun 2024.

## Fitur

- **Peta 3D kelurahan dan kecamatan.** Poligon kelurahan diekstrusi dengan tinggi dan warna yang mengikuti mode analisis. Kamera bisa diarahkan ke wilayah mana pun.
- **Lima mode analisis:**
  - Persebaran fasilitas kesehatan
  - Indeks kapasitas fasilitas kesehatan
  - Rasio fasilitas terhadap penduduk
  - Kepadatan penduduk
  - Aksesibilitas fasilitas kesehatan
- **Bobot kapasitas yang bisa diatur.** Rumah sakit, puskesmas, klinik, dan apotek punya bobot sendiri, dan bobot ini mengubah indeks kapasitas secara langsung.
- **Cakupan layanan.** Buffer 1 km untuk puskesmas dan 3 km untuk rumah sakit, dihitung per kelurahan dan per kecamatan. Area di luar cakupan ditampilkan sebagai celah akses.
- **Pemerataan layanan.** Indeks Gini, Theil, koefisien variasi, dan kurva Lorenz untuk indeks kapasitas antar kelurahan. Ambang rujukan Permenkes No. 19 Tahun 2024 dihitung per kecamatan dan bisa diubah di panel.
- **Pencarian.** Cari kelurahan, kecamatan, atau fasilitas, lalu kamera terbang ke lokasi tersebut.
- **Dashboard.** Ringkasan kota, indeks kapasitas per kecamatan, dan sebaran penduduk per kecamatan.
- **Mode presentasi.** Enam langkah berurutan dari gambaran kota sampai kelurahan dengan indeks kapasitas terendah. Setiap langkah menerbangkan kamera dan menampilkan satu temuan beserta angkanya.

## Sumber data

| Data | Sumber | Keterangan |
|---|---|---|
| Fasilitas kesehatan | OpenStreetMap, diklasifikasikan dengan `tools/klasifikasi_osm.py` | 68 titik di `public/data/healthmap-fasilitas-utama.geojson`. Setiap titik memiliki status verifikasi dan keyakinan klasifikasi. |
| Batas kelurahan (54) dan kecamatan (5) | Data batas wilayah Kota Surakarta | `public/data/kelurahan.geojson`, `public/data/kecamatan.geojson` |
| Penduduk per kelurahan, 2024 | BPS Kota Surakarta | `public/data/penduduk_kelurahan_2024.csv` |
| Ambang rujukan | Permenkes No. 19 Tahun 2024 tentang Penyelenggaraan Pusat Kesehatan Masyarakat | Pasal 10 ayat (1), (3), dan (5) |

Sebagian data fasilitas, khususnya jumlah puskesmas, berasal dari OpenStreetMap. Angka ini perlu diverifikasi dengan daftar resmi Dinas Kesehatan Kota Surakarta sebelum dipakai untuk keputusan.

## Prinsip data

- Tidak ada poligon yang dibuat acak.
- Tidak ada data penduduk atau fasilitas yang dikarang.
- Data demo wajib diberi label DEMO.
- Setiap ambang wajib memiliki sumber yang bisa ditelusuri.
- Parameter simulasi, seperti bobot dan radius buffer, ditandai sebagai parameter dan bukan standar resmi.

## Teknologi

- React 19 dan TypeScript
- Vite 8
- Tailwind CSS 4
- Three.js melalui `@react-three/fiber` dan `@react-three/drei`
- Turf.js untuk operasi geospasial
- PapaParse untuk membaca CSV

## Struktur proyek

```
public/data/          data batas wilayah, fasilitas, dan penduduk
tools/                skrip klasifikasi OSM dan ekspor Overpass
src/
  components/
    layout/           topbar, sidebar kiri dan kanan, pencarian, panduan
    map/              scene 3D, layer kelurahan, kecamatan, fasilitas, cakupan
    dashboard/        grafik batang dan panel pemerataan
    story/            panel mode presentasi
  features/
    analysis/         mode analisis, metrik, cakupan, statistik, pemerataan
    facilities/       metadata dan warna tipe fasilitas
    story/            penyusun langkah presentasi
  services/           pemuatan GeoJSON, CSV, dan data fasilitas
  hooks/              data fasilitas dan analisis
  utils/              format, geometri, proyeksi, dan teks
```

Pemisahan ini mengikuti aturan proyek: data spasial, data atribut, analisis, dan antarmuka berada di lapisan yang berbeda.

## Menjalankan proyek

Prasyarat: Node.js versi 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

Perintah lain:

```bash
npm run build      # cek tipe TypeScript lalu build produksi
npm run preview    # jalankan hasil build secara lokal
npm run lint       # jalankan oxlint
```

### Konfigurasi alias

Impor memakai alias `@/` yang mengarah ke `src/`. Alias ini harus didaftarkan di dua tempat:

- `tsconfig.app.json` pada `paths`, untuk pengecekan tipe.
- `vite.config.ts` pada `resolve.alias`, untuk bundler.

Tanpa entri kedua, Vite tidak bisa menemukan modul seperti `@/App.tsx`.

## Keterbatasan

- **Jarak dihitung garis lurus**, bukan waktu tempuh. Ambang waktu tempuh 60 menit dari Permenkes belum bisa dihitung karena belum ada data jaringan jalan.
- **Penduduk hanya tersedia dalam total**, belum per kelompok umur.
- **Klasifikasi fasilitas** dari OSM sebagian belum diverifikasi. Status verifikasi ditampilkan di panel detail setiap fasilitas.
- Ambang Permenkes untuk rasio penduduk per puskesmas adalah pertimbangan lokasi, bukan kuota wajib per wilayah.

## Rencana berikutnya

- Aksesibilitas berbasis jaringan jalan (isochrone waktu tempuh).
- Penduduk rentan per kelompok umur sebagai pembobot.
- Ekspor tabel analisis dan tautan yang menyimpan mode serta lokasi yang sedang dilihat.

## Lisensi dan atribusi

- Data OpenStreetMap © kontributor OpenStreetMap, tersedia di bawah ODbL.
- Data penduduk dari BPS Kota Surakarta.
- Permenkes No. 19 Tahun 2024 adalah peraturan publik.
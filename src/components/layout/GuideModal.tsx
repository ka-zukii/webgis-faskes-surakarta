import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";

type Tab = "panduan" | "metodologi";

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-panel-2/40 px-3 py-2">
      <p className="text-xs font-semibold text-accent">{term}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-ink/80">{children}</p>
    </div>
  );
}

function PanduanContent() {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Cara membaca peta">
        <p>
          Peta menampilkan Kota Surakarta dalam bentuk 3D. Warna dan tinggi setiap
          kelurahan menggambarkan nilai analisis yang sedang dipilih. Titik berwarna
          menunjukkan lokasi fasilitas kesehatan.
        </p>
      </Section>

      <Section title="Navigasi kamera">
        <Item term="Putar">Geser dengan klik kiri lalu tarik di area peta.</Item>
        <Item term="Geser posisi">Klik kanan lalu tarik, atau tahan Ctrl/Shift sambil menarik.</Item>
        <Item term="Zoom">Gulir roda mouse, atau cubit pada layar sentuh.</Item>
        <Item term="Reset kamera">Tombol di bagian atas untuk kembali ke tampilan awal.</Item>
        <Item term="Layar penuh">Tombol di kanan atas untuk memperbesar area peta.</Item>
      </Section>

      <Section title="Memilih dan melihat detail">
        <Item term="Fasilitas">
          Arahkan kursor ke titik untuk melihat nama. Klik titik untuk membuka detail di
          panel kanan, termasuk alamat, kelurahan, koordinat, dan sumber data.
        </Item>
        <Item term="Kelurahan">
          Klik wilayah untuk melihat jumlah fasilitas, penduduk, kepadatan, dan indeks
          kapasitas di panel kanan.
        </Item>
        <Item term="Batal pilih">Klik area kosong di peta untuk menutup pilihan.</Item>
      </Section>

      <Section title="Mengatur tampilan (panel kiri)">
        <Item term="Filter fasilitas">
          Nyalakan atau matikan jenis fasilitas: rumah sakit, puskesmas, klinik pratama,
          dan apotek.
        </Item>
        <Item term="Batas wilayah">
          Tampilkan atau sembunyikan batas kelurahan dan kecamatan.
        </Item>
        <Item term="Healthcare Coverage">
          Menampilkan area simulasi yang belum terjangkau buffer 1 km dari puskesmas.
        </Item>
        <Item term="Mode analisis">
          Pilih cara wilayah diwarnai: persebaran fasilitas, indeks kapasitas, rasio per
          penduduk, kepadatan penduduk, atau aksesibilitas. Beberapa mode membutuhkan data
          penduduk atau batas wilayah yang harus sudah dimuat.
        </Item>
        <Item term="Bobot kapasitas">
          Saat mode indeks kapasitas dipilih, Anda bisa mengubah bobot tiap jenis fasilitas
          untuk melihat perubahan peringkat kelurahan.
        </Item>
      </Section>

      <Section title="Pencarian">
        <p>
          Gunakan kolom pencarian di bagian atas untuk langsung menuju fasilitas atau
          kelurahan tertentu.
        </p>
      </Section>
    </div>
  );
}

function MetodologiContent() {
  return (
    <div className="flex flex-col gap-6">
      <Section title="1. Sumber data">
        <Item term="Kependudukan 2024">
          Jumlah penduduk per kelurahan dari BPS Kota Surakarta (Jumlah Penduduk Menurut
          Kelurahan dan Kelompok Umur 2024).
        </Item>
        <Item term="Rumah sakit">Data rumah sakit dari RS Online (Kemenkes).</Item>
        <Item term="Puskesmas, klinik pratama, apotek">
          Titik dari OpenStreetMap, diambil melalui Overpass turbo.
        </Item>
        <Item term="Koordinat lokasi">Koordinat setiap lokasi diambil dari Google Maps.</Item>
        <Item term="Batas wilayah">
          Poligon kecamatan dan kelurahan Kota Surakarta dalam format GeoJSON.
        </Item>
      </Section>

      <Section title="2. Pengolahan data fasilitas">
        <p>
          Data OpenStreetMap diunduh sebagai GeoJSON, lalu diklasifikasi ulang dengan
          skrip pengolahan. Aturannya adalah sebagai berikut:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-[12px] text-ink/80">
          <li>Hanya titik yang berada di dalam wilayah Kota Surakarta yang dipakai.</li>
          <li>Nama fasilitas lebih diutamakan daripada tag OSM. Tag hanya memperkuat tingkat keyakinan klasifikasi.</li>
          <li>Puskesmas induk memakai daftar resmi 17 puskesmas, bukan titik OSM. Puskesmas pembantu (pustu) ikut dimasukkan dari OSM.</li>
          <li>Klinik hanya mencakup klinik pratama. Klinik bersalin, bidan, laboratorium, praktik, toko obat, jamu, terapi, dan klinik estetika dikeluarkan.</li>
          <li>Halte, posyandu, dan titik lain yang bukan fasilitas kesehatan dikeluarkan.</li>
          <li>Titik dengan nama dan kata inti yang sama dalam radius 150 meter digabung menjadi satu.</li>
        </ul>
      </Section>

      <Section title="3. Perhitungan indikator">
        <Item term="Total fasilitas">Jumlah rumah sakit, puskesmas, klinik pratama, dan apotek dalam satu kelurahan.</Item>
        <Item term="Rasio per 10.000 penduduk">Total fasilitas dibagi jumlah penduduk, dikali 10.000.</Item>
        <Item term="Indeks kapasitas">
          (rumah sakit × bobot + puskesmas × bobot + klinik × bobot + apotek × bobot)
          dibagi jumlah penduduk, dikali 10.000. Bobot awal: rumah sakit 10, puskesmas 5,
          klinik 2, apotek 1. Bobot ini adalah parameter analisis, bukan standar resmi.
        </Item>
        <Item term="Kepadatan penduduk">Jumlah penduduk dibagi luas kelurahan (jiwa per km²).</Item>
        <Item term="Jarak ke fasilitas terdekat">
          Jarak garis lurus dari pusat kelurahan ke fasilitas terdekat (rumah sakit,
          puskesmas, atau klinik), dalam km. Ini bukan waktu tempuh.
        </Item>
        <Item term="Kategori pemerataan">
          Kelurahan diurutkan berdasarkan indeks kapasitas, lalu dibagi menjadi tiga
          kelompok yang sama besar: Tinggi, Sedang, dan Rendah.
        </Item>
      </Section>

      <Section title="4. Simulasi cakupan">
        <p>
          Cakupan dihitung dengan grid sampel setiap 100 meter di dalam tiap kelurahan.
          Area dianggap terjangkau jika berada dalam radius 1 km dari puskesmas atau 3 km
          dari rumah sakit. Angka radius ini adalah asumsi simulasi, bukan standar resmi
          jangkauan layanan kesehatan.
        </p>
      </Section>

      <Section title="5. Keterbatasan">
        <ul className="list-disc space-y-1.5 pl-5 text-[12px] text-ink/80">
          <li>Data OpenStreetMap bergantung pada kelengkapan kontributor, sehingga bisa ada fasilitas yang belum tercatat atau salah kategori.</li>
          <li>Jarak dihitung dalam garis lurus, belum memperhitungkan jalan, kemacetan, atau waktu tempuh.</li>
          <li>Data penduduk yang dipakai adalah tahun 2024 dan dibagi per kelurahan, sehingga tidak menggambarkan mobilitas penduduk harian.</li>
          <li>Indeks kapasitas dan kategori pemerataan adalah alat perbandingan relatif antarkelurahan, bukan penilaian mutlak kualitas layanan.</li>
        </ul>
      </Section>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "panduan", label: "Panduan" },
  { id: "metodologi", label: "Metodologi" },
];

export default function GuideModal({ open, onClose }: GuideModalProps) {
  const [tab, setTab] = useState<Tab>("panduan");

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="glass flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-accent" />
            <h2 id="guide-title" className="text-base font-semibold">
              Panduan &amp; Metodologi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-white/5 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div role="tablist" className="flex gap-1 border-b border-white/5 px-5 pt-3">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition ${
                  active ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="scroll-thin overflow-y-auto px-5 py-5">
          {tab === "panduan" ? <PanduanContent /> : <MetodologiContent />}
        </div>
      </div>
    </div>
  );
}

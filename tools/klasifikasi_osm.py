"""
Klasifikasi export Overpass turbo (GeoJSON) menjadi format HealthMap Solo.

Cara pakai:
  1. Jalankan query Overpass turbo, lalu Export -> GeoJSON.
  2. Simpan sebagai tools/overpass-export.geojson (atau beri path lain sebagai argumen).
  3. python3 tools/klasifikasi_osm.py [path_export]

Aturan:
- Hanya titik di dalam poligon kecamatan Kota Surakarta yang dipakai.
- Nama didahulukan daripada tag OSM. Tag hanya dipakai untuk menguatkan keyakinan.
- Puskesmas induk memakai daftar resmi (PUSKESMAS_RESMI), bukan titik OSM.
- Rumah sakit memakai daftar resmi (RS_RESMI), dengan koordinat dari SIRS Kemenkes.
- Puskesmas Pembantu (pustu) dipakai dari OSM jika INCLUDE_PUSTU = True.
- Kategori klinik hanya klinik pratama: bersalin, bidan, lab, dan praktik dikeluarkan.
- Halte, posyandu, toko obat/jamu, terapi, dan klinik estetika dikeluarkan.
- Titik dengan nama sama dan kata inti sama dalam radius 150 m digabung.
"""
import json, math, re, sys

INPUT = sys.argv[1] if len(sys.argv) > 1 else "tools/overpass-export.geojson"
OUT = "public/data/healthmap-fasilitas-utama.geojson"
KEC = "public/data/kecamatan.geojson"
KEL = "public/data/kelurahan.geojson"
INCLUDE_PUSTU = True  # False agar jumlah puskesmas = 17 seperti tabel resmi

# Daftar resmi 17 puskesmas Kota Surakarta. (nama, alamat, telepon, lon, lat)
PUSKESMAS_RESMI = [
    ("Pajang", "Jl. Sidoluhur No. 29, Kec. Laweyan", "0271-714594", 110.785500, -7.568700),
    ("Penumping", "Jl. Ki Ageng Mangir Gg. II, Penumping, Kec. Laweyan", "0271-714832", 110.807800, -7.569100),
    ("Purwosari", "Jl. Plamboyan Dalam No. 2, Kec. Laweyan", "0271-716333", 110.801201, -7.564200),
    ("Kratonan", "Jl. Pringgondani No. 34, Kec. Serengan", "0271-655539", 110.816803, -7.579800),
    ("Jayengan", "Kartopuran RT 12/V, Kec. Serengan", "0271-641257", 110.818604, -7.576000),
    ("Gajahan", "Jl. Veteran No. 46, Kec. Pasar Kliwon", "0271-654077", 110.827698, -7.568200),
    ("Sangkrah", "Jl. S Indragiri, Kec. Pasar Kliwon", "0271-655061", 110.840401, -7.577800),
    ("Sibela", "Jl. Sibela Timur No. 1, Perum Mojosongo, Kec. Jebres", "0271-854252", 110.846901, -7.559800),
    ("Purwodiningratan", "Jl. Surya No. 49, Kec. Jebres", "0271-647545", 110.837799, -7.564800),
    ("Ngoresan", "Jl. Kartika IV No. 12 RT 03/18, Kec. Jebres", "0271-646919", 110.834198, -7.559000),
    ("Pucangsawit", "Jl. Waringin No. 1 RT 03 RW 13 Pucangsari, Kec. Jebres", "0271-648990", 110.851501, -7.570400),
    ("Banyuanyar", "Jl. Bone Utama No. 38, Kec. Banjarsari", "0271-711244", 110.803703, -7.540800),
    ("Manahan", "Jl. Srigunting VII/11, Kec. Banjarsari", "0271-719313", 110.805298, -7.556300),
    ("Nusukan", "Jl. Sriwijaya Utara III/5, Kec. Banjarsari", "0271-717736", 110.821297, -7.550400),
    ("Gilingan", "Jl. Bibis Wetan RT 03/19, Kec. Banjarsari", "0271-637025", 110.823997, -7.554600),
    ("Setabelan", "Jl. D.I. Panjaitan No. 5, Ds. Setabelan, Kec. Banjarsari", "0271-641033", 110.826500, -7.563200),
    ("Gambir Sari", "Jl. Kelud Barat, Kadipiro, Kec. Banjarsari", "0271-857376", 110.826202, -7.537800),
]

# Daftar resmi RS Kota Surakarta (sumber: SIRS Kemenkes). (nama, jenis, lon, lat); lat/lon None = belum ada koordinat
RS_RESMI = [
    ("RS Bhayangkara Surakarta", "RSU", 110.8018449, -7.5546792),
    ("RS Gigi dan Mulut Soelastri", "RSK Gigi dan Mulut", 110.801648, -7.564757),
    ("RS JIH Solo", "RSU", 110.791552, -7.552994),
    ("RS Jiwa Daerah Dr. Arif Zainudin", "RSK Jiwa", None, None),
    ("RS Kardiologi Emirates Indonesia", "RSK Jantung", 110.852445, -7.558352),
    ("RS Khusus Mata Solo", "RSK Mata", 110.781845, -7.548842),
    ("RS Onkologi Solo", "RSK Kanker", 110.795856, -7.552945),
    ("RS PKU Muhammadiyah Sampangan Surakarta", "RSU", 110.841560, -7.587840),
    ("RS PKU Muhammadiyah Surakarta", "RSU", 110.817551, -7.567156),
    ("RS UMS Ar Fachrudin", "RSU", 110.782054, -7.549214),
    ("RS Umum Brayat Minulya", "RSU", 110.814444, -7.551944),
    ("RS Umum Daerah Bung Karno Kota Surakarta", "RSU", 110.842792, -7.593466),
    ("RS Umum Daerah Dr. Moewardi Surakarta", "RSU", 110.840003, -7.558368),
    ("RS Umum Daerah Ibu Fatmawati Soekarno", "RSU", 110.812325, -7.530364),
    ("RS Umum Dr. Oen", "RSU", 110.838547, -7.554315),
    ("RS Umum Hermina Solo", "RSU", 110.844350, -7.558360),
    ("RS Umum Islam Kustati", "RSU", 110.832252, -7.578615),
    ("RS Umum Kasih Ibu", "RSU", 110.803730, -7.564750),
    ("RS Umum Panti Waluyo", "RSU", 110.796338, -7.555891),
    ("RS Umum Pusat Surakarta", "RSU", 110.787041, -7.554540),
    ("RS Umum Tk III Slamet Riyadi Surakarta", "RSU", 110.805000, -7.565833),
    ("RS Umum Triharsi", "RSU", 110.82478, -7.55736),
]

# RS yang koordinat SIRS-nya jatuh di luar batas kecamatan pada data wilayah.
# Titik dipindah ke pusat kelurahan sesuai alamat resmi (nama kelurahan, nama kecamatan, alamat).
RS_DARI_ALAMAT = {
    "RS PKU Muhammadiyah Sampangan Surakarta": ("Kelurahan Semanggi", "Pasar Kliwon", "Semanggi, Kec. Ps. Kliwon"),
    "RS Umum Daerah Bung Karno Kota Surakarta": ("Kelurahan Mojo", "Pasar Kliwon", "Mojo, Kec. Ps. Kliwon"),
}

# RS tanpa koordinat: ditaruh di tengah poligon kecamatan (perkiraan, bukan lokasi pasti)
RS_KECAMATAN_PERKIRAAN = {
    "RS Jiwa Daerah Dr. Arif Zainudin": ("Pasar Kliwon", "Jl. Ki Hajar Dewantoro No. 80"),
}

# Alamat resmi RS (dari daftar yang dikirim)
RS_ALAMAT = {
    "RS Bhayangkara Surakarta": "Jalan Adi Sucipto No 2, Kota Surakarta",
    "RS Gigi dan Mulut Soelastri": "Jl. Brigjen Slamet Riyadi No. 366, Kota Surakarta",
    "RS JIH Solo": "Jl. Adi Sucipto No 118, Jajar, Laweyan",
    "RS Jiwa Daerah Dr. Arif Zainudin": "Jl. Ki Hajar Dewantoro No. 80, Kota Surakarta",
    "RS Kardiologi Emirates Indonesia": "Jalan Surya II, Kota Surakarta",
    "RS Khusus Mata Solo": "Jl. Adi Sucipto 169, Kota Surakarta",
    "RS Onkologi Solo": "Jl. Siwalan No. 37, Kota Surakarta",
    "RS PKU Muhammadiyah Sampangan Surakarta": "Gang Cempaka 11, Semanggi, Kec. Pasar Kliwon",
    "RS PKU Muhammadiyah Surakarta": "Jln. Ronggowarsito 130, Kota Surakarta",
    "RS UMS Ar Fachrudin": "Jalan Adi Sucipto Nomor 167, Kota Surakarta",
    "RS Umum Brayat Minulya": "Jl. Dr. Setiabudi No. 106, Kota Surakarta",
    "RS Umum Daerah Bung Karno Kota Surakarta": "Jl. Sungai Serang I, Mojo, Kec. Pasar Kliwon",
    "RS Umum Daerah Dr. Moewardi Surakarta": "Jl. Kol Sutarto Nomor 132, Jebres",
    "RS Umum Daerah Ibu Fatmawati Soekarno": "Jalan Lettu Sumarto nomor 1, Kota Surakarta",
    "RS Umum Dr. Oen": "Jl. Brigjend Katamso No. 55, Kota Surakarta",
    "RS Umum Hermina Solo": "Jalan Kolonel Sutarto No. 16, Jebres",
    "RS Umum Islam Kustati": "Jl. Kapt. Mulyadi No. 249, Kota Surakarta",
    "RS Umum Kasih Ibu": "Jl. Slamet Riyadi 404, Kota Surakarta",
    "RS Umum Panti Waluyo": "Jl. Jend A Yani No. 1-2, Kota Surakarta",
    "RS Umum Pusat Surakarta": "Jl. Profesor Dr. R. Soeharso No. 28, Kota Surakarta",
    "RS Umum Tk III Slamet Riyadi Surakarta": "Jalan Slamet Riyadi No. 321, Laweyan",
    "RS Umum Triharsi": "Jalan Monginsidi 82, Kota Surakarta",
}

# Tabel resmi per kecamatan (RS = umum + khusus, Puskesmas = rawat inap + non rawat inap, Klinik Pratama)
TABEL_RESMI = {
    "Laweyan": (None, 3, 21),
    "Serengan": (None, 2, 4),
    "Pasar Kliwon": (None, 2, 6),
    "Jebres": (None, 4, 13),
    "Banjarsari": (None, 6, 36),
}

PUSTU_RE = re.compile(r"(?i)\bpustu\b|puskesmas pembantu")
PKM_RE = re.compile(r"(?i)^(uptd\s+|upt\s+)?puskesmas\b")
RS_RE = re.compile(r"(?i)\b(rs|r\.s|rsi|rst|rsud|rsjd|rsia|rsu|rumah sakit)\b")
BEAUTY_RE = re.compile(r"(?i)skin|aesthetic|esthetic|beauty|kecantikan")
NONMED_RE = re.compile(r"(?i)\bterapi\b|holistic")
STOP = {"rs", "r", "s", "rumah", "sakit", "rsud", "rsi", "rst", "rsjd", "dr", "gedung",
        "surakarta", "solo", "klinik", "clinic", "puskesmas", "the", "dan", "kota"}


def load_kecamatan():
    data = json.load(open(KEC, encoding="utf-8"))
    out = []
    for f in data["features"]:
        p = f.get("properties") or {}
        nama = (p.get("Kecamatan") or p.get("name") or "").replace("Kecamatan ", "").strip()
        g = f.get("geometry")
        if not nama or not g:
            continue
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        out.append((nama, polys))
    return out


def _in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def kecamatan_of(lon, lat, kec):
    for nama, polys in kec:
        for poly in polys:
            if _in_ring(lon, lat, poly[0]) and not any(_in_ring(lon, lat, h) for h in poly[1:]):
                return nama
    return None


def kecamatan_centroid(nama, kec):
    pts = []
    for n, polys in kec:
        if n == nama:
            for poly in polys:
                pts.extend(poly[0])
    if not pts:
        return None
    lon = sum(p[0] for p in pts) / len(pts)
    lat = sum(p[1] for p in pts) / len(pts)
    return lon, lat


def kelurahan_centroid(nama_kelurahan):
    """Pusat kasar poligon kelurahan (rata-rata titik ring luar)."""
    data = json.load(open(KEL, encoding="utf-8"))
    for f in data["features"]:
        p = f.get("properties") or {}
        if (p.get("Kelurahan") or p.get("name") or "").strip() != nama_kelurahan:
            continue
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        pts = [pt for poly in polys for pt in poly[0]]
        return (sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts))
    return None


def load_kelurahan():
    data = json.load(open(KEL, encoding="utf-8"))
    out = []
    for f in data["features"]:
        p = f.get("properties") or {}
        nama = (p.get("Kelurahan") or p.get("name") or "").replace("Kelurahan ", "").strip()
        g = f.get("geometry")
        if not nama or not g:
            continue
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        out.append((nama, polys))
    return out


def kelurahan_of(lon, lat, kel):
    for nama, polys in kel:
        for poly in polys:
            if _in_ring(lon, lat, poly[0]) and not any(_in_ring(lon, lat, h) for h in poly[1:]):
                return nama
    return ""


def alamat_osm(tags):
    if tags.get("addr:full"):
        return tags["addr:full"]
    jalan = " ".join(x for x in [tags.get("addr:street", ""), tags.get("addr:housenumber", "")] if x).strip()
    return ", ".join(x for x in [jalan, tags.get("addr:city", "")] if x)


def exclude_reason(name, tags):
    amen, hc = tags.get("amenity"), tags.get("healthcare")
    if not name:
        return "tanpa nama"
    if "," in name:
        return "nama tidak valid (berisi alamat)"
    if tags.get("highway") == "bus_stop" or tags.get("public_transport"):
        return "halte/bus stop"
    if PUSTU_RE.search(name):
        return None if INCLUDE_PUSTU else "pustu (dinonaktifkan di pengaturan)"
    if PKM_RE.match(name):
        return "diganti daftar resmi puskesmas Kota Surakarta"
    n = name.lower()
    if re.match(r"^posyandu\b", n):
        return "posyandu (bukan fasilitas kesehatan formal)"
    if n.startswith("toko "):
        return "toko obat/jamu, bukan apotek"
    if NONMED_RE.search(name):
        return "terapi non-medis"
    if tags.get("beauty") or BEAUTY_RE.search(name):
        return "klinik estetika/kecantikan"
    if re.search(r"(?i)bersalin|bidan|laboratorium|\blab\b|praktik", name):
        return "bukan klinik pratama (bersalin/bidan/lab/praktik)"
    if (amen == "clinic" or hc == "clinic") and not re.search(r"(?i)klinik|clinic", name):
        return "tag clinic tanpa kata klinik dalam nama"
    return None


def classify(name, tags):
    amen, hc = tags.get("amenity"), tags.get("healthcare")
    tag_hospital = amen == "hospital" or hc == "hospital"
    tag_pharmacy = amen == "pharmacy" or hc == "pharmacy"
    tag_clinic = amen == "clinic" or hc == "clinic"

    if PUSTU_RE.search(name):
        return ("puskesmas", "sedang",
                "Puskesmas Pembantu (pustu); masuk kategori puskesmas, pertimbangkan kategori terpisah.")
    has_rs = bool(RS_RE.search(name))
    if not has_rs and re.search(r"(?i)klinik|clinic", name):
        conf = "tinggi" if tag_clinic else "sedang"
        return "klinik", conf, "Nama menyebut klinik; verifikasi jenis layanan dan status fasilitas."
    if has_rs or tag_hospital:
        if has_rs and tag_hospital:
            return "rumah_sakit", "tinggi", "Nama dan tag OSM sama-sama menunjukkan rumah sakit."
        return "rumah_sakit", "sedang", "Hanya salah satu sumber (nama atau tag) menunjukkan rumah sakit; perlu verifikasi."
    if tag_pharmacy or re.search(r"(?i)apotek|kimia farma", name):
        if tag_pharmacy and re.search(r"(?i)apotek|kimia farma", name):
            return "apotek", "tinggi", "Nama dan tag OSM sama-sama menunjukkan apotek."
        return "apotek", "sedang", "Verifikasi nama, operasional, dan status apotek."
    if tag_clinic:
        return "klinik", "sedang", "Verifikasi jenis layanan dan status fasilitas."
    return None, None, "tidak ada tag atau nama yang menunjukkan fasilitas kesehatan"


def haversine_m(lon1, lat1, lon2, lat2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def core(name):
    tokens = re.sub(r"[^a-z0-9 ]", " ", name.lower()).split()
    return {t for t in tokens if t not in STOP and len(t) > 1}


def main():
    src = json.load(open(INPUT, encoding="utf-8"))
    kec = load_kecamatan()
    kel_data = load_kelurahan()
    kept, excluded = [], []

    for f in src["features"]:
        p = f.get("properties") or {}
        lon, lat = f["geometry"]["coordinates"][:2]
        osm_id = p.get("@id") or str(f.get("id") or "?")
        name = (p.get("name") or "").strip()

        reason = exclude_reason(name, p)
        if reason is None:
            kat, conf, catatan = classify(name, p)
            if kat is None:
                reason = catatan
        if reason is None and kat == "rumah_sakit":
            reason = "RS tidak ada di daftar resmi RS Kota Surakarta"
        if reason is None:
            kab = kecamatan_of(lon, lat, kec)
            if kab is None:
                reason = "di luar Kota Surakarta"
        if reason is not None:
            excluded.append((osm_id, name, reason))
            continue
        kept.append({"osm_id": osm_id, "name": name, "kat": kat, "conf": conf,
                     "catatan": catatan, "lon": lon, "lat": lat, "kecamatan": kab,
                     "alamat": alamat_osm(p)})

    result, merged = [], []
    for item in kept:
        dup = None
        for other in result:
            if other["kat"] != item["kat"]:
                continue
            if haversine_m(item["lon"], item["lat"], other["lon"], other["lat"]) < 150:
                ci, co = core(item["name"]), core(other["name"])
                if ci and co and (ci <= co or co <= ci):
                    dup = other
                    break
        if dup:
            merged.append((item["osm_id"], item["name"], dup["name"]))
        else:
            result.append(item)

    for nama, alamat, telp, lon, lat in PUSKESMAS_RESMI:
        slug = re.sub(r"[^a-z0-9]+", "-", nama.lower()).strip("-")
        result.append({"osm_id": f"daftar-resmi/{slug}", "name": f"Puskesmas {nama}",
                       "kat": "puskesmas", "conf": "tinggi",
                       "catatan": f"Daftar resmi puskesmas Kota Surakarta. Alamat: {alamat}. Telp: {telp}. Koordinat dari daftar; cek ulang di lapangan.",
                       "lon": lon, "lat": lat, "kecamatan": kecamatan_of(lon, lat, kec),
                       "alamat": alamat, "telepon": telp})

    rs_tanpa_koordinat, rs_luar_kecamatan, rs_perkiraan = [], [], []
    for nama, jenis, lon, lat in RS_RESMI:
        if lon is None or lat is None:
            if nama in RS_KECAMATAN_PERKIRAAN:
                kec_nama, alamat_rs = RS_KECAMATAN_PERKIRAAN[nama]
                lon, lat = kecamatan_centroid(kec_nama, kec)
                slug = re.sub(r"[^a-z0-9]+", "-", nama.lower()).strip("-")
                result.append({"osm_id": f"daftar-resmi-rs/{slug}", "name": nama,
                               "kat": "rumah_sakit", "conf": "sedang",
                               "catatan": f"Daftar resmi RS Kota Surakarta ({jenis}). Koordinat PERKIRAAN di tengah kecamatan {kec_nama}; alamat resmi: {alamat_rs}. Cek ulang lokasinya.",
                               "lon": lon, "lat": lat, "kecamatan": kec_nama})
                rs_perkiraan.append(nama)
                continue
            rs_tanpa_koordinat.append(nama)
            continue
        kab = kecamatan_of(lon, lat, kec)
        catatan = f"Daftar resmi RS Kota Surakarta ({jenis}). Koordinat dari SIRS Kemenkes; cek ulang di lapangan."
        if kab is None and nama in RS_DARI_ALAMAT:
            kel, kab, alamat_rs = RS_DARI_ALAMAT[nama]
            pusat = kelurahan_centroid(kel)
            if pusat is not None:
                lon, lat = pusat
            catatan = (f"Daftar resmi RS Kota Surakarta ({jenis}). Alamat resmi: {alamat_rs}. "
                       f"Titik ditempatkan di pusat {kel} karena koordinat SIRS di luar batas kecamatan; cek ulang di lapangan.")
        elif kab is None:
            kab = ""
            catatan += " Koordinat di luar batas kecamatan pada data wilayah; cek ulang."
            rs_luar_kecamatan.append(nama)
        slug = re.sub(r"[^a-z0-9]+", "-", nama.lower()).strip("-")
        result.append({"osm_id": f"daftar-resmi-rs/{slug}", "name": nama,
                       "kat": "rumah_sakit", "conf": "tinggi",
                       "catatan": catatan, "lon": lon, "lat": lat, "kecamatan": kab})

    features = []
    for item in result:
        status = "klasifikasi_awal" if item["conf"] == "tinggi" else "perlu_verifikasi"
        alamat = item.get("alamat") or RS_ALAMAT.get(item["name"], "")
        props = {
            "@id": item["osm_id"],
            "name": item["name"],
            "kategori_healthmap": item["kat"],
            "keyakinan_klasifikasi": item["conf"],
            "status_verifikasi": status,
            "catatan_pembersihan": item["catatan"],
            "kecamatan": item["kecamatan"],
            "kelurahan": kelurahan_of(item["lon"], item["lat"], kel_data),
            "alamat": alamat,
        }
        if item.get("telepon"):
            props["telepon"] = item["telepon"]
        features.append({"type": "Feature",
                         "geometry": {"type": "Point", "coordinates": [item["lon"], item["lat"]]},
                         "properties": props})

    out = {
        "type": "FeatureCollection",
        "name": "HealthMap Solo - empat kategori fasilitas kesehatan",
        "generator": "HealthMap Solo - klasifikasi ulang nama dan tag OSM (tools/klasifikasi_osm.py)",
        "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
        "source_timestamp": src.get("timestamp", ""),
        "attribution": "© OpenStreetMap contributors",
        "features": features,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    kats = ["rumah_sakit", "puskesmas", "klinik", "apotek"]
    print("Output:", OUT, "| fitur:", len(features))
    print("Per kategori:", {k: sum(1 for x in result if x["kat"] == k) for k in kats})

    print("\nPERBANDINGAN DENGAN TABEL RESMI (RS, Puskesmas, Klinik Pratama)")
    print(f"  {'Kecamatan':<14}{'RS':>8}{'Pusk':>10}{'Klinik':>12}")
    tot_k = {k: 0 for k in kats}
    for nama, (rs_r, pk_r, kl_r) in TABEL_RESMI.items():
        c = {k: sum(1 for x in result if x["kecamatan"] == nama and x["kat"] == k) for k in kats}
        for k in kats:
            tot_k[k] += c[k]
        rs_txt = "-" if rs_r is None else str(rs_r)
        print(f"  {nama:<14}{c['rumah_sakit']:>3}/{rs_txt:<4}{c['puskesmas']:>4}/{pk_r:<5}{c['klinik']:>5}/{kl_r:<6}")
    print(f"  {'Total (5 kec.)':<14}{tot_k['rumah_sakit']:>3}/{len(RS_RESMI):<4}{tot_k['puskesmas']:>4}/{17:<5}{tot_k['klinik']:>5}/{80:<6}")
    print(f"  (RS total di kolom kanan = daftar RS Kota Surakarta yang dikirim, {len(RS_RESMI)} entri)")

    if rs_perkiraan:
        print(f"\nRS KOORDINAT PERKIRAAN (tengah kecamatan) ({len(rs_perkiraan)}):")
        for nama in rs_perkiraan:
            print(f"  - {nama}")
    if rs_tanpa_koordinat:
        print(f"\nRS DAFTAR RESMI TANPA KOORDINAT ({len(rs_tanpa_koordinat)}):")
        for nama in rs_tanpa_koordinat:
            print(f"  - {nama}")
    if rs_luar_kecamatan:
        print(f"\nRS DI LUAR BATAS KECAMATAN (tetap dimasukkan, cek koordinatnya) ({len(rs_luar_kecamatan)}):")
        for nama in rs_luar_kecamatan:
            print(f"  - {nama}")

    print(f"\nDIKELUARKAN ({len(excluded)}):")
    by_reason = {}
    for osm_id, name, reason in excluded:
        by_reason.setdefault(reason, []).append(name or osm_id)
    for reason, names in sorted(by_reason.items(), key=lambda kv: -len(kv[1])):
        print(f"  [{len(names)}] {reason}: {', '.join(names[:6])}{' ...' if len(names) > 6 else ''}")

    print(f"\nDIGABUNG ({len(merged)}):")
    for osm_id, name, kept_name in merged:
        print(f"  {name} -> digabung ke '{kept_name}'")


if __name__ == "__main__":
    main()
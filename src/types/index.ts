export type FacilityType = "hospital" | "puskesmas" | "clinic" | "pharmacy";

export interface HealthcareFacility {
  id: string;
  nama: string;
  tipe: FacilityType;
  /** Alamat tidak tersedia pada dataset saat ini; string kosong berarti belum ada. */
  alamat: string;
  /** Kosong sampai berkas batas kelurahan tersedia dan titik dapat dipetakan. */
  kelurahan: string;
  /** Kosong sampai berkas batas kecamatan tersedia dan titik dapat dipetakan. */
  kecamatan: string;
  latitude: number;
  longitude: number;
  kategoriAsli: string;
  keyakinan: string;
  statusVerifikasi: string;
  osmRef: string;
}

export interface KelurahanData {
  id: string;
  nama: string;
  kecamatan: string;
  populasi: number;
  tahunData: number;
  jumlahRS: number;
  jumlahPuskesmas: number;
  jumlahKlinik: number;
  jumlahApotek: number;
}

export type LoadStatus = "loading" | "ready" | "error";

export type VisibleTypes = Record<FacilityType, boolean>;

export interface SceneCameraInfo {
  lon: number;
  lat: number;
  distance: number;
  zoom: number;
}

export type SelectionKind = "facility" | "kelurahan" | "kecamatan";

export interface Selection {
  kind: SelectionKind;
  id: string;
}

/** Permintaan kamera untuk terbang ke titik tertentu di scene (satuan km). */
export interface FocusRequest {
  x: number;
  z: number;
}

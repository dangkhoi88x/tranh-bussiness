export type SlotDef = { x: number; y: number; w: number; h: number; bleed: boolean };

export type SpreadLayout = {
  code: string;
  name: string;
  slots: SlotDef[];
};

export const SPREAD_LAYOUTS: SpreadLayout[] = [
  { code: 'TRAN_DOI', name: 'Tràn đôi', slots: [
    { x: 0, y: 0, w: 1, h: 1, bleed: true },
  ]},
  { code: 'DOI_CAN', name: 'Đôi cân', slots: [
    { x: 0.06, y: 0.08, w: 0.38, h: 0.84, bleed: false },
    { x: 0.56, y: 0.08, w: 0.38, h: 0.84, bleed: false },
  ]},
  { code: 'MOT_LON_MOT_NHO', name: 'Một lớn một nhỏ', slots: [
    { x: 0.04, y: 0.06, w: 0.58, h: 0.88, bleed: false },
    { x: 0.66, y: 0.30, w: 0.30, h: 0.40, bleed: false },
  ]},
  { code: 'BA_NGANG', name: 'Ba ngang', slots: [
    { x: 0.03, y: 0.15, w: 0.30, h: 0.70, bleed: false },
    { x: 0.35, y: 0.15, w: 0.30, h: 0.70, bleed: false },
    { x: 0.67, y: 0.15, w: 0.30, h: 0.70, bleed: false },
  ]},
  { code: 'CHU_L', name: 'Chữ L', slots: [
    { x: 0.04, y: 0.06, w: 0.58, h: 0.88, bleed: false },
    { x: 0.66, y: 0.06, w: 0.30, h: 0.42, bleed: false },
    { x: 0.66, y: 0.52, w: 0.30, h: 0.42, bleed: false },
  ]},
  { code: 'BON_O', name: 'Bốn ô', slots: [
    { x: 0.04, y: 0.05, w: 0.44, h: 0.43, bleed: false },
    { x: 0.52, y: 0.05, w: 0.44, h: 0.43, bleed: false },
    { x: 0.04, y: 0.52, w: 0.44, h: 0.43, bleed: false },
    { x: 0.52, y: 0.52, w: 0.44, h: 0.43, bleed: false },
  ]},
  { code: 'BA_TAM', name: 'Ba tấm', slots: [
    { x: 0.03, y: 0.08, w: 0.20, h: 0.84, bleed: false },
    { x: 0.26, y: 0.08, w: 0.48, h: 0.84, bleed: false },
    { x: 0.77, y: 0.08, w: 0.20, h: 0.84, bleed: false },
  ]},
  { code: 'SAU_O', name: 'Sáu ô', slots: [
    { x: 0.03, y: 0.05, w: 0.30, h: 0.43, bleed: false },
    { x: 0.35, y: 0.05, w: 0.30, h: 0.43, bleed: false },
    { x: 0.67, y: 0.05, w: 0.30, h: 0.43, bleed: false },
    { x: 0.03, y: 0.52, w: 0.30, h: 0.43, bleed: false },
    { x: 0.35, y: 0.52, w: 0.30, h: 0.43, bleed: false },
    { x: 0.67, y: 0.52, w: 0.30, h: 0.43, bleed: false },
  ]},
  { code: 'CONTACT_SHEET', name: 'Contact sheet', slots: [
    { x: 0.024, y: 0.025, w: 0.22, h: 0.30, bleed: false },
    { x: 0.268, y: 0.025, w: 0.22, h: 0.30, bleed: false },
    { x: 0.512, y: 0.025, w: 0.22, h: 0.30, bleed: false },
    { x: 0.756, y: 0.025, w: 0.22, h: 0.30, bleed: false },
    { x: 0.024, y: 0.350, w: 0.22, h: 0.30, bleed: false },
    { x: 0.268, y: 0.350, w: 0.22, h: 0.30, bleed: false },
    { x: 0.512, y: 0.350, w: 0.22, h: 0.30, bleed: false },
    { x: 0.756, y: 0.350, w: 0.22, h: 0.30, bleed: false },
    { x: 0.024, y: 0.675, w: 0.22, h: 0.30, bleed: false },
    { x: 0.268, y: 0.675, w: 0.22, h: 0.30, bleed: false },
    { x: 0.512, y: 0.675, w: 0.22, h: 0.30, bleed: false },
    { x: 0.756, y: 0.675, w: 0.22, h: 0.30, bleed: false },
  ]},
  { code: 'KHOI_MAU', name: 'Khối màu', slots: [] },

  // ── Wave 2 ──
  { code: 'PANORAMA', name: 'Toàn cảnh', slots: [
    { x: 0.03, y: 0.25, w: 0.94, h: 0.50, bleed: false },
  ]},
  { code: 'MOT_HAI', name: 'Một hai', slots: [
    { x: 0.04, y: 0.05, w: 0.92, h: 0.45, bleed: false },
    { x: 0.04, y: 0.55, w: 0.44, h: 0.40, bleed: false },
    { x: 0.52, y: 0.55, w: 0.44, h: 0.40, bleed: false },
  ]},
  { code: 'HAI_MOT', name: 'Hai một', slots: [
    { x: 0.04, y: 0.05, w: 0.44, h: 0.40, bleed: false },
    { x: 0.52, y: 0.05, w: 0.44, h: 0.40, bleed: false },
    { x: 0.04, y: 0.50, w: 0.92, h: 0.45, bleed: false },
  ]},
  { code: 'BAC_THANG', name: 'Bậc thang', slots: [
    { x: 0.04, y: 0.05, w: 0.28, h: 0.42, bleed: false },
    { x: 0.36, y: 0.29, w: 0.28, h: 0.42, bleed: false },
    { x: 0.68, y: 0.53, w: 0.28, h: 0.42, bleed: false },
  ]},
  { code: 'NAM_O', name: 'Năm ô', slots: [
    { x: 0.03, y: 0.05, w: 0.46, h: 0.43, bleed: false },
    { x: 0.51, y: 0.05, w: 0.46, h: 0.43, bleed: false },
    { x: 0.03, y: 0.52, w: 0.30, h: 0.43, bleed: false },
    { x: 0.35, y: 0.52, w: 0.30, h: 0.43, bleed: false },
    { x: 0.67, y: 0.52, w: 0.30, h: 0.43, bleed: false },
  ]},
  { code: 'KHUNG_DOI', name: 'Khung đôi', slots: [
    { x: 0.08, y: 0.10, w: 0.34, h: 0.80, bleed: false },
    { x: 0.58, y: 0.10, w: 0.34, h: 0.80, bleed: false },
  ]},
  { code: 'BA_TANG', name: 'Ba tầng', slots: [
    { x: 0.04, y: 0.04, w: 0.92, h: 0.28, bleed: false },
    { x: 0.04, y: 0.36, w: 0.92, h: 0.28, bleed: false },
    { x: 0.04, y: 0.68, w: 0.92, h: 0.28, bleed: false },
  ]},
  { code: 'GHEP_HINH', name: 'Ghép hình', slots: [
    { x: 0.03, y: 0.05, w: 0.58, h: 0.55, bleed: false },
    { x: 0.65, y: 0.05, w: 0.32, h: 0.26, bleed: false },
    { x: 0.65, y: 0.34, w: 0.32, h: 0.26, bleed: false },
    { x: 0.03, y: 0.64, w: 0.30, h: 0.31, bleed: false },
    { x: 0.35, y: 0.64, w: 0.62, h: 0.31, bleed: false },
  ]},
  { code: 'DOC_NGANG', name: 'Dọc ngang', slots: [
    { x: 0.04, y: 0.06, w: 0.35, h: 0.88, bleed: false },
    { x: 0.44, y: 0.06, w: 0.52, h: 0.42, bleed: false },
    { x: 0.44, y: 0.52, w: 0.52, h: 0.42, bleed: false },
  ]},
  { code: 'VIEN_LON', name: 'Viền lớn', slots: [
    { x: 0.15, y: 0.12, w: 0.70, h: 0.76, bleed: false },
  ]},
];

export const DEFAULT_CYCLE = [
  'TRAN_DOI', 'DOI_CAN', 'MOT_LON_MOT_NHO', 'BA_NGANG', 'CHU_L',
  'KHOI_MAU', 'BON_O', 'BA_TAM', 'CONTACT_SHEET', 'SAU_O',
  'PANORAMA', 'MOT_HAI', 'HAI_MOT', 'BAC_THANG', 'NAM_O',
  'KHUNG_DOI', 'BA_TANG', 'GHEP_HINH', 'DOC_NGANG', 'VIEN_LON',
];

export function layoutByCode(code: string): SpreadLayout {
  return SPREAD_LAYOUTS.find((l) => l.code === code) ?? SPREAD_LAYOUTS[0];
}

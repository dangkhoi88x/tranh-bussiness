import { DEFAULT_CYCLE } from './spreadLayouts';

export type PresetCaption = {
  spreadIndex: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type PhotobookTemplate = {
  id: string;
  name: string;
  icon: string;
  defaultFont: string;
  defaultCaptionColor: string;
  spreadColors: string[];
  layoutCycle: string[];
  presetCaptions: PresetCaption[];
};

export const PHOTOBOOK_TEMPLATES: PhotobookTemplate[] = [
  {
    id: 'free',
    name: 'Tự do',
    icon: '✨',
    defaultFont: 'Archivo',
    defaultCaptionColor: '#1a1a1a',
    spreadColors: ['#ffffff'],
    layoutCycle: DEFAULT_CYCLE,
    presetCaptions: [],
  },
  {
    id: 'wedding',
    name: 'Đám cưới',
    icon: '💒',
    defaultFont: 'Great Vibes',
    defaultCaptionColor: '#8b4513',
    spreadColors: ['#fdf8f4', '#fef0f0', '#fdf8f4', '#ffffff'],
    layoutCycle: [
      'TRAN_DOI', 'VIEN_LON', 'DOI_CAN', 'KHOI_MAU',
      'MOT_LON_MOT_NHO', 'KHUNG_DOI', 'BA_TAM', 'PANORAMA',
      'DOI_CAN', 'VIEN_LON', 'BON_O', 'TRAN_DOI',
      'BA_NGANG', 'KHOI_MAU', 'DOC_NGANG', 'VIEN_LON',
      'MOT_HAI', 'KHUNG_DOI', 'TRAN_DOI', 'VIEN_LON',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Ngày cưới', fontSize: 6, fontFamily: 'Great Vibes', color: '#8b4513', align: 'center' },
    ],
  },
  {
    id: 'baby',
    name: 'Em bé',
    icon: '🍼',
    defaultFont: 'Quicksand',
    defaultCaptionColor: '#2c3e50',
    spreadColors: ['#f0f7ff', '#fff5f5', '#fefce8', '#f0fdf4'],
    layoutCycle: [
      'TRAN_DOI', 'BON_O', 'BA_TAM', 'KHOI_MAU',
      'SAU_O', 'GHEP_HINH', 'DOI_CAN', 'MOT_LON_MOT_NHO',
      'CONTACT_SHEET', 'VIEN_LON', 'NAM_O', 'BA_NGANG',
      'BON_O', 'KHOI_MAU', 'TRAN_DOI', 'GHEP_HINH',
      'DOI_CAN', 'SAU_O', 'BA_TAM', 'VIEN_LON',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Chào thế giới!', fontSize: 6, fontFamily: 'Quicksand', color: '#2c3e50', align: 'center' },
    ],
  },
  {
    id: 'travel',
    name: 'Du lịch',
    icon: '✈️',
    defaultFont: 'Montserrat',
    defaultCaptionColor: '#1a1a1a',
    spreadColors: ['#ffffff', '#f8f9fa', '#ffffff', '#f8f9fa'],
    layoutCycle: [
      'PANORAMA', 'TRAN_DOI', 'BA_NGANG', 'CONTACT_SHEET',
      'MOT_HAI', 'DOI_CAN', 'GHEP_HINH', 'KHOI_MAU',
      'HAI_MOT', 'BAC_THANG', 'TRAN_DOI', 'SAU_O',
      'PANORAMA', 'NAM_O', 'BA_TANG', 'DOI_CAN',
      'TRAN_DOI', 'CONTACT_SHEET', 'GHEP_HINH', 'PANORAMA',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Hành trình', fontSize: 8, fontFamily: 'Montserrat', color: '#1a1a1a', align: 'center' },
    ],
  },
  {
    id: 'graduation',
    name: 'Tốt nghiệp',
    icon: '🎓',
    defaultFont: 'Playfair Display',
    defaultCaptionColor: '#1a365d',
    spreadColors: ['#f0f4f8', '#fefce8', '#f0f4f8', '#ffffff'],
    layoutCycle: [
      'VIEN_LON', 'DOI_CAN', 'MOT_LON_MOT_NHO', 'KHOI_MAU',
      'BA_TAM', 'TRAN_DOI', 'BON_O', 'PANORAMA',
      'KHUNG_DOI', 'DOC_NGANG', 'BA_NGANG', 'VIEN_LON',
      'MOT_HAI', 'DOI_CAN', 'TRAN_DOI', 'KHOI_MAU',
      'NAM_O', 'VIEN_LON', 'GHEP_HINH', 'TRAN_DOI',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Ngày tốt nghiệp', fontSize: 6, fontFamily: 'Playfair Display', color: '#1a365d', align: 'center' },
    ],
  },
  {
    id: 'family',
    name: 'Gia đình',
    icon: '🏠',
    defaultFont: 'Lora',
    defaultCaptionColor: '#5d4037',
    spreadColors: ['#fdf8f0', '#f5f0eb', '#fdf8f0', '#ffffff'],
    layoutCycle: [
      'DOI_CAN', 'BON_O', 'BA_TAM', 'KHOI_MAU',
      'GHEP_HINH', 'TRAN_DOI', 'MOT_LON_MOT_NHO', 'SAU_O',
      'KHUNG_DOI', 'DOC_NGANG', 'VIEN_LON', 'BA_NGANG',
      'DOI_CAN', 'NAM_O', 'MOT_HAI', 'KHOI_MAU',
      'BON_O', 'TRAN_DOI', 'GHEP_HINH', 'VIEN_LON',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Gia đình mình', fontSize: 6, fontFamily: 'Lora', color: '#5d4037', align: 'center' },
    ],
  },
  {
    id: 'birthday',
    name: 'Sinh nhật',
    icon: '🎂',
    defaultFont: 'Pacifico',
    defaultCaptionColor: '#7b2d8e',
    spreadColors: ['#fef5ff', '#fff0f3', '#f5f0ff', '#fffbeb'],
    layoutCycle: [
      'TRAN_DOI', 'SAU_O', 'BA_NGANG', 'KHOI_MAU',
      'GHEP_HINH', 'DOI_CAN', 'BON_O', 'MOT_LON_MOT_NHO',
      'CONTACT_SHEET', 'VIEN_LON', 'NAM_O', 'BA_TAM',
      'TRAN_DOI', 'HAI_MOT', 'GHEP_HINH', 'KHOI_MAU',
      'DOI_CAN', 'SAU_O', 'BA_NGANG', 'VIEN_LON',
    ],
    presetCaptions: [
      { spreadIndex: 0, text: 'Happy Birthday!', fontSize: 6, fontFamily: 'Pacifico', color: '#7b2d8e', align: 'center' },
    ],
  },
];

export function templateById(id: string): PhotobookTemplate {
  return PHOTOBOOK_TEMPLATES.find((t) => t.id === id) ?? PHOTOBOOK_TEMPLATES[0];
}

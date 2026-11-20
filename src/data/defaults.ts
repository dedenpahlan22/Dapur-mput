import type { MenuAddon, MenuVariant } from '../types/mputpos';

export const DEFAULT_LOGO_URL = '/src/assets/images/mputpos_logo_1794996347197.jpg';

export interface DefaultMenuSeed {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string;
  variants: MenuVariant[];
  addons: MenuAddon[];
  sortOrder: number;
}

export const DEFAULT_MENU_ITEMS: DefaultMenuSeed[] = [
  {
    id: 'menu_tahu_walik',
    name: 'Tahu Walik',
    basePrice: 12000,
    imageUrl: '/src/assets/images/menu_tahu_walik_1794996347559.jpg',
    variants: [
      { id: 'var_matang', name: 'Matang', priceDelta: 0 },
      { id: 'var_mentah', name: 'Mentah', priceDelta: 0 },
    ],
    addons: [],
    sortOrder: 1,
  },
  {
    id: 'menu_tahu_kocek',
    name: 'Tahu Kocek',
    basePrice: 10000,
    imageUrl: '/src/assets/images/menu_tahu_kocek_1794996348676.jpg',
    variants: [{ id: 'var_normal', name: 'Normal', priceDelta: 0 }],
    addons: [
      { id: 'add_porsi_plus', name: 'Porsi ++', price: 3000 },
      { id: 'add_cabe_plus', name: 'Cabe ++', price: 1000 },
    ],
    sortOrder: 2,
  },
  {
    id: 'menu_tahu_seuhah',
    name: 'Tahu Seuhah',
    basePrice: 12000,
    imageUrl: '/src/assets/images/menu_tahu_seuhah_1794996349128.jpg',
    variants: [],
    addons: [],
    sortOrder: 3,
  },
  {
    id: 'menu_mango_sago',
    name: 'Mango Sago',
    basePrice: 15000,
    imageUrl: '/src/assets/images/menu_mango_sago_1794996350860.jpg',
    variants: [],
    addons: [],
    sortOrder: 4,
  },
];

export const DEFAULT_SHEETS = [
  { id: 'sheet_tgl_11', name: 'Tanggal 11', dateLabel: '11 Nov', sortOrder: 1 },
  { id: 'sheet_tgl_12', name: 'Tanggal 12', dateLabel: '12 Nov', sortOrder: 2 },
];

export const DEFAULT_AREAS = [
  { id: 'area_a', name: 'Area A', sortOrder: 1 },
  { id: 'area_b', name: 'Area B', sortOrder: 2 },
  { id: 'area_c', name: 'Area C', sortOrder: 3 },
  { id: 'area_pickup', name: 'Ambil Sendiri', sortOrder: 4 },
];

export const DEFAULT_INGREDIENT_TEMPLATES = [
  { name: 'Terigu', unitNote: '1 kg', amount: 13000 },
  { name: 'Sagu', unitNote: '1 kg', amount: 14000 },
  { name: 'Tahu', unitNote: '1 papan / paket', amount: 25000 },
  { name: 'Ayam', unitNote: '1/2 kg', amount: 20000 },
];

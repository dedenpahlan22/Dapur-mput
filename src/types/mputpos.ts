import type { Timestamp } from 'firebase/firestore';

export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  STORE_NAME_MAX: 80,
  LOGO_URL_MAX: 220000,
  OWNER_NAME_MAX: 100,
  OWNER_EMAIL_MAX: 150,
  SHEET_NAME_MAX: 60,
  DATE_LABEL_MAX: 30,
  AREA_NAME_MAX: 50,
  MENU_NAME_MAX: 80,
  IMAGE_URL_MAX: 220000,
  VARIANTS_MAX: 20,
  ADDONS_MAX: 20,
  CUSTOMER_NAME_MAX: 100,
  ORDER_ITEMS_MAX: 50,
  NOTES_MAX: 500,
  EXPENSE_NAME_MAX: 80,
  UNIT_NOTE_MAX: 40,
} as const;

export interface MenuVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
}

export interface UserStore {
  id: string;
  ownerId: string;
  storeName: string;
  logoUrl: string;
  ownerName: string;
  ownerEmail: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Sheet {
  id: string;
  ownerId: string;
  name: string;
  dateLabel: string;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Area {
  id: string;
  ownerId: string;
  name: string;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MenuItem {
  id: string;
  ownerId: string;
  name: string;
  basePrice: number;
  imageUrl: string;
  variants: MenuVariant[];
  addons: MenuAddon[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrderItem {
  lineId: string;
  menuItemId: string;
  menuName: string;
  variantName: string;
  addonNames: string[];
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  ownerId: string;
  sheetId: string;
  areaId: string;
  areaName: string;
  customerName: string;
  items: OrderItem[];
  notes: string;
  isPaid: boolean;
  totalAmount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Expense {
  id: string;
  ownerId: string;
  sheetId: string;
  name: string;
  unitNote: string;
  amount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type AppTab = 'orders' | 'dashboard' | 'menu' | 'settings';

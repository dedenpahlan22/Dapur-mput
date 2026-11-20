import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_AREAS,
  DEFAULT_INGREDIENT_TEMPLATES,
  DEFAULT_LOGO_URL,
  DEFAULT_MENU_ITEMS,
  DEFAULT_SHEETS,
} from '../data/defaults';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  resolvePendingRedirectAuth,
  signInWithGoogle,
  signOutUser,
  testConnection,
} from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  type Area,
  type Expense,
  type MenuAddon,
  type MenuItem,
  type MenuVariant,
  type Order,
  type OrderItem,
  type Sheet,
  type UserStore,
} from '../types/mputpos';
import {
  createSafeId,
  sanitizeNonNegNumber,
  sanitizeStr,
} from '../utils/format';

interface OrderInput {
  sheetId: string;
  areaId: string;
  areaName: string;
  customerName: string;
  items: OrderItem[];
  notes: string;
  isPaid: boolean;
}

interface MenuItemInput {
  name: string;
  basePrice: number;
  imageUrl: string;
  variants: MenuVariant[];
  addons: MenuAddon[];
  isActive: boolean;
}

interface ExpenseInput {
  sheetId: string;
  name: string;
  unitNote: string;
  amount: number;
}

interface StoreContextValue {
  user: User | null;
  authReady: boolean;
  dataReady: boolean;
  store: UserStore | null;
  sheets: Sheet[];
  areas: Area[];
  menuItems: MenuItem[];
  orders: Order[];
  expenses: Expense[];
  activeSheetId: string;
  setActiveSheetId: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateStoreBranding: (storeName: string, logoUrl: string) => Promise<void>;
  createSheet: (name: string, dateLabel?: string) => Promise<string>;
  renameSheet: (sheetId: string, name: string, dateLabel?: string) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;
  createArea: (name: string) => Promise<string>;
  renameArea: (areaId: string, name: string) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
  createMenuItem: (input: MenuItemInput) => Promise<void>;
  updateMenuItem: (menuItemId: string, input: MenuItemInput) => Promise<void>;
  deleteMenuItem: (menuItemId: string) => Promise<void>;
  createOrder: (input: OrderInput) => Promise<void>;
  updateOrder: (orderId: string, input: OrderInput) => Promise<void>;
  toggleOrderPaid: (orderId: string, isPaid: boolean) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  createExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (expenseId: string, input: Omit<ExpenseInput, 'sheetId'>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  seedBasicIngredientsForSheet: (sheetId: string) => Promise<void>;
  copyExpensesFromSheet: (fromSheetId: string, toSheetId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [store, setStore] = useState<UserStore | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');

  if (fatalError) {
    throw fatalError;
  }

  useEffect(() => {
    testConnection();
    resolvePendingRedirectAuth();
  }, []);

  const ensureUserInitialized = useCallback(async (firebaseUser: User) => {
    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);

    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          ownerId: uid,
          storeName: 'MputPos',
          logoUrl: DEFAULT_LOGO_URL,
          ownerName: sanitizeStr(
            firebaseUser.displayName || 'Penjual MputPos',
            BLUEPRINT_LIMITS.OWNER_NAME_MAX
          ),
          ownerEmail: sanitizeStr(
            firebaseUser.email || '',
            BLUEPRINT_LIMITS.OWNER_EMAIL_MAX
          ),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const batch = writeBatch(db);

        for (const s of DEFAULT_SHEETS) {
          batch.set(doc(db, 'users', uid, 'sheets', s.id), {
            ownerId: uid,
            name: s.name,
            dateLabel: s.dateLabel,
            sortOrder: s.sortOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const a of DEFAULT_AREAS) {
          batch.set(doc(db, 'users', uid, 'areas', a.id), {
            ownerId: uid,
            name: a.name,
            sortOrder: a.sortOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const m of DEFAULT_MENU_ITEMS) {
          batch.set(doc(db, 'users', uid, 'menuItems', m.id), {
            ownerId: uid,
            name: m.name,
            basePrice: m.basePrice,
            imageUrl: m.imageUrl,
            variants: m.variants,
            addons: m.addons,
            isActive: true,
            sortOrder: m.sortOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        for (const ing of DEFAULT_INGREDIENT_TEMPLATES) {
          const expId = createSafeId('exp');
          batch.set(doc(db, 'users', uid, 'expenses', expId), {
            ownerId: uid,
            sheetId: DEFAULT_SHEETS[0].id,
            name: ing.name,
            unitNote: ing.unitNote,
            amount: ing.amount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await ensureUserInitialized(firebaseUser);
          setUser(firebaseUser);
        } catch (err) {
          setFatalError(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      } else {
        setUser(null);
        setStore(null);
        setSheets([]);
        setAreas([]);
        setMenuItems([]);
        setOrders([]);
        setExpenses([]);
        setActiveSheetId('');
        setDataReady(false);
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, [ensureUserInitialized]);

  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const loadedFlags = {
      store: false,
      sheets: false,
      areas: false,
      menu: false,
      orders: false,
      expenses: false,
    };

    const checkAllLoaded = () => {
      if (
        loadedFlags.store &&
        loadedFlags.sheets &&
        loadedFlags.areas &&
        loadedFlags.menu &&
        loadedFlags.orders &&
        loadedFlags.expenses
      ) {
        setDataReady(true);
      }
    };

    const captureSnapshotError = (
      error: unknown,
      op: OperationType,
      path: string
    ) => {
      try {
        handleFirestoreError(error, op, path);
      } catch (wrapped) {
        setFatalError(
          wrapped instanceof Error ? wrapped : new Error(String(wrapped))
        );
      }
    };

    const unsubStore = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setStore({ id: snap.id, ...(snap.data() as Omit<UserStore, 'id'>) });
        }
        loadedFlags.store = true;
        checkAllLoaded();
      },
      (err) => captureSnapshotError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubSheets = onSnapshot(
      query(
        collection(db, 'users', uid, 'sheets'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Sheet, 'id'>) }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setSheets(list);
        setActiveSheetId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0]?.id || '';
        });
        loadedFlags.sheets = true;
        checkAllLoaded();
      },
      (err) =>
        captureSnapshotError(err, OperationType.LIST, `users/${uid}/sheets`)
    );

    const unsubAreas = onSnapshot(
      query(
        collection(db, 'users', uid, 'areas'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Area, 'id'>) }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setAreas(list);
        loadedFlags.areas = true;
        checkAllLoaded();
      },
      (err) =>
        captureSnapshotError(err, OperationType.LIST, `users/${uid}/areas`)
    );

    const unsubMenu = onSnapshot(
      query(
        collection(db, 'users', uid, 'menuItems'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<MenuItem, 'id'>) }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setMenuItems(list);
        loadedFlags.menu = true;
        checkAllLoaded();
      },
      (err) =>
        captureSnapshotError(err, OperationType.LIST, `users/${uid}/menuItems`)
    );

    const unsubOrders = onSnapshot(
      query(
        collection(db, 'users', uid, 'orders'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? Date.now();
            const tb = b.createdAt?.toMillis?.() ?? Date.now();
            return tb - ta;
          });
        setOrders(list);
        loadedFlags.orders = true;
        checkAllLoaded();
      },
      (err) =>
        captureSnapshotError(err, OperationType.LIST, `users/${uid}/orders`)
    );

    const unsubExpenses = onSnapshot(
      query(
        collection(db, 'users', uid, 'expenses'),
        where('ownerId', '==', uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? Date.now();
            const tb = b.createdAt?.toMillis?.() ?? Date.now();
            return ta - tb;
          });
        setExpenses(list);
        loadedFlags.expenses = true;
        checkAllLoaded();
      },
      (err) =>
        captureSnapshotError(err, OperationType.LIST, `users/${uid}/expenses`)
    );

    return () => {
      unsubStore();
      unsubSheets();
      unsubAreas();
      unsubMenu();
      unsubOrders();
      unsubExpenses();
    };
  }, [authReady, user]);

  const loginWithGoogle = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
  }, []);

  const updateStoreBranding = useCallback(
    async (storeName: string, logoUrl: string) => {
      if (!user) return;
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          storeName:
            sanitizeStr(storeName, BLUEPRINT_LIMITS.STORE_NAME_MAX) ||
            'MputPos',
          logoUrl: logoUrl.slice(0, BLUEPRINT_LIMITS.LOGO_URL_MAX),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const createSheet = useCallback(
    async (name: string, dateLabel = '') => {
      if (!user) return '';
      const id = createSafeId('sheet');
      const path = `users/${user.uid}/sheets/${id}`;
      const nextSort =
        sheets.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1;
      try {
        await setDoc(doc(db, 'users', user.uid, 'sheets', id), {
          ownerId: user.uid,
          name:
            sanitizeStr(name, BLUEPRINT_LIMITS.SHEET_NAME_MAX) || 'Sheet Baru',
          dateLabel: sanitizeStr(dateLabel, BLUEPRINT_LIMITS.DATE_LABEL_MAX),
          sortOrder: nextSort,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveSheetId(id);
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user, sheets]
  );

  const renameSheet = useCallback(
    async (sheetId: string, name: string, dateLabel = '') => {
      if (!user) return;
      const path = `users/${user.uid}/sheets/${sheetId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'sheets', sheetId), {
          name:
            sanitizeStr(name, BLUEPRINT_LIMITS.SHEET_NAME_MAX) || 'Sheet',
          dateLabel: sanitizeStr(dateLabel, BLUEPRINT_LIMITS.DATE_LABEL_MAX),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteSheet = useCallback(
    async (sheetId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/sheets/${sheetId}`;
      try {
        const batch = writeBatch(db);
        for (const o of orders.filter((ord) => ord.sheetId === sheetId)) {
          batch.delete(doc(db, 'users', user.uid, 'orders', o.id));
        }
        for (const e of expenses.filter((exp) => exp.sheetId === sheetId)) {
          batch.delete(doc(db, 'users', user.uid, 'expenses', e.id));
        }
        batch.delete(doc(db, 'users', user.uid, 'sheets', sheetId));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user, orders, expenses]
  );

  const createArea = useCallback(
    async (name: string) => {
      if (!user) return '';
      const id = createSafeId('area');
      const path = `users/${user.uid}/areas/${id}`;
      const nextSort =
        areas.reduce((max, a) => Math.max(max, a.sortOrder), 0) + 1;
      try {
        await setDoc(doc(db, 'users', user.uid, 'areas', id), {
          ownerId: user.uid,
          name:
            sanitizeStr(name, BLUEPRINT_LIMITS.AREA_NAME_MAX) || 'Area Baru',
          sortOrder: nextSort,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user, areas]
  );

  const renameArea = useCallback(
    async (areaId: string, name: string) => {
      if (!user) return;
      const cleanName =
        sanitizeStr(name, BLUEPRINT_LIMITS.AREA_NAME_MAX) || 'Area';
      const path = `users/${user.uid}/areas/${areaId}`;
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', user.uid, 'areas', areaId), {
          name: cleanName,
          updatedAt: serverTimestamp(),
        });
        for (const ord of orders.filter((o) => o.areaId === areaId)) {
          batch.update(doc(db, 'users', user.uid, 'orders', ord.id), {
            areaName: cleanName,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user, orders]
  );

  const deleteArea = useCallback(
    async (areaId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/areas/${areaId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'areas', areaId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const createMenuItem = useCallback(
    async (input: MenuItemInput) => {
      if (!user) return;
      const id = createSafeId('menu');
      const path = `users/${user.uid}/menuItems/${id}`;
      const nextSort =
        menuItems.reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1;
      try {
        await setDoc(doc(db, 'users', user.uid, 'menuItems', id), {
          ownerId: user.uid,
          name:
            sanitizeStr(input.name, BLUEPRINT_LIMITS.MENU_NAME_MAX) ||
            'Menu Baru',
          basePrice: sanitizeNonNegNumber(input.basePrice),
          imageUrl: (input.imageUrl || '').slice(
            0,
            BLUEPRINT_LIMITS.IMAGE_URL_MAX
          ),
          variants: input.variants.slice(0, BLUEPRINT_LIMITS.VARIANTS_MAX),
          addons: input.addons.slice(0, BLUEPRINT_LIMITS.ADDONS_MAX),
          isActive: Boolean(input.isActive),
          sortOrder: nextSort,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user, menuItems]
  );

  const updateMenuItem = useCallback(
    async (menuItemId: string, input: MenuItemInput) => {
      if (!user) return;
      const path = `users/${user.uid}/menuItems/${menuItemId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'menuItems', menuItemId), {
          name:
            sanitizeStr(input.name, BLUEPRINT_LIMITS.MENU_NAME_MAX) || 'Menu',
          basePrice: sanitizeNonNegNumber(input.basePrice),
          imageUrl: (input.imageUrl || '').slice(
            0,
            BLUEPRINT_LIMITS.IMAGE_URL_MAX
          ),
          variants: input.variants.slice(0, BLUEPRINT_LIMITS.VARIANTS_MAX),
          addons: input.addons.slice(0, BLUEPRINT_LIMITS.ADDONS_MAX),
          isActive: Boolean(input.isActive),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteMenuItem = useCallback(
    async (menuItemId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/menuItems/${menuItemId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'menuItems', menuItemId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const createOrder = useCallback(
    async (input: OrderInput) => {
      if (!user) return;
      const id = createSafeId('ord');
      const path = `users/${user.uid}/orders/${id}`;
      const cleanItems = input.items
        .slice(0, BLUEPRINT_LIMITS.ORDER_ITEMS_MAX)
        .map((it) => {
          const qty = Math.max(1, sanitizeNonNegNumber(it.qty));
          const unitPrice = sanitizeNonNegNumber(it.unitPrice);
          return {
            ...it,
            qty,
            unitPrice,
            subtotal: qty * unitPrice,
          };
        });
      const totalAmount = cleanItems.reduce((sum, it) => sum + it.subtotal, 0);

      try {
        await setDoc(doc(db, 'users', user.uid, 'orders', id), {
          ownerId: user.uid,
          sheetId: input.sheetId,
          areaId: input.areaId,
          areaName: sanitizeStr(input.areaName, BLUEPRINT_LIMITS.AREA_NAME_MAX),
          customerName:
            sanitizeStr(
              input.customerName,
              BLUEPRINT_LIMITS.CUSTOMER_NAME_MAX
            ) || 'Pelanggan',
          items: cleanItems,
          notes: sanitizeStr(input.notes, BLUEPRINT_LIMITS.NOTES_MAX),
          isPaid: Boolean(input.isPaid),
          totalAmount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const updateOrder = useCallback(
    async (orderId: string, input: OrderInput) => {
      if (!user) return;
      const path = `users/${user.uid}/orders/${orderId}`;
      const cleanItems = input.items
        .slice(0, BLUEPRINT_LIMITS.ORDER_ITEMS_MAX)
        .map((it) => {
          const qty = Math.max(1, sanitizeNonNegNumber(it.qty));
          const unitPrice = sanitizeNonNegNumber(it.unitPrice);
          return {
            ...it,
            qty,
            unitPrice,
            subtotal: qty * unitPrice,
          };
        });
      const totalAmount = cleanItems.reduce((sum, it) => sum + it.subtotal, 0);

      try {
        await updateDoc(doc(db, 'users', user.uid, 'orders', orderId), {
          sheetId: input.sheetId,
          areaId: input.areaId,
          areaName: sanitizeStr(input.areaName, BLUEPRINT_LIMITS.AREA_NAME_MAX),
          customerName:
            sanitizeStr(
              input.customerName,
              BLUEPRINT_LIMITS.CUSTOMER_NAME_MAX
            ) || 'Pelanggan',
          items: cleanItems,
          notes: sanitizeStr(input.notes, BLUEPRINT_LIMITS.NOTES_MAX),
          isPaid: Boolean(input.isPaid),
          totalAmount,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const toggleOrderPaid = useCallback(
    async (orderId: string, isPaid: boolean) => {
      if (!user) return;
      const path = `users/${user.uid}/orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'orders', orderId), {
          isPaid: Boolean(isPaid),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/orders/${orderId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'orders', orderId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const createExpense = useCallback(
    async (input: ExpenseInput) => {
      if (!user) return;
      const id = createSafeId('exp');
      const path = `users/${user.uid}/expenses/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'expenses', id), {
          ownerId: user.uid,
          sheetId: input.sheetId,
          name:
            sanitizeStr(input.name, BLUEPRINT_LIMITS.EXPENSE_NAME_MAX) ||
            'Bahan',
          unitNote: sanitizeStr(input.unitNote, BLUEPRINT_LIMITS.UNIT_NOTE_MAX),
          amount: sanitizeNonNegNumber(input.amount),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const updateExpense = useCallback(
    async (expenseId: string, input: Omit<ExpenseInput, 'sheetId'>) => {
      if (!user) return;
      const path = `users/${user.uid}/expenses/${expenseId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'expenses', expenseId), {
          name:
            sanitizeStr(input.name, BLUEPRINT_LIMITS.EXPENSE_NAME_MAX) ||
            'Bahan',
          unitNote: sanitizeStr(input.unitNote, BLUEPRINT_LIMITS.UNIT_NOTE_MAX),
          amount: sanitizeNonNegNumber(input.amount),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/expenses/${expenseId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', expenseId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const seedBasicIngredientsForSheet = useCallback(
    async (sheetId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/expenses`;
      try {
        const batch = writeBatch(db);
        for (const ing of DEFAULT_INGREDIENT_TEMPLATES) {
          const id = createSafeId('exp');
          batch.set(doc(db, 'users', user.uid, 'expenses', id), {
            ownerId: user.uid,
            sheetId,
            name: ing.name,
            unitNote: ing.unitNote,
            amount: ing.amount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const copyExpensesFromSheet = useCallback(
    async (fromSheetId: string, toSheetId: string) => {
      if (!user) return;
      const source = expenses.filter((e) => e.sheetId === fromSheetId);
      if (source.length === 0) return;
      const path = `users/${user.uid}/expenses`;
      try {
        const batch = writeBatch(db);
        for (const exp of source) {
          const id = createSafeId('exp');
          batch.set(doc(db, 'users', user.uid, 'expenses', id), {
            ownerId: user.uid,
            sheetId: toSheetId,
            name: sanitizeStr(exp.name, BLUEPRINT_LIMITS.EXPENSE_NAME_MAX),
            unitNote: sanitizeStr(exp.unitNote, BLUEPRINT_LIMITS.UNIT_NOTE_MAX),
            amount: sanitizeNonNegNumber(exp.amount),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user, expenses]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      user,
      authReady,
      dataReady,
      store,
      sheets,
      areas,
      menuItems,
      orders,
      expenses,
      activeSheetId,
      setActiveSheetId,
      loginWithGoogle,
      logout,
      updateStoreBranding,
      createSheet,
      renameSheet,
      deleteSheet,
      createArea,
      renameArea,
      deleteArea,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
      createOrder,
      updateOrder,
      toggleOrderPaid,
      deleteOrder,
      createExpense,
      updateExpense,
      deleteExpense,
      seedBasicIngredientsForSheet,
      copyExpensesFromSheet,
    }),
    [
      user,
      authReady,
      dataReady,
      store,
      sheets,
      areas,
      menuItems,
      orders,
      expenses,
      activeSheetId,
      loginWithGoogle,
      logout,
      updateStoreBranding,
      createSheet,
      renameSheet,
      deleteSheet,
      createArea,
      renameArea,
      deleteArea,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
      createOrder,
      updateOrder,
      toggleOrderPaid,
      deleteOrder,
      createExpense,
      updateExpense,
      deleteExpense,
      seedBasicIngredientsForSheet,
      copyExpensesFromSheet,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}

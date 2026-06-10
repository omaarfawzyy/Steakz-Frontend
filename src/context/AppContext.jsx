import { createContext, useContext, useEffect, useState } from 'react';
import { createId } from '../lib/utils';
import { branchOptions, getInitialStore, menuItems as seededMenuItems } from '../data/mockData';
import {
  AUTH_TOKEN_KEY,
  authApi,
  branchesApi,
  menuApi,
  bookingsApi,
  ordersApi,
  shiftsApi,
  staffApi,
  usersApi,
} from '../lib/api';

const STORE_KEY = 'steakz-store-v3-london';
const SESSION_KEY = 'steakz-session-v2';
const BRANCH_KEY = 'steakz-branch-v2-london';
const ALL_BRANCHES_ID = 'all-branches';

const AppContext = createContext(null);

const BRANCH_CODE_TO_FRONTEND_ID = {
  'STK-DOH-01': 'west-bay',
  'STK-LUS-01': 'lusail-marina',
  'STK-PRL-01': 'the-pearl',
  'STK-WKR-01': 'al-wakrah',
  'STK-RYN-01': 'al-rayyan',
};

function loadJson(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function collectionFromResponse(response, key, fallback) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.[key])) {
    return response[key];
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return fallback;
}

function getFrontendBranchId(branch) {
  return BRANCH_CODE_TO_FRONTEND_ID[branch?.code] ?? branch?.id;
}

function normalizeBranch(branch) {
  const frontendId = getFrontendBranchId(branch);
  const baseBranch = branchOptions.find((option) => option.id === frontendId) ?? {};
  const cityLabel = branch?.city ? `${branch.city} dining district` : undefined;

  return {
    ...baseBranch,
    ...branch,
    id: frontendId,
    backendId: branch?.backendId ?? branch?.id,
    district: branch?.district ?? baseBranch.district ?? cityLabel ?? 'London dining district',
    address: branch?.address ?? baseBranch.address ?? 'London',
    phone: branch?.phone ?? baseBranch.phone ?? '+44 20 7946 1100',
    hours: branch?.hours ?? baseBranch.hours ?? '12:00 PM - 12:00 AM',
    signature: branch?.signature ?? baseBranch.signature ?? 'Premium Steakz dining experience',
    spotlight: branch?.spotlight ?? baseBranch.spotlight ?? 'Luxury steakhouse service with smooth reservations.',
    image: baseBranch.image ?? branch?.image ?? null,
    capacity: Number(branch?.capacity ?? baseBranch.capacity ?? 80),
    features: Array.isArray(branch?.features)
      ? branch.features
      : baseBranch.features ?? ['Reservations', 'Premium dining', 'Family seating'],
  };
}

function createBranchLookup(branches) {
  return new Map(
    branches.map((branch) => [branch.backendId ?? branch.id, branch.id]),
  );
}

function normalizeCategory(category, name) {
  if (category && category !== 'Main') {
    return category;
  }

  return /steak|ribeye|sirloin|tenderloin|wagyu/i.test(name ?? '')
    ? 'Steaks'
    : 'Signature Plates';
}

function normalizeCatalogText(value) {
  return value?.toString().trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function findSeedMenuItem(item) {
  if (!item) {
    return null;
  }

  const exactMatch = seededMenuItems.find((seedItem) => seedItem.id === item.id);
  if (exactMatch) {
    return exactMatch;
  }

  const itemLabel = normalizeCatalogText(item.title ?? item.name);
  if (!itemLabel) {
    return null;
  }

  return seededMenuItems.find((seedItem) => (
    normalizeCatalogText(seedItem.title) === itemLabel
    || normalizeCatalogText(seedItem.name) === itemLabel
  )) ?? null;
}

const fallbackMenuImageByCategory = Object.freeze({
  Starters: seededMenuItems.find((item) => item.category === 'Starters')?.image ?? null,
  Steaks: seededMenuItems.find((item) => item.category === 'Steaks')?.image ?? null,
  'Signature Plates': seededMenuItems.find((item) => item.category === 'Signature Plates')?.image ?? null,
  Sides: seededMenuItems.find((item) => item.category === 'Sides')?.image ?? null,
  Desserts: seededMenuItems.find((item) => item.category === 'Desserts')?.image ?? null,
  Beverages: seededMenuItems.find((item) => item.category === 'Beverages')?.image ?? null,
});

function resolveMenuItemImage(item, baseItem, category) {
  return item?.image
    ?? baseItem?.image
    ?? fallbackMenuImageByCategory[category]
    ?? fallbackMenuImageByCategory['Signature Plates']
    ?? null;
}

function normalizeMenuItem(item, branches) {
  const branchLookup = createBranchLookup(branches);
  const baseItem = findSeedMenuItem(item) ?? {};
  const frontendBranchId = branchLookup.get(item?.branchId) ?? item?.branchId;
  const title = item?.title ?? item?.name ?? baseItem.title ?? 'Steakz menu item';
  const category = normalizeCategory(item?.category ?? baseItem.category, title);
  const availableAt = Array.isArray(item?.availableAt)
    ? item.availableAt
    : item?.branchId
      ? [frontendBranchId].filter(Boolean)
      : Array.isArray(baseItem.availableAt)
      ? baseItem.availableAt
      : [frontendBranchId].filter(Boolean);

  return {
    ...baseItem,
    ...item,
    id: item?.id ?? baseItem.id ?? createId('menu'),
    title,
    name: item?.name ?? title,
    category,
    description: item?.description ?? baseItem.description ?? 'A Steakz signature item prepared for the selected branch.',
    price: Number(item?.price ?? baseItem.price ?? 0),
    branchId: frontendBranchId,
    backendBranchId: item?.backendBranchId ?? item?.branchId,
    availableAt: availableAt.map((branchId) => branchLookup.get(branchId) ?? branchId).filter(Boolean),
    badge: item?.badge ?? baseItem.badge ?? 'From kitchen',
    image: resolveMenuItemImage(item, baseItem, category),
  };
}

function normalizeBooking(booking, branches) {
  const branchLookup = createBranchLookup(branches);
  const frontendBranchId = branchLookup.get(booking?.branchId) ?? booking?.branchId;

  return {
    ...booking,
    id: booking?.id ?? createId('booking'),
    backendId: booking?.backendId ?? booking?.id,
    branchId: frontendBranchId,
    backendBranchId: booking?.backendBranchId ?? booking?.branchId,
    customerName: booking?.customerName ?? 'Guest',
    customerEmail: booking?.customerEmail ?? '',
    partySize: Number(booking?.partySize ?? 1),
    dateTime: booking?.dateTime ?? booking?.bookingTime ?? new Date().toISOString(),
    status: humanizeEnum(booking?.status, 'Pending'),
    occasion: booking?.occasion ?? booking?.specialRequests ?? 'Dining',
  };
}

function humanizeEnum(value, fallback = '') {
  if (!value) {
    return fallback;
  }

  return value
    .toString()
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toDisplayOrderType(type) {
  const typeMap = {
    DINE_IN: 'Dine-in',
    TAKEAWAY: 'Pickup',
    DELIVERY: 'Pickup',
  };

  return typeMap[type] ?? type ?? 'Dine-in';
}

function toBackendOrderType(type) {
  const typeMap = {
    'Dine-in': 'DINE_IN',
    Pickup: 'TAKEAWAY',
  };

  return typeMap[type] ?? type;
}

function toBackendOrderStatus(status) {
  const statusMap = {
    Pending: 'PENDING',
    Preparing: 'PREPARING',
    Ready: 'READY',
    Completed: 'COMPLETED',
    Cancelled: 'CANCELLED',
  };

  return statusMap[status] ?? status;
}

function toBackendBookingStatus(status) {
  const statusMap = {
    Pending: 'PENDING',
    Confirmed: 'CONFIRMED',
    Cancelled: 'CANCELLED',
    Completed: 'COMPLETED',
  };

  return statusMap[status] ?? status;
}

function normalizeOrder(order, branches, fallbackItems = []) {
  const branchLookup = createBranchLookup(branches);
  const frontendBranchId = branchLookup.get(order?.branchId) ?? order?.branchId;
  const orderItems = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const items = orderItems.length
    ? orderItems.map((lineItem) => ({
      menuItemId: lineItem.menuItemId,
      title: lineItem.menuItem?.name ?? lineItem.title ?? lineItem.menuItemId,
      quantity: Number(lineItem.quantity ?? 1),
      price: Number(lineItem.unitPrice ?? lineItem.price ?? 0),
    }))
    : fallbackItems;
  const total = Number(
    order?.total
    ?? order?.totalAmount
    ?? items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.price ?? 0), 0),
  );

  return {
    ...order,
    id: order?.id ?? createId('order'),
    backendId: order?.backendId ?? order?.id,
    branchId: frontendBranchId,
    backendBranchId: order?.backendBranchId ?? order?.branchId,
    customerId: order?.customerId,
    customerName: order?.customerName ?? order?.customer?.fullName ?? order?.customer?.name ?? 'Guest',
    type: toDisplayOrderType(order?.type ?? order?.orderType),
    orderType: order?.orderType ?? toBackendOrderType(order?.type),
    status: humanizeEnum(order?.status, 'Pending'),
    placedAt: order?.placedAt ?? order?.createdAt ?? new Date().toISOString(),
    total,
    totalAmount: Number(order?.totalAmount ?? total),
    items,
  };
}

function formatShiftDay(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Scheduled';
  }

  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

function formatShiftTime(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeShift(shift, branches) {
  const branchLookup = createBranchLookup(branches);
  const frontendBranchId = branchLookup.get(shift?.branchId) ?? shift?.branchId;
  const startTime = shift?.startTime ?? shift?.dateTime ?? shift?.startsAt;
  const endTime = shift?.endTime ?? shift?.endsAt;
  const startLabel = formatShiftTime(startTime);
  const endLabel = formatShiftTime(endTime);
  const slotLabel = [startLabel, endLabel].filter(Boolean).join(' - ');
  const user = shift?.user ?? {};

  return {
    ...shift,
    id: shift?.id ?? createId('shift'),
    backendId: shift?.backendId ?? shift?.id,
    branchId: frontendBranchId,
    backendBranchId: shift?.backendBranchId ?? shift?.branchId,
    userId: shift?.userId ?? user.id,
    personName: shift?.personName ?? user.fullName ?? user.name ?? 'Staff member',
    role: humanizeEnum(user.role ?? shift?.role, 'Staff'),
    day: shift?.day ?? formatShiftDay(startTime),
    slot: shift?.slot ?? (slotLabel || 'Shift time TBC'),
    startTime,
    endTime,
    status: humanizeEnum(shift?.status, 'Scheduled'),
  };
}

function normalizeRole(role) {
  const roleKey = role?.toString().trim();
  const backendRoleKey = roleKey?.toUpperCase().replaceAll('-', '_');
  const roleMap = {
    ADMIN: 'admin',
    HQ_MANAGER: 'hq-manager',
    BRANCH_MANAGER: 'branch-manager',
    CHEF: 'chef',
    WAITER: 'waiter',
    CUSTOMER: 'customer',
  };

  return roleMap[backendRoleKey] ?? roleKey;
}

function normalizeSession(session) {
  if (!session?.userId || !session?.role) {
    return null;
  }

  return {
    ...session,
    role: normalizeRole(session.role),
  };
}

function toBackendRole(role) {
  const roleMap = {
    admin: 'ADMIN',
    'hq-manager': 'HQ_MANAGER',
    'branch-manager': 'BRANCH_MANAGER',
    chef: 'CHEF',
    waiter: 'WAITER',
    customer: 'CUSTOMER',
  };

  return roleMap[role] ?? role;
}

function normalizeUser(user, branches) {
  const branchLookup = createBranchLookup(branches);
  const branchId = branchLookup.get(user?.branchId) ?? user?.branchId;

  return {
    ...user,
    id: user?.id ?? createId('user'),
    name: user?.name ?? user?.fullName ?? 'Steakz user',
    fullName: user?.fullName ?? user?.name ?? 'Steakz user',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: normalizeRole(user?.role),
    branchId,
    backendBranchId: user?.backendBranchId ?? user?.branchId,
    status: user?.status ?? (user?.isActive === false ? 'Inactive' : 'Active'),
  };
}

function normalizeStoreShape(store) {
  const branches = Array.isArray(store.branches) ? store.branches.map(normalizeBranch) : [];
  const menuItems = Array.isArray(store.menuItems)
    ? store.menuItems.map((item) => normalizeMenuItem(item, branches))
    : [];
  const bookings = Array.isArray(store.bookings)
    ? store.bookings.map((booking) => normalizeBooking(booking, branches))
    : [];
  const users = Array.isArray(store.users)
    ? store.users.map((user) => normalizeUser(user, branches))
    : [];
  const orders = Array.isArray(store.orders)
    ? store.orders.map((order) => normalizeOrder(order, branches))
    : [];
  const shifts = Array.isArray(store.shifts)
    ? store.shifts.map((shift) => normalizeShift(shift, branches))
    : [];

  return {
    ...store,
    branches,
    menuItems,
    bookings,
    users,
    orders,
    shifts,
  };
}

function mergeById(incoming, existing) {
  const seenIds = new Set(incoming.map((item) => item.id));
  return [
    ...incoming,
    ...existing.filter((item) => !seenIds.has(item.id)),
  ];
}

export function AppProvider({ children }) {
  const [store, setStore] = useState(() => normalizeStoreShape(loadJson(STORE_KEY, getInitialStore())));
  const [session, setSession] = useState(() => normalizeSession(loadJson(SESSION_KEY, null)));
  const [selectedBranchId, setSelectedBranchId] = useState(
    () => loadJson(BRANCH_KEY, store.branches[0]?.id ?? null),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem(BRANCH_KEY, JSON.stringify(selectedBranchId));
  }, [selectedBranchId]);

  // Fetch initial data from backend
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [branchesData, menuData] = await Promise.all([
          branchesApi.getBranches().catch(() => ({ branches: store.branches })),
          menuApi.getMenuItems().catch(() => ({ menuItems: store.menuItems })),
        ]);

        const branches = collectionFromResponse(branchesData, 'branches', store.branches).map(normalizeBranch);
        const menuItems = collectionFromResponse(menuData, 'menuItems', store.menuItems)
          .map((item) => normalizeMenuItem(item, branches));

        setStore((prev) => normalizeStoreShape({
          ...prev,
          branches,
          menuItems,
        }));

        if (
          branches.length &&
          selectedBranchId !== ALL_BRANCHES_ID &&
          !branches.some((branch) => branch.id === selectedBranchId)
        ) {
          setSelectedBranchId(branches[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const currentUser = store.users.find((user) => user.id === session?.userId) ?? null;
  const lockedBranchId = currentUser?.role === 'chef' || currentUser?.role === 'waiter' || currentUser?.role === 'branch-manager'
    ? currentUser.branchId
    : null;
  const isHqAllBranchLens = currentUser?.role === 'hq-manager' && selectedBranchId === ALL_BRANCHES_ID;
  const safeSelectedBranchId = selectedBranchId === ALL_BRANCHES_ID && !isHqAllBranchLens
    ? store.branches[0]?.id
    : selectedBranchId;
  const effectiveBranchId = isHqAllBranchLens
    ? store.branches[0]?.id
    : lockedBranchId ?? safeSelectedBranchId ?? store.branches[0]?.id;
  const selectedLensId = isHqAllBranchLens
    ? ALL_BRANCHES_ID
    : lockedBranchId ?? safeSelectedBranchId ?? store.branches[0]?.id;
  const currentBranch = store.branches.find((branch) => branch.id === effectiveBranchId) ?? store.branches[0];

  useEffect(() => {
    if (currentUser?.role === 'hq-manager') {
      setSelectedBranchId(ALL_BRANCHES_ID);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!session || !currentUser || !window.localStorage.getItem(AUTH_TOKEN_KEY)) {
      return undefined;
    }

    let cancelled = false;

    async function fetchAccountActivity() {
      try {
        const canReadOrders = ['admin', 'hq-manager', 'branch-manager', 'chef', 'waiter', 'customer'].includes(currentUser.role);
        const canReadBookings = ['admin', 'hq-manager', 'branch-manager', 'waiter', 'customer'].includes(currentUser.role);
        const canReadUsers = ['admin', 'hq-manager'].includes(currentUser.role);
        const canReadStaff = ['admin', 'hq-manager', 'branch-manager'].includes(currentUser.role);
        const canReadShifts = ['admin', 'branch-manager', 'chef', 'waiter'].includes(currentUser.role);
        const branchScopedRoles = ['branch-manager', 'chef', 'waiter'];
        const isBranchScopedRole = branchScopedRoles.includes(currentUser.role);
        const scopedBranch = isBranchScopedRole
          ? store.branches.find((branch) => branch.id === currentUser.branchId)
          : null;
        const scopedBackendBranchId = isBranchScopedRole
          ? scopedBranch?.backendId ?? currentUser.backendBranchId ?? currentUser.branchId
          : undefined;

        const [
          ordersData,
          bookingsData,
          usersData,
          staffData,
          shiftsData,
        ] = await Promise.all([
          canReadOrders ? ordersApi.getOrders(scopedBackendBranchId).catch(() => ({ orders: [] })) : Promise.resolve({ orders: [] }),
          canReadBookings ? bookingsApi.getBookings(scopedBackendBranchId).catch(() => ({ bookings: [] })) : Promise.resolve({ bookings: [] }),
          canReadUsers ? usersApi.getUsers().catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
          canReadStaff ? staffApi.getStaffMembers(scopedBackendBranchId).catch(() => ({ staffMembers: [] })) : Promise.resolve({ staffMembers: [] }),
          canReadShifts ? shiftsApi.getShifts(scopedBackendBranchId).catch(() => ({ shifts: [] })) : Promise.resolve({ shifts: [] }),
        ]);

        if (cancelled) {
          return;
        }

        const orders = collectionFromResponse(ordersData, 'orders', [])
          .map((order) => normalizeOrder(order, store.branches));
        const bookings = collectionFromResponse(bookingsData, 'bookings', [])
          .map((booking) => normalizeBooking(booking, store.branches));
        const users = collectionFromResponse(usersData, 'users', [])
          .map((user) => normalizeUser(user, store.branches));
        const staffMembers = collectionFromResponse(staffData, 'staffMembers', [])
          .map((user) => normalizeUser(user, store.branches));
        const shifts = collectionFromResponse(shiftsData, 'shifts', [])
          .map((shift) => normalizeShift(shift, store.branches));

        setStore((previous) => ({
          ...previous,
          orders: canReadOrders ? orders : previous.orders,
          bookings: mergeById(bookings, previous.bookings),
          users: users.length ? users : previous.users,
          staffMembers: staffMembers.length ? staffMembers : previous.staffMembers,
          shifts: canReadShifts ? shifts : previous.shifts,
        }));
      } catch (err) {
        console.error('Failed to fetch account activity:', err);
      }
    }

    fetchAccountActivity();
    const refreshInterval = window.setInterval(fetchAccountActivity, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, [session?.userId, currentUser?.id, store.branches.length]);

  async function loginAs(userId) {
    try {
      const user = store.users.find((entry) => entry.id === userId);

      if (!user) {
        return;
      }

      setSession({
        userId: user.id,
        role: user.role,
      });

      if (user.branchId) {
        setSelectedBranchId(user.branchId);
      } else if (user.role === 'hq-manager') {
        setSelectedBranchId(ALL_BRANCHES_ID);
      } else {
        setSelectedBranchId(store.branches[0]?.id ?? null);
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message);
    }
  }

  async function signIn(email, password) {
    try {
      setError(null);

      const response = await authApi.login(email, password);
      const authData = response.data ?? response;
      const token = authData.token;
      const branchesData = await branchesApi.getBranches().catch(() => ({ branches: store.branches }));
      const latestBranches = collectionFromResponse(branchesData, 'branches', store.branches).map(normalizeBranch);
      const user = normalizeUser(authData.user, latestBranches);

      if (!token || !user?.id) {
        throw new Error('Login response was missing account details.');
      }

      window.localStorage.setItem(AUTH_TOKEN_KEY, token);

      setStore((previous) => {
        const normalizedPrevious = normalizeStoreShape({
          ...previous,
          branches: latestBranches,
        });

        return {
          ...normalizedPrevious,
          users: [
            user,
            ...normalizedPrevious.users.filter((entry) => entry.id !== user.id),
          ],
        };
      });

      setSession({
        userId: user.id,
        role: user.role,
      });

      if (user.branchId) {
        setSelectedBranchId(user.branchId);
      } else if (user.role === 'hq-manager') {
        setSelectedBranchId(ALL_BRANCHES_ID);
      } else {
        setSelectedBranchId(store.branches[0]?.id ?? null);
      }

      return user;
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err.message);
      throw err;
    }
  }

  async function registerCustomer(customer) {
    try {
      setError(null);

      const response = await authApi.registerCustomer({
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone || undefined,
        password: customer.password,
      });
      const authData = response.data ?? response;
      const token = authData.token;
      const user = normalizeUser(authData.user, store.branches);

      if (!token || !user?.id) {
        throw new Error('Registration response was missing account details.');
      }

      window.localStorage.setItem(AUTH_TOKEN_KEY, token);

      setStore((previous) => ({
        ...previous,
        users: [
          user,
          ...previous.users.filter((entry) => entry.id !== user.id),
        ],
      }));

      setSession({
        userId: user.id,
        role: user.role,
      });

      setSelectedBranchId(store.branches[0]?.id ?? null);

      return user;
    } catch (err) {
      console.error('Customer registration failed:', err);
      setError(err.message);
      throw err;
    }
  }

  async function logout() {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setSession(null);
      setSelectedBranchId(store.branches[0]?.id ?? null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  function selectBranch(branchId) {
    if (!lockedBranchId) {
      setSelectedBranchId(branchId);
    }
  }

  async function createBooking(booking) {
    try {
      const branchId = booking.branchId ?? currentBranch.id;
      const bookingBranch = store.branches.find((branch) => branch.id === branchId) ?? currentBranch;
      const bookingData = {
        branchId: bookingBranch.backendId ?? bookingBranch.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail || currentUser?.email || 'guest@steakz.local',
        customerPhone: booking.customerPhone || undefined,
        partySize: Number(booking.partySize),
        bookingTime: new Date(booking.dateTime).toISOString(),
        specialRequests: booking.occasion || 'Dining',
      };

      const response = await bookingsApi.createBooking(bookingData);
      const newBooking = normalizeBooking(response.booking || response.data || bookingData, store.branches);

      setStore((previous) => ({
        ...previous,
        bookings: [
          {
            ...newBooking,
            customerId: currentUser?.role === 'customer' ? currentUser.id : undefined,
          },
          ...previous.bookings,
        ],
      }));

      return newBooking;
    } catch (err) {
      console.error('Failed to create booking:', err);
      setError(err.message);
      throw err;
    }
  }

  async function updateBookingStatus(bookingId, status) {
    try {
      const booking = store.bookings.find((entry) => entry.id === bookingId);
      const backendBookingId = booking?.backendId ?? booking?.id;

      if (!backendBookingId || backendBookingId.startsWith('booking-')) {
        throw new Error('This booking is not connected to the live reservation system. Refresh the page and try again.');
      }

      const response = await bookingsApi.updateBooking(backendBookingId, {
        status: toBackendBookingStatus(status),
      });
      const updatedBooking = normalizeBooking(response.booking || response.data || { ...booking, status }, store.branches);

      setStore((previous) => ({
        ...previous,
        bookings: previous.bookings.map((entry) => (
          entry.id === bookingId ? { ...entry, ...updatedBooking, id: bookingId } : entry
        )),
      }));

      return updatedBooking;
    } catch (err) {
      console.error('Failed to update booking status:', err);
      setError(err.message);
      throw err;
    }
  }

  async function placeOrder({ branchId, type, items, note }) {
    try {
      const orderBranch = store.branches.find((branch) => branch.id === branchId) ?? currentBranch;
      const orderData = {
        branchId: orderBranch.backendId ?? orderBranch.id,
        orderType: toBackendOrderType(type),
        notes: note || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId ?? item.id,
          quantity: Number(item.quantity),
        })),
      };

      const response = await ordersApi.createOrder(orderData);
      const newOrder = normalizeOrder(
        response.order || response.data || orderData,
        store.branches,
        items,
      );

      setStore((previous) => ({
        ...previous,
        orders: mergeById([newOrder], previous.orders),
      }));

      return newOrder;
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err.message);
      throw err;
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const order = store.orders.find((entry) => entry.id === orderId);
      const backendOrderId = order?.backendId ?? order?.id;

      if (!backendOrderId || backendOrderId.startsWith('ORD-')) {
        throw new Error('This starter order is not connected to the live kitchen system. Refresh the page to load current orders.');
      }

      await ordersApi.updateOrder(backendOrderId, { status: toBackendOrderStatus(status) });
      
      setStore((previous) => ({
        ...previous,
        orders: previous.orders.map((order) => (
          order.id === orderId ? { ...order, status } : order
        )),
      }));
    } catch (err) {
      console.error('Failed to update order status:', err);
      setError(err.message);
      throw err;
    }
  }

  async function addUser(user) {
    try {
      const selectedBranch = store.branches.find((branch) => branch.id === user.branchId);
      const backendRole = toBackendRole(user.role);
      const isBranchBoundRole = ['BRANCH_MANAGER', 'CHEF', 'WAITER'].includes(backendRole);
      const userData = {
        fullName: user.name,
        email: user.email,
        phone: user.phone || undefined,
        password: user.password,
        role: backendRole,
        branchId: isBranchBoundRole
          ? selectedBranch?.backendId ?? selectedBranch?.id ?? user.branchId
          : undefined,
      };

      const response = await usersApi.createUser(userData);
      const newUser = normalizeUser(response.user || response.data || userData, store.branches);

      setStore((previous) => ({
        ...previous,
        users: mergeById([newUser], previous.users),
      }));

      return newUser;
    } catch (err) {
      console.error('Failed to add user:', err);
      setError(err.message);
      throw err;
    }
  }

  async function toggleUserStatus(userId) {
    try {
      const user = store.users.find((u) => u.id === userId);

      if (!user) {
        return;
      }

      const newStatus = user?.status === 'Active' ? 'Inactive' : 'Active';
      const selectedBranch = store.branches.find((branch) => branch.id === user.branchId);
      
      const response = await usersApi.updateUser(userId, {
        role: toBackendRole(user.role),
        branchId: selectedBranch?.backendId ?? selectedBranch?.id ?? user.backendBranchId ?? user.branchId ?? null,
        isActive: newStatus === 'Active',
      });
      const updatedUser = normalizeUser(response.user || response.data || { ...user, status: newStatus }, store.branches);

      setStore((previous) => ({
        ...previous,
        users: previous.users.map((entry) => (
          entry.id === userId ? updatedUser : entry
        )),
      }));

      return updatedUser;
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError(err.message);
      throw err;
    }
  }

  async function addBranch(branch) {
    try {
      const branchData = {
        name: branch.name,
        code: branch.code,
        city: branch.city,
        address: branch.address,
      };

      const response = await branchesApi.createBranch(branchData);
      const newBranch = normalizeBranch({
        ...branch,
        ...(response.branch || response.data || branchData),
        features: branch.features ? branch.features.split(',').map((value) => value.trim()) : [],
        capacity: Number(branch.capacity),
      });

      setStore((previous) => ({
        ...previous,
        branches: mergeById([newBranch], previous.branches),
        branchPerformance: [
          ...previous.branchPerformance,
          {
            branchId: newBranch.id,
            salesToday: 0,
            salesMonth: 0,
            averageTicket: 0,
            activeStaff: 0,
            bookingsToday: 0,
            pendingOrders: 0,
            satisfaction: 0.88,
          },
        ],
      }));

      return newBranch;
    } catch (err) {
      console.error('Failed to add branch:', err);
      setError(err.message);
      throw err;
    }
  }

  async function deleteBranch(branchId) {
    try {
      const branch = store.branches.find((entry) => entry.id === branchId);

      if (!branch) {
        return;
      }

      if (store.branches.length <= 1) {
        throw new Error('At least one branch must remain in the system.');
      }

      const remainingBranches = store.branches.filter((entry) => entry.id !== branchId);

      await branchesApi.deleteBranch(branch.backendId ?? branch.id);

      setStore((previous) => ({
        ...previous,
        branches: previous.branches.filter((entry) => entry.id !== branchId),
        branchPerformance: previous.branchPerformance.filter((entry) => entry.branchId !== branchId),
        bookings: previous.bookings.filter((booking) => booking.branchId !== branchId),
        menuItems: previous.menuItems.filter((item) => !item.availableAt?.includes(branchId) && item.branchId !== branchId),
        orders: previous.orders.filter((order) => order.branchId !== branchId),
        shifts: previous.shifts.filter((shift) => shift.branchId !== branchId),
        staffMembers: previous.staffMembers.map((member) => (
          member.branchId === branchId ? { ...member, branchId: undefined, status: 'Inactive' } : member
        )),
        users: previous.users.map((user) => (
          user.branchId === branchId ? { ...user, branchId: undefined, status: 'Inactive' } : user
        )),
      }));

      if (effectiveBranchId === branchId) {
        setSelectedBranchId(remainingBranches[0]?.id ?? null);
      }
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setError(err.message);
      throw err;
    }
  }

  async function addMenuItem(item) {
    try {
      const frontendBranchIds = item.availableAt?.length
        ? item.availableAt
        : [item.branchId ?? currentBranch.id];
      const selectedBranches = frontendBranchIds
        .map((branchId) => store.branches.find((branch) => branch.id === branchId))
        .filter(Boolean);

      const responses = await Promise.all(
        selectedBranches.map((selectedBranch) => {
          const menuItemData = {
            branchId: selectedBranch.backendId ?? selectedBranch.id,
            name: item.title,
            description: item.description,
            category: item.category,
            price: Number(item.price),
          };

          return menuApi.createMenuItem(menuItemData).then((response) => (
            normalizeMenuItem(response.menuItem || response.data || menuItemData, store.branches)
          ));
        }),
      );

      setStore((previous) => ({
        ...previous,
        menuItems: mergeById(responses, previous.menuItems),
      }));

      return responses[0];
    } catch (err) {
      console.error('Failed to add menu item:', err);
      setError(err.message);
      throw err;
    }
  }

  async function updateMenuItem(item, changes) {
    try {
      const backendIds = item.backendIds?.length
        ? item.backendIds
        : [item.backendId ?? item.id].filter(Boolean);
      const itemData = {
        name: changes.title,
        description: changes.description,
        category: changes.category,
        price: Number(changes.price),
      };

      const updatedItems = await Promise.all(
        backendIds.map((itemId) => (
          menuApi.updateMenuItem(itemId, itemData).then((response) => (
            normalizeMenuItem(response.menuItem || response.data || { ...item, ...itemData, id: itemId }, store.branches)
          ))
        )),
      );
      const updatedIds = new Set(updatedItems.map((entry) => entry.id));

      setStore((previous) => ({
        ...previous,
        menuItems: [
          ...updatedItems,
          ...previous.menuItems.filter((entry) => !updatedIds.has(entry.id)),
        ],
      }));

      return updatedItems[0];
    } catch (err) {
      console.error('Failed to update menu item:', err);
      setError(err.message);
      throw err;
    }
  }

  async function deleteMenuItem(item) {
    try {
      const backendIds = item.backendIds?.length
        ? item.backendIds
        : [item.backendId ?? item.id].filter(Boolean);

      await Promise.all(backendIds.map((itemId) => menuApi.deleteMenuItem(itemId)));

      const deletedIds = new Set(backendIds);
      setStore((previous) => ({
        ...previous,
        menuItems: previous.menuItems.filter((entry) => !deletedIds.has(entry.backendId ?? entry.id)),
      }));
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      setError(err.message);
      throw err;
    }
  }

  const value = {
    store,
    session,
    currentUser,
    currentBranch,
    selectedBranchId: selectedLensId,
    lockedBranchId,
    loading,
    error,
    loginAs,
    signIn,
    registerCustomer,
    logout,
    selectBranch,
    createBooking,
    updateBookingStatus,
    placeOrder,
    updateOrderStatus,
    addUser,
    toggleUserStatus,
    addBranch,
    deleteBranch,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return context;
}

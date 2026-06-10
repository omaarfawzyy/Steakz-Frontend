const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const roleLabels = {
  customer: 'Customer',
  chef: 'Chef',
  waiter: 'Waiter',
  'branch-manager': 'Branch Manager',
  'hq-manager': 'Headquarter Manager',
  admin: 'Admin',
};

export function currency(value) {
  return currencyFormatter.format(value);
}

export function percent(value) {
  return percentFormatter.format(value);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getRoleLabel(role) {
  return roleLabels[role] ?? role;
}

export function getStatusTone(status = '') {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('complete') ||
    normalized.includes('ready') ||
    normalized.includes('active') ||
    normalized.includes('seated') ||
    normalized.includes('confirmed')
  ) {
    return 'success';
  }

  if (
    normalized.includes('pending') ||
    normalized.includes('wait') ||
    normalized.includes('hold') ||
    normalized.includes('plating') ||
    normalized.includes('warning')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('cancel') ||
    normalized.includes('low') ||
    normalized.includes('error') ||
    normalized.includes('inactive')
  ) {
    return 'error';
  }

  return 'info';
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

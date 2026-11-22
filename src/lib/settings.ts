export const SETTINGS_KEY = 'chinebadam_pos_settings';

export interface StoreSettings {
  name: string;
  logo: string;
  address: string;
  phone: string;
  gstNumber: string;
  fssaiNumber: string;
  taxRate: number;
  currency: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Chinebadam',
  logo: '',
  address: '',
  phone: '',
  gstNumber: '',
  fssaiNumber: '',
  taxRate: 5,
  currency: 'INR (₹)',
};

export function loadStoreSettings(): StoreSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      taxRate: parsed.taxRate !== undefined ? Number(parsed.taxRate) : DEFAULT_SETTINGS.taxRate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('pos-settings-updated'));
}

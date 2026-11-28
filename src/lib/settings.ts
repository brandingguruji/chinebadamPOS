export const SETTINGS_KEY = 'chinebadam_pos_settings';

export type StoreType = 'small' | 'medium' | 'big';

export interface StoreSettings {
  name: string;
  logo: string;
  address: string;
  phone: string;
  whatsappLink: string;
  gstNumber: string;
  fssaiNumber: string;
  taxRate: number;
  currency: string;
  storeType: StoreType;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Chinebadam',
  logo: '',
  address: '',
  phone: '',
  whatsappLink: '',
  gstNumber: '',
  fssaiNumber: '',
  taxRate: 5,
  currency: 'INR (₹)',
  storeType: 'big',
};

function normalizeSettings(raw: Partial<StoreSettings> | null | undefined): StoreSettings {
  if (!raw) return DEFAULT_SETTINGS;
  const validType: StoreType =
    raw.storeType === 'small' || raw.storeType === 'medium' || raw.storeType === 'big'
      ? raw.storeType
      : DEFAULT_SETTINGS.storeType;
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    storeType: validType,
    taxRate: raw.taxRate !== undefined ? Number(raw.taxRate) : DEFAULT_SETTINGS.taxRate,
  };
}

export function loadStoreSettings(): StoreSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('pos-settings-updated'));
}

export async function fetchStoreSettingsFromDB(): Promise<StoreSettings> {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return loadStoreSettings();
    const data = await res.json();
    const normalized = normalizeSettings(data);
    saveStoreSettings(normalized);
    return normalized;
  } catch {
    return loadStoreSettings();
  }
}

export async function saveStoreSettingsToDB(
  token: string,
  settings: StoreSettings
): Promise<StoreSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save settings' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const saved = normalizeSettings(await res.json());
  saveStoreSettings(saved);
  return saved;
}

export async function uploadStoreLogo(
  token: string,
  file: File
): Promise<{ logo: string; savedToDisk: boolean; filePath?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/settings/logo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to upload logo' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

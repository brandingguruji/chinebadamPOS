'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { CheckCircle2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const SETTINGS_KEY = 'chinebadam_pos_settings';

export default function SettingsPage() {
  const [name, setName] = useState('Chinebadam');
  const [taxRate, setTaxRate] = useState('5');
  const [currency, setCurrency] = useState('INR (₹)');
  const [logo, setLogo] = useState<string>('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.name) setName(parsed.name);
        if (parsed.taxRate !== undefined) setTaxRate(String(parsed.taxRate));
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.logo) setLogo(parsed.logo);
      } catch {}
    }
  }, []);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Logo file must be under 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogo(reader.result);
        toast.info('Logo selected — click Save Settings to apply');
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    const taxNum = Number(taxRate);
    if (name.trim().length < 2) {
      setError('Restaurant name must be at least 2 characters.');
      return;
    }
    if (Number.isNaN(taxNum) || taxNum < 0 || taxNum > 50) {
      setError('Tax rate must be between 0% and 50%.');
      return;
    }

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        name: name.trim(),
        taxRate: taxNum,
        currency,
        logo,
      })
    );
    window.dispatchEvent(new Event('pos-settings-updated'));
    setSaved(true);
    toast.success('Settings & logo updated successfully');
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Configure your restaurant branding, logo, and POS preferences.
      </p>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5"
      >
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <CheckCircle2 size={14} />
            Settings &amp; logo saved successfully.
          </div>
        )}

        {/* Logo Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Restaurant Logo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logo ? (
                <img src={logo} alt="Restaurant Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon size={22} className="text-slate-300" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold cursor-pointer transition">
                <Upload size={14} />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>

              {logo && (
                <button
                  type="button"
                  onClick={() => { setLogo(''); toast.info('Logo removed — click Save Settings to apply'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
              <p className="w-full text-[11px] text-slate-400">
                PNG, JPG, WebP, or SVG (max 1 MB). Appears in the sidebar header.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Restaurant Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Default Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step="0.5"
              required
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

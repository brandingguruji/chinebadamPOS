'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { CheckCircle2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getToken } from '@/lib/auth';
import {
  loadStoreSettings,
  fetchStoreSettingsFromDB,
  saveStoreSettingsToDB,
  uploadStoreLogo,
  type StoreType,
} from '@/lib/settings';
import clsx from 'clsx';

export default function SettingsPage() {
  const [name, setName] = useState('Chinebadam');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [currency, setCurrency] = useState('INR (₹)');
  const [logo, setLogo] = useState<string>('');
  const [storeType, setStoreType] = useState<StoreType>('big');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const apply = (s: ReturnType<typeof loadStoreSettings>) => {
      setName(s.name);
      setAddress(s.address);
      setPhone(s.phone);
      setGstNumber(s.gstNumber);
      setFssaiNumber(s.fssaiNumber);
      setTaxRate(String(s.taxRate));
      setCurrency(s.currency);
      setLogo(s.logo);
      setStoreType(s.storeType);
    };
    apply(loadStoreSettings());
    fetchStoreSettingsFromDB().then(apply);
  }, []);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file must be under 2 MB.');
      return;
    }

    const token = getToken();
    if (!token) return;

    setUploadingLogo(true);
    try {
      const res = await uploadStoreLogo(token, file);
      setLogo(res.logo);
      if (res.savedToDisk) {
        toast.success(`Logo saved to ${res.filePath} — click Save Settings to update DB`);
      } else {
        toast.info('Logo ready — click Save Settings to save in database');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload logo';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    const taxNum = Number(taxRate);
    if (name.trim().length < 2) {
      setError('Store name must be at least 2 characters.');
      return;
    }
    if (Number.isNaN(taxNum) || taxNum < 0 || taxNum > 50) {
      setError('Tax rate must be between 0% and 50%.');
      return;
    }

    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      await saveStoreSettingsToDB(token, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        fssaiNumber: fssaiNumber.trim(),
        taxRate: taxNum,
        currency,
        logo,
        storeType,
      });

      setSaved(true);
      toast.success('Store settings saved to MongoDB');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Store Settings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Saved in MongoDB and synced across all devices, sidebar, login screen, and thermal bills.
      </p>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-5"
      >
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3.5 py-2.5 flex items-center gap-2">
            <CheckCircle2 size={14} />
            Store settings saved to database successfully.
          </div>
        )}

        {/* Store Type / Size Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Store Size &amp; Workflow Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {([
              {
                id: 'small',
                title: 'Small Shop',
                desc: '1-person counter / takeaway. Hides Tables, Dine-In & Send to Kitchen.',
              },
              {
                id: 'medium',
                title: 'Medium Cafe',
                desc: 'Tables & Dine-In enabled with fast counter billing.',
              },
              {
                id: 'big',
                title: 'Big Restaurant',
                desc: 'Full mode: Tables, Order Line & Send to Kitchen.',
              },
            ] as { id: StoreType; title: string; desc: string }[]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStoreType(opt.id)}
                className={clsx(
                  'text-left p-3 rounded-xl border transition',
                  storeType === opt.id
                    ? 'bg-[#E6F4F1] border-[#0D9488] ring-1 ring-[#0D9488]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="text-xs font-bold text-slate-800">{opt.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Store Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logo ? (
                <img src={logo} alt="Store Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon size={22} className="text-slate-300" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold cursor-pointer transition">
                <Upload size={14} />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>

              {logo && (
                <button
                  type="button"
                  onClick={() => {
                    setLogo('');
                    toast.info('Logo removed — click Save Settings to apply');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
              <p className="w-full text-[11px] text-slate-400">
                PNG, JPG, WebP, or SVG (max 2 MB). Saved in <code>public/uploads/</code> locally so it stays after Git push &amp; build.
              </p>
            </div>
          </div>
        </div>

        {/* Store Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chinebadam Cafe"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Store Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Store Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Store Address</label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Shop No, Street, Area, City - PIN"
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* GST & FSSAI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Store GST Number (GSTIN)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="e.g. 19ABCDE1234F1Z5"
              className="w-full px-3.5 py-2 text-sm uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Store FSSAI Number
            </label>
            <input
              type="text"
              value={fssaiNumber}
              onChange={(e) => setFssaiNumber(e.target.value)}
              placeholder="e.g. 12824019001234"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Tax Rate & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Default GST / Tax (%)
            </label>
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
            disabled={saving || uploadingLogo}
            className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

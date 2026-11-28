'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import {
  CheckCircle2,
  Upload,
  Trash2,
  Image as ImageIcon,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Store,
  MessageCircle,
  ExternalLink,
  Copy,
  Clock,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getToken, setToken } from '@/lib/auth';
import { getMe, updateProfile } from '@/lib/api';
import {
  loadStoreSettings,
  fetchStoreSettingsFromDB,
  saveStoreSettingsToDB,
  uploadStoreLogo,
  type StoreType,
} from '@/lib/settings';
import clsx from 'clsx';

export default function SettingsPage() {
  // Store Settings state
  const [name, setName] = useState('Chinebadam');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [availableOnZomato, setAvailableOnZomato] = useState(false);
  const [zomatoLink, setZomatoLink] = useState('');
  const [availableOnSwiggy, setAvailableOnSwiggy] = useState(false);
  const [swiggyLink, setSwiggyLink] = useState('');
  const [availableOnOwnlly, setAvailableOnOwnlly] = useState(false);
  const [ownllyLink, setOwnllyLink] = useState('');
  const [publicMenuUrl, setPublicMenuUrl] = useState('/menu');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [taxRate, setTaxRate] = useState('5');
  const [currency, setCurrency] = useState('INR (₹)');
  const [logo, setLogo] = useState<string>('');
  const [storeType, setStoreType] = useState<StoreType>('big');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [storeSaved, setStoreSaved] = useState(false);

  // Profile Settings state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const apply = (s: ReturnType<typeof loadStoreSettings>) => {
      setName(s.name);
      setAddress(s.address);
      setPhone(s.phone);
      setWhatsappLink(s.whatsappLink || '');
      setOpeningHours(s.openingHours || '');
      setAvailableOnZomato(Boolean(s.availableOnZomato));
      setZomatoLink(s.zomatoLink || '');
      setAvailableOnSwiggy(Boolean(s.availableOnSwiggy));
      setSwiggyLink(s.swiggyLink || '');
      setAvailableOnOwnlly(Boolean(s.availableOnOwnlly));
      setOwnllyLink(s.ownllyLink || '');
      setGstNumber(s.gstNumber);
      setFssaiNumber(s.fssaiNumber);
      setTaxRate(String(s.taxRate));
      setCurrency(s.currency);
      setLogo(s.logo);
      setStoreType(s.storeType);
    };
    if (typeof window !== 'undefined') {
      setPublicMenuUrl(`${window.location.origin}/menu`);
    }
    apply(loadStoreSettings());
    fetchStoreSettingsFromDB().then(apply);

    const token = getToken();
    if (token) {
      getMe(token)
        .then((u) => {
          setUsername(u.username || '');
          setEmail(u.email || '');
          setRole(u.role || 'admin');
        })
        .catch(() => {})
        .finally(() => setProfileLoading(false));
    } else {
      setProfileLoading(false);
    }
  }, []);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    setStoreError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStoreError('Please upload a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStoreError('Logo file must be under 2 MB.');
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
      setStoreError(msg);
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveStore(e: FormEvent) {
    e.preventDefault();
    setStoreError('');
    const taxNum = Number(taxRate);
    if (name.trim().length < 2) {
      setStoreError('Store name must be at least 2 characters.');
      return;
    }
    if (Number.isNaN(taxNum) || taxNum < 0 || taxNum > 50) {
      setStoreError('Tax rate must be between 0% and 50%.');
      return;
    }

    const token = getToken();
    if (!token) return;

    setSavingStore(true);
    try {
      await saveStoreSettingsToDB(token, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        whatsappLink: whatsappLink.trim(),
        openingHours: openingHours.trim(),
        availableOnZomato,
        zomatoLink: zomatoLink.trim(),
        availableOnSwiggy,
        swiggyLink: swiggyLink.trim(),
        availableOnOwnlly,
        ownllyLink: ownllyLink.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        fssaiNumber: fssaiNumber.trim(),
        taxRate: taxNum,
        currency,
        logo,
        storeType,
      });

      setStoreSaved(true);
      toast.success('Store settings saved to MongoDB');
      setTimeout(() => setStoreSaved(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setStoreError(msg);
      toast.error(msg);
    } finally {
      setSavingStore(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError('');

    if (username.trim().length < 3) {
      setProfileError('Username must be at least 3 characters.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError('Please enter a valid email address.');
      return;
    }
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setProfileError('Enter your current password to change password.');
        return;
      }
      if (newPassword.length < 6) {
        setProfileError('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError('New password and confirm password do not match.');
        return;
      }
    }

    const token = getToken();
    if (!token) return;

    setSavingProfile(true);
    try {
      const res = await updateProfile(token, {
        username: username.trim(),
        email: email.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      setToken(res.token);
      setUsername(res.user.username);
      setEmail(res.user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.dispatchEvent(new Event('pos-profile-updated'));
      setProfileSaved(true);
      toast.success('Profile & login credentials updated');
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings &amp; Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your store branding, thermal bill details, and login account in one place.
        </p>
      </div>

      {/* Side-by-Side 2-Column Layout on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Store Settings ── */}
        <form
          onSubmit={handleSaveStore}
          className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
              <Store size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Store Settings</h2>
              <p className="text-xs text-slate-400">Synced across devices, login screen &amp; thermal bills</p>
            </div>
          </div>

          {storeError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
              {storeError}
            </div>
          )}
          {storeSaved && (
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
                  PNG, JPG, WebP, or SVG (max 2 MB). Saved in <code>public/uploads/</code>.
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

          {/* WhatsApp Order Link / Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <MessageCircle size={13} className="text-[#25D366]" />
              WhatsApp Order Link or Number
            </label>
            <input
              type="text"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="e.g. https://wa.me/917439682218 or 7439682218"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used on your public digital menu when customers click &quot;Send Order on WhatsApp&quot;. Falls back to Store Phone if empty.
            </p>
          </div>

          {/* Opening Hours */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
              <Clock size={13} className="text-[#0D9488]" />
              Opening Hours
            </label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. Open Daily: 11:00 AM – 11:00 PM"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Delivery Platforms: Zomato, Swiggy, Ownlly */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Also Available On (Public Menu Badges)</div>
              <p className="text-[11px] text-slate-400">
                Enable platforms to show badges on your external menu link. Add a store URL to make them clickable.
              </p>
            </div>

            {/* Zomato */}
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnZomato}
                  onChange={(e) => setAvailableOnZomato(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                Available on Zomato
              </label>
              {availableOnZomato && (
                <input
                  type="url"
                  value={zomatoLink}
                  onChange={(e) => setZomatoLink(e.target.value)}
                  placeholder="https://www.zomato.com/... (optional)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              )}
            </div>

            {/* Swiggy */}
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnSwiggy}
                  onChange={(e) => setAvailableOnSwiggy(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                Available on Swiggy
              </label>
              {availableOnSwiggy && (
                <input
                  type="url"
                  value={swiggyLink}
                  onChange={(e) => setSwiggyLink(e.target.value)}
                  placeholder="https://www.swiggy.com/... (optional)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              )}
            </div>

            {/* Ownlly */}
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnOwnlly}
                  onChange={(e) => setAvailableOnOwnlly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Available on Ownlly
              </label>
              {availableOnOwnlly && (
                <input
                  type="url"
                  value={ownllyLink}
                  onChange={(e) => setOwnllyLink(e.target.value)}
                  placeholder="https://ownlly.com/... (optional)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
            </div>
          </div>

          {/* Public Digital Menu Share Box */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-teal-900">Public Digital Menu Link</div>
              <div className="text-[11px] text-teal-700 truncate">{publicMenuUrl}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(publicMenuUrl);
                  toast.success('Public menu link copied!');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 text-xs font-bold transition"
              >
                <Copy size={12} />
                Copy
              </button>
              <a
                href="/menu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition"
              >
                <ExternalLink size={12} />
                Open
              </a>
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
              disabled={savingStore || uploadingLogo}
              className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold transition shadow-sm"
            >
              {savingStore ? 'Saving...' : 'Save Store Settings'}
            </button>
          </div>
        </form>

        {/* ── Right Column: Profile & Login Settings ── */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-11 h-11 rounded-full bg-teal-600 text-white font-bold text-base flex items-center justify-center flex-shrink-0">
              {(username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800 truncate">
                Profile &amp; Login
              </h2>
              <div className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium capitalize">
                <ShieldCheck size={13} />
                {role} Account
              </div>
            </div>
          </div>

          {profileLoading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
            </div>
          ) : (
            <>
              {profileError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                  {profileError}
                </div>
              )}
              {profileSaved && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Profile &amp; login credentials updated.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Login Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sign in using either your email or username.
                  </p>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Lock size={14} className="text-[#0D9488]" />
                    Change Password
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Leave blank to keep your current password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold transition shadow-sm"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

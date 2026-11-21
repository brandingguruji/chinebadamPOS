'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { getStocks, createStock, updateStock, deleteStock } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import type { StockItem } from '@/types';
import clsx from 'clsx';
import { Plus, Minus, Edit3, Trash2, X, AlertTriangle, Package, PackageX } from 'lucide-react';

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'packets', 'boxes'];
const CATEGORIES = ['Grocery', 'Dairy', 'Meat & Poultry', 'Vegetables', 'Beverages', 'Packaging', 'Spices'];

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [quantity, setQuantity] = useState('');
  const [minThreshold, setMinThreshold] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = getToken() ?? '';
  const toast = useToast();

  const loadStocks = useCallback(async () => {
    try {
      const data = await getStocks(token);
      setStocks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const outCount = stocks.filter((s) => s.quantity <= 0).length;
  const lowCount = stocks.filter((s) => s.quantity > 0 && s.quantity <= s.minThreshold).length;

  const filtered = stocks.filter((s) => {
    if (filter === 'out') return s.quantity <= 0;
    if (filter === 'low') return s.quantity > 0 && s.quantity <= s.minThreshold;
    if (filter === 'ok') return s.quantity > s.minThreshold;
    return true;
  });

  function openAdd() {
    setEditing(null);
    setName('');
    setCategory('Grocery');
    setQuantity('');
    setMinThreshold('5');
    setUnit('pcs');
    setError('');
    setShowModal(true);
  }

  function openEdit(item: StockItem) {
    setEditing(item);
    setName(item.name);
    setCategory(item.category || 'Grocery');
    setQuantity(String(item.quantity));
    setMinThreshold(String(item.minThreshold));
    setUnit(item.unit || 'pcs');
    setError('');
    setShowModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Item name must be at least 2 characters.');
      return;
    }
    const q = Number(quantity);
    const m = Number(minThreshold);
    if (Number.isNaN(q) || q < 0) {
      setError('Quantity cannot be negative.');
      return;
    }
    if (Number.isNaN(m) || m < 0) {
      setError('Low stock alert threshold cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateStock(token, editing.id, {
          name: name.trim(),
          category,
          quantity: q,
          minThreshold: m,
          unit,
        });
        setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success(`Updated stock: ${updated.name}`);
      } else {
        const created = await createStock(token, {
          name: name.trim(),
          category,
          quantity: q,
          minThreshold: m,
          unit,
        });
        setStocks((prev) => [created, ...prev]);
        toast.success(`Added stock item: ${created.name}`);
      }
      window.dispatchEvent(new Event('pos-stocks-updated'));
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save stock item';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAdjust(item: StockItem, delta: number) {
    const nextQty = Math.max(0, Number((item.quantity + delta).toFixed(2)));
    try {
      const updated = await updateStock(token, item.id, { quantity: nextQty });
      setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      window.dispatchEvent(new Event('pos-stocks-updated'));
      if (updated.quantity <= updated.minThreshold) {
        toast.error(`Low Stock Alert: ${updated.name} (${updated.quantity} ${updated.unit} left)`);
      } else {
        toast.success(`${updated.name}: ${updated.quantity} ${updated.unit}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update stock');
    }
  }

  async function handleDelete(item: StockItem) {
    if (!confirm(`Delete "${item.name}" from stock?`)) return;
    try {
      await deleteStock(token, item.id);
      setStocks((prev) => prev.filter((s) => s.id !== item.id));
      window.dispatchEvent(new Event('pos-stocks-updated'));
      toast.success(`Deleted "${item.name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete stock');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock &amp; Low-Stock Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track kitchen inventory and get automatic alerts when items run low
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus size={16} />
          Add Stock Item
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stocks.length}</div>
            <div className="text-xs text-slate-500">Total Tracked Items</div>
          </div>
        </div>
        <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-800">{lowCount}</div>
            <div className="text-xs text-amber-700 font-medium">Low Stock Alerts</div>
          </div>
        </div>
        <div className="bg-rose-50/70 rounded-2xl p-5 border border-rose-200 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <PackageX size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-700">{outCount}</div>
            <div className="text-xs text-rose-700 font-medium">Out of Stock</div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all', label: `All (${stocks.length})` },
          { id: 'low', label: `Low Stock (${lowCount})` },
          { id: 'out', label: `Out of Stock (${outCount})` },
          { id: 'ok', label: `In Stock (${stocks.length - lowCount - outCount})` },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'px-3.5 py-2 rounded-xl text-xs font-semibold border transition',
              filter === f.id
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Alert Below</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Current Stock</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                  No stock items found. Click &quot;Add Stock Item&quot; to start tracking inventory.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isOut = item.quantity <= 0;
                const isLow = !isOut && item.quantity <= item.minThreshold;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{item.category}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={clsx(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        )}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      ≤ {item.minThreshold} {item.unit}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleQuickAdjust(item, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="min-w-[70px] text-center font-bold text-slate-900">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => handleQuickAdjust(item, 1)}
                          className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-slate-400 hover:text-teal-600"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Stock Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Stock Item' : 'Add Stock Item'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Milk, Chicken Breast, Burger Buns"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert When ≤</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold"
                >
                  {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

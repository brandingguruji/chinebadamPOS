'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { Pagination } from '@/components/Pagination';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/api';
import type { Expense } from '@/types';
import { Plus, Trash2, Edit3, Wallet, X, Calendar } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['Grocery', 'Utilities', 'Packaging', 'Staff', 'Maintenance', 'General'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type ExpPeriod = 'daily' | 'monthly' | 'yearly' | 'all';

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ExpensesPage() {
  const [period, setPeriod] = useState<ExpPeriod>('monthly');
  const [dayVal, setDayVal] = useState(todayStr());
  const [monthVal, setMonthVal] = useState(currentMonthStr());
  const [yearVal, setYearVal] = useState(String(new Date().getFullYear()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = getToken() ?? '';

  const toast = useToast();

  const loadExpenses = useCallback(async () => {
    try {
      const data = await getExpenses(token);
      setExpenses(data);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  function openAdd() {
    setEditing(null);
    setAmount('');
    setDescription('');
    setCategory('Grocery');
    setDate(todayStr());
    setError('');
    setShowModal(true);
  }

  function openEdit(ex: Expense) {
    setEditing(ex);
    setAmount(String(ex.amount));
    setDescription(ex.description);
    setCategory(ex.category || 'General');
    setDate(ex.date ? new Date(ex.date).toISOString().slice(0, 10) : todayStr());
    setError('');
    setShowModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (description.trim().length < 2) {
      setError('Description must be at least 2 characters (e.g., Grocery - Milk).');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateExpense(token, editing.id, {
          amount: numAmount,
          description: description.trim(),
          category,
          date,
        });
        setExpenses((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
        toast.success(`Updated expense: ₹${updated.amount.toFixed(2)}`);
      } else {
        const created = await createExpense(token, {
          amount: numAmount,
          description: description.trim(),
          category,
          date,
        });
        setExpenses((prev) => [created, ...prev]);
        toast.success(`Saved expense: ₹${created.amount.toFixed(2)}`);
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save expense';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ex: Expense) {
    if (!confirm(`Delete expense "${ex.description}" (₹${ex.amount})?`)) return;
    try {
      await deleteExpense(token, ex.id);
      setExpenses((prev) => prev.filter((item) => item.id !== ex.id));
      toast.success('Expense deleted');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const paginatedExpenses = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Log, edit, and manage daily cafe expenses</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Period Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'daily', label: 'Daily' },
            { id: 'monthly', label: 'This Month' },
            { id: 'yearly', label: 'Yearly' },
            { id: 'all', label: 'All' },
          ] as { id: ExpPeriod; label: string }[]).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                period === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period !== 'all' && (
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            {period === 'daily' && (
              <input
                type="date"
                value={dayVal}
                onChange={(e) => setDayVal(e.target.value || todayStr())}
                className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            )}
            {period === 'monthly' && (
              <input
                type="month"
                value={monthVal}
                onChange={(e) => setMonthVal(e.target.value || currentMonthStr())}
                className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            )}
            {period === 'yearly' && (
              <select
                value={yearVal}
                onChange={(e) => setYearVal(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              >
                {Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wallet size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Logged Expenses</div>
            <div className="text-2xl font-bold text-slate-900">₹{totalExpenses.toFixed(2)}</div>
          </div>
        </div>
        <div className="text-xs text-slate-400">{expenses.length} entries</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                  No expenses logged yet. Tap &quot;Add Expense&quot; to record one.
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{ex.description}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {ex.category || 'General'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {new Date(ex.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                    ₹{Number(ex.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(ex)}
                        className="text-slate-400 hover:text-teal-600 transition"
                        title="Edit expense"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(ex)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Delete expense"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={page}
          totalItems={expenses.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Edit Expense' : 'Add Expense'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 10"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery - Milk"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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

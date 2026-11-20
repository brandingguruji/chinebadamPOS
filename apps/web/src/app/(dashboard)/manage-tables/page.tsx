'use client';

import { useEffect, useState, FormEvent } from 'react';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { getTables, createTable, updateTableStatus, deleteTable } from '@/lib/api';
import type { Table, TableStatus } from '@/types';
import clsx from 'clsx';
import { Plus, Users, Edit3, Trash2, X, CheckCircle2 } from 'lucide-react';

const STATUS_STYLES: Record<TableStatus, string> = {
  Available: 'bg-green-100 text-green-700 border-green-200',
  Occupied: 'bg-orange-100 text-orange-700 border-orange-200',
  Reserved: 'bg-blue-100 text-blue-700 border-blue-200',
};

const CARD_BORDER: Record<TableStatus, string> = {
  Available: 'border-green-200',
  Occupied: 'border-orange-200',
  Reserved: 'border-blue-200',
};

export default function ManageTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);

  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [status, setStatus] = useState<TableStatus>('Available');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = getToken() ?? '';

  const toast = useToast();

  useEffect(() => {
    getTables(token)
      .then(setTables)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  function openAdd() {
    setEditing(null);
    const nextNum = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    setNumber(String(nextNum));
    setCapacity('4');
    setStatus('Available');
    setError('');
    setShowModal(true);
  }

  function openEdit(table: Table) {
    setEditing(table);
    setNumber(String(table.number));
    setCapacity(String(table.capacity));
    setStatus(table.status);
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const numVal = Number(number);
    const capVal = Number(capacity);
    if (!Number.isInteger(numVal) || numVal <= 0) {
      setError('Table number must be a positive whole number.');
      return;
    }
    if (!Number.isInteger(capVal) || capVal <= 0 || capVal > 50) {
      setError('Capacity must be between 1 and 50 seats.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTableStatus(token, editing.id, {
          number: numVal,
          capacity: capVal,
          status,
        });
        setTables((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.number - b.number)
        );
        toast.success(`Table #${updated.number} updated`);
      } else {
        const created = await createTable(token, { number: numVal, capacity: capVal, status });
        setTables((prev) => [...prev, created].sort((a, b) => a.number - b.number));
        toast.success(`Table #${created.number} added`);
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save table';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(table: Table, nextStatus: TableStatus) {
    try {
      const updated = await updateTableStatus(token, table.id, { status: nextStatus });
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Table #${table.number} marked ${nextStatus}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    }
  }

  async function handleDelete(table: Table) {
    if (!confirm(`Delete Table #${table.number}?`)) return;
    try {
      await deleteTable(token, table.id);
      setTables((prev) => prev.filter((t) => t.id !== table.id));
      toast.success(`Table #${table.number} deleted`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Tables</h1>
          <p className="text-sm text-slate-500 mt-1">{tables.length} tables total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Table
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6">
        {(['Available', 'Occupied', 'Reserved'] as TableStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={clsx('w-3 h-3 rounded-full', {
                'bg-green-500': s === 'Available',
                'bg-orange-500': s === 'Occupied',
                'bg-blue-500': s === 'Reserved',
              })}
            />
            <span className="text-xs text-slate-600 font-medium">{s}</span>
            <span className="text-xs text-slate-400">
              ({tables.filter((t) => t.status === s).length})
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={clsx(
              'bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-md transition-all',
              CARD_BORDER[table.status]
            )}
          >
            <div className="flex justify-end gap-1.5 mb-1">
              <button
                onClick={() => openEdit(table)}
                className="text-slate-400 hover:text-teal-600 transition"
                title="Edit table"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(table)}
                className="text-slate-400 hover:text-rose-600 transition"
                title="Delete table"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-slate-800 mb-1">#{table.number}</div>
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
                <Users size={12} />
                <span>{table.capacity} seats</span>
              </div>
            </div>

            <div
              className={clsx(
                'text-center text-xs font-semibold px-3 py-1.5 rounded-full border mb-3',
                STATUS_STYLES[table.status]
              )}
            >
              {table.status}
            </div>

            <select
              value={table.status}
              onChange={(e) => handleStatusChange(table, e.target.value as TableStatus)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50"
            >
              <option value="Available">Set Available</option>
              <option value="Occupied">Set Occupied</option>
              <option value="Reserved">Set Reserved</option>
            </select>
          </div>
        ))}
      </div>

      {/* Add / Edit Table Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? `Edit Table #${editing.number}` : 'Add New Table'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Table Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TableStatus)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
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
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

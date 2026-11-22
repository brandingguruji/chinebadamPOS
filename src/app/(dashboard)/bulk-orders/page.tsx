'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { getBulkOrders, createBulkOrder, updateBulkOrder, deleteBulkOrder } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Pagination } from '@/components/Pagination';
import { ThermalReceiptModal, type ReceiptData } from '@/components/ThermalReceiptModal';
import type { BulkOrder, BulkOrderStatus } from '@/types';
import clsx from 'clsx';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Search,
  Calendar,
  Users,
  Printer,
  CheckCircle2,
  PartyPopper,
  Phone,
  Clock,
} from 'lucide-react';

const EVENT_TYPES = ['Birthday', 'Marriage', 'Anniversary', 'Office Party', 'Family Gathering', 'Other'];
const PAGE_SIZE = 8;

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d?: string) {
  if (!d) return '—';
  const parsed = new Date(d + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE: Record<BulkOrderStatus, string> = {
  Booked: 'bg-blue-100 text-blue-700',
  Preparing: 'bg-amber-100 text-amber-800',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-rose-100 text-rose-700',
};

export default function BulkOrdersPage() {
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BulkOrderStatus>('All');
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BulkOrder | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('Birthday');
  const [menuDetails, setMenuDetails] = useState('');
  const [peopleCount, setPeopleCount] = useState('10');
  const [totalPrice, setTotalPrice] = useState('');
  const [advancePaid, setAdvancePaid] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Scan' | 'Card'>('Cash');
  const [orderDate, setOrderDate] = useState(getTodayStr());
  const [deliveryDate, setDeliveryDate] = useState(getTodayStr());
  const [deliveryTime, setDeliveryTime] = useState('19:00');
  const [status, setStatus] = useState<BulkOrderStatus>('Booked');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = getToken() ?? '';
  const toast = useToast();

  const loadOrders = useCallback(async () => {
    try {
      const data = await getBulkOrders(token);
      setOrders(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load bulk orders');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q) ||
      (o.menuDetails || '').toLowerCase().includes(q) ||
      (o.eventType || '').toLowerCase().includes(q) ||
      (o.orderNumber || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalBookingValue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((s, o) => s + Number(o.totalPrice || 0), 0);
  const totalAdvance = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((s, o) => s + Number(o.advancePaid || 0), 0);
  const totalBalance = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((s, o) => s + Number(o.balanceDue || 0), 0);

  const calcTotal = Number(totalPrice) || 0;
  const calcAdvance = Math.max(0, Number(advancePaid) || 0);
  const calcBalance = Math.max(0, calcTotal - calcAdvance);
  const calcPeople = Math.max(1, Number(peopleCount) || 1);
  const perPlate = calcTotal > 0 ? (calcTotal / calcPeople).toFixed(0) : '0';

  function openAdd() {
    setEditing(null);
    setCustomerName('');
    setPhone('');
    setEventType('Birthday');
    setMenuDetails('');
    setPeopleCount('10');
    setTotalPrice('');
    setAdvancePaid('0');
    setPaymentMethod('Cash');
    setOrderDate(getTodayStr());
    setDeliveryDate(getTodayStr());
    setDeliveryTime('19:00');
    setStatus('Booked');
    setNotes('');
    setError('');
    setShowModal(true);
  }

  function openEdit(o: BulkOrder) {
    setEditing(o);
    setCustomerName(o.customerName || '');
    setPhone(o.phone || '');
    setEventType(o.eventType || 'Birthday');
    setMenuDetails(o.menuDetails || '');
    setPeopleCount(String(o.peopleCount || 10));
    setTotalPrice(String(o.totalPrice || ''));
    setAdvancePaid(String(o.advancePaid || 0));
    setPaymentMethod(o.paymentMethod || 'Cash');
    setOrderDate(o.orderDate || getTodayStr());
    setDeliveryDate(o.deliveryDate || getTodayStr());
    setDeliveryTime(o.deliveryTime || '');
    setStatus(o.status || 'Booked');
    setNotes(o.notes || '');
    setError('');
    setShowModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (customerName.trim().length < 2) {
      setError('Customer name must be at least 2 characters.');
      return;
    }
    if (phone.trim().length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (!menuDetails.trim()) {
      setError('Please enter menu / package items (e.g. Fried Rice + Alur Dum + Beguni).');
      return;
    }
    if (calcTotal <= 0) {
      setError('Total price must be greater than ₹0.');
      return;
    }
    if (!orderDate || !deliveryDate) {
      setError('Both Order Date and Delivery Date are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        eventType,
        menuDetails: menuDetails.trim(),
        peopleCount: calcPeople,
        totalPrice: calcTotal,
        advancePaid: calcAdvance,
        paymentMethod,
        orderDate,
        deliveryDate,
        deliveryTime,
        status,
        notes: notes.trim(),
      };

      if (editing) {
        const updated = await updateBulkOrder(token, editing.id, payload);
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        toast.success(`Updated bulk order ${updated.orderNumber}`);
      } else {
        const created = await createBulkOrder(token, payload);
        setOrders((prev) => [created, ...prev]);
        toast.success(`Booked bulk order ${created.orderNumber}`);
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save bulk order';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCollectAndComplete(o: BulkOrder) {
    if (!confirm(`Mark ${o.orderNumber} as Completed & Fully Paid (₹${o.totalPrice})?`)) return;
    try {
      const updated = await updateBulkOrder(token, o.id, {
        status: 'Completed',
        advancePaid: o.totalPrice,
      });
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Order ${updated.orderNumber} completed & settled!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete order');
    }
  }

  async function handleDelete(o: BulkOrder) {
    if (!confirm(`Delete bulk order ${o.orderNumber} (${o.customerName})?`)) return;
    try {
      await deleteBulkOrder(token, o.id);
      setOrders((prev) => prev.filter((item) => item.id !== o.id));
      toast.success(`Deleted ${o.orderNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function openThermalBill(o: BulkOrder) {
    setReceiptData({
      orderNumber: o.orderNumber,
      date: new Date().toLocaleDateString('en-IN'),
      orderType: `Bulk (${o.eventType})`,
      customerName: `${o.customerName} (${o.phone})`,
      paymentMethod: o.paymentMethod === 'Scan' ? 'UPI' : o.paymentMethod,
      orderDate: formatDate(o.orderDate),
      deliveryDate: `${formatDate(o.deliveryDate)}${o.deliveryTime ? ` ${o.deliveryTime}` : ''}`,
      peopleCount: o.peopleCount,
      items: [
        {
          name: `${o.menuDetails} (${o.peopleCount} pax)`,
          quantity: 1,
          unitPrice: Number(o.totalPrice || 0),
        },
      ],
      subtotal: Number(o.totalPrice || 0),
      taxRate: 0,
      tax: 0,
      total: Number(o.totalPrice || 0),
      advancePaid: Number(o.advancePaid || 0),
      balanceDue: Number(o.balanceDue || 0),
    });
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
            <PartyPopper size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Bulk / Party Orders</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage birthday, marriage &amp; group catering bookings
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus size={16} />
          New Bulk Order
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{orders.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Bookings</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-teal-600">₹{totalBookingValue.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Package Value</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">₹{totalAdvance.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Advance Collected</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-rose-600">₹{totalBalance.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Balance Pending</div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, event, menu..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'Booked', 'Preparing', 'Completed', 'Cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-semibold border transition',
                statusFilter === s
                  ? 'bg-[#0D9488] text-white border-[#0D9488]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Orders Cards + Pagination */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No bulk orders found. Click &quot;New Bulk Order&quot; to book a party or group order.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginated.map((o) => (
              <div key={o.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{o.orderNumber}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {o.eventType}
                      </span>
                      <span
                        className={clsx(
                          'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                          STATUS_BADGE[o.status] || STATUS_BADGE.Booked
                        )}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">
                      {o.customerName}{' '}
                      <span className="text-xs font-normal text-slate-500 inline-flex items-center gap-1 ml-1">
                        <Phone size={11} />
                        {o.phone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      ₹{Number(o.totalPrice || 0).toFixed(0)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Adv: <span className="font-semibold text-emerald-600">₹{Number(o.advancePaid || 0).toFixed(0)}</span> ·
                      Due: <span className="font-semibold text-rose-600">₹{Number(o.balanceDue || 0).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Menu & Dates Row */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-800">{o.menuDetails}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <Users size={12} className="text-teal-600" />
                      {o.peopleCount} People
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      Order Date: <strong className="text-slate-700">{formatDate(o.orderDate)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      Delivery Date:{' '}
                      <strong className="text-amber-800">
                        {formatDate(o.deliveryDate)}
                        {o.deliveryTime ? ` · ${o.deliveryTime}` : ''}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                  {o.status !== 'Completed' && o.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCollectAndComplete(o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                    >
                      <CheckCircle2 size={13} />
                      {o.balanceDue > 0 ? `Collect ₹${o.balanceDue} & Complete` : 'Mark Completed'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openThermalBill(o)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-semibold transition"
                  >
                    <Printer size={13} />
                    Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(o)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(o)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Bulk Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? `Edit Bulk Order ${editing.orderNumber}` : 'New Bulk / Party Order'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Amit Das"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Order Date & Delivery Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Time</label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {EVENT_TYPES.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BulkOrderStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Booked">Booked</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Menu / Package Items
                </label>
                <textarea
                  rows={2}
                  required
                  value={menuDetails}
                  onChange={(e) => setMenuDetails(e.target.value)}
                  placeholder="e.g. Fried Rice + Alur Dum + Beguni"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total People</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="1200"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Live Calculation Summary */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-xs">
                <span className="text-teal-800 font-medium">
                  Per plate: <strong>₹{perPlate}</strong>
                </span>
                <span className="text-rose-700 font-bold">
                  Balance Due: ₹{calcBalance.toFixed(0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Scan' | 'Card')}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Scan">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Less spicy, extra chutney..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  {saving ? 'Saving...' : editing ? 'Update Booking' : 'Save Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Bill Preview */}
      <ThermalReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}

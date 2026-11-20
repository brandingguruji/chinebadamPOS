'use client';

import { Phone, Mail, Clock, ShoppingBag } from 'lucide-react';

// Mock customer data (no customers API in scope)
const MOCK_CUSTOMERS = [
  { id: '1', name: 'Alice Wong', phone: '+1 555-0101', email: 'alice@example.com', totalOrders: 12, lastVisit: '2026-11-19', totalSpent: 320.50 },
  { id: '2', name: 'Bob Chen', phone: '+1 555-0102', email: 'bob@example.com', totalOrders: 7, lastVisit: '2026-11-18', totalSpent: 184.00 },
  { id: '3', name: 'Carol Lim', phone: '+1 555-0103', email: 'carol@example.com', totalOrders: 24, lastVisit: '2026-11-20', totalSpent: 650.75 },
  { id: '4', name: 'David Ng', phone: '+1 555-0104', email: 'david@example.com', totalOrders: 3, lastVisit: '2026-11-15', totalSpent: 89.90 },
  { id: '5', name: 'Emma Tan', phone: '+1 555-0105', email: 'emma@example.com', totalOrders: 18, lastVisit: '2026-11-20', totalSpent: 490.25 },
  { id: '6', name: 'Frank Ho', phone: '+1 555-0106', email: 'frank@example.com', totalOrders: 9, lastVisit: '2026-11-17', totalSpent: 230.00 },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-sm text-slate-500 mt-1">{MOCK_CUSTOMERS.length} registered customers</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-2xl font-bold text-slate-800">{MOCK_CUSTOMERS.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Customers</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-2xl font-bold text-teal-600">
            {MOCK_CUSTOMERS.reduce((s, c) => s + c.totalOrders, 0)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Total Orders</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-2xl font-bold text-emerald-600">
            ${MOCK_CUSTOMERS.reduce((s, c) => s + c.totalSpent, 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Total Revenue</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Orders</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Spent</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {MOCK_CUSTOMERS.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone size={11} className="text-slate-400" />
                      {c.phone}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail size={11} className="text-slate-400" />
                      {c.email}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-700">{c.totalOrders}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-emerald-600">${c.totalSpent.toFixed(2)}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    {formatDate(c.lastVisit)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

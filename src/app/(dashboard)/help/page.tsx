'use client';

export default function HelpPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Help Center</h1>
      <p className="text-sm text-slate-500 mb-6">Quick tips for using the POS system.</p>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 text-sm text-slate-600">
        <div>
          <h2 className="font-semibold text-slate-800">Placing an Order</h2>
          <p className="text-xs mt-1">Open Order Line, select a table on the right panel, click + on dishes, pick a payment method, and hit Place Order.</p>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Updating Kitchen Status</h2>
          <p className="text-xs mt-1">Use the status badge dropdown directly on any order card to move orders from In Kitchen to Ready or Served.</p>
        </div>
      </div>
    </div>
  );
}

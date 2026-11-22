'use client';

import { Printer, X } from 'lucide-react';
import { loadStoreSettings } from '@/lib/settings';

export interface ReceiptData {
  orderNumber: string;
  date: string;
  orderType: string;
  tableNumber?: number;
  customerName?: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  orderDate?: string;
  deliveryDate?: string;
  peopleCount?: number;
  advancePaid?: number;
  balanceDue?: number;
}

interface ThermalReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function ThermalReceiptModal({ receipt, onClose }: ThermalReceiptModalProps) {
  if (!receipt) return null;

  const store = loadStoreSettings();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Modal Top Bar (hidden on print) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">Thermal Bill Preview</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="overflow-y-auto p-4 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-[58mm] bg-white text-black font-mono text-[11px] leading-[1.35] p-3 shadow-sm border border-slate-200"
          >
            {/* Header: Logo + Store Name + Address + GST + FSSAI */}
            <div className="text-center mb-2">
              {store.logo && (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-12 h-12 object-contain mx-auto mb-1 grayscale"
                />
              )}
              <div className="text-[14px] font-bold uppercase tracking-wide">{store.name}</div>
              {store.address && (
                <div className="text-[10px] whitespace-pre-line mt-0.5">{store.address}</div>
              )}
              {store.phone && <div className="text-[10px]">Ph: {store.phone}</div>}
              {store.gstNumber && (
                <div className="text-[10px] font-semibold mt-0.5">GSTIN: {store.gstNumber}</div>
              )}
              {store.fssaiNumber && (
                <div className="text-[10px] font-semibold">FSSAI: {store.fssaiNumber}</div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-1.5" />

            {/* Order Meta */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill: {receipt.orderNumber}</span>
                <span>{receipt.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Date: {receipt.date}</span>
                {receipt.tableNumber ? <span>Table #{receipt.tableNumber}</span> : null}
              </div>
              {receipt.customerName && receipt.customerName !== 'Walk-in' && (
                <div>Cust: {receipt.customerName}</div>
              )}
              {receipt.orderDate && <div>Order Date: {receipt.orderDate}</div>}
              {receipt.deliveryDate && <div>Delivery: {receipt.deliveryDate}</div>}
              {receipt.peopleCount ? <div>People: {receipt.peopleCount} pax</div> : null}
              <div>Pay: {receipt.paymentMethod}</div>
            </div>

            <div className="border-t border-dashed border-black my-1.5" />

            {/* Column Headers */}
            <div className="flex justify-between font-bold text-[10px] pb-1">
              <span className="flex-1">ITEM</span>
              <span className="w-7 text-center">QTY</span>
              <span className="w-12 text-right">AMT</span>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[10px] items-start">
                  <span className="flex-1 pr-1 break-words">{item.name}</span>
                  <span className="w-7 text-center">{item.quantity}</span>
                  <span className="w-12 text-right">
                    {(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-1.5" />

            {/* Totals */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{receipt.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({receipt.taxRate}%)</span>
                <span>₹{receipt.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-dashed border-black my-1" />
              <div className="flex justify-between text-[13px] font-bold">
                <span>TOTAL</span>
                <span>₹{receipt.total.toFixed(2)}</span>
              </div>
              {receipt.advancePaid !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Advance Paid</span>
                    <span>₹{receipt.advancePaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span>₹{(receipt.balanceDue ?? 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            <div className="text-center text-[10px]">
              <div>Thank you! Visit again</div>
            </div>
          </div>
        </div>

        {/* Print / Close Buttons */}
        <div className="p-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-sm"
          >
            <Printer size={14} />
            Print Thermal
          </button>
        </div>
      </div>
    </div>
  );
}

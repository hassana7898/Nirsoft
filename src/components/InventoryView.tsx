import React, { useState, useEffect } from 'react';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react';

interface InventoryViewProps {
  products: any[];
  stockRecords: any[];
  onRefresh: () => void;
}

export function InventoryView({ products, stockRecords, onRefresh }: InventoryViewProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [search, setSearch] = useState('');

  // Adjustment form
  const [adjProductId, setAdjProductId] = useState('');
  const [adjAction, setAdjAction] = useState<'ADJUSTMENT_INCREASE' | 'ADJUSTMENT_DECREASE'>('ADJUSTMENT_DECREASE');
  const [adjQuantityKg, setAdjQuantityKg] = useState<number | ''>('');
  const [adjReason, setAdjReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLedger = async () => {
    try {
      setLoadingLedger(true);
      const res = await fetch('/api/v1/inventory/ledger');
      if (res.ok) {
        const json = await res.json();
        setLedgerRows(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger();
    }
  }, [activeTab]);

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId || !adjQuantityKg || !adjReason) {
      setErrorMsg('تکمیل تمامی فیلدها الزامی است.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjProductId,
          action: adjAction,
          quantityKg: Number(adjQuantityKg),
          reason: adjReason,
        }),
      });

      if (!res.ok) throw new Error('خطا در ثبت تعدیل انبار');

      setShowAdjustmentModal(false);
      setAdjQuantityKg('');
      setAdjReason('');
      onRefresh();
      if (activeTab === 'ledger') fetchLedger();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PURCHASE_RECEIPT':
        return { label: 'ورود بارنامه (خرید)', bg: 'bg-blue-50 text-blue-700' };
      case 'PRODUCTION_OUTPUT':
        return { label: 'تولید دان آماده', bg: 'bg-emerald-50 text-emerald-700' };
      case 'PRODUCTION_CONSUMPTION':
        return { label: 'مصرف در خط تولید', bg: 'bg-purple-50 text-purple-700' };
      case 'SALES_DISPATCH':
        return { label: 'خروج به مرغدار', bg: 'bg-orange-50 text-orange-700' };
      case 'ADJUSTMENT_INCREASE':
        return { label: 'تعدیل انبارگردانی (+)', bg: 'bg-teal-50 text-teal-700' };
      case 'ADJUSTMENT_DECREASE':
        return { label: 'تعدیل کسری انبار (-)', bg: 'bg-rose-50 text-rose-700' };
      default:
        return { label: action, bg: 'bg-slate-50 text-slate-700' };
    }
  };

  const filteredStock = stockRecords.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            انبار مرکزی، سیلوها و دفتر کل کاردکس کالا (Immutable Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده موجودی لحظه‌ای مواد اولیه و دان آماده، ثبت تغییرات دوطرفه و انبارگردانی فیزیکی
          </p>
        </div>

        <button
          onClick={() => {
            if (products.length > 0 && !adjProductId) setAdjProductId(products[0].id);
            setShowAdjustmentModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          ثبت تعدیل انبارگردانی فیزیکی
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            موجودی لحظه‌ای انبار و سیلوها ({stockRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            کاردکس و ریز تراکنش‌های دفتر کل انبار
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 w-64">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در اقلام کالا..."
              className="w-full text-xs bg-transparent border-none outline-none text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Stock Levels View */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStock.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition hover:shadow-md ${
                s.isLowStock ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.type === 'RAW_MATERIAL'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {s.type === 'RAW_MATERIAL' ? 'ماده اولیه' : 'خوراک آماده نهایی'}
                </span>
                {s.isLowStock && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    کسری انبار
                  </span>
                )}
              </div>

              <h4 className="font-bold text-base text-slate-900 mb-2">{s.name}</h4>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {Number(s.currentStockKg || 0).toLocaleString('fa-IR')}
                </span>
                <span className="text-xs font-semibold text-slate-500">کیلوگرم</span>
                <span className="text-xs text-slate-400 font-mono">
                  ({(Number(s.currentStockKg || 0) / 1000).toFixed(2)} تن)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>حد هشدار حداقل موجودی:</span>
                <span className="font-mono font-bold text-slate-700">
                  {Number(s.minStockAlert || 0).toLocaleString('fa-IR')} kg
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ledger Cards View */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">تاریخ تراکنش</th>
                  <th className="py-3 px-4">نام کالا</th>
                  <th className="py-3 px-4">نوع عملیات کاردکس</th>
                  <th className="py-3 px-4 text-center">تغییر مقدار (kg)</th>
                  <th className="py-3 px-4">شرح سند / بابت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerRows.map((l) => {
                  const b = getActionBadge(l.action);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">{l.transactionDate}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{l.productName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${b.bg}`}>
                          {b.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm">
                        <span
                          className={
                            Number(l.quantityChange) > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {Number(l.quantityChange) > 0 ? '+' : ''}
                          {Number(l.quantityChange).toLocaleString('fa-IR')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{l.reason || '---'}</td>
                    </tr>
                  );
                })}
                {ledgerRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      هیچ تراکنشی در دفتر کل ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Physical Adjustment */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">ثبت تعدیل انبارگردانی فیزیکی</h3>
              </div>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustment} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">انتخاب کالا *</label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                >
                  <option value="">انتخاب کالا...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === 'RAW_MATERIAL' ? 'ماده اولیه' : 'دان آماده'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع تعدیل *</label>
                <select
                  value={adjAction}
                  onChange={(e) => setAdjAction(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                >
                  <option value="ADJUSTMENT_DECREASE">کسری انبارگردانی (کاهش از موجودی کاردکس)</option>
                  <option value="ADJUSTMENT_INCREASE">مازاد انبارگردانی (افزایش به موجودی کاردکس)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مقدار تعدیل (کیلوگرم) *</label>
                <input
                  type="number"
                  value={adjQuantityKg}
                  onChange={(e) => setAdjQuantityKg(e.target.value ? Number(e.target.value) : '')}
                  placeholder="مثال: 450"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">علت و مستند تعدیل *</label>
                <textarea
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="مثال: نتیجه انبارگردانی پایان دوره پاییز با حضور ناظر"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ثبت تعدیل قطعی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

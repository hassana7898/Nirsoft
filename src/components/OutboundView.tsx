import React, { useState } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  Printer,
  Calendar,
  User,
  Package,
  AlertTriangle,
  X,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { calculateFeedQuota } from '../domain/farming/calculations.ts';

interface OutboundViewProps {
  records: any[];
  farmers: any[];
  flocks: any[];
  products: any[];
  drivers: any[];
  onRefresh: () => void;
  onPrint: (record: any) => void;
}

export function OutboundView({
  records,
  farmers,
  flocks,
  products,
  drivers,
  onRefresh,
  onPrint,
}: OutboundViewProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [farmerId, setFarmerId] = useState('');
  const [flockId, setFlockId] = useState('');
  const [productId, setProductId] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [driverName, setDriverName] = useState('');
  const [driverId, setDriverId] = useState('');
  const [isCrumble, setIsCrumble] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const finishedGoodProducts = products.filter((p) => p.type === 'FINISHED_GOOD');
  const farmerFlocks = flocks.filter((f) => f.farmerId === farmerId);
  const selectedFlock = flocks.find((f) => f.id === flockId);

  // Calculate quota warning
  const standardQuotaKg = selectedFlock ? calculateFeedQuota(1800, selectedFlock.chickCount) : 0;
  const currentTotalExitsKg = records
    .filter((r) => r.flockId === flockId)
    .reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  const projectedTotalKg = currentTotalExitsKg + (typeof weight === 'number' ? weight : 0);
  const isExceedingQuota = standardQuotaKg > 0 && projectedTotalKg > standardQuotaKg;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId || !productId || !weight) {
      setErrorMsg('انتخاب مرغدار، محصول و وزن دان خروجی الزامی است.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/inventory/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exitDate,
          farmerId,
          flockId: flockId || undefined,
          productId,
          weight: Number(weight),
          driverName: driverName || undefined,
          driverId: driverId || undefined,
          isCrumble,
          invoiceNumber: invoiceNumber || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت حواله خروج');

      setShowAddModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFarmerId('');
    setFlockId('');
    setProductId(finishedGoodProducts[0]?.id || '');
    setWeight('');
    setDriverName('');
    setDriverId('');
    setIsCrumble(false);
    setInvoiceNumber('');
    setErrorMsg(null);
  };

  const filtered = records.filter(
    (r) =>
      r.farmerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.productName?.toLowerCase().includes(search.toLowerCase()) ||
      r.driverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            باسکول و خروج خوراک مرغداری (ارسال بار به مزارع)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            صدور حواله‌های رسمی ارسال خوراک آماده به مرغداران، تطبیق سهمیه مصرفی گله و کسر لحظه‌ای از انبار محصول نهایی
          </p>
        </div>

        <button
          onClick={() => {
            if (finishedGoodProducts.length > 0 && !productId) {
              setProductId(finishedGoodProducts[0].id);
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          صدور حواله خروج جدید
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس نام مرغدار، شماره حواله، نوع خوراک یا راننده..."
          className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
            پاک‌کردن
          </button>
        )}
      </div>

      {/* Outbound Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">شماره حواله</th>
                <th className="py-3 px-4">تاریخ ارسال</th>
                <th className="py-3 px-4">نام مرغدار</th>
                <th className="py-3 px-4">دوره / گله</th>
                <th className="py-3 px-4">نوع دان ارسالی</th>
                <th className="py-3 px-4 text-center">فرم فیزیکی</th>
                <th className="py-3 px-4 text-center">وزن خالص (kg)</th>
                <th className="py-3 px-4">راننده حامل</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{r.exitDate}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.farmerName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {r.flockCode ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                        {r.flockCode}
                      </span>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{r.productName}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.isCrumble
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {r.isCrumble ? 'کرامبل' : 'پلت'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-black text-emerald-800 text-sm">
                    {Number(r.weight).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.driverName || '---'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onPrint(r)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="چاپ حواله رسمی تحویل دان"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ حواله خروجی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Outbound Exit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">صدور حواله رسمی خروج خوراک مرغداری</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ ارسال بار *</label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره حواله / فاکتور</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="اختیاری (سیستم به صورت خودکار تولید می‌کند)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">انتخاب مرغدار *</label>
                  <select
                    value={farmerId}
                    onChange={(e) => {
                      setFarmerId(e.target.value);
                      setFlockId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  >
                    <option value="">انتخاب مرغدار...</option>
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">انتخاب دوره / گله مرغداری</label>
                  <select
                    value={flockId}
                    onChange={(e) => setFlockId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="">انتخاب دوره فعال...</option>
                    {farmerFlocks.map((fl) => (
                      <option key={fl.id} value={fl.id}>
                        {fl.flockCode || 'دوره'} ({fl.chickCount} قطعه - شروع: {fl.startDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع محصول دان *</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  >
                    <option value="">انتخاب محصول...</option>
                    {finishedGoodProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وزن خالص دان در باسکول (kg) *</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 6000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono text-sm font-bold text-emerald-900"
                    required
                  />
                </div>
              </div>

              {/* Crumble vs Pellet selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">فرم فیزیکی خوراک:</span>
                  <span className="text-[11px] text-slate-500">
                    برای روزهای آغازین پرورش جوجه (پیش‌دان) معمولاً دان به صورت کرامبل خرد شده تحویل می‌شود.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isCrumble}
                    onChange={(e) => setIsCrumble(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>ارسال به صورت کرامبل (Crumble)</span>
                </label>
              </div>

              {/* Feed Quota live indicator */}
              {selectedFlock && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isExceedingQuota
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isExceedingQuota ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <span>
                      سهمیه مجاز استاندارد این گله ({selectedFlock.chickCount} قطعه):{' '}
                      <strong className="font-mono">{standardQuotaKg.toLocaleString('fa-IR')} کیلوگرم</strong>
                    </span>
                  </div>
                  <div className="text-left font-mono font-bold text-xs">
                    مجموع پس از ارسال: {projectedTotalKg.toLocaleString('fa-IR')} kg
                    {isExceedingQuota && <span className="block text-rose-600 text-[10px]">فراتر از سهمیه!</span>}
                  </div>
                </div>
              )}

              {/* Driver Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">انتخاب از ناوگان رانندگان کارخانه</label>
                  <select
                    value={driverId}
                    onChange={(e) => {
                      setDriverId(e.target.value);
                      const drv = drivers.find((d) => d.id === e.target.value);
                      if (drv) setDriverName(drv.fullName);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="">انتخاب راننده...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام راننده (دستی / آزاد)</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="نام راننده حامل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'در حال ثبت حواله...' : 'تأیید و صدور حواله خروج دان'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

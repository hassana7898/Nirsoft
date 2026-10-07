import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Calendar,
  PlusCircle,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  ChevronLeft,
  X,
  Phone,
} from 'lucide-react';
import { calculateFlockDuration, calculatePerCapita } from '../domain/farming/calculations.ts';

interface FarmerPortalViewProps {
  user: any;
  products: any[];
}

export function FarmerPortalView({ user, products }: FarmerPortalViewProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDailyRecordModal, setShowDailyRecordModal] = useState(false);

  // Daily Record form
  const [selectedFlockId, setSelectedFlockId] = useState('');
  const [dayOfAge, setDayOfAge] = useState<number | ''>(25);
  const [mortalityCount, setMortalityCount] = useState<number | ''>(5);
  const [feedConsumedKg, setFeedConsumedKg] = useState<number | ''>(1250);
  const [waterConsumedLiters, setWaterConsumedLiters] = useState<number | ''>(2400);
  const [averageWeightGrams, setAverageWeightGrams] = useState<number | ''>(1350);
  const [dailyNotes, setDailyNotes] = useState('');

  // Order form
  const [orderFlockId, setOrderFlockId] = useState('');
  const [orderProductId, setOrderProductId] = useState('');
  const [orderTonnageKg, setOrderTonnageKg] = useState<number | ''>(10000);
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isCrumble, setIsCrumble] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const finishedGoodProducts = products.filter((p) => p.type === 'FINISHED_GOOD');

  const fetchFarmerData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/portal/farmer/overview');
      if (res.ok) {
        const j = await res.json();
        setData(j.data);
        if (j.data?.activeFlocks?.length > 0) {
          setSelectedFlockId(j.data.activeFlocks[0].id);
          setOrderFlockId(j.data.activeFlocks[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerData();
  }, []);

  const handleSaveDailyRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlockId || dayOfAge === '') return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/portal/farmer/daily-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flockId: selectedFlockId,
          recordDate: new Date().toISOString().slice(0, 10),
          dayOfAge: Number(dayOfAge),
          mortalityCount: Number(mortalityCount || 0),
          feedConsumedKg: Number(feedConsumedKg || 0),
          waterConsumedLiters: Number(waterConsumedLiters || 0),
          averageWeightGrams: Number(averageWeightGrams || 0),
          notes: dailyNotes || undefined,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'خطا در ثبت آمار');

      setShowDailyRecordModal(false);
      setSuccessMsg('آمار روزانه سالن با موفقیت در سامانه کارخانه ثبت شد.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchFarmerData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderProductId || !orderTonnageKg) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flockId: orderFlockId || undefined,
          productId: orderProductId,
          requestedQuantityKg: Number(orderTonnageKg),
          requestedDate: orderDate,
          isCrumble,
          notes: orderNotes || undefined,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'خطا در ثبت سفارش');

      setShowOrderModal(false);
      setSuccessMsg('سفارش دان با موفقیت به واحد فروش و بازرگانی کارخانه ارسال شد.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchFarmerData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeFlock = data?.activeFlocks?.[0];
  const flockAge = activeFlock ? calculateFlockDuration(activeFlock.startDate) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                پرتال اختصاصی مرغدار طرف قرارداد
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {data?.farmer?.fullName || user?.fullName}
            </h2>
            <p className="text-xs text-emerald-200 mt-1">
              مدیریت دوره‌های جوجه‌ریزی، درخواست مستقیم دان پلت و ثبت روزانه تلفات و رشد سالن
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              سفارش دان جدید
            </button>
            <button
              onClick={() => setShowDailyRecordModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              ثبت آمار روزانه
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Flock Spotlight Card */}
      {activeFlock ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">دوره در حال پرورش:</span>
              <h3 className="font-bold text-base text-slate-900">{activeFlock.flockCode}</h3>
            </div>
            <div className="text-left font-mono">
              <span className="text-2xl font-black text-emerald-700">{flockAge}</span>
              <span className="text-xs text-slate-500 mr-1">روز سن</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] mb-1">تعداد جوجه اولیه:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {Number(activeFlock.chickCount).toLocaleString('fa-IR')} قطعه
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] mb-1">نژاد پرنده:</span>
              <span className="font-bold text-slate-800 text-sm">{activeFlock.breed}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] mb-1">کل دان دریافتی:</span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                {Number(data?.totalFeedReceivedKg || 0).toLocaleString('fa-IR')} kg
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] mb-1">مصرف سرانه هر قطعه:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {calculatePerCapita(data?.totalFeedReceivedKg || 0, activeFlock.chickCount).toLocaleString('fa-IR')} g
              </span>
            </div>
          </div>

          {/* Ross 308 Standard Feed Quota Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">میزان پیشروی مصرف دان نسبت به سهمیه استاندارد دوره (۴۵۰۰ گرم/پرنده):</span>
              <span className="font-mono text-emerald-800">
                {(
                  ((data?.totalFeedReceivedKg || 0) /
                    ((activeFlock.chickCount * 4500) / 1000)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((data?.totalFeedReceivedKg || 0) / ((activeFlock.chickCount * 4500) / 1000)) * 100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
          در حال حاضر هیچ دوره جوجه‌ریزی فعالی برای شما ثبت نشده است.
        </div>
      )}

      {/* Recent Orders Tracking Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            وضعیت سفارشات اخیر دان شما:
          </h3>
          <button
            onClick={() => setShowOrderModal(true)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
          >
            + ثبت سفارش جدید
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">شماره سفارش</th>
                <th className="py-2.5 px-3">نوع دان</th>
                <th className="py-2.5 px-3 text-center">مقدار (kg)</th>
                <th className="py-2.5 px-3">تاریخ درخواستی</th>
                <th className="py-2.5 px-3 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentOrders?.map((ord: any) => (
                <tr key={ord.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{ord.productName}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800">
                    {Number(ord.requestedQuantityKg).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{ord.requestedDate}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.recentOrders || data.recentOrders.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    هیچ سفارشی ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Submit Daily Record */}
      {showDailyRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">ثبت آمار روزانه سالن مرغداری</h3>
              </div>
              <button onClick={() => setShowDailyRecordModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyRecord} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سن گله (روز) *</label>
                  <input
                    type="number"
                    value={dayOfAge}
                    onChange={(e) => setDayOfAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تلفات امروز (قطعه)</label>
                  <input
                    type="number"
                    value={mortalityCount}
                    onChange={(e) => setMortalityCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono text-rose-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">دان مصرفی ۲۴ ساعت (kg)</label>
                  <input
                    type="number"
                    value={feedConsumedKg}
                    onChange={(e) => setFeedConsumedKg(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مصرف آب (لیتر)</label>
                  <input
                    type="number"
                    value={waterConsumedLiters}
                    onChange={(e) => setWaterConsumedLiters(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نمونه میانگین وزن پرنده (گرم)</label>
                <input
                  type="number"
                  value={averageWeightGrams}
                  onChange={(e) => setAverageWeightGrams(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت و وضعیت سالن</label>
                <textarea
                  rows={2}
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="مثال: تهویه و دانخوری در شرایط عالی، واکسیناسیون انجام شد"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDailyRecordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  ثبت آمار روزانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Order for Farmer */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">ثبت سفارش مستقیم دان برای مرغداری</h3>
              </div>
              <button onClick={() => setShowOrderModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع دان *</label>
                <select
                  value={orderProductId}
                  onChange={(e) => setOrderProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                >
                  <option value="">انتخاب محصول دان...</option>
                  {finishedGoodProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مقدار مورد نیاز (kg) *</label>
                  <input
                    type="number"
                    value={orderTonnageKg}
                    onChange={(e) => setOrderTonnageKg(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 10000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ تحویل درخواستی *</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isCrumble}
                  onChange={(e) => setIsCrumble(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>سفارش به صورت کرامبل خرد شده (Crumble)</span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت برای راننده و انبار</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="مثال: تخلیه در سیلوی شماره ۳ مرغداری"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  ارسال سفارش به کارخانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

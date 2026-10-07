import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PlusCircle,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Activity,
  Archive,
  X,
  Search,
  FileText,
} from 'lucide-react';
import {
  calculateFCR,
  calculatePerCapita,
  calculateFlockDuration,
} from '../domain/farming/calculations.ts';

interface FarmingViewProps {
  farmers: any[];
  flocks: any[];
  onRefresh: () => void;
}

export function FarmingView({ farmers, flocks, onRefresh }: FarmingViewProps) {
  const [activeTab, setActiveTab] = useState<'flocks' | 'farmers'>('flocks');
  const [search, setSearch] = useState('');
  const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
  const [showAddFlockModal, setShowAddFlockModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedFlockToSettle, setSelectedFlockToSettle] = useState<any | null>(null);

  // Farmer form
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [farmerNationalId, setFarmerNationalId] = useState('');

  // Flock form
  const [flockFarmerId, setFlockFarmerId] = useState('');
  const [flockCode, setFlockCode] = useState('');
  const [chickCount, setChickCount] = useState<number | ''>(20000);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [breed, setBreed] = useState('Ross 308');

  // Settle form
  const [finalWeightKg, setFinalWeightKg] = useState<number | ''>('');
  const [actualEndDate, setActualEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/farming/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: farmerName,
          phoneNumber: farmerPhone || undefined,
          address: farmerAddress || undefined,
          nationalId: farmerNationalId || undefined,
        }),
      });
      if (!res.ok) throw new Error('خطا در ثبت مرغدار');
      setShowAddFarmerModal(false);
      setFarmerName('');
      setFarmerPhone('');
      setFarmerAddress('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flockFarmerId || !chickCount || !startDate) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/farming/flocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: flockFarmerId,
          flockCode: flockCode || `FL-${startDate.replace(/-/g, '')}`,
          chickCount: Number(chickCount),
          startDate,
          breed,
        }),
      });
      if (!res.ok) throw new Error('خطا در ثبت دوره پرورش');
      setShowAddFlockModal(false);
      setFlockFarmerId('');
      setFlockCode('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettleFlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlockToSettle || !finalWeightKg) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/farming/flocks/${selectedFlockToSettle.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalChickenWeight: Number(finalWeightKg),
          actualEndDate,
        }),
      });
      if (!res.ok) throw new Error('خطا در تسویه و محاسبه FCR');
      setShowSettleModal(false);
      setSelectedFlockToSettle(null);
      setFinalWeightKg('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFlocks = flocks.filter(
    (fl) =>
      fl.farmerName?.toLowerCase().includes(search.toLowerCase()) ||
      fl.flockCode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFarmers = farmers.filter(
    (f) =>
      f.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      f.phoneNumber?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            مدیریت مرغداران، مزارع و دوره‌های جوجه‌ریزی (گله‌ها)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            پایش سن گله، خوراک مصرفی تجمعی، مصرف سرانه هر پرنده و محاسبه ضریب تبدیل نهایی (FCR)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddFarmerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-600" />
            ثبت مرغدار جدید
          </button>
          <button
            onClick={() => {
              if (farmers.length > 0 && !flockFarmerId) {
                setFlockFarmerId(farmers[0].id);
              }
              setShowAddFlockModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            آغاز دوره پرورش جدید
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('flocks')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'flocks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            دوره‌های فعال و تسویه‌شده ({flocks.length})
          </button>
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'farmers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فهرست مرغداران طرف قرارداد ({farmers.length})
          </button>
        </div>

        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در مرغداران یا گله‌ها..."
            className="w-full text-xs bg-transparent border-none outline-none text-slate-800"
          />
        </div>
      </div>

      {/* Flocks Table */}
      {activeTab === 'flocks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">کد دوره / گله</th>
                  <th className="py-3 px-4">نام مرغدار</th>
                  <th className="py-3 px-4">نژاد</th>
                  <th className="py-3 px-4 text-center">تعداد جوجه</th>
                  <th className="py-3 px-4 text-center">سن گله (روز)</th>
                  <th className="py-3 px-4 text-center">کل خوراک دریافتی</th>
                  <th className="py-3 px-4 text-center">مصرف سرانه (g)</th>
                  <th className="py-3 px-4 text-center">ضریب تبدیل (FCR)</th>
                  <th className="py-3 px-4 text-center">وضعیت</th>
                  <th className="py-3 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFlocks.map((fl) => {
                  const durationDays = calculateFlockDuration(fl.startDate, fl.actualEndDate);
                  const feedKg = parseFloat(fl.totalFeedConsumedKg || '0');
                  const perCapitaG = calculatePerCapita(feedKg, fl.chickCount);
                  const fcrVal = calculateFCR(feedKg, parseFloat(fl.finalChickenWeight || '0'));

                  return (
                    <tr key={fl.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{fl.flockCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{fl.farmerName}</td>
                      <td className="py-3 px-4 text-slate-600">{fl.breed}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {Number(fl.chickCount).toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-800">
                        {durationDays} روز
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-800">
                        {Number(feedKg).toLocaleString('fa-IR')} kg
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {perCapitaG ? `${perCapitaG.toLocaleString('fa-IR')} گرم` : '---'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {fcrVal ? (
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {fcrVal.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">در حال پرورش</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            fl.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {fl.status === 'ACTIVE' ? 'فعال در سالن' : 'تسویه و بایگانی'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {fl.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setSelectedFlockToSettle(fl);
                              setShowSettleModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition cursor-pointer"
                          >
                            تسویه و محاسبه FCR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredFlocks.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      هیچ دوره‌ای ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Farmers Directory Table */}
      {activeTab === 'farmers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">نام مرغدار</th>
                  <th className="py-3 px-4">شماره تماس</th>
                  <th className="py-3 px-4">کد ملی / شناسه</th>
                  <th className="py-3 px-4">آدرس واحد مرغداری</th>
                  <th className="py-3 px-4 text-center">سقف اعتبار (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarmers.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{f.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{f.phoneNumber || '---'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{f.nationalId || '---'}</td>
                    <td className="py-3 px-4 text-slate-600">{f.address || 'ثبت نشده'}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {Number(f.creditLimit || 0).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Farmer */}
      {showAddFarmerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">ثبت مرغدار طرف قرارداد جدید</h3>
              </div>
              <button
                onClick={() => setShowAddFarmerModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarmer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی مرغدار *</label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="مثال: حاج محمد علیزاده"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره تلفن همراه</label>
                <input
                  type="text"
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  placeholder="0912xxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">کد ملی</label>
                <input
                  type="text"
                  value={farmerNationalId}
                  onChange={(e) => setFarmerNationalId(e.target.value)}
                  placeholder="10 رقمی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">آدرس مرغداری / شهر</label>
                <input
                  type="text"
                  value={farmerAddress}
                  onChange={(e) => setFarmerAddress(e.target.value)}
                  placeholder="مثال: استان مازندران، جاده ساری به قائمشهر"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddFarmerModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ثبت مرغدار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Flock */}
      {showAddFlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">آغاز دوره جدید جوجه‌ریزی</h3>
              </div>
              <button
                onClick={() => setShowAddFlockModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFlock} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">انتخاب مرغدار *</label>
                <select
                  value={flockFarmerId}
                  onChange={(e) => setFlockFarmerId(e.target.value)}
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
                <label className="block font-bold text-slate-700 mb-1">کد یا عنوان دوره</label>
                <input
                  type="text"
                  value={flockCode}
                  onChange={(e) => setFlockCode(e.target.value)}
                  placeholder="مثال: دوره پاییز سالن شماره ۱"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تعداد جوجه ریخته‌شده *</label>
                  <input
                    type="number"
                    value={chickCount}
                    onChange={(e) => setChickCount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 20000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نژاد جوجه</label>
                  <select
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="Ross 308">راس ۳۰۸ (Ross 308)</option>
                    <option value="Cobb 500">کاب ۵۰۰ (Cobb 500)</option>
                    <option value="Arbor Acres">آربور آکرز (Arbor Acres)</option>
                    <option value="Arian">آرین (Arian)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ جوجه‌ریزی *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddFlockModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ثبت دوره پرورش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settle Brood / Calculate FCR */}
      {showSettleModal && selectedFlockToSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">تسویه نهایی دوره و محاسبه FCR</h3>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleFlock} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div>مرغدار: <strong className="text-slate-800">{selectedFlockToSettle.farmerName}</strong></div>
                <div>کد گله: <strong className="font-mono text-slate-800">{selectedFlockToSettle.flockCode}</strong></div>
                <div>تعداد اولیه: <strong className="font-mono">{selectedFlockToSettle.chickCount} قطعه</strong></div>
                <div>کل دان مصرفی: <strong className="font-mono text-emerald-700">{Number(selectedFlockToSettle.totalFeedConsumedKg || 0).toLocaleString('fa-IR')} kg</strong></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  وزن زنده نهایی تحویلی به کشتارگاه (kg) *
                </label>
                <input
                  type="number"
                  value={finalWeightKg}
                  onChange={(e) => setFinalWeightKg(e.target.value ? Number(e.target.value) : '')}
                  placeholder="مثال: 54000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold text-sm text-emerald-800"
                  required
                />
              </div>

              {typeof finalWeightKg === 'number' && finalWeightKg > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex justify-between items-center font-bold">
                  <span>ضریب تبدیل حاصله (FCR):</span>
                  <span className="font-mono text-lg font-black">
                    {(
                      (parseFloat(selectedFlockToSettle.totalFeedConsumedKg || '0') / finalWeightKg)
                    ).toFixed(3)}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ بارگیری به کشتارگاه</label>
                <input
                  type="date"
                  value={actualEndDate}
                  onChange={(e) => setActualEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  تأیید تسویه و بایگانی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

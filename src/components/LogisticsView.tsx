import React, { useState, useEffect } from 'react';
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  Clock,
  User,
  Phone,
  ShieldCheck,
  Search,
  X,
  KeyRound,
  FileText,
} from 'lucide-react';

interface LogisticsViewProps {
  drivers: any[];
  onRefresh: () => void;
}

export function LogisticsView({ drivers, onRefresh }: LogisticsViewProps) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Driver form
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverNationalCode, setDriverNationalCode] = useState('');
  const [driverIban, setDriverIban] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const fetchLogistics = async () => {
    try {
      setLoading(true);
      const [delRes, vehRes] = await Promise.all([
        fetch('/api/v1/logistics/deliveries'),
        fetch('/api/v1/logistics/vehicles'),
      ]);
      if (delRes.ok) {
        const j = await delRes.json();
        setDeliveries(j.data || []);
      }
      if (vehRes.ok) {
        const j = await vehRes.json();
        setVehicles(j.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogistics();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/logistics/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: driverName,
          phoneNumber: driverPhone,
          nationalCode: driverNationalCode || undefined,
          iban: driverIban || undefined,
          licenseNumber: licenseNumber || undefined,
        }),
      });
      if (!res.ok) throw new Error('خطا در ثبت راننده');
      setShowAddDriverModal(false);
      setDriverName('');
      setDriverPhone('');
      onRefresh();
      fetchLogistics();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/logistics/deliveries/${selectedDelivery.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'خطا در تأیید تحویل');
      setShowConfirmModal(false);
      setSelectedDelivery(null);
      setConfirmCode('');
      fetchLogistics();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            ناوگان حمل، رانندگان و ردیابی محموله‌های دان
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت رانندگان اختصاصی و باربری، صدور مجوز خروج، کدهای تأیید دیجیتال تحویل در مقصد
          </p>
        </div>

        <button
          onClick={() => setShowAddDriverModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          ثبت راننده جدید
        </button>
      </div>

      {/* Grid: Drivers summary & Active dispatches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Drivers fleet list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800">فهرست رانندگان فعال کارخانه</h3>
            <span className="text-xs text-purple-600 font-mono font-bold">{drivers.length} نفر</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {drivers.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{d.fullName}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{d.phoneNumber}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  فعال
                </span>
              </div>
            ))}
            {drivers.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                هنوز راننده‌ای ثبت نشده است
              </div>
            )}
          </div>
        </div>

        {/* Deliveries tracking list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800">رهگیری محموله‌های ارسالی به مقصد</h3>
            <span className="text-xs text-slate-500">{deliveries.length} محموله</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">کد محموله</th>
                  <th className="py-2.5 px-3">راننده</th>
                  <th className="py-2.5 px-3">سفارش / محصول</th>
                  <th className="py-2.5 px-3 text-center">تناژ بارگیری (kg)</th>
                  <th className="py-2.5 px-3 text-center">کد تأیید تحویل</th>
                  <th className="py-2.5 px-3 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{del.deliveryNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{del.driverName}</div>
                      {del.plateNumber && <span className="text-[10px] font-mono text-slate-400">{del.plateNumber}</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{del.productName || 'خوراک طیور'}</td>
                    <td className="py-3 px-3 text-center font-mono font-black text-purple-900">
                      {Number(del.dispatchedWeightKg).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {del.deliveryConfirmationCode || '------'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {del.status === 'CONFIRMED' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          تحویل تأیید شد
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDelivery(del);
                            setShowConfirmModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold transition cursor-pointer"
                        >
                          ثبت تحویل در مقصد
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      هنوز محموله‌ای اعزام نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add Driver */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">ثبت راننده ناوگان کارخانه</h3>
              </div>
              <button
                onClick={() => setShowAddDriverModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی راننده *</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="مثال: علیرضا محمدی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره تلفن همراه *</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="0912xxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">کد ملی</label>
                <input
                  type="text"
                  value={driverNationalCode}
                  onChange={(e) => setDriverNationalCode(e.target.value)}
                  placeholder="10 رقمی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره شبا بانکی (جهت کرایه حمل)</label>
                <input
                  type="text"
                  value={driverIban}
                  onChange={(e) => setDriverIban(e.target.value)}
                  placeholder="IR..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ثبت راننده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delivery */}
      {showConfirmModal && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">تأیید تحویل بار در مرغداری</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div>محموله: <strong className="font-mono text-slate-800">{selectedDelivery.deliveryNumber}</strong></div>
                <div>راننده: <strong className="text-slate-800">{selectedDelivery.driverName}</strong></div>
                <div>وزن: <strong className="font-mono text-purple-700">{Number(selectedDelivery.dispatchedWeightKg).toLocaleString('fa-IR')} kg</strong></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کد تأیید ۶ رقمی تحویل (از مرغدار یا پیامک):
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="کد ۶ رقمی..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-center font-black tracking-widest text-lg text-emerald-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  تأیید نهایی تحویل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

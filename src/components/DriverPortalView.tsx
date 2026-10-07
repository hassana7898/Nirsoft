import React, { useState, useEffect } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  FileText,
  KeyRound,
  X,
} from 'lucide-react';

interface DriverPortalViewProps {
  user: any;
}

export function DriverPortalView({ user }: DriverPortalViewProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/portal/driver/overview');
      if (res.ok) {
        const j = await res.json();
        setData(j.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const handleUpdateStatus = async (deliveryId: string, status: 'IN_TRANSIT' | 'DELIVERED') => {
    try {
      const res = await fetch('/api/v1/portal/driver/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, status }),
      });
      if (res.ok) {
        setSuccessMsg(`وضعیت محموله با موفقیت به "${status === 'IN_TRANSIT' ? 'در مسیر' : 'تحویل‌شده'}" تغییر یافت.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchDriverData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/logistics/deliveries/${selectedDelivery.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode || undefined }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'خطا در تأیید کد تحویل');

      setSelectedDelivery(null);
      setOtpCode('');
      setSuccessMsg('تحویل بار در مرغداری با تأیید کد دیجیتال با موفقیت نهایی شد.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchDriverData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeAssignment = data?.assignments?.find((a: any) => a.status !== 'CONFIRMED');
  const completedAssignments = data?.assignments?.filter((a: any) => a.status === 'CONFIRMED') || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-purple-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                پرتال راننده ناوگان حمل کارخانه
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {data?.driver?.fullName || user?.fullName}
            </h2>
            <p className="text-xs text-purple-200 mt-1">
              کامیون: {data?.vehicle?.plateNumber || 'تخصیص‌یافته'} ({data?.vehicle?.model || 'بنز باری'})
            </p>
          </div>

          <div className="text-left font-mono bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block">تلفن تماس ثبت‌شده:</span>
            <span className="font-bold text-white text-sm">{data?.driver?.phoneNumber || user?.phoneNumber}</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Trip Spotlight */}
      {activeAssignment ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold text-purple-600 block">ماموریت فعال حمل:</span>
              <h3 className="font-black text-lg text-slate-900">
                بارنامه شماره {activeAssignment.invoiceNumber}
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeAssignment.status === 'IN_TRANSIT'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}
            >
              {activeAssignment.status === 'IN_TRANSIT' ? 'در مسیر مرغداری' : 'بارگیری شده / اعزام'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-slate-400 block text-[11px]">مقصد و مشخصات مرغدار:</span>
              <div className="font-bold text-slate-900 text-sm">{activeAssignment.farmerName}</div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{activeAssignment.farmerAddress || 'مازندران، مرغداری خریدار'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold font-mono">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activeAssignment.farmerPhone || '0912xxxxxxx'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-slate-400 block text-[11px]">مشخصات محموله:</span>
              <div className="font-bold text-slate-900 text-sm">{activeAssignment.productName}</div>
              <div className="text-slate-600">
                وزن خالص بارنامه:{' '}
                <strong className="font-mono text-purple-900 text-base">
                  {Number(activeAssignment.dispatchedWeightKg).toLocaleString('fa-IR')} kg
                </strong>
              </div>
              <div className="text-[11px] text-slate-500">
                کد رهگیری سامانه: <span className="font-mono">{activeAssignment.deliveryNumber}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {activeAssignment.status !== 'IN_TRANSIT' && (
              <button
                onClick={() => handleUpdateStatus(activeAssignment.id, 'IN_TRANSIT')}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition cursor-pointer"
              >
                اعلام شروع حرکت به سمت مرغداری (در مسیر)
              </button>
            )}

            <button
              onClick={() => {
                setSelectedDelivery(activeAssignment);
              }}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              رسیدم / ثبت کد تحویل و تخلیه بار
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
          در حال حاضر هیچ محموله جدیدی برای شما اختصاص نیافته است. به زودی از باسکول کارخانه اعلام خواهد شد.
        </div>
      )}

      {/* Completed Deliveries History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          سوابق سرویس‌های انجام‌شده شما:
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">شماره بارنامه</th>
                <th className="py-2.5 px-3">مقصد (مرغدار)</th>
                <th className="py-2.5 px-3 text-center">تناژ (kg)</th>
                <th className="py-2.5 px-3 text-center">وضعیت تحویل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedAssignments.map((del: any) => (
                <tr key={del.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{del.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-slate-800">{del.farmerName}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-900">
                    {Number(del.dispatchedWeightKg).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      تأیید و تسویه شد
                    </span>
                  </td>
                </tr>
              ))}
              {completedAssignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    هنوز سابقه تحویلی ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Confirm Delivery with OTP */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">تأیید تحویل بار به مرغدار</h3>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOtp} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div>مرغدار: <strong className="text-slate-900">{selectedDelivery.farmerName}</strong></div>
                <div>وزن بارنامه: <strong className="font-mono text-purple-900">{Number(selectedDelivery.dispatchedWeightKg).toLocaleString('fa-IR')} kg</strong></div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px]">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  کد تأیید دیجیتال تحویل (از مرغدار یا پیامک):
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="کد ۶ رقمی..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-center font-black tracking-widest text-lg text-emerald-800"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedDelivery(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  تأیید نهایی تخلیه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

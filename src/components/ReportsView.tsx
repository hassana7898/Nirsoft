import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Scale,
  Award,
  AlertTriangle,
  ArrowUpRight,
  FileSpreadsheet,
  Calendar,
  Layers,
} from 'lucide-react';

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<'fcr' | 'wastage'>('fcr');
  const [fcrData, setFcrData] = useState<any[]>([]);
  const [wastageData, setWastageData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [fcrRes, wasRes] = await Promise.all([
        fetch('/api/v1/reports/fcr-analysis'),
        fetch('/api/v1/reports/wastage-analysis'),
      ]);
      if (fcrRes.ok) {
        const j = await fcrRes.json();
        setFcrData(j.data || []);
      }
      if (wasRes.ok) {
        const j = await wasRes.json();
        setWastageData(j.data || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            گزارشات تحلیلی، رتبه‌بندی ضریب تبدیل (FCR) و پایش افت بارنامه
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            شاخص‌های کلیدی بهره‌وری تولید، ارزیابی عملکرد گله‌های مرغداران و کنترل خطاهای توزین
          </p>
        </div>

        <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('fcr')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'fcr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تحلیل ضریب تبدیل (FCR گله‌ها)
          </button>
          <button
            onClick={() => setActiveTab('wastage')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'wastage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            پایش افت و کسری بارنامه‌ها
          </button>
        </div>
      </div>

      {/* Tab: FCR Analysis */}
      {activeTab === 'fcr' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-900 to-emerald-900 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-base">شاخص ضریب تبدیل غذایی گله‌های صنعتی (Feed Conversion Ratio)</h3>
            </div>
            <p className="text-xs text-teal-200 max-w-2xl leading-relaxed">
              ضریب تبدیل (FCR) شاخص اصلی راندمان گوشت‌گیری است. عدد کمتر از ۱.۶۵ در نژاد راس ۳۰۸ نشان‌دهنده کیفیت عالی پلت کارخانه و مدیریت بهینه سالن مرغدار است.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">رتبه</th>
                    <th className="py-3 px-4">مرغدار</th>
                    <th className="py-3 px-4">کد دوره</th>
                    <th className="py-3 px-4 text-center">تعداد جوجه</th>
                    <th className="py-3 px-4 text-center">کل دان مصرفی (kg)</th>
                    <th className="py-3 px-4 text-center">وزن زنده نهایی (kg)</th>
                    <th className="py-3 px-4 text-center">مصرف سرانه (g)</th>
                    <th className="py-3 px-4 text-center">ضریب تبدیل (FCR)</th>
                    <th className="py-3 px-4 text-center">ارزیابی فنی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fcrData.map((fl, idx) => {
                    const fcrVal = fl.fcr;
                    let rankBadge = 'bg-slate-100 text-slate-700';
                    if (idx === 0 && fcrVal) rankBadge = 'bg-amber-100 text-amber-800 border-amber-300';
                    if (idx === 1 && fcrVal) rankBadge = 'bg-slate-200 text-slate-800';

                    return (
                      <tr key={fl.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-center">
                          <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-black ${rankBadge}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{fl.farmerName}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{fl.flockCode}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {Number(fl.chickCount).toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-teal-800">
                          {Number(fl.totalFeedConsumedKg).toLocaleString('fa-IR')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                          {fl.liveWeightKg > 0 ? Number(fl.liveWeightKg).toLocaleString('fa-IR') : '---'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                          {fl.perCapitaGrams ? `${fl.perCapitaGrams.toLocaleString('fa-IR')} گرم` : '---'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {fcrVal ? (
                            <span
                              className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                                fcrVal <= 1.65
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {fcrVal.toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">در حال پرورش</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {fcrVal ? (
                            fcrVal <= 1.65 ? (
                              <span className="text-emerald-700 font-bold text-[11px]">عالی و استاندارد</span>
                            ) : (
                              <span className="text-amber-700 font-bold text-[11px]">قابل بهبود</span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">دوره جاری</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {fcrData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        هنوز اطلاعات گله‌ای برای تحلیل موجود نیست
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Wastage & Discrepancies */}
      {activeTab === 'wastage' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-rose-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-base">آنالیز اختلاف و کسری بارنامه‌های ورودی (تأمین‌کنندگان)</h3>
            </div>
            <p className="text-xs text-rose-200 max-w-2xl leading-relaxed">
              کنترل افت ناشی از رطوبت، باد یا بارگیری در بنادر و شناسایی فروشندگانی که بیشترین افت تناژ را داشته‌اند.
            </p>
          </div>

          {/* Seller Discrepancy Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-sm text-slate-800 mb-4">میزان کسری به تفکیک فروشنده و تأمین‌کننده:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {wastageData?.sellerSummary?.map((s: any) => (
                <div key={s.seller} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900">{s.seller}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 font-mono">
                      {s.count} محموله
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>کل بارنامه مبدأ:</span>
                      <span className="font-mono">{Number(s.totalBill).toLocaleString('fa-IR')} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>کل باسکول کارخانه:</span>
                      <span className="font-mono">{Number(s.totalScale).toLocaleString('fa-IR')} kg</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-200">
                      <span>کسری تناژ:</span>
                      <span className="font-mono">{Math.abs(Number(s.totalWastage)).toLocaleString('fa-IR')} kg ({s.discrepancyPercent}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

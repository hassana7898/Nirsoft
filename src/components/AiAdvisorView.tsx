import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  TrendingUp,
  Scale,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface AiAdvisorViewProps {
  flocks: any[];
}

export function AiAdvisorView({ flocks }: AiAdvisorViewProps) {
  const [selectedFlockId, setSelectedFlockId] = useState('');
  const [dayOfAge, setDayOfAge] = useState<number | ''>(28);
  const [chickCount, setChickCount] = useState<number | ''>(20000);
  const [totalFeedKg, setTotalFeedKg] = useState<number | ''>(35000);
  const [averageWeightGrams, setAverageWeightGrams] = useState<number | ''>(1450);
  const [mortalityPercent, setMortalityPercent] = useState<number | ''>(1.8);

  const [loading, setLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<string | null>(null);

  const handleSelectFlock = (id: string) => {
    setSelectedFlockId(id);
    const fl = flocks.find((f) => f.id === id);
    if (fl) {
      setChickCount(fl.chickCount);
      setTotalFeedKg(parseFloat(fl.totalFeedConsumedKg || '30000'));
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setAdvisoryResult(null);
      const res = await fetch('/api/v1/ai/flock-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfAge: Number(dayOfAge),
          chickCount: Number(chickCount),
          totalFeedKg: Number(totalFeedKg),
          averageWeightGrams: Number(averageWeightGrams),
          mortalityPercent: Number(mortalityPercent),
        }),
      });

      const json = await res.json();
      if (json.data?.recommendation) {
        setAdvisoryResult(json.data.recommendation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-purple-900/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            تغذیه هوشمند با Gemini 3.8 Flash
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight">
          دستیار هوش مصنوعی و متخصص تغذیه طیور (Broiler Nutritionist AI)
        </h2>
        <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
          تحلیل انحراف رشد گله از منحنی استاندارد راس ۳۰۸، تشخیص ناهنجاری در اشتها، بهینه‌سازی فرمول دان و پیشنهادات مدیریتی سالن
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:col-span-1 text-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800">اطلاعات گله جهت تحلیل هوش مصنوعی:</h3>

          <div>
            <label className="block font-bold text-slate-700 mb-1">انتخاب از دوره‌های فعال:</label>
            <select
              value={selectedFlockId}
              onChange={(e) => handleSelectFlock(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
            >
              <option value="">ورود اطلاعات دستی یا انتخاب گله...</option>
              {flocks.map((fl) => (
                <option key={fl.id} value={fl.id}>
                  {fl.flockCode} ({fl.farmerName} - {fl.chickCount} قطعه)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">سن گله (روز)</label>
              <input
                type="number"
                value={dayOfAge}
                onChange={(e) => setDayOfAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">تعداد جوجه</label>
              <input
                type="number"
                value={chickCount}
                onChange={(e) => setChickCount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">کل دان مصرفی تا امروز (kg)</label>
            <input
              type="number"
              value={totalFeedKg}
              onChange={(e) => setTotalFeedKg(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold text-purple-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">میانگین وزن پرنده (گرم)</label>
              <input
                type="number"
                value={averageWeightGrams}
                onChange={(e) => setAverageWeightGrams(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">درصد تلفات (%)</label>
              <input
                type="number"
                step="0.1"
                value={mortalityPercent}
                onChange={(e) => setMortalityPercent(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {loading ? 'هوش مصنوعی در حال بررسی...' : 'دریافت تحلیل و توصیه تغذیه'}
          </button>
        </div>

        {/* Advisory Output */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                تحلیل تخصصی جیره و وضعیت گله:
              </h3>
              {advisoryResult && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  تحلیل زنده تولید شد
                </span>
              )}
            </div>

            {advisoryResult ? (
              <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap bg-purple-50/30 p-5 rounded-xl border border-purple-100">
                {advisoryResult}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                <span>اطلاعات گله را تکمیل نمایید و دکمه دریافت تحلیل را بزنید.</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            * تحلیل‌های ارائه شده جنبه مشورتی داشته و بر پایه استاندارد پرورش نژاد راس ۳۰۸ و داده‌های دریافتی از کارخانه تنظیم گردیده‌اند.
          </div>
        </div>
      </div>
    </div>
  );
}

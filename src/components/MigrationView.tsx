import React, { useState } from 'react';
import {
  Database,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MigrationViewProps {
  onRefreshAll: () => void;
}

export function MigrationView({ onRefreshAll }: MigrationViewProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      setResult(null);

      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error('فرمت متن ورودی باید JSON معتبر باشد.');
      }

      const res = await fetch('/api/v1/migration/import-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedPayload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در مهاجرت داده‌ها');

      setResult(json.summary);
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    const sampleLegacyJson = {
      poultryAppFarmers: [
        {
          id: 'leg_farmer_101',
          fullName: 'حاج کریم اکبری (مزرعه بهاران)',
          phoneNumber: '09123456789',
          address: 'مازندران، جاده جویبار',
          broods: [
            {
              id: 'leg_brood_201',
              name: 'دوره پاییزه شماره ۱',
              chickCount: 25000,
              startDate: '2026-09-01',
              finalWeight: 67500,
              isSettled: true,
            },
          ],
        },
        {
          id: 'leg_farmer_102',
          fullName: 'مهندس صابر نوروزی (مرغداری طبرستان)',
          phoneNumber: '09129876543',
          address: 'سوادکوه، پل‌سفید',
          broods: [
            {
              id: 'leg_brood_202',
              name: 'دوره زمستانه سالن ۲',
              chickCount: 18000,
              startDate: '2026-09-15',
              isSettled: false,
            },
          ],
        },
      ],
      poultryAppInvoices: [
        {
          type: 'entry',
          entryNumber: 'LEG-IN-001',
          date: '2026-09-02',
          sellerName: 'شرکت غلات اروند',
          billWeight: 26000,
          scaleWeight: 25850,
          origin: 'بندر امام خمینی',
          driverName: 'جواد کاظمی',
        },
        {
          type: 'exit',
          invoiceNumber: 'LEG-OUT-001',
          date: '2026-09-10',
          farmerId: 'leg_farmer_101',
          farmerName: 'حاج کریم اکبری (مزرعه بهاران)',
          weight: 12000,
          driverName: 'محسن بهرامی',
        },
      ],
    };

    setJsonInput(JSON.stringify(sampleLegacyJson, null, 2));
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/v1/migration/export-backup');
      if (res.ok) {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nirware-next-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            مهاجرت داده‌های سامانه قبلی و پشتیبان‌گیری کامل (Legacy Migration & Backup)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تبدیل فایل‌های خروجی و ساختار JSON سامانه قبلی nirware به جداول رابطه ای و استانداردهای PostgreSQL
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
        >
          <DownloadCloud className="w-4 h-4 text-emerald-400" />
          دریافت فایل پشتیبان (Export Backup)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import JSON Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">ورود داده‌های JSON سامانه قبلی:</h3>
            <button
              onClick={handleLoadSample}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
            >
              بارگذاری نمونه داده‌های سامانه قدیم
            </button>
          </div>

          <p className="text-slate-500 leading-relaxed">
            محتوای پشتیبان یا `localStorage` سامانه قبلی (شامل `poultryAppFarmers`, `poultryAppInvoices`, `poultryAppSettings`) را در کادر زیر قرار دهید:
          </p>

          <textarea
            rows={10}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="JSON داده‌های سامانه قبلی..."
            className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] leading-relaxed outline-none focus:border-indigo-500"
          ></textarea>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !jsonInput.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            {loading ? 'در حال تبدیل و ذخیره در PostgreSQL...' : 'تأیید و اجرای مهاجرت به پایگاه داده'}
          </button>
        </div>

        {/* Results & Guidelines */}
        <div className="space-y-4">
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>مهاجرت داده‌ها با موفقیت به پایان رسید!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  مرغداران واردشده: <strong>{result.importedFarmers}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  دوره‌های پرورش واردشده: <strong>{result.importedFlocks}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  قبوض باسکول ورودی: <strong>{result.importedInbound}</strong>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                  حواله‌های خروج دان: <strong>{result.importedOutbound}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900">اصول و قوانین مهاجرت داده به NIRWARE NEXT:</h4>
            <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-slate-600">
              <li>تمام شناسه‌های رشته‌ای نامعتبر به‌صورت خودکار با UUID استاندارد جایگزین می‌شوند.</li>
              <li>کلیدهای خارجی و ارتباط گله به مرغدار با حفظ جامعیت ارجاعی (Foreign Keys) برقرار می‌شود.</li>
              <li>قبوض ورودی بدون ماده اولیه با موجودی انبار ذرت تطبیق می‌یابند.</li>
              <li>تمام ورودی‌ها در جدول ثبت رخدادهای امنیتی (Audit Logs) لاگ می‌شوند.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

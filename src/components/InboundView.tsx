import React, { useState } from 'react';
import {
  Scale,
  PlusCircle,
  Search,
  Printer,
  Sparkles,
  Trash2,
  Calendar,
  Truck,
  ArrowDownLeft,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { calculateWastage } from '../domain/farming/calculations.ts';

interface InboundViewProps {
  records: any[];
  products: any[];
  onRefresh: () => void;
  onPrint: (record: any) => void;
}

export function InboundView({ records, products, onRefresh, onPrint }: InboundViewProps) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sellerName, setSellerName] = useState('');
  const [productId, setProductId] = useState('');
  const [billWeight, setBillWeight] = useState<number | ''>('');
  const [scaleWeight, setScaleWeight] = useState<number | ''>('');
  const [billNumber, setBillNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [factoryDestination, setFactoryDestination] = useState('انبار مرکزی کارخانه');
  const [transportCost, setTransportCost] = useState<number | ''>('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverIban, setDriverIban] = useState('');

  const rawMaterialProducts = products.filter((p) => p.type === 'RAW_MATERIAL');

  const calculatedWastage =
    typeof billWeight === 'number' && typeof scaleWeight === 'number'
      ? calculateWastage(scaleWeight, billWeight)
      : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName || !productId || !billWeight || !scaleWeight) {
      setErrorMsg('لطفاً تمامی فیلدهای الزامی (فروشنده، ماده اولیه، وزن بارنامه و وزن باسکول) را تکمیل نمایید.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/inventory/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate,
          sellerName,
          productId,
          billWeight: Number(billWeight),
          scaleWeight: Number(scaleWeight),
          billNumber: billNumber || undefined,
          origin: origin || undefined,
          factoryDestination,
          transportCost: transportCost ? Number(transportCost) : 0,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          driverIban: driverIban || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت قبض');

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
    setSellerName('');
    setProductId(rawMaterialProducts[0]?.id || '');
    setBillWeight('');
    setScaleWeight('');
    setBillNumber('');
    setOrigin('');
    setTransportCost('');
    setDriverName('');
    setDriverPhone('');
    setDriverIban('');
    setErrorMsg(null);
  };

  const handleAiScan = async () => {
    if (!aiText.trim()) return;
    try {
      setAiLoading(true);
      const res = await fetch('/api/v1/ai/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.sellerName) setSellerName(d.sellerName);
        if (d.billWeight) setBillWeight(Number(d.billWeight));
        if (d.scaleWeight) setScaleWeight(Number(d.scaleWeight));
        if (d.billNumber) setBillNumber(d.billNumber);
        if (d.origin) setOrigin(d.origin);
        if (d.driverName) setDriverName(d.driverName);

        // Find matching product
        if (d.productName) {
          const matched = rawMaterialProducts.find(
            (p) => p.name.includes(d.productName) || d.productName.includes(p.name)
          );
          if (matched) setProductId(matched.id);
        }

        setShowAiModal(false);
        setShowAddModal(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از ابطال این قبض باسکول و بازگشت موجودی انبار اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/v1/inventory/inbound/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = records.filter(
    (r) =>
      r.sellerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.entryNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.productName?.toLowerCase().includes(search.toLowerCase()) ||
      r.driverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            باسکول ورودی مواد اولیه (غلات، کنجاله و مکمل‌ها)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت و تطبیق تناژ بارنامه‌های ارسالی با وزن واقعی باسکول کارخانه، محاسبه خودکار کسری بار و ورود به انبار
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            اسکن هوشمند قبض با هوش مصنوعی (Gemini)
          </button>
          <button
            onClick={() => {
              if (rawMaterialProducts.length > 0 && !productId) {
                setProductId(rawMaterialProducts[0].id);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            ثبت قبض توزین جدید
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس شماره قبض، نام فروشنده، نوع کالا یا راننده..."
          className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
            پاک‌کردن
          </button>
        )}
      </div>

      {/* Inbound Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">شماره قبض</th>
                <th className="py-3 px-4">تاریخ ورود</th>
                <th className="py-3 px-4">فروشنده / مبدأ</th>
                <th className="py-3 px-4">کالای ورودی</th>
                <th className="py-3 px-4 text-center">وزن بارنامه (kg)</th>
                <th className="py-3 px-4 text-center">وزن باسکول (kg)</th>
                <th className="py-3 px-4 text-center">کسری بار (kg)</th>
                <th className="py-3 px-4">راننده</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.entryNumber}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{r.entryDate}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    <div>{r.sellerName}</div>
                    {r.origin && <span className="text-[10px] text-slate-400">مبدأ: {r.origin}</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium border border-slate-200">
                      {r.productName || 'ماده اولیه'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                    {Number(r.billWeight).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-black text-blue-900 text-sm">
                    {Number(r.scaleWeight).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        Number(r.wastage) < 0
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {Number(r.wastage) < 0 ? '' : '+'}
                      {Number(r.wastage).toLocaleString('fa-IR')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div>{r.driverName || '---'}</div>
                    {r.driverPhone && <div className="text-[10px] font-mono text-slate-400">{r.driverPhone}</div>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onPrint(r)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="چاپ قبض رسمی باسکول"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title="ابطال قبض"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هیچ قبضی مطابق با جستجو یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Inbound Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">ثبت قبض جدید باسکول ورودی مواد اولیه</h3>
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ ورود بار *</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">فروشنده / شرکت تأمین‌کننده *</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="مثال: شرکت پشتیبانی امور دام / غلات دانه طلایی"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">کالای ماده اولیه *</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">انتخاب ماده اولیه...</option>
                    {rawMaterialProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره بارنامه مبدأ</label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="مثال: BL-98432"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وزن بارنامه مبدأ (kg) *</label>
                  <input
                    type="number"
                    value={billWeight}
                    onChange={(e) => setBillWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 25000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وزن باسکول دیجیتال کارخانه (kg) *</label>
                  <input
                    type="number"
                    value={scaleWeight}
                    onChange={(e) => setScaleWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 24850"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm font-bold text-blue-900"
                    required
                  />
                </div>
              </div>

              {/* Real-time Wastage Calculation Badge */}
              {calculatedWastage !== null && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between font-medium ${
                    calculatedWastage < 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <span>اختلاف وزن (کسری بار در مسیر):</span>
                  <span className="font-mono font-black text-sm">
                    {calculatedWastage < 0 ? '' : '+'}
                    {calculatedWastage.toLocaleString('fa-IR')} کیلوگرم
                    {typeof billWeight === 'number' && billWeight > 0 && (
                      <span className="text-xs mr-2 font-normal">
                        ({((calculatedWastage / billWeight) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مبدأ بارگیری</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="بندر امام / امیرآباد"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نام راننده</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="نام و نام خانوادگی راننده"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شماره همراه راننده</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'در حال ثبت در پایگاه داده...' : 'ثبت قطعی در باسکول و انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gemini AI Scale Ticket Reader */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">استخراج هوشمند قبض باسکول با Gemini 3.8 Flash</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                متن خام، پیامک بارنامه یا محتوای اسکن شده قبض باسکول را در کادر زیر قرار دهید تا هوش مصنوعی فیلدهای فروشنده، وزن بارنامه، وزن باسکول و راننده را استخراج کند:
              </p>

              <textarea
                rows={5}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="مثال: بارنامه شماره ۹۸۷۶۵ بارگیری ذرت برزیلی از بندر امام به مقصد کارخانه خوراک. وزن مبدأ ۲۵۴۵۰ کیلو، وزن باسکول کارخانه ۲۵۲۹۰ کیلوگرم، راننده رضایی..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
              ></textarea>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleAiScan}
                  disabled={aiLoading || !aiText.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {aiLoading ? 'در حال تحلیل با هوش مصنوعی...' : 'استخراج و پرکردن فرم'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

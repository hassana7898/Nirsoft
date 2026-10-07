import React, { useState, useEffect } from 'react';
import {
  Cpu,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  Clock,
  User,
  X,
  Package,
} from 'lucide-react';
import { validateFormulaBalance } from '../domain/farming/calculations.ts';

interface ProductionViewProps {
  products: any[];
}

export function ProductionView({ products }: ProductionViewProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any | null>(null);

  // Form states
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [finishedGoodId, setFinishedGoodId] = useState('');
  const [formulaId, setFormulaId] = useState('');
  const [plannedQuantityKg, setPlannedQuantityKg] = useState<number | ''>(10000);
  const [actualQuantityKg, setActualQuantityKg] = useState<number | ''>(9950);
  const [wasteKg, setWasteKg] = useState<number | ''>(50);
  const [operatorName, setOperatorName] = useState('اپراتور خط پلت‌سازی');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finishedGoodProducts = products.filter((p) => p.type === 'FINISHED_GOOD');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, fRes] = await Promise.all([
        fetch('/api/v1/production/batches'),
        fetch('/api/v1/catalog/formulas'),
      ]);
      if (bRes.ok) {
        const bJson = await bRes.json();
        setBatches(bJson.data || []);
      }
      if (fRes.ok) {
        const fJson = await fRes.json();
        setFormulas(fJson.data || []);
        if (fJson.data?.length > 0 && !formulaId) {
          setFormulaId(fJson.data[0].id);
          setFinishedGoodId(fJson.data[0].finishedGoodId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExecuteBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishedGoodId || !formulaId || !plannedQuantityKg || !actualQuantityKg) {
      setErrorMsg('تکمیل تمامی فیلدهای الزامی برای بچ تولید الزامی است.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/production/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionDate,
          finishedGoodId,
          formulaId,
          plannedQuantityKg: Number(plannedQuantityKg),
          actualQuantityKg: Number(actualQuantityKg),
          wasteKg: Number(wasteKg || 0),
          operatorName,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت بچ تولید');

      setShowAddBatchModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBatch = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/production/batches/${id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedBatchDetails(json.data);
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
            <Cpu className="w-6 h-6 text-indigo-600" />
            خط تولید، بچ‌پلان و اجرای فرمولاسیون خوراک (BOM)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            برنامه‌ریزی و اجرای بچ‌های تولید خوراک طیور بر اساس فرمول‌های استاندارد، کسر خودکار مواد اولیه و محاسبه پرت تولید
          </p>
        </div>

        <button
          onClick={() => setShowAddBatchModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          ثبت و اجرای بچ تولید جدید
        </button>
      </div>

      {/* Formulas & Recipes Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">فرمول‌های فعال تغذیه طیور (BOM Recipes)</h3>
          </div>
          <span className="text-xs text-indigo-300 font-mono">
            {formulas.length} فرمول فعال ثبت شده در سیستم
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formulas.map((f) => (
            <div
              key={f.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">{f.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">
                  نسخه {f.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">محصول نهایی: {f.finishedGoodName}</p>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>مبنای بچ:</span>
                  <span className="font-mono">{Number(f.batchBasisKg).toLocaleString('fa-IR')} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد اقلام مواد اولیه:</span>
                  <span className="font-mono">{f.items?.length || 0} قلم</span>
                </div>
              </div>
            </div>
          ))}
          {formulas.length === 0 && (
            <div className="text-xs text-slate-400 py-4 col-span-3 text-center">
              هنوز فرمولی بارگذاری نشده است
            </div>
          )}
        </div>
      </div>

      {/* Production Batches Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">دفتر ثبت بچ‌های خط تولید کارخانه</h3>
          <span className="text-xs text-slate-500">{batches.length} بچ اجرا شده</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کد بچ تولید</th>
                <th className="py-3 px-4">تاریخ تولید</th>
                <th className="py-3 px-4">محصول نهایی</th>
                <th className="py-3 px-4">فرمول تولید</th>
                <th className="py-3 px-4 text-center">برنامه‌ریزی شده (kg)</th>
                <th className="py-3 px-4 text-center">تولید واقعی (kg)</th>
                <th className="py-3 px-4 text-center">افت / پرت (kg)</th>
                <th className="py-3 px-4">اپراتور</th>
                <th className="py-3 px-4 text-center">جزئیات مواد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{b.productionDate}</td>
                  <td className="py-3 px-4 font-bold text-indigo-900">{b.productName}</td>
                  <td className="py-3 px-4 text-slate-700">{b.formulaTitle || '---'}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                    {Number(b.plannedQuantityKg).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 text-sm">
                    {Number(b.actualQuantityKg).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                    {Number(b.wasteKg || 0).toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{b.operatorName || 'اپراتور'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewBatch(b.id)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition cursor-pointer"
                    >
                      مشاهده مصرف مواد
                    </button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    هنوز بچ تولیدی ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Production Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">ثبت و اجرای بچ تولید خوراک طیور</h3>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBatch} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ تولید *</label>
                  <input
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">انتخاب فرمول تولید *</label>
                  <select
                    value={formulaId}
                    onChange={(e) => {
                      setFormulaId(e.target.value);
                      const f = formulas.find((item) => item.id === e.target.value);
                      if (f) setFinishedGoodId(f.finishedGoodId);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                    required
                  >
                    <option value="">انتخاب فرمول...</option>
                    {formulas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title} ({f.finishedGoodName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">محصول دان نهایی *</label>
                  <select
                    value={finishedGoodId}
                    onChange={(e) => setFinishedGoodId(e.target.value)}
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

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اپراتور خط تولید</label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تناژ برنامه‌ریزی شده (kg) *</label>
                  <input
                    type="number"
                    value={plannedQuantityKg}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setPlannedQuantityKg(val);
                      if (typeof val === 'number') {
                        setActualQuantityKg(val - (typeof wasteKg === 'number' ? wasteKg : 50));
                      }
                    }}
                    placeholder="مثال: 10000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تولید واقعی دان (kg) *</label>
                  <input
                    type="number"
                    value={actualQuantityKg}
                    onChange={(e) => setActualQuantityKg(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 9950"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold text-emerald-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">افت و غبار تولید (kg)</label>
                <input
                  type="number"
                  value={wasteKg}
                  onChange={(e) => setWasteKg(e.target.value ? Number(e.target.value) : '')}
                  placeholder="مثال: 50"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                ℹ️ با ثبت این بچ، مواد اولیه متناسب با نسبت‌های فرمول به‌صورت خودکار از کاردکس انبار کسر و تناژ دان نهایی به موجودی افزوده خواهد شد.
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'در حال اجرای تراکنش تولید...' : 'تأیید و اجرای بچ در انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Execution Drilldown */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  جزئیات کسر مواد اولیه در بچ {selectedBatchDetails.batch?.batchNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span>تولید نهایی دان آماده:</span>
                <strong className="font-mono text-emerald-700">
                  {Number(selectedBatchDetails.batch?.actualQuantityKg).toLocaleString('fa-IR')} kg
                </strong>
              </div>

              <h4 className="font-bold text-slate-800">مواد اولیه مصرف‌شده طبق فرمول:</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedBatchDetails.materialsMovement?.map((m: any) => (
                  <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <span className="font-semibold text-slate-800">{m.productName}</span>
                    <span
                      className={`font-mono font-bold ${
                        Number(m.quantityChange) < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {Number(m.quantityChange).toLocaleString('fa-IR')} kg
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

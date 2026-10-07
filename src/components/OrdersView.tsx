import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  Calendar,
  Search,
  X,
  Layers,
} from 'lucide-react';

interface OrdersViewProps {
  farmers: any[];
  flocks: any[];
  products: any[];
  userRole?: string;
}

export function OrdersView({ farmers, flocks, products, userRole }: OrdersViewProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form
  const [farmerId, setFarmerId] = useState('');
  const [flockId, setFlockId] = useState('');
  const [productId, setProductId] = useState('');
  const [requestedQuantityKg, setRequestedQuantityKg] = useState<number | ''>(10000);
  const [requestedDate, setRequestedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isCrumble, setIsCrumble] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finishedGoodProducts = products.filter((p) => p.type === 'FINISHED_GOOD');
  const farmerFlocks = flocks.filter((f) => f.farmerId === farmerId);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/orders');
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerId || !productId || !requestedQuantityKg || !requestedDate) {
      setErrorMsg('تکمیل تمامی فیلدهای الزامی سفارش الزامی است.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId,
          flockId: flockId || undefined,
          productId,
          requestedQuantityKg: Number(requestedQuantityKg),
          requestedDate,
          isCrumble,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت سفارش');

      setShowAddModal(false);
      fetchOrders();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStateAction = async (orderId: string, action: string) => {
    try {
      setActionLoading(`${orderId}-${action}`);
      const res = await fetch(`/api/v1/orders/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return { label: 'در انتظار تأیید بازرگانی', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'APPROVED':
        return { label: 'تأیید شد (آماده برنامه‌ریزی)', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'PRODUCTION_PENDING':
        return { label: 'در صف خط تولید', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'READY':
        return { label: 'دان تولید شد (آماده بارگیری)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'PICKED_UP':
        return { label: 'بارگیری در کامیون', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'IN_TRANSIT':
        return { label: 'راننده در مسیر مرغداری', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'DELIVERED':
        return { label: 'تحویل در مقصد (منتظر تأیید)', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'CONFIRMED':
        return { label: 'تأیید نهایی مرغدار', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CANCELLED':
        return { label: 'لغو شده', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.farmerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.productName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            سفارشات دان و گردش‌کار خط تولید (State Machine)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            چرخه کامل تأیید مالی، برنامه‌ریزی تولید، بارگیری کامیون و تحویل رسمی به مرغدار
          </p>
        </div>

        <button
          onClick={() => {
            if (finishedGoodProducts.length > 0 && !productId) {
              setProductId(finishedGoodProducts[0].id);
            }
            if (farmers.length > 0 && !farmerId) {
              setFarmerId(farmers[0].id);
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          ثبت سفارش دان جدید
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در سفارشات..."
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 w-64 outline-none"
          />
          <span className="text-xs text-slate-500">{orders.length} سفارش ثبت شده</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">شماره سفارش</th>
                <th className="py-3 px-4">نام مرغدار</th>
                <th className="py-3 px-4">نوع دان</th>
                <th className="py-3 px-4 text-center">تناژ درخواستی (kg)</th>
                <th className="py-3 px-4">تاریخ تحویل درخواستی</th>
                <th className="py-3 px-4 text-center">وضعیت سفارش</th>
                <th className="py-3 px-4 text-center">اقدام گردش‌کار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => {
                const badge = getStatusBadge(o.status);
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{o.farmerName}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {o.productName} {o.isCrumble ? '(کرامبل)' : ''}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-purple-900 text-sm">
                      {Number(o.requestedQuantityKg).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{o.requestedDate}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {o.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'APPROVE')}
                            disabled={actionLoading === `${o.id}-APPROVE`}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            تأیید سفارش
                          </button>
                        )}
                        {o.status === 'APPROVED' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'SCHEDULE')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            برنامه‌ریزی تولید
                          </button>
                        )}
                        {o.status === 'PRODUCTION_PENDING' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'PRODUCE')}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            تولید دان آماده شد
                          </button>
                        )}
                        {o.status === 'READY' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'LOAD_TRUCK')}
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            بارگیری در کامیون
                          </button>
                        )}
                        {o.status === 'PICKED_UP' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'DISPATCH')}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            اعزام راننده به مقصد
                          </button>
                        )}
                        {o.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'DELIVER')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            تأیید تخلیه در مرغداری
                          </button>
                        )}
                        {o.status === 'DELIVERED' && (
                          <button
                            onClick={() => handleStateAction(o.id, 'CONFIRM')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                          >
                            تأیید قطعی تحویل
                          </button>
                        )}
                        {o.status === 'CONFIRMED' && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تکمیل شده
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    هیچ سفارشی ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Order */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base">ثبت سفارش دان جدید</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {errorMsg}
                </div>
              )}

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
                <label className="block font-bold text-slate-700 mb-1">دوره / گله فعال مرغدار</label>
                <select
                  value={flockId}
                  onChange={(e) => setFlockId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                >
                  <option value="">انتخاب دوره...</option>
                  {farmerFlocks.map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.flockCode} ({fl.chickCount} قطعه)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع دان درخواستی *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                  required
                >
                  <option value="">انتخاب نوع دان...</option>
                  {finishedGoodProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تناژ درخواستی (kg) *</label>
                  <input
                    type="number"
                    value={requestedQuantityKg}
                    onChange={(e) => setRequestedQuantityKg(e.target.value ? Number(e.target.value) : '')}
                    placeholder="مثال: 10000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ تحویل درخواستی *</label>
                  <input
                    type="date"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
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
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>درخواست به صورت کرامبل خرد شده (Crumble)</span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 mb-1">یادداشت و دستورات ویژه تخلیه</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تخلیه در سیلوی شماره ۲ مرغداری"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none"
                ></textarea>
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
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ثبت سفارش در سامانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

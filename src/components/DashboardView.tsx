import React from 'react';
import {
  TrendingUp,
  Scale,
  Truck,
  Package,
  Layers,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Cpu,
  BarChart3,
  PlusCircle,
  FileText,
} from 'lucide-react';

interface DashboardViewProps {
  stats: any;
  inboundRecords: any[];
  outboundRecords: any[];
  stockRecords: any[];
  onNavigate: (tab: string) => void;
  onOpenInboundModal: () => void;
  onOpenOutboundModal: () => void;
}

export function DashboardView({
  stats,
  inboundRecords,
  outboundRecords,
  stockRecords,
  onNavigate,
  onOpenInboundModal,
  onOpenOutboundModal,
}: DashboardViewProps) {
  const lowStockItems = stockRecords.filter((s) => s.isLowStock);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                مرکز فرماندهی و مونیتورینگ کارخانه
              </span>
              <span className="text-xs text-slate-400">
                تاریخ امروز: {new Date().toLocaleDateString('fa-IR')}
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
              مدیریت زنجیره تولید، توزین و تحویل خوراک طیور
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              توزین دقیق باسکول دیجیتال، پایش ضریب تبدیل گله‌ها (FCR)، اجرای فرمول‌های خوراک و هماهنگی لجستیک رانندگان در یک سامانه یکپارچه.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenInboundModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              ثبت ورود بارنامه (باسکول)
            </button>
            <button
              onClick={onOpenOutboundModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              صدور حواله خروج دان
            </button>
            <button
              onClick={() => onNavigate('production')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/80 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              بچ تولید جدید
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Feed Dispatched */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">کل خوراک تحویلی به مرغداران</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {Number(stats?.totalFeedDeliveredKg || 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">کیلوگرم</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>معادل {(Number(stats?.totalFeedDeliveredKg || 0) / 1000).toFixed(1)} تن پلت و کرامبل</span>
          </div>
        </div>

        {/* Active Broods & Chicks */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">دوره‌های فعال جوجه‌گوشتی</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {Number(stats?.activeFlocksCount || 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">گله فعال</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
            <span>در مجموع {Number(stats?.totalActiveChicks || 0).toLocaleString('fa-IR')} قطعه پرنده</span>
          </div>
        </div>

        {/* Raw Materials Stock */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">موجودی انبار کارخانه</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {Number(stats?.totalCurrentStockKg || 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">کیلوگرم</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 font-medium">
            <span>ذرت، کنجاله سویا، مکمل و دان نهایی</span>
          </div>
        </div>

        {/* Scale Discrepancy / Wastage */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">کسری بار ورودی (پایش افت بارنامه)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">
              {stats?.wastagePercentage || '0.00'}%
            </span>
            <span className="text-xs font-semibold text-slate-500">میانگین افت</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
            <span>
              کسری کل: {Math.abs(Number(stats?.totalWastageKg || 0)).toLocaleString('fa-IR')} کیلوگرم
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">
              هشدار کاهش موجودی در مواد اولیه و خوراک:
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockItems.map((item) => (
                <span
                  key={item.id}
                  className="px-2.5 py-1 bg-white rounded-lg border border-amber-300 text-xs font-semibold text-amber-800"
                >
                  {item.name}: {Number(item.currentStockKg).toLocaleString('fa-IR')} کیلوگرم (حداقل مجاز:{' '}
                  {Number(item.minStockAlert).toLocaleString('fa-IR')})
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0 cursor-pointer"
          >
            مشاهده انبار
          </button>
        </div>
      )}

      {/* Grid: Recent Inbound Scale Tickets & Recent Outbound Exits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inbound Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <h3 className="font-bold text-base text-slate-900">آخرین ورودی‌های مواد اولیه (باسکول)</h3>
            </div>
            <button
              onClick={() => onNavigate('inbound')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">شماره قبض</th>
                  <th className="py-2.5 px-3">فروشنده</th>
                  <th className="py-2.5 px-3">کالا</th>
                  <th className="py-2.5 px-3 text-center">باسکول (kg)</th>
                  <th className="py-2.5 px-3 text-center">کسری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inboundRecords.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{r.entryNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{r.sellerName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.productName || 'ماده اولیه'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-center">
                      {Number(r.scaleWeight).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                          Number(r.wastage) < 0
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {Number(r.wastage) < 0 ? '' : '+'}
                        {Number(r.wastage).toLocaleString('fa-IR')}
                      </span>
                    </td>
                  </tr>
                ))}
                {inboundRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      هنوز قبض ورودی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Outbound Exits */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <h3 className="font-bold text-base text-slate-900">آخرین حواله‌های خروج خوراک مرغداری</h3>
            </div>
            <button
              onClick={() => onNavigate('outbound')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">شماره حواله</th>
                  <th className="py-2.5 px-3">مرغدار</th>
                  <th className="py-2.5 px-3">محصول</th>
                  <th className="py-2.5 px-3 text-center">وزن خالص (kg)</th>
                  <th className="py-2.5 px-3">راننده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outboundRecords.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{r.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{r.farmerName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.productName} {r.isCrumble ? '(کرامبل)' : ''}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-center">
                      {Number(r.weight).toLocaleString('fa-IR')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{r.driverName || '---'}</td>
                  </tr>
                ))}
                {outboundRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      هنوز حواله خروجی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

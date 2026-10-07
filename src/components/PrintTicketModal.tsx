import React from 'react';
import { Printer, X, CheckCircle, Scale, Truck, User, Calendar, FileText } from 'lucide-react';

interface PrintTicketModalProps {
  type: 'INBOUND' | 'OUTBOUND';
  data: any;
  onClose: () => void;
}

export function PrintTicketModal({ type, data, onClose }: PrintTicketModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const isInbound = type === 'INBOUND';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
        {/* Modal Header Controls (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">
              {isInbound ? 'پیش‌نمایش قبض رسمی باسکول ورودی' : 'پیش‌نمایش حواله خروج و تحویل دان'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              چاپ برگه (Print)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 bg-white print:p-0" id="printable-ticket">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                کارخانه تولید خوراک طیور نیروار (NIRWARE)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                سامانه هوشمند مدیریت توزین، لجستیک و کنترل کیفی کارخانه
              </p>
            </div>
            <div className="text-left font-mono">
              <div className="text-sm font-bold text-slate-800">
                {isInbound ? `شماره قبض: ${data.entryNumber || '---'}` : `شماره حواله: ${data.invoiceNumber || '---'}`}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                تاریخ صدور: {data.entryDate || data.exitDate || new Date().toISOString().slice(0, 10)}
              </div>
            </div>
          </div>

          {/* Ticket Type Banner */}
          <div
            className={`py-2 px-4 rounded-lg text-center font-bold text-sm mb-6 ${
              isInbound
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}
          >
            {isInbound ? 'قبض توزین و تحویل مواد اولیه (باسکول ورودی)' : 'حواله رسمی خروج خوراک مرغداری (باسکول خروجی)'}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            {isInbound ? (
              <>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">فروشنده / تأمین‌کننده:</span>
                  <span className="font-bold text-slate-800">{data.sellerName || '---'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">ماده اولیه:</span>
                  <span className="font-bold text-slate-800">{data.productName || 'ذرت/سویا'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">شماره بارنامه مبدأ:</span>
                  <span className="font-bold font-mono text-slate-800">{data.billNumber || 'ندارد'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">مبدأ بارگیری:</span>
                  <span className="font-bold text-slate-800">{data.origin || 'بندر امام / سایر'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">نام راننده:</span>
                  <span className="font-bold text-slate-800">{data.driverName || 'نامشخص'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">تلفن راننده:</span>
                  <span className="font-mono text-slate-800">{data.driverPhone || '---'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">نام مرغدار / خریدار:</span>
                  <span className="font-bold text-slate-800">{data.farmerName || '---'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">کد دوره / گله:</span>
                  <span className="font-bold font-mono text-slate-800">{data.flockCode || 'دوره جاری'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">نوع خوراک تحویلی:</span>
                  <span className="font-bold text-slate-800">{data.productName || 'پلت/کرامبل'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">فرم فیزیکی:</span>
                  <span className="font-bold text-slate-800">{data.isCrumble ? 'کرامبل (ریز خرد شده)' : 'پلت استاندارد'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">راننده حامل:</span>
                  <span className="font-bold text-slate-800">{data.driverName || '---'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">مقصد تخلیه:</span>
                  <span className="font-bold text-slate-800">سالن‌های مرغداری خریدار</span>
                </div>
              </>
            )}
          </div>

          {/* Weight Information Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">شرح وزن</th>
                  <th className="p-3 text-center">مقدار (کیلوگرم)</th>
                  <th className="p-3 text-center">معادل تن</th>
                  <th className="p-3">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isInbound ? (
                  <>
                    <tr>
                      <td className="p-3 font-medium">وزن بارنامه مبدأ</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {Number(data.billWeight || 0).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {(Number(data.billWeight || 0) / 1000).toFixed(3)}
                      </td>
                      <td className="p-3 text-slate-500 text-xs">مستند به بارنامه رسمی</td>
                    </tr>
                    <tr className="bg-blue-50/50">
                      <td className="p-3 font-bold text-blue-900">وزن باسکول دیجیتال کارخانه</td>
                      <td className="p-3 text-center font-mono font-black text-blue-900 text-base">
                        {Number(data.scaleWeight || 0).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-blue-800 font-bold">
                        {(Number(data.scaleWeight || 0) / 1000).toFixed(3)}
                      </td>
                      <td className="p-3 text-emerald-600 text-xs font-semibold">مبنای تسویه و ورود به انبار</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-rose-700">اختلاف وزن (کسری / اضافه)</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-700 dir-ltr">
                        {Number(data.wastage || 0) < 0 ? '-' : '+'}
                        {Math.abs(Number(data.wastage || 0)).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-rose-600">
                        {(Number(data.wastage || 0) / 1000).toFixed(3)}
                      </td>
                      <td className="p-3 text-slate-500 text-xs">
                        {Number(data.wastage || 0) < 0 ? 'کسری بار در مسیر حمل' : 'تطابق کامل / مازاد'}
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="bg-emerald-50/50">
                      <td className="p-3 font-bold text-emerald-900">وزن خالص خوراک ارسالی</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-900 text-lg">
                        {Number(data.weight || 0).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-800 font-bold">
                        {(Number(data.weight || 0) / 1000).toFixed(3)}
                      </td>
                      <td className="p-3 text-emerald-700 text-xs font-semibold">توزین دقیق در باسکول ۶۰ تنی</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
            <div className="space-y-10">
              <span className="font-semibold text-slate-600 block">متصدی باسکول کارخانه</span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-slate-400">امضا و تاریخ</span>
            </div>
            <div className="space-y-10">
              <span className="font-semibold text-slate-600 block">راننده حامل بار</span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-slate-400">امضا و اثر انگشت</span>
            </div>
            <div className="space-y-10">
              <span className="font-semibold text-slate-600 block">
                {isInbound ? 'مدیر کنترل کیفیت / انبار' : 'مرغدار / تحویل‌گیرنده در مقصد'}
              </span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-slate-400">مهر و امضا</span>
            </div>
          </div>

          {/* Footer notice */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            این سند سیستمی و معتبر صادر شده توسط NIRWARE NEXT است. هرگونه قلم‌خوردگی موجب ابطال می‌باشد.
          </div>
        </div>
      </div>
    </div>
  );
}

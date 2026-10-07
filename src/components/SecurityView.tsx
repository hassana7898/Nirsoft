import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  User,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Search,
} from 'lucide-react';

export function SecurityView() {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [uRes, aRes] = await Promise.all([
        fetch('/api/v1/auth/users'),
        fetch('/api/v1/system/audit-logs'),
      ]);
      if (uRes.ok) {
        const uj = await uRes.json();
        setUsers(uj.data || []);
      }
      if (aRes.ok) {
        const aj = await aRes.json();
        setAuditLogs(aj.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const getRoleName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'مدیر ارشد کارخانه (Super Admin)';
      case 'ADMIN':
        return 'مدیر سیستم (Admin)';
      case 'MANAGER':
        return 'مدیر بازرگانی و فروش';
      case 'PRODUCTION_MANAGER':
        return 'مدیر خط تولید و فرمولاسیون';
      case 'SCALE_OPERATOR':
        return 'متصدی باسکول دیجیتال';
      case 'FARMER':
        return 'مرغدار طرف قرارداد';
      case 'DRIVER':
        return 'راننده ناوگان حمل';
      default:
        return role;
    }
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.userPhone?.includes(search) ||
      l.entityType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            امنیت، کنترل دسترسی (RBAC) و لاگ‌های حسابرسی (Audit Trail)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت تمامی تغییرات، ایجاد اسناد و تراکنش‌های انبار با شناسه کاربر، IP و تفکیک سطوح دسترسی
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-800">حساب‌های کاربری فعال سامانه و نقش‌های امنیتی</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">نام کامل</th>
                <th className="py-3 px-4">شماره همراه (نام کاربری)</th>
                <th className="py-3 px-4">نقش دسترسی (RBAC)</th>
                <th className="py-3 px-4 text-center">وضعیت حساب</th>
                <th className="py-3 px-4">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{u.phoneNumber}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {getRoleName(u.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      فعال
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">دفتر ثبت رخدادهای سیستمی و امنیتی (Audit Logs)</h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="فیلتر لاگ‌ها..."
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 w-64 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">زمان ثبت</th>
                <th className="py-3 px-4">کاربر اقدام‌کننده</th>
                <th className="py-3 px-4">عملیات</th>
                <th className="py-3 px-4">موجودیت هدف</th>
                <th className="py-3 px-4 font-mono">شناسه رکورد</th>
                <th className="py-3 px-4">آدرس IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {new Date(l.createdAt).toLocaleTimeString('fa-IR')}{' '}
                    {new Date(l.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{l.userPhone || 'سیستمی'}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{l.entityType}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                    {l.entityId ? l.entityId.slice(0, 12) + '...' : '---'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{l.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لاگی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

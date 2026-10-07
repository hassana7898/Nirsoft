import React from 'react';
import {
  Layers,
  Database,
  Shield,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    fullName: string;
    role: string;
    phoneNumber: string;
    farmerId?: string | null;
    driverId?: string | null;
  } | null;
  onLogout: () => void;
  onQuickRoleSwitch: (role: string, phone: string) => void;
}

export function Navbar({ user, onLogout, onQuickRoleSwitch }: NavbarProps) {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return { label: 'مدیر ارشد کارخانه', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
      case 'MANAGER':
      case 'PRODUCTION_MANAGER':
        return { label: 'مدیر تولید و فرمولاسیون', bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      case 'SCALE_OPERATOR':
        return { label: 'متصدی باسکول دیجیتال', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
      case 'FARMER':
        return { label: 'مرغدار طرف قرارداد', bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'DRIVER':
        return { label: 'راننده ناوگان حمل', bg: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
      default:
        return { label: role || 'کاربر سیستم', bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    }
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-slate-900">
                NIRWARE <span className="text-emerald-600">NEXT</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                v1.0.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              سامانه یکپارچه مدیریت کارخانه خوراک طیور، مرغداران و لجستیک
            </p>
          </div>
        </div>

        {/* Status Indicators & User Controls */}
        <div className="flex items-center gap-3">
          {/* DB Live Health Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Database className="w-3.5 h-3.5" />
            <span>پایگاه داده PostgreSQL فعال</span>
          </div>

          {/* User Profile / Quick Role Switch */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-medium border border-slate-200 transition cursor-pointer"
                  title="تغییر نقش کاربری برای تست و بررسی پرتال‌ها"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <div className="text-right">
                    <span className="font-bold block text-slate-900">{user.fullName}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {roleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                      تغییر پرتال کاربری (بررسی دسترسی‌ها)
                    </div>
                    <button
                      onClick={() => {
                        onQuickRoleSwitch('SUPER_ADMIN', '09120000000');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
                    >
                      <span>مدیر ارشد کارخانه (Admin)</span>
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => {
                        onQuickRoleSwitch('SCALE_OPERATOR', '09123333333');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
                    >
                      <span>متصدی باسکول (Scale)</span>
                      <span className="text-[10px] text-amber-600">قبوض و بارنامه</span>
                    </button>
                    <button
                      onClick={() => {
                        onQuickRoleSwitch('FARMER', '09121111111');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
                    >
                      <span>پرتال مرغدار (Farmer)</span>
                      <span className="text-[10px] text-blue-600">سفارش و گله</span>
                    </button>
                    <button
                      onClick={() => {
                        onQuickRoleSwitch('DRIVER', '09122222222');
                        setRoleMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
                    >
                      <span>پرتال راننده (Driver)</span>
                      <span className="text-[10px] text-purple-600">حمل و تحویل</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>احراز هویت امن</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

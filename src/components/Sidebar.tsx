import React from 'react';
import {
  Activity,
  Scale,
  Truck,
  Cpu,
  TrendingUp,
  FileText,
  Package,
  BarChart3,
  Sparkles,
  Database,
  Shield,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole?: string;
  inboundCount?: number;
  outboundCount?: number;
  lowStockCount?: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  userRole,
  inboundCount,
  outboundCount,
  lowStockCount,
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'داشبورد مدیریتی', icon: Activity },
    { id: 'inbound', label: 'باسکول ورودی مواد اولیه', icon: Scale, badge: inboundCount },
    { id: 'outbound', label: 'باسکول خروج خوراک', icon: Truck, badge: outboundCount },
    { id: 'production', label: 'خط تولید و فرمولاسیون', icon: Cpu },
    { id: 'farming', label: 'مرغداران و دوره‌های پرورش', icon: TrendingUp },
    { id: 'orders', label: 'سفارشات دان و گردش‌کار', icon: FileText },
    { id: 'inventory', label: 'انبار و دفتر کل کاردکس', icon: Package, badge: lowStockCount, badgeColor: 'bg-amber-500' },
    { id: 'logistics', label: 'ناوگان حمل و رانندگان', icon: Truck },
    { id: 'reports', label: 'گزارشات و تحلیل FCR', icon: BarChart3 },
    { id: 'ai', label: 'دستیار هوش مصنوعی گله', icon: Sparkles, highlight: true },
    { id: 'migration', label: 'مهاجرت داده و پشتیبان', icon: Database },
    { id: 'security', label: 'امنیت و لاگ حسابرسی', icon: Shield },
  ];

  // Role-based visibility filtering if needed, but in ERP super admin can view all
  const filteredItems = navItems.filter((item) => {
    if (userRole === 'DRIVER') {
      return ['logistics', 'orders', 'dashboard'].includes(item.id);
    }
    if (userRole === 'FARMER') {
      return ['farming', 'orders', 'outbound', 'ai', 'dashboard'].includes(item.id);
    }
    if (userRole === 'SCALE_OPERATOR') {
      return ['inbound', 'outbound', 'inventory', 'logistics', 'dashboard'].includes(item.id);
    }
    return true;
  });

  return (
    <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-l border-slate-200 p-4 shrink-0">
      <nav className="space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : item.highlight
                  ? 'text-purple-700 bg-purple-50/60 hover:bg-purple-100/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-emerald-400'
                      : item.highlight
                      ? 'text-purple-600'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold text-white ${
                    item.badgeColor || (isActive ? 'bg-emerald-600' : 'bg-slate-500')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini System Info Box */}
      <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 hidden lg:block">
        <div className="font-bold text-slate-700 mb-1">NIRWARE NEXT — v1.0.0</div>
        <div>معماری: Modular Monolith</div>
        <div>پایگاه داده: PostgreSQL (ACID)</div>
        <div>هوش مصنوعی: Gemini 3.8 Flash</div>
      </div>
    </aside>
  );
}

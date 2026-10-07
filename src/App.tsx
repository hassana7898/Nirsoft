import React, { useState, useEffect } from 'react';
import {
  Layers,
  Lock,
  User,
  Shield,
  Truck,
  Scale,
  KeyRound,
  AlertCircle,
  Activity,
  CheckCircle2,
} from 'lucide-react';

import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { InboundView } from './components/InboundView.tsx';
import { OutboundView } from './components/OutboundView.tsx';
import { ProductionView } from './components/ProductionView.tsx';
import { FarmingView } from './components/FarmingView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { LogisticsView } from './components/LogisticsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AiAdvisorView } from './components/AiAdvisorView.tsx';
import { MigrationView } from './components/MigrationView.tsx';
import { SecurityView } from './components/SecurityView.tsx';
import { PrintTicketModal } from './components/PrintTicketModal.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [stats, setStats] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [flocks, setFlocks] = useState<any[]>([]);
  const [inboundRecords, setInboundRecords] = useState<any[]>([]);
  const [outboundRecords, setOutboundRecords] = useState<any[]>([]);
  const [stockRecords, setStockRecords] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Print ticket modal state
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    type: 'INBOUND' | 'OUTBOUND';
    data: any;
  }>({
    isOpen: false,
    type: 'INBOUND',
    data: null,
  });

  // Login form states
  const [phoneInput, setPhoneInput] = useState('09120000000');
  const [passwordInput, setPasswordInput] = useState('Admin@Dev2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Check current session on load
  const checkSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated && json.user) {
          setUser(json.user);
          await fetchAllData();
          return;
        }
      }
      // If not authenticated, attempt dev auto-login for seamless preview
      await handleDevLogin('09120000000', 'Admin@Dev2026!');
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (phone: string, pass: string) => {
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, password: pass }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUser(json.user);
        await fetchAllData();
      } else {
        setLoginError(json.error || 'خطا در ورود');
      }
    } catch (err: any) {
      setLoginError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = async () => {
    try {
      const [stRes, prodRes, farRes, flRes, inRes, outRes, stockRes, drvRes] =
        await Promise.all([
          fetch('/api/v1/reports/overview'),
          fetch('/api/v1/catalog/products'),
          fetch('/api/v1/farming/farmers'),
          fetch('/api/v1/farming/flocks'),
          fetch('/api/v1/inventory/inbound'),
          fetch('/api/v1/inventory/outbound'),
          fetch('/api/v1/inventory/stock'),
          fetch('/api/v1/logistics/drivers'),
        ]);

      if (stRes.ok) setStats((await stRes.json()).data);
      if (prodRes.ok) setProducts((await prodRes.json()).data || []);
      if (farRes.ok) setFarmers((await farRes.json()).data || []);
      if (flRes.ok) setFlocks((await flRes.json()).data || []);
      if (inRes.ok) setInboundRecords((await inRes.json()).data || []);
      if (outRes.ok) setOutboundRecords((await outRes.json()).data || []);
      if (stockRes.ok) setStockRecords((await stockRes.json()).data || []);
      if (drvRes.ok) setDrivers((await drvRes.json()).data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const openPrintTicket = (type: 'INBOUND' | 'OUTBOUND', data: any) => {
    setPrintModalState({
      isOpen: true,
      type,
      data,
    });
  };

  // If user is not logged in
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-800" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
              <Layers className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              NIRWARE <span className="text-emerald-600">NEXT</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              سیستم جامع مدیریت کارخانه خوراک طیور، مرغداران و لجستیک
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDevLogin(phoneInput, passwordInput);
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره تلفن همراه (نام کاربری)</label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-sm focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">رمز عبور امن</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none font-mono text-sm focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer text-sm"
            >
              {loginLoading ? 'در حال بررسی هویت...' : 'ورود به سامانه کارخانه'}
            </button>
          </form>

          {/* Fast Quick-Login Demo Presets */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-400 block mb-2 text-center">
              ورود سریع با نقش‌های کاربری پیش‌فرض:
            </span>
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <button
                type="button"
                onClick={() => handleDevLogin('09120000000', 'Admin@Dev2026!')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 transition border border-slate-200 text-right cursor-pointer"
              >
                <div>👑 مدیر ارشد کارخانه</div>
                <div className="text-[10px] text-slate-400 font-mono">09120000000</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin('09123333333', 'Scale@Dev2026!')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 transition border border-slate-200 text-right cursor-pointer"
              >
                <div>⚖️ متصدی باسکول</div>
                <div className="text-[10px] text-slate-400 font-mono">09123333333</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin('09121111111', 'Farmer@Dev2026!')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition border border-slate-200 text-right cursor-pointer"
              >
                <div>🐔 مرغدار طرف قرارداد</div>
                <div className="text-[10px] text-slate-400 font-mono">09121111111</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin('09122222222', 'Driver@Dev2026!')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 transition border border-slate-200 text-right cursor-pointer"
              >
                <div>🚛 راننده ناوگان حمل</div>
                <div className="text-[10px] text-slate-400 font-mono">09122222222</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lowStockCount = stockRecords.filter((s) => s.isLowStock).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onQuickRoleSwitch={(role, phone) => {
          let pass = 'Admin@Dev2026!';
          if (role === 'SCALE_OPERATOR') pass = 'Scale@Dev2026!';
          if (role === 'FARMER') pass = 'Farmer@Dev2026!';
          if (role === 'DRIVER') pass = 'Driver@Dev2026!';
          handleDevLogin(phone, pass);
        }}
      />

      {/* Main Layout: Sidebar + View Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={user?.role}
          inboundCount={inboundRecords.length}
          outboundCount={outboundRecords.length}
          lowStockCount={lowStockCount}
        />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              inboundRecords={inboundRecords}
              outboundRecords={outboundRecords}
              stockRecords={stockRecords}
              onNavigate={setActiveTab}
              onOpenInboundModal={() => setActiveTab('inbound')}
              onOpenOutboundModal={() => setActiveTab('outbound')}
            />
          )}

          {activeTab === 'inbound' && (
            <InboundView
              records={inboundRecords}
              products={products}
              onRefresh={fetchAllData}
              onPrint={(data) => openPrintTicket('INBOUND', data)}
            />
          )}

          {activeTab === 'outbound' && (
            <OutboundView
              records={outboundRecords}
              farmers={farmers}
              flocks={flocks}
              products={products}
              drivers={drivers}
              onRefresh={fetchAllData}
              onPrint={(data) => openPrintTicket('OUTBOUND', data)}
            />
          )}

          {activeTab === 'production' && <ProductionView products={products} />}

          {activeTab === 'farming' && (
            <FarmingView
              farmers={farmers}
              flocks={flocks}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              farmers={farmers}
              flocks={flocks}
              products={products}
              userRole={user?.role}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              stockRecords={stockRecords}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'logistics' && (
            <LogisticsView drivers={drivers} onRefresh={fetchAllData} />
          )}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'ai' && <AiAdvisorView flocks={flocks} />}

          {activeTab === 'migration' && <MigrationView onRefreshAll={fetchAllData} />}

          {activeTab === 'security' && <SecurityView />}
        </main>
      </div>

      {/* Printable Weighbridge or Delivery Ticket Modal */}
      {printModalState.isOpen && (
        <PrintTicketModal
          type={printModalState.type}
          data={printModalState.data}
          onClose={() => setPrintModalState({ isOpen: false, type: 'INBOUND', data: null })}
        />
      )}
    </div>
  );
}

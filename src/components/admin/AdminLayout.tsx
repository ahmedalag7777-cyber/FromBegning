import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Receipt, BookOpen,
  Wallet, Settings, Store, Menu, X, ArrowLeft, TrendingUp, Brain,
  Bell, AlertTriangle, Clock, Info, Key, Activity,
} from 'lucide-react';
import { navigate } from '@/lib/router';
import { useNotifications, type Notification } from '@/lib/notifications';

interface AdminLayoutProps {
  children: ReactNode;
  activePage: string;
}

const NAV_ITEMS = [
  { id: 'executive', label: 'اللوحة التنفيذية', icon: Activity, path: '/admin/executive' },
  { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard, path: '/admin' },
  { id: 'products', label: 'المنتجات', icon: Package, path: '/admin/products' },
  { id: 'orders', label: 'الطلبات', icon: ShoppingCart, path: '/admin/orders' },
  { id: 'customers', label: 'العملاء', icon: Users, path: '/admin/customers' },
  { id: 'invoices', label: 'الفواتير', icon: Receipt, path: '/admin/invoices' },
  { id: 'journal', label: 'القيود المحاسبية', icon: BookOpen, path: '/admin/journal' },
  { id: 'accounts', label: 'دليل الحسابات', icon: Wallet, path: '/admin/accounts' },
  { id: 'reports', label: 'التقارير المالية', icon: TrendingUp, path: '/admin/reports' },
  { id: 'forecast', label: 'التنبؤ بالمبيعات', icon: Brain, path: '/admin/forecast' },
  { id: 'settings', label: 'الإعدادات', icon: Settings, path: '/admin/settings' },
  { id: 'ai-keys', label: 'مفاتيح الذكاء الاصطناعي', icon: Key, path: '/admin/ai-keys' },
];

const SEVERITY_CONFIG: Record<Notification['severity'], { color: string; icon: React.ElementType }> = {
  info: { color: 'text-blue-600 bg-blue-50', icon: Info },
  warning: { color: 'text-amber-600 bg-amber-50', icon: AlertTriangle },
  danger: { color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

export function AdminLayout({ children, activePage }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, count } = useNotifications();

  return (
    <div className="min-h-screen bg-neutral-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-64 bg-neutral-900 text-neutral-300 z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="font-bold text-white text-sm">متجر النخبة</div>
              <div className="text-[10px] text-neutral-400">لوحة التحكم</div>
            </div>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                activePage === item.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-neutral-800">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5 shrink-0" />
              العودة للمتجر
            </button>
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-neutral-100">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm hidden lg:block">لوحة تحكم متجر النخبة</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-neutral-100 transition"
              >
                <Bell className="w-5 h-5 text-neutral-600" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                    {count}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden animate-slide-up">
                    <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
                      <span className="font-bold text-sm">الإشعارات</span>
                      {count > 0 && <span className="text-xs text-neutral-500">{count} جديد</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-neutral-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          لا توجد إشعارات
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => {
                          const cfg = SEVERITY_CONFIG[n.severity];
                          return (
                            <button
                              key={n.id}
                              onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}
                              className="w-full text-right p-3 hover:bg-neutral-50 transition border-b border-neutral-50 flex items-start gap-3"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                                <cfg.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-neutral-900">{n.title}</div>
                                <div className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.message}</div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-neutral-100 transition">
              <Store className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

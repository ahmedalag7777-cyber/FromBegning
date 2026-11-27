import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/context/CartContext';
import { Router, navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { Category } from '@/types';

// Store components
import { Header, Footer } from '@/components/store/Layout';

// Store pages
import { HomePage } from '@/pages/store/HomePage';
import { ShopPage } from '@/pages/store/ShopPage';
import { ProductDetailPage } from '@/pages/store/ProductDetailPage';
import { CartPage } from '@/pages/store/CartPage';
import { CheckoutPage } from '@/pages/store/CheckoutPage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminOrders } from '@/pages/admin/AdminOrders';
import { AdminCustomers } from '@/pages/admin/AdminCustomers';
import { AdminInvoices } from '@/pages/admin/AdminInvoices';
import { AdminJournal } from '@/pages/admin/AdminJournal';
import { AdminAccounts } from '@/pages/admin/AdminAccounts';
import { AdminReports } from '@/pages/admin/AdminReports';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminForecast } from '@/pages/admin/AdminForecast';
import { AdminAIKeys } from '@/pages/admin/AdminAIKeys';
import { AdminExecutive } from '@/pages/admin/AdminExecutive';

// Shared admin components
import { AIAssistant } from '@/components/admin/AIAssistant';

function StoreShell({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase.from('categories').order('sort_order').then(({ data }) => setCategories(data || []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header categories={categories} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-neutral-300 mb-4">404</h1>
        <p className="text-neutral-500 mb-4">الصفحة غير موجودة</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl bg-primary-700 text-white font-medium hover:bg-primary-800 transition">
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Router
          routes={[
            // Store
            { pattern: '/', component: <StoreShell><HomePage /></StoreShell> },
            { pattern: '/shop', component: <StoreShell><ShopPage /></StoreShell> },
            { pattern: '/product/:slug', component: <StoreShell><ProductDetailPage /></StoreShell> },
            { pattern: '/cart', component: <StoreShell><CartPage /></StoreShell> },
            { pattern: '/checkout', component: <StoreShell><CheckoutPage /></StoreShell> },
            // Admin
            { pattern: '/admin', component: <AdminDashboard /> },
            { pattern: '/admin/products', component: <AdminProducts /> },
            { pattern: '/admin/orders', component: <AdminOrders /> },
            { pattern: '/admin/customers', component: <AdminCustomers /> },
            { pattern: '/admin/invoices', component: <AdminInvoices /> },
            { pattern: '/admin/journal', component: <AdminJournal /> },
            { pattern: '/admin/accounts', component: <AdminAccounts /> },
            { pattern: '/admin/reports', component: <AdminReports /> },
            { pattern: '/admin/forecast', component: <AdminForecast /> },
            { pattern: '/admin/settings', component: <AdminSettings /> },
            { pattern: '/admin/ai-keys', component: <AdminAIKeys /> },
            { pattern: '/admin/executive', component: <AdminExecutive /> },
          ]}
          fallback={<NotFound />}
        />
        <AIAssistant />
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;

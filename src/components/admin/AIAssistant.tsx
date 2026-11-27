import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2, TrendingUp, Package, Wallet, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAIAssistant } from '@/lib/ai';
import { queries } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/format';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: 'حلل أداء المبيعات', color: 'text-emerald-600' },
  { icon: Wallet, text: 'ما وضع الوضع المالي؟', color: 'text-primary-700' },
  { icon: Package, text: 'حلل حالة المخزون', color: 'text-amber-600' },
  { icon: ShoppingCart, text: 'ما أكثر المنتجات طلباً؟', color: 'text-blue-600' },
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'مرحباً! أنا المساعد الذكي للمتجر. كيف يمكنني مساعدتك في تحليل بياناتك؟' },
  ]);
  const [input, setInput] = useState('');
  const { ask, loading } = useAIAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Gather context data
  const { data: orders = [] } = useQuery({ queryKey: queryKeys.orders, queryFn: queries.orders });
  const { data: products = [] } = useQuery({ queryKey: queryKeys.products, queryFn: queries.products });
  const { data: accounts = [] } = useQuery({ queryKey: queryKeys.accounts, queryFn: queries.accounts });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const lowStock = products.filter((p) => p.stock <= 5).length;
    const totalProducts = products.length;
    const assets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
    const liabilities = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
    const revenue = accounts.filter((a) => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
    const expenses = accounts.filter((a) => a.type === 'expense').reduce((s, a) => s + a.balance, 0);

    return `بيانات المتجر:
- إجمالي الإيرادات: ${formatCurrency(totalRevenue)}
- عدد الطلبات: ${totalOrders}
- عدد المنتجات: ${totalProducts}
- منتجات منخفضة المخزون: ${lowStock}
- إجمالي الأصول: ${formatCurrency(assets)}
- إجمالي الخصوم: ${formatCurrency(liabilities)}
- إيرادات الحسابات: ${formatCurrency(revenue)}
- مصروفات الحسابات: ${formatCurrency(expenses)}
- صافي الربح: ${formatCurrency(revenue - expenses)}`;
  };

  const handleSend = async (text?: string) => {
    const prompt = text || input.trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setInput('');

    const result = await ask(prompt, buildContext());
    if (result) {
      setMessages((prev) => [...prev, { role: 'assistant', text: result.response }]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'عذراً، حدث خطأ. حاول مرة أخرى.' }]);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-2xl shadow-primary-300 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="المساعد الذكي"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-400 border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-slide-up flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-700 to-primary-800 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">المساعد الذكي</div>
                <div className="text-xs text-primary-100">تحليلات فورية لبيانات متجرك</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-bl-sm'
                      : 'bg-white border border-neutral-200 text-neutral-800 rounded-br-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl rounded-br-sm">
                  <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q.text)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs font-medium hover:border-primary-300 hover:bg-primary-50 transition ${q.color}`}
                >
                  <q.icon className="w-3.5 h-3.5" />
                  {q.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-neutral-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اكتب سؤالك..."
                className="flex-1 h-10 px-3 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

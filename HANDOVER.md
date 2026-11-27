# ملف تسليم المشروع — متجر النخبة (نظام تجارة إلكترونية + محاسبة + ذكاء اصطناعي)

## تاريخ التسليم: 2026-11-27

---

## 1. معرّفات قاعدة البيانات (Supabase)

قاعدة البيانات الحالية تعمل على Supabase المستضافة، وتحتوي على جميع البيانات والبنية.

### معرّفات الاتصال (متغيرات البيئة في Bolt)

These environment variables are automatically injected by the Bolt runtime — they are NOT in any file in the GitHub repo. The second Bolt account will have the SAME variables automatically if it uses the same Supabase project. If a NEW Supabase project is provisioned for the second account, you must migrate (see Section 6).

| المتغير | الوصف |
|---|---|
| `SUPABASE_URL` | عنوان مشروع Supabase (يُحقن تلقائياً في Bolt) |
| `SUPABASE_ANON_KEY` | مفتاح العميل (للواجهة الأمامية) |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخادم (لـ Edge Functions، يتجاوز RLS) |
| `SUPABASE_DB_URL` | رابط اتصال PostgreSQL المباشر |
| `VITE_SUPABASE_URL` | نفس `SUPABASE_URL`، يُحقن في كود الواجهة |
| `VITE_SUPABASE_ANON_KEY` | نفس `SUPABASE_ANON_KEY`، يُحقن في كود الواجهة |

> مهم: هذه المتغيرات تُحقن تلقائياً من بيئة Bolt. لا توجد في GitHub ولا في أي ملف. الحساب الثاني سيحصل على متغيرات جديدة لمشروع Supabase جديد ما لم يُربط بنفس المشروع.

### لمعرفة قيم المتغيرات الحالية (للنسخ اليدوي عند الحاجة):
في Bolt الحالي، افتح Terminal ونفّذ:
```bash
printenv | grep SUPABASE
```
أو في صفحة Supabase Dashboard > Settings > API.

---

## 2. بنية قاعدة البيانات (6 migrations)

كل ملفات الـ migrations موجودة في GitHub تحت `supabase/migrations/`:

| الملف | المحتوى |
|---|---|
| `20261126024241_ecommerce_accounting_schema.sql` | 12 جدول: categories, products, customers, orders, order_items, accounts, journal_entries, journal_lines, invoices, payments, store_settings + RLS + grants |
| `20261126024337_seed_data.sql` | 21 حساب محاسبي، 6 فئات، 15 منتج بصور Pexels، إعدادات المتجر |
| `20261126024629_rpc_functions.sql` | دالتان: `decrement_stock()` و `update_customer_stats()` |
| `20261127020237_ai_provider_keys.sql` | جدول `ai_provider_keys` (RLS، service_role فقط) |
| `20261127020448_enable_pg_trgm_search.sql` | تمديد pg_trgm + فهارس GIN للبحث العربي الضبابي |
| `20261127021304_seed_customers_orders_invoices.sql` | 8 عملاء، 12 طلب، 12 صنف، 11 فاتورة، 9 قيود يومية، 18 سطر قيد |

### حالة البيانات الحالية:
- منتجات: 15 | فئات: 6 | عملاء: 8 | طلبات: 12 | أصناف طلبات: 12
- فواتير: 11 | حسابات: 21 | قيود يومية: 9 | سطور قيود: 18
- إعدادات: 1 | مفاتيح AI: 10 | مدفوعات: 0

---

## 3. مفاتيح الذكاء الاصطناعي (مخزّنة في قاعدة البيانات)

المفاتيح مخزّنة في جدول `ai_provider_keys` — لا توجد في GitHub ولا في متغيرات بيئة. تُقرأ بواسطة Edge Function عبر service_role key.

| المزود | عدد المفاتيح | الحالة |
|---|---|---|
| Groq | 3 | نشطة (أولوية 1, 2, 3) |
| Google Gemini | 1 | نشطة (أولوية 1) |
| OpenRouter | 3 | نشطة (أولوية 1, 2, 3) |
| Cloudflare AI | 3 | نشطة (أولوية 1, 2, 3) |

### آلية التبديل التلقائي:
- Edge Function `ai-assistant` تجرّب المزودين بالترتيب: Groq → Gemini → OpenRouter → Cloudflare → fallback محلي
- ضمن كل مزود، تجرّب كل مفتاح حسب الأولوية. تتخطّى المفتاح عند 429/403/401
- مفاتيح Cloudflare مخزّنة بصيغة `account_id:api_token`

### لنقل المفاتيح إلى مشروع Supabase جديد:
```sql
-- بعد إنشاء جدول ai_provider_keys في المشروع الجديد، استخرج المفاتيح الحالية:
SELECT provider, key_value, label, is_active, priority FROM ai_provider_keys ORDER BY provider, priority;
-- ثم أدرجها في المشروع الجديد
```
أو استخدم صفحة "مفاتيح الذكاء الاصطناعي" في لوحة التحكم (Admin > AI Keys) لإعادة إدخالها يدوياً.

---

## 4. Edge Functions (منشورة)

| الدالة | الحالة | verify_jwt | الوصف |
|---|---|---|---|
| `ai-assistant` | ACTIVE | false | وكيل AI مع تبديل تلقائي بين 4 مزودين |
| `ai-keys-mgmt` | ACTIVE | false | إدارة مفاتيح AI (GET/POST/PATCH/DELETE) |

### ملفات Edge Functions في GitHub:
- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/ai-keys-mgmt/index.ts`
- `supabase/config.toml` (إعدادات الدوال)

### أسرار Edge Functions (تُحقن تلقائياً من Bolt):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — تُستخدم لقراءة المفاتيح من قاعدة البيانات.

> ملاحظة: متغيرات `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CLOUDFLARE_*` موجودة في بيئة Edge Functions لكن غير مستخدمة مباشرة — المفاتيح تُقرأ من جدول قاعدة البيانات.

---

## 5. الأمان و RLS

- جميع الجداول الـ 11 (عدا `ai_provider_keys`) لديها RLS مفعّل مع 4 سياسات لكل جدول (SELECT/INSERT/UPDATE/DELETE) موجهة لـ `anon, authenticated` — تطبيق single-tenant بدون مصادقة.
- جدول `ai_provider_keys`: RLS مفعّل، لا توجد سياسات لـ anon/authenticated — فقط `service_role` يمكنه الوصول.
- تمديد `pg_trgm` مفعّل مع فهارس GIN على: products.name, products.description, customers.name, customers.phone, orders.order_number.

---

## 6. سيناريوهات الانتقال للحساب الثاني (nas.msr2015@gmail.com)

### السيناريو A: نفس مشروع Supabase (موصى به)
إذا كان الحساب الثاني يُربط بنفس مشروع Supabase (عن طريق Supabase Dashboard > Project Settings > Transfer Ownership، أو إضافة المستخدم كـ Owner):

1. استورد المشروع من GitHub في Bolt.new بالحساب الثاني
2. متغيرات `SUPABASE_URL` و `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY` ستكون **نفسها** لأن المشروع واحد
3. جميع البيانات والـ Edge Functions والـ migrations تبقى كما هي
4. لا حاجة لأي إجراء إضافي

> لمنح الحساب الثاني صلاحية Owner على مشروع Supabase:
> - اذهب إلى https://supabase.com/dashboard/projects
> - Project Settings > General > Transfer Project Ownership
> - أو: Project Settings > Team Members > Add member (nas.msr2015@gmail.com) كـ Owner

### السيناريو B: مشروع Supabase جديد (إذا تعذّر نقل الملكية)
إذا أنشأ Bolt للحساب الثاني مشروع Supabase **جديد**، يجب迁移 البيانات:

1. استورد المشروع من GitHub
2. نفّذ ملفات الـ migrations الستة بالترتيب (موجودة في `supabase/migrations/`)
3. أعد إدخال مفاتيح AI عبر صفحة Admin > AI Keys أو بـ SQL
4. أعد نشر Edge Functions ( Bolt سينشرها تلقائياً عند الكشف عن تغيير في الكود)

### السيناريو C: نسخة احتياطية كاملة (احتياط)
لإنشاء نسخة احتياطية كاملة من قاعدة البيانات الحالية:
- عبر Supabase Dashboard > Database > Backups (تلقائية يومية)
- أو عبر `pg_dump` باستخدام `SUPABASE_DB_URL`:
```bash
pg_dump "SUPABASE_DB_URL" -F p -f backup.sql
```

---

## 7. ما تم ربطه فعلياً (مؤكد)

- [x] قاعدة بيانات Supabase مع 12 جدول + RLS + grants
- [x] 6 migrations منشورة (آخرها seed للعملاء والطلبات)
- [x] Edge Function `ai-assistant` منشورة وتعمل (ACTIVE)
- [x] Edge Function `ai-keys-mgmt` منشورة وتعمل (ACTIVE)
- [x] 10 مفاتيح AI في قاعدة البيانات (Groq×3, Gemini×1, OpenRouter×3, Cloudflare×3)
- [x] pg_trgm مفعّل مع فهارس البحث العربي
- [x] دالتان RPC: decrement_stock, update_customer_stats
- [x] بيانات تجريبية: 15 منتج، 8 عملاء، 12 طلب، 11 فاتورة، 9 قيود محاسبية

## 8. ما يحتاج إجراءً يدوياً في الحساب الثاني

1. **استيراد المشروع من GitHub**: https://github.com/ahmedalag7777-cyber/FromBegning
2. **ربط مشروع Supabase**: 
   - الخيار الأمثل: نقل ملكية مشروع Supabase الحالي إلى nas.msr2015@gmail.com
   - أو إضافته كـ Owner في Team Members
3. **التحقق من متغيرات البيئة**: بعد الاستيراد، تأكد أن `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` محقونة (Bolt يفعل هذا تلقائياً)
4. **التحقق من Edge Functions**: افتح Admin > AI Keys للتأكد أن المفاتيح تُقرأ من قاعدة البيانات
5. **إذا كان مشروع Supabase جديد**: نفّذ migrations + أعد إدخال مفاتيح AI + انشر Edge Functions

## 9. خطوات استئناف العمل في الحساب الثاني

1. افتح Bolt.new ببريد nas.msr2015@gmail.com
2. استورد المشروع من GitHub: https://github.com/ahmedalag7777-cyber/FromBegning
3. انتظر حتى يُحمّل المشروع وتُحقن متغيرات Supabase
4. افتح المعاينة — يجب أن يظهر المتجر بالمنتجات والفئات
5. اذهب إلى `/admin` → لوحة التحكم بالكامل (طلبات، عملاء، فواتير، محاسبة)
6. اذهب إلى `/admin/executive` → اللوحة التنفيذية
7. اذهب إلى `/admin/ai-keys` → إدارة مفاتيح AI
8. اختبر المساعد الذكي (زر عائم أسفل اليسار)
9. إذا لم تظهر البيانات: تحقق من ربط Supabase (السيناريو A أو B في القسم 6)

## 10. بنية المشروع (موجودة بالكامل في GitHub)

```
src/
├── App.tsx                          # الراوتر الرئيسي + 15 صفحة
├── components/
│   ├── admin/
│   │   ├── AdminLayout.tsx          # Sidebar + notifications + 12 nav items
│   │   └── AIAssistant.tsx          # مساعد ذكي عائم
│   └── store/
│       ├── Layout.tsx               # Header + Footer
│       └── ProductCard.tsx          # بطاقة منتج
├── context/CartContext.tsx          # سلة تسوق + localStorage
├── lib/
│   ├── ai.ts                        # hook للمساعد الذكي
│   ├── api.ts                       # queries + mutations (Supabase)
│   ├── exporters.ts                 # Excel/CSV (lazy-loaded ExcelJS)
│   ├── forecast.ts                  # تنبؤ بالمبيعات (moving average)
│   ├── format.ts                    # تنسيق العملة/التاريخ/الحالات
│   ├── notifications.ts             # إشعارات (low stock, pending, overdue)
│   ├── pdf.ts                       # PDF فواتير + QR (lazy-loaded jsPDF)
│   ├── queryClient.ts               # TanStack Query config
│   ├── router.tsx                   # hash-based router
│   └── supabase.ts                  # Supabase client singleton
├── pages/
│   ├── store/ (5 صفحات: Home, Shop, ProductDetail, Cart, Checkout)
│   └── admin/ (12 صفحة: Dashboard, Executive, Products, Orders, Customers,
│               Invoices, Journal, Accounts, Reports, Forecast, Settings, AIKeys)
└── types/index.ts                   # جميع الأنواع
supabase/
├── config.toml                      # إعدادات Edge Functions
├── functions/
│   ├── ai-assistant/index.ts        # وكيل AI + تبديل تلقائي
│   └── ai-keys-mgmt/index.ts        # إدارة المفاتيح
└── migrations/ (6 ملفات SQL)
```

---

## ملخص تنفيذي

المشروع **مكتمل في GitHub** (كود + migrations + edge functions). البيانات الحية في Supabase (منتجات، عملاء، طلبات، محاسبة، مفاتيح AI). للانتقال:

1. انقل ملكية Supabase إلى الحساب الثاني (أو أضفه Owner)
2. استورد المشروع من GitHub في Bolt.new
3. ستعمل كل المتغيرات والدوال والبيانات تلقائياً

إذا تعذّر نقل Supabase: migrations + إعادة مفاتيح AI = استعادة كاملة.

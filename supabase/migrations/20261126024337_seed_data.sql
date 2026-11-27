/*
# Seed Data: Chart of Accounts, Categories, Products, Settings

## Overview
Seeds the database with:
1. Standard chart of accounts (assets, liabilities, equity, revenue, expenses)
2. Product categories with icons
3. Sample products with images
4. Default store settings row

Accounts are referenced by their unique code in subsequent inserts.
*/

-- ============================================
-- STORE SETTINGS (single row)
-- ============================================
INSERT INTO store_settings (id, store_name, store_email, store_phone, store_address)
VALUES ('00000000-0000-0000-0000-000000000001', 'متجر النخبة', 'info@elite-store.sa', '+966 50 123 4567', 'الرياض، المملكة العربية السعودية')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================
INSERT INTO accounts (code, name, type, description) VALUES
('1000', 'النقدية والبنوك', 'asset', 'الحسابات النقدية والبنكية'),
('1010', 'الصندوق', 'asset', 'النقدية في الصندوق'),
('1020', 'البنك - الحساب الجاري', 'asset', 'الحساب البنكي الجاري'),
('1100', 'الذمم المدينة (العملاء)', 'asset', 'المبالغ المستحقة من العملاء'),
('1200', 'المخزون', 'asset', 'قيمة المخزون السلعي'),
('1300', 'الأصول الثابتة', 'asset', 'الأصول الثابتة للمتجر'),
('2000', 'الذمم الدائنة (الموردون)', 'liability', 'المبالغ المستحقة للموردين'),
('2100', 'ضريبة القيمة المضافة المستحقة', 'liability', 'VAT المستحقة الدفع'),
('2200', 'مصاريف مستحقة', 'liability', 'مصاريف مستحقة الدفع'),
('3000', 'رأس المال', 'equity', 'رأس مال المتجر'),
('3100', 'الأرباح المرحّلة', 'equity', 'الأرباح المرحلة من السنوات السابقة'),
('4000', 'إيرادات المبيعات', 'revenue', 'إيرادات بيع المنتجات'),
('4100', 'إيرادات الشحن', 'revenue', 'إيرادات رسوم الشحن'),
('4200', 'إيرادات أخرى', 'revenue', 'إيرادات متنوعة'),
('5000', 'تكلفة البضاعة المباعة', 'expense', 'تكلفة البضاعة المباعة COGS'),
('5100', 'مصاريف الشراء', 'expense', 'مصاريف شراء البضاعة'),
('5200', 'مصاريف الشحن والنقل', 'expense', 'مصاريف الشحن للعملاء'),
('5300', 'الرواتب والأجور', 'expense', 'رواتب الموظفين'),
('5400', 'الإيجار', 'expense', 'إيجار المحل/المخزن'),
('5500', 'التسويق والإعلان', 'expense', 'مصاريف التسويق'),
('5600', 'مصاريف عامة وإدارية', 'expense', 'مصاريف إدارية متنوعة')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- CATEGORIES (slug is unique, used as stable reference)
-- ============================================
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
('إلكترونيات', 'electronics', 'أجهزة إلكترونية وملحقاتها', 'Smartphone', 1),
('أزياء', 'fashion', 'ملابس وأزياء رجالية ونسائية', 'Shirt', 2),
('منزل ومطبخ', 'home-kitchen', 'أدوات المنزل والمطبخ', 'Home', 3),
('جمال وعناية', 'beauty', 'منتجات العناية والتجميل', 'Sparkles', 4),
('رياضة', 'sports', 'معدات وملابس رياضية', 'Dumbbell', 5),
('كتب', 'books', 'كتب وقرطاسية', 'BookOpen', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PRODUCTS (slug is unique)
-- ============================================
INSERT INTO products (category_id, name, slug, description, price, cost, stock, sku, image_url, is_active, is_featured, rating, tags)
SELECT c.id, p.name, p.slug, p.description, p.price, p.cost, p.stock, p.sku, p.image_url, p.is_active, p.is_featured, p.rating, p.tags
FROM (VALUES
-- Electronics
('electronics', 'سماعات لاسلكية فاخرة', 'premium-wireless-headphones', 'سماعات لاسلكية بعزل الضجيج النشط وجودة صوت استثنائية', 499.00, 280.00, 45, 'ELEC-001', 'https://images.pexels.com/photos/3394651/pexels-photo-3394651.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.8, ARRAY['صوت','لاسلكي','بلوتوث']),
('electronics', 'ساعة ذكية رياضية', 'smart-sport-watch', 'ساعة ذكية مع تتبع اللياقة البدنية ومراقبة القلب', 749.00, 420.00, 30, 'ELEC-002', 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.6, ARRAY['ساعة ذكية','رياضة','صحة']),
('electronics', 'مكبر صوت بلوتوث محمول', 'portable-bluetooth-speaker', 'مكبر صوت محمول مقاوم للماء بصوت قوي', 199.00, 95.00, 60, 'ELEC-003', 'https://images.pexels.com/photos/12791030/pexels-photo-12791030.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.4, ARRAY['مكبر صوت','بلوتوث','مقاوم للماء']),
-- Fashion
('fashion', 'حقيبة جلدية فاخرة', 'premium-leather-bag', 'حقيبة جلدية أنيقة مصنوعة من جلد طبيعي فاخر', 689.00, 350.00, 20, 'FASH-001', 'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.7, ARRAY['حقيبة','جلد','فاخر']),
('fashion', 'نظارة شمسية كلاسيكية', 'classic-sunglasses', 'نظارة شمسية بتصميم كلاسيكي وحماية UV كاملة', 259.00, 120.00, 50, 'FASH-002', 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.3, ARRAY['نظارة','شمسية','حماية UV']),
('fashion', 'ساعة يد كلاسيكية', 'classic-wrist-watch', 'ساعة يد أنيقة بتصميم كلاسيكي خالد', 529.00, 240.00, 35, 'FASH-003', 'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.5, ARRAY['ساعة','كلاسيك','أنيق']),
-- Home & Kitchen
('home-kitchen', 'آلة قهوة احترافية', 'professional-coffee-maker', 'آلة قهوة احترافية لتحضير قهوة المختص في منزلك', 899.00, 520.00, 15, 'HOME-001', 'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.9, ARRAY['قهوة','مطبخ','احترافي']),
('home-kitchen', 'طقم أواني طبخ 10 قطع', 'cookware-set-10pcs', 'طقم أواني طبخ مكون من 10 قطع من الستانلس ستيل', 449.00, 220.00, 25, 'HOME-002', 'https://images.pexels.com/photos/4226806/pexels-photo-4226806.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.5, ARRAY['أواني','طبخ','ستانلس']),
('home-kitchen', 'مصباح طاولة عصري', 'modern-table-lamp', 'مصباح طاولة بتصميم عصري وإضاءة LED قابلة للتعديل', 149.00, 65.00, 40, 'HOME-003', 'https://images.pexels.com/photos/1112597/pexels-photo-1112597.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.2, ARRAY['مصباح','طاولة','LED']),
-- Beauty
('beauty', 'عطر فاخر للرجال', 'luxury-mens-perfume', 'عطر شرقي فاخر للرجال بثبات يدوم طويلاً', 389.00, 180.00, 30, 'BTY-001', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.6, ARRAY['عطر','رجال','فاخر']),
('beauty', 'طقم عناية بالبشرة', 'skincare-set', 'طقم متكامل للعناية بالبشرة من منتجات طبيعية', 229.00, 100.00, 45, 'BTY-002', 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.4, ARRAY['عناية','بشرة','طبيعي']),
-- Sports
('sports', 'دمبل قابل للتعديل', 'adjustable-dumbbell', 'دمبل قابل لتعديل الوزن من 2.5 إلى 24 كجم', 599.00, 310.00, 18, 'SPRT-001', 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.7, ARRAY['دمبل','رياضة','قابل للتعديل']),
('sports', 'حذاء رياضي للجري', 'running-shoes', 'حذاء رياضي خفيف مخصص للجري بمزيد من الراحة', 349.00, 160.00, 55, 'SPRT-002', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=600', true, true, 4.5, ARRAY['حذاء','رياضة','جري']),
-- Books
('books', 'كتاب فن اللامبالاة', 'subtle-art-book', 'كتاب فن اللامبالاة لعيش حياة أفضل', 89.00, 40.00, 100, 'BOOK-001', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.3, ARRAY['كتاب','تطوير ذات']),
('books', 'دفتر ملاحظات جلدي', 'leather-notebook', 'دفتر ملاحظات بغلاف جلدي فاخر وورق عالي الجودة', 69.00, 25.00, 80, 'BOOK-002', 'https://images.pexels.com/photos/6260923/pexels-photo-6260923.jpeg?auto=compress&cs=tinysrgb&w=600', true, false, 4.6, ARRAY['دفتر','ملاحظات','جلد'])
) AS p(cat_slug, name, slug, description, price, cost, stock, sku, image_url, is_active, is_featured, rating, tags)
JOIN categories c ON c.slug = p.cat_slug
ON CONFLICT (slug) DO NOTHING;

# Project memory

## Product intent & audience

- E-commerce/marketplace web app with a customer-facing storefront and an admin dashboard.
- Admin features include product management, an AI assistant, demand prediction/forecasting, and data export.
- Backend/data layer is Supabase; the storefront and admin read live data from Supabase tables.
- Goal: production-ready, deliverable product that runs end-to-end without errors.

## Brand personality & voice

- Arabic-speaking primary user/owner; UI likely bilingual or Arabic-first.
- Communication is direct and outcome-focused ("ready for delivery, working").

## Visual design & UX direction

- Built with Tailwind CSS, Lucide React icons, React hooks.
- Production-quality, non-cookie-cutter UI expected by default.
- Storefront surfaces categories and products from Supabase; admin has product management and analytics-style tools (prediction, export, AI assistant).

## Decisions, constraints & rationale

- Stack: Vite + React + TypeScript, Supabase client, `@/` path alias for `src/`.
- Critical bug fixed: Supabase queries were calling `.order()` before `.select()`, causing a full white-screen crash across the storefront and admin. Corrected in store page, product admin, and related modules.
- Additional TypeScript/type errors fixed in AI assistant, prediction, and export modules to ensure a clean build, not just a running homepage.
- Verification gate: TypeScript type-check + build must pass before considering work complete.

## Open questions & assumptions

- Supabase schema and env credentials are assumed configured and accessible.
- Exact product catalog structure (tables/fields for categories, products) inferred from query patterns; not yet documented.
- Auth/role model for admin vs storefront access not yet specified.
- Prediction and export data sources/outputs not fully defined.
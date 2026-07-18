# CLAUDE.md — Frontend (Ishbor Web)

> Ildizdagi `/CLAUDE.md` ni ham o'qing — umumiy kontekst o'sha yerda.

## Nima bu

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui web ilova.
Ko'p tilli (uz/ru/en) `next-intl` bilan. E'lonlar, malaka testi, reyting, kirish.

## Ishga tushirish

```bash
npm run dev -w frontend    # port 3000
npm run build -w frontend
npm run lint -w frontend
npx tsc --noEmit           # tez typecheck (frontend papkasida)
```
Muhit: `frontend/.env.local` → `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).

## Marshrutlar (`app/[locale]/`)

- `page.tsx` — **e'lonlar sahifasi** (asosiy): rol segmenti, filtrlar, qidiruv, card grid.
- `jobs/new/page.tsx` — e'lon berish.
- `test/page.tsx` — malaka testi (anti-cheat, taymer).
- `leaderboard/page.tsx` — reyting.
- `login/page.tsx` — kirish/ro'yxatdan o'tish.
- `layout.tsx` — SiteNav + ThemeProvider + i18n provayder.

## Muhim konvensiyalar

- **API:** faqat `lib/api.ts` (`api.getJobs`, `api.me`, ...) orqali. `payload.data` qaytadi; xatoda `ApiError`.
- **Auth token:** `tokenStore` (localStorage `ishbor_token`).
- **i18n:** har matn **uz/ru/en** `messages/*.json` ga qo'shiladi; komponentda `useTranslations('namespace')`, sana uchun `useFormatter`.
- **Navigatsiya:** `@/i18n/navigation` dan `Link`, `useRouter`, `usePathname` (lokalizatsiyalangan).
- **Uslub:** Tailwind + `cn()` (`lib/utils`). shadcn `components/ui/*` — asosiy primitivlar.
- **'use client':** ma'lumot yuklaydigan/interaktiv sahifalar klient komponent.
- **Path alias:** `@/` → `frontend/src/`.

## Asosiy komponentlar

- `JobCard.tsx` — bosiladigan e'lon kartasi → `JobDetailDialog` ochadi.
- `JobDetailDialog.tsx` — to'liq detal modal (reyting, tavsif, bog'lanish).
- `rating.tsx` — `RatingStars` (test %idan yulduz) + `Avatar` (ismdan gradient).
- `badges.tsx` — `LevelBadge`, `StackBadge`, `VerifiedBadge`.
- `QuestionCard`, `Timer`, `ResultCard`, `AntiCheatBanner`, `ViolationDialog` — test oqimi.

## Dizayn tili

- shadcn slate bazasi (CSS o'zgaruvchilari `globals.css`), light/dark.
- Aksent ranglar: **ish beruvchi = indigo**, **ish qidiruvchi = emerald**, maosh/muvaffaqiyat = emerald, reyting = amber.
- Card grid `sm:grid-cols-2 lg:grid-cols-3`, hover'da ko'tarilish + soya.

## 📝 Hujjatni yangilab borish (MAJBURIY)

Yangi sahifa / komponent / dizayn qoidasi qo'shsangiz — shu `frontend/CLAUDE.md`
ni **o'sha PR ichida** yangilang. Yangi matn bo'lsa `messages/{uz,ru,en}.json`
uchtala tilga qo'shing. Batafsil qoida: ildiz `/CLAUDE.md` → "Hujjatlarni yangilab borish".

## Domen egalari (`docs/team/`)

- **Fazilov** — `components/ui/*`, `rating`, `badges`, `theme`, `layout`, `globals.css`, test UI, i18n.
- **Hidoyatov** — `page.tsx` (e'lonlar), `jobs/new`, `JobCard`, `JobDetailDialog` + admin (yangi).
- **Sardor** — `hooks/*` (anti-cheat), `lib/socket.ts`, `AntiCheatBanner`, `ViolationDialog`, login.

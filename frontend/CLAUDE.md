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
  Har qanday so'rov 401 qaytarsa, `request()` avtomatik `POST /auth/refresh` chaqirib
  tokenni yangilaydi va so'rovni bir marta qayta yuboradi — controllerlar buni
  bilishi shart emas, shaffof ishlaydi.
- **Auth token:** `tokenStore` (localStorage `ishbor_token` + `ishbor_refresh_token`,
  `get`/`set`/`getRefresh`/`setRefresh`/`clear`). Bitta qurilmadan chiqish —
  `api.logout()`; **barcha** qurilmalardan chiqish — `api.logoutAllDevices()`
  (`SiteNav.tsx`da kichik ikkilamchi tugma, ⚠️ joylashuvi Fazilov bilan hali
  kelishilmagan). To'g'ridan-to'g'ri `tokenStore.clear()` ishlatma — refresh
  token DB'da qolib ketadi.
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

### Anti-cheat oqimi (`test/page.tsx`, `phase === 'active'`)

`useHeartbeat` (socket ochadi + heartbeat yuboradi) → socket'ni `useAntiCheat`ga
beriladi (tab-switch, copy/paste/cut, right-click, PrintScreen, DevTools kuzatadi,
`POST /test/tab-switch` va `POST /test/violation` chaqiradi) → `AntiCheatBanner`
holatni ko'rsatadi (tab-switch + umumiy violation soni), `ViolationDialog` har
buzilishda ochiladi (`anti.violationDialog`, tur bo'yicha matn: `violationBody` /
`violationBodyCopyPaste` / `violationBodyRightClick` / `violationBodyScreenshot` /
`violationBodyDevtools`). `useFullscreen` — test boshlanganda (`start()`, klik
ichida sinxron, `await`dan oldin) fullscreen so'raladi; fullscreen'dan chiqish
(ikkinchi oyna ochish, Esc va h.k.) **alohida hisoblagich ochmasdan**, mavjud
tab-switch kanali orqali (`anti.report()`) xabar qilinadi — bitta jismoniy
harakat (masalan alt-tab) ikki marta hisoblanmasin deb. `useExamLockdown` —
qo'shimcha deterrent: F12/Ctrl+Shift+I,J,C/Ctrl+U,P,S,C,X,V yorliqlarini bloklaydi.
Server sessiyani terminate qilsa (`onTerminated`), `submitTest` chaqirilmaydi —
sintetik `status: 'terminated'` natija to'g'ridan-to'g'ri `ResultCard`ga beriladi.
Yangi buzilish turi qo'shsang: `types/test.ts`dagi `ViolationType`,
`useAntiCheat.ts`, `ViolationDialog.tsx` (`bodyKeyByType`) va `messages/*.json`dagi
`proctor` namespace'ni yangila (backendda ham `VIOLATION_TYPES`).

> Screenshot aniqlash faqat PrintScreen tugmasi bilan cheklangan — OS darajasidagi
> skrinshot vositalari (Snipping Tool, Cmd+Shift+4) hech qanday brauzer API orqali
> ko'rinmaydi, bu bartaraf etib bo'lmaydigan texnik chegara. Xuddi shunday,
> `Ctrl+N`/`Ctrl+T`/`Ctrl+Shift+N` (yangi oyna/tab/incognito) hech qanday web
> sahifa tomonidan bloklanmasligi ataylab qilingan brauzer xavfsizlik siyosati —
> shu sabab "ko'p oyna" himoyasi to'liq oldini olish emas, fullscreen'dan
> chiqishni aniqlash orqali amalga oshirilgan.

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

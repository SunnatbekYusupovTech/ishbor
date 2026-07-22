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
  Kengaytirilgan filtrlar: joylashuv, maosh oralig'i, sort (newest/oldest/salary_asc/salary_desc).
- `jobs/new/page.tsx` — e'lon berish (location maydoni qo'shilgan).
- `admin/page.tsx` — Admin dashboard (statistika, bo'limlar bo'yicha tahlil).
- `admin/users/page.tsx` — Foydalanuvchilarni boshqarish (qidiruv, pagination, o'chirish).
- `admin/jobs/page.tsx` — E'lonlarni boshqarish (qidiruv, pagination, o'chirish).
- `admin/sessions/page.tsx` — Anti-cheat sessiyalar (status filter, loglarni ko'rish).
- `admin/questions/page.tsx` — Savollar bazasi (texnologiya va qiyinchilik bo'yicha filter).
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
  `test/page.tsx` anti-cheat'ni ulaydi (`useAntiCheat` REST) va `proctor` namespace'dan
  matn oladi; savol matni/variantlari backend'dan lokalizatsiyalangan holda keladi
  (`api.startTest` `locale` yuboradi). Modal ochilganda savol taymeri pauza qilinadi.
- `lib/hidden.ts` — yashirilgan e'lonlar (localStorage `ishbor_hidden`, `favorites.ts`
  bilan bir xil `useSyncExternalStore` shabloni).
- `login/page.tsx` — parolni ko'rsatish (ko'z), `confirmPassword`, `noValidate` + maydon
  ostidagi lokalizatsiyalangan xatolar (`auth.err*`). `jobs/new` — maosh diapazoni va
  maydon validatsiyasi (`post.err*`).
- **Responsive:** mobil `SiteNav` (hamburger menyu, `md:` da to'liq nav), mobil-xavfsiz
  `ui/dialog` (`w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]`), formalar `sm:` da ustunli.
- `language-selector.tsx` — premium til tanlagich (bayroq + kod, animatsion dropdown,
  klaviatura bilan boshqarish, `lib/locale-preference.ts` orqali localStorage'da saqlash).
  Bayroqlar `flags.tsx` (SVG — emoji bayroqlar Windows'da harf ko'rinadi). `SiteNav`da ishlatiladi.

### Anti-cheat oqimi (`test/page.tsx`, `phase === 'active'`)

`useHeartbeat` (socket ochadi + heartbeat yuboradi) → socket'ni `useAntiCheat`ga
beriladi (tab-switch, copy/paste/cut, right-click, PrintScreen, DevTools kuzatadi,
`POST /test/tab-switch` va `POST /test/violation` chaqiradi) — DevTools ikki mustaqil
signal bilan aniqlanadi: oyna o'lchami farqi (faqat docked panel) + `debugger;`
timing trap (docked **va** undocked/ikkinchi monitordagi panelni ham ushlaydi —
DevTools ochiq bo'lsa `debugger;` ijroni to'xtatadi, o'lchangan vaqt me'yordan
keskin oshadi; yopiq bo'lsa ~0ms) — ikkalasi ham bitta `'devtools'` violation
sifatida hisoblanadi. → `AntiCheatBanner`
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

## Dizayn tili (hh.uz-uslubidagi job-board)

- **Token'lar** `globals.css` da (light/dark), Tailwind orqali ishlatiladi.
  - **Bitta harakat aksenti = ko'k** `primary` (`#0069f5`; dark'da yorqinroq). Barcha
    harakatlar: tugmalar, havolalar, aktiv filtr, verifikatsiya belgisi. Aksent faqat
    harakat/holat uchun.
  - **Brend qizil** `brand` (`#d6001c`; token: `hsl(var(--brand))`) — faqat logo va
    xato uchun, **hech qachon** oddiy harakat tugmasi uchun ishlatilmaydi.
  - Light: canvas och-kulrang (`#f4f6f9`), kartalar oq "orol"; Dark: deep-slate canvas,
    kartalar bir pog'ona ochroq.
  - **Semantik token'lar:** `success` (maosh/ijobiy — yashil), `warning`, `destructive`.
    Yangi kodda ad-hoc `emerald-*`/`indigo-*`/`sky-*` o'rniga token ishlating.
  - Radius: `--radius: 0.75rem` (xl/lg/md/sm hosilalari Tailwind configda).
- **Shriftlar** (`next/font`, `layout.tsx`): sans = **Onest** (uz/ru/en — latin-ext +
  cyrillic), mono = **JetBrains Mono** (taymer, ball, kod). Tailwind: `font-sans`/`font-mono`.
- Rol aksenti: **ish beruvchi = ko'k (primary)**, **ish qidiruvchi = yashil (success)**.
  Reyting yulduzlari = amber.
- **Layout (e'lonlar sahifasi):** yuqorida keng qidiruv + rol segmenti; pastda ikki ustun
  `lg:grid-cols-[300px_minmax(0,1fr)]` — chapda `<aside>` sticky vidjetlar (Faoliyatingiz/
  Saqlanganlar, Filtrlar, Saqlangan qidiruvlar preset'lari, malaka-promo, mehmon uchun
  kirish), o'ngda **bitta ustunli** keng karta lentasi.
- **Header (`SiteNav`):** qizil `ish` logo mark + wordmark, `Toshkent` city pill (`MapPin`),
  aktiv link ostida ko'k chiziq, o'ngda saqlanganlar (yurak + counter), bildirishnoma
  qo'ng'irog'i (empty-state popover), locale/theme, ko'k `Kirish`.
- **JobCard:** keng "orol" karta — avatar + ko'k `BadgeCheck` (verifikatsiya =
  `rating.verificationLevel !== 'none'`), rol bejlik, sarlavha (dialog ochadi), teglar,
  yashil maosh, tavsif; o'ng-yuqorida `EyeOff` (yashirish) + `Heart` (saqlash); pastda
  vaqt + ko'k `Bog'lanish`.
- **Saqlanganlar (favorites):** `lib/favorites.ts` — localStorage (`ishbor_favorites`) +
  `useSyncExternalStore` (snapshot memoizatsiya qilinadi, aks holda infinite-loop). Header
  yuragi, karta yuragi va sidebar counteri shu store orqali sinxron.
- `container` padding adaptiv: `1rem` (mobil) → `1.5rem` (sm) → `2rem` (lg).
- Metadata `generateMetadata` orqali lokalizatsiya qilinadi (`meta` namespace, uch tilda).

## 📝 Hujjatni yangilab borish (MAJBURIY)

Yangi sahifa / komponent / dizayn qoidasi qo'shsangiz — shu `frontend/CLAUDE.md`
ni **o'sha PR ichida** yangilang. Yangi matn bo'lsa `messages/{uz,ru,en}.json`
uchtala tilga qo'shing. Batafsil qoida: ildiz `/CLAUDE.md` → "Hujjatlarni yangilab borish".

## Domen egalari (`docs/team/`)

- **Fazilov** — `components/ui/*`, `rating`, `badges`, `theme`, `layout`, `globals.css`, test UI, i18n.
- **Hidoyatov** — `page.tsx` (e'lonlar), `jobs/new`, `JobCard`, `JobDetailDialog`,
  `admin/*` (dashboard, users, jobs, sessions, questions), `SiteNav` (admin link).
- **Sardor** — `hooks/*` (anti-cheat), `lib/socket.ts`, `AntiCheatBanner`, `ViolationDialog`, login.

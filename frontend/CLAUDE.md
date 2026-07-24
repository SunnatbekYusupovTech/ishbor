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

**Fayl tuzilishi tekis** (route group YO'Q — bir marta `(site)`/`admin` route-group
sinab ko'rilgan edi, lekin Vercel production build'ini buzgan, sababi to'liq
aniqlanmagan; shu sabab qaytarilgan). Admin panelda header yo'qligi endi
**`components/SiteChrome.tsx`** (client komponent) orqali — `usePathname()`
`/admin` bilan boshlansa `SiteNav`/footer'siz oddiy `<main>` qaytaradi, aks holda
odatdagi `SiteNav` + `<main>` + footer. `layout.tsx` (ildiz) shu `SiteChrome`ni
`{children}` atrofida o'raydi — boshqa hech qanday layout fayli yo'q.

- `page.tsx` — **e'lonlar sahifasi** (asosiy): rol segmenti, filtrlar, qidiruv, card grid.
  Kengaytirilgan filtrlar: joylashuv (`RegionSelect`), maosh oralig'i, sort.
- `jobs/new/page.tsx` — e'lon berish. Seeker uchun daraja **stack-bo'yicha**:
  `verificationLevels[form.stack]` (frontend testidan o'tish backend rezyume
  joylashni ochmaydi) — tanlangan stack uchun `none` bo'lsa forma ogohlantiradi
  va submit bloklanadi (`stackUnverifiedHint`).
- `admin/login/page.tsx` — **alohida** admin kirish sahifasi (email/parol, `api.login`
  + `api.me()` bilan `role==='admin'` tekshiradi — aks holda token tashlab yuboriladi
  va `notAdmin` xatosi ko'rsatiladi). 3 marta ketma-ket xato urinishdan keyin forma
  15 soniyaga bloklanadi (`MAX_ATTEMPTS`/`COOLDOWN_MS`, sof frontend UX qatlami —
  backenddagi IP-bo'yicha `authRateLimiter`dan mustaqil, qo'shimcha).
- `admin/page.tsx` — Admin dashboard (statistika, bo'limlar bo'yicha tahlil).
- `admin/users/page.tsx` — Foydalanuvchilarni boshqarish (qidiruv, pagination, o'chirish).
- `admin/jobs/page.tsx` — E'lonlarni boshqarish (qidiruv, pagination, o'chirish).
- `admin/sessions/page.tsx` — Anti-cheat sessiyalar (status filter, loglarni ko'rish).
- `admin/questions/page.tsx` — Savollar bazasi (texnologiya va qiyinchilik bo'yicha filter).
- Barcha 5 ta `admin/*` sahifa `hooks/useAdminGuard.ts`dan foydalanadi — avval faqat
  `tokenStore.get()` (istalgan tizimga kirgan foydalanuvchi) tekshirilardi; endi
  `api.me()` orqali `role==='admin'` ham qayta tasdiqlanadi (backenddagi
  `requireAdmin` kabi — keshlangan rolga ishonilmaydi), aks holda `/admin/login`ga
  yo'naltiriladi (avval umumiy `/login`ga yuborilardi).
- `test/page.tsx` — malaka testi (anti-cheat, taymer).
- `leaderboard/page.tsx` — reyting.
- `profile/page.tsx` — profil: ism/email/rol, **"Kimligingizni tanlang"**
  (`primaryDirection` tanlagich — 4 tugma, bosilganda darhol `api.updateMe`
  bilan saqlanadi, optimistik yangilanadi), har bir yo'nalish uchun
  `components/DirectionProgress.tsx` progress-bar (6 pog'ona: junior→
  strong-junior→middle→strong-middle→senior→strong-senior, "siz shu yerdasiz"
  width-based bar), eng yaxshi natija/urinishlar, `isQaTester` bo'lsa
  ogohlantirish, test/reyting/chiqish havolalari. `SiteNav`dagi far-right
  `UserMenu` avatar-dropdown orqali ochiladi (faqat `authed` bo'lsa ko'rinadi).
  To'liq CRUD: **Update** — `EditProfileCard` (ism/email + ixtiyoriy parol
  o'zgartirish, `api.updateMe` → `PATCH /auth/me`); **Delete** —
  `DangerZoneCard` (parol tasdig'i bilan `Dialog`, `api.deleteMe` →
  `DELETE /auth/me`, muvaffaqiyatda `tokenStore.clear()` + `/`ga yo'naltirish).
- `u/[handle]/page.tsx` — **ommaviy frilanser profili** (`/u/<username>`, yoki
  username tanlamagan eski akkauntlar uchun `/u/<id>` — backend ikkalasini
  ham hal qiladi). Tizimga kirmasdan ham ochiladi; javobdagi `isOwner`
  qo'shish/tahrirlash/o'chirish tugmalarini yoqadi (serverda ham egalik
  qayta tekshiriladi — batafsil `backend/CLAUDE.md` → "Frilanser profili").
  Tuzilishi: `ProfileHeader` (muqova + avatar + ism/@username + onlayn
  nuqta + mutaxassislik + ko'nikma teglari) → ikki ustun
  `lg:grid-cols-[minmax(0,1fr)_300px]` (chapda `AboutSection` +
  `SocialLinksSection` + `PortfolioSection`, o'ngda sticky `ProfileSidebar`)
  → pastda to'liq kenglikdagi `ReviewsSection`. `EditProfileDialog` —
  egasining hamma maydonlarini bitta `PATCH /auth/me`da saqlaydi.
  Username o'zgarsa sahifa yangi handle'ga `router.replace` qiladi
  (aks holda URL ishlamay qolardi).
- `login/page.tsx` — kirish/ro'yxatdan o'tish.
- `layout.tsx` — html/body, `ThemeProvider`, `NextIntlClientProvider`, `SiteChrome`.

## Muhim konvensiyalar

- **API:** faqat `lib/api.ts` (`api.getJobs`, `api.me`, ...) orqali. `payload.data` qaytadi; xatoda `ApiError`.
  **`ApiError.status === 0`** — alohida holat: so'rov serverga umuman yetib
  bormagan (backend o'chiq, yoki brauzer CORS bilan bloklagan, ya'ni bu origin
  backenddagi `CLIENT_ORIGIN` ro'yxatida yo'q). Server qaytargan rad javobidan
  butunlay boshqacha muammo va boshqacha yechim, shuning uchun UI'da alohida
  xabar ko'rsatiladi (`freelancer.errNetwork`). Yangi xato ishlovi yozganda
  shuni hisobga oling — aks holda "server ishlamayapti" va "server rad etdi"
  bir xil ko'rinadi.
  > **Dev gotcha:** `frontend` `-p 3000`da ishlaydi, shuning uchun
  > `backend/.env`dagi `CLIENT_ORIGIN` ham `http://localhost:3000`ni o'z
  > ichiga olishi shart (vergul bilan bir nechta origin yozish mumkin).
  > Mos kelmasa **hamma** so'rov bloklanadi.
  Har qanday so'rov 401 qaytarsa, `request()` avtomatik `POST /auth/refresh` chaqirib
  tokenni yangilaydi va so'rovni bir marta qayta yuboradi — controllerlar buni
  bilishi shart emas, shaffof ishlaydi.
- **Auth token:** `tokenStore` (localStorage `ishbor_token` + `ishbor_refresh_token`,
  `get`/`set`/`getRefresh`/`setRefresh`/`clear`). Chiqish `SiteNav.tsx`dagi
  far-right avatar-dropdown (`UserMenu`, Profil + Chiqish) orqali — "Chiqish"
  bosilganda `LogoutDialog` ochiladi ("Barcha qurilmalardan chiqish" checkbox
  bilan): belgilansa `api.logoutAllDevices()` (har bir refresh tokenni bekor
  qiladi), aks holda oddiy `api.logout()` (faqat shu qurilma). To'g'ridan-to'g'ri
  `tokenStore.clear()` ishlatma — refresh token DB'da qolib ketadi.
- **i18n:** har matn **uz/ru/en** `messages/*.json` ga qo'shiladi; komponentda `useTranslations('namespace')`, sana uchun `useFormatter`.
- **Navigatsiya:** `@/i18n/navigation` dan `Link`, `useRouter`, `usePathname` (lokalizatsiyalangan).
- **Uslub:** Tailwind + `cn()` (`lib/utils`). shadcn `components/ui/*` — asosiy primitivlar.
- **'use client':** ma'lumot yuklaydigan/interaktiv sahifalar klient komponent.
- **Path alias:** `@/` → `frontend/src/`.

## Asosiy komponentlar

- `JobCard.tsx` — bosiladigan e'lon kartasi → `JobDetailDialog` ochadi.
- `JobDetailDialog.tsx` — to'liq detal modal (reyting, tavsif, bog'lanish).
- `rating.tsx` — `RatingStars` (test %idan yulduz) + `Avatar` (ismdan gradient;
  ixtiyoriy `src` bilan rasm — yuklanmasa yoki havola buzilgan bo'lsa
  avtomatik initsiallarga qaytadi; `size="xl"` profil sahifasi uchun).
- `components/profile/*` — frilanser profili bo'limlari: `ProfileHeader`,
  `AboutSection`, `SocialLinksSection`, `PortfolioSection` (grid + qo'shish/
  tahrirlash/o'chirish dialoglari), `ProfileSidebar`, `ReviewsSection`,
  `EditProfileDialog`, `social-icons.tsx`.
  - **`social-icons.tsx`:** lucide-react v1 brend ikonkalarini olib tashlagan,
    shuning uchun Telegram/Instagram/LinkedIn/GitHub/Behance/Dribbble
    glifları shu faylda inline SVG (24×24, `currentColor`). Brend rangi
    faqat **hover**da qo'llanadi (`--social` CSS o'zgaruvchisi orqali) —
    tinch holatda sayt palitrasi buzilmasin deb.
  - **`ImageDropzone.tsx`** — avatar, muqova va portfolio rasmi uchun bitta
    qayta ishlatiladigan komponent. To'rt xil qo'yish usuli: **faylni
    tashlash (drag & drop)**, bosib **kompyuterdan tanlash**, fokusdaligida
    **clipboard'dan qo'yish (Ctrl+V)**, yoki ochiladigan "Yoki havola (URL)
    qo'ying" maydoni. Fayl darhol `POST /uploads/image`ga yuboriladi va
    forma faqat **satr** bilan ishlaydi — qo'lda qo'yilgan URL bilan bir xil
    shakl. `''` — "tozalash".
  - **`lib/images.ts#resolveImageUrl`** — bazada rasm origin'siz
    (`/uploads/…`) saqlanadi, shuning uchun **har bir `<img src>`** shu
    yordamchi orqali o'tishi kerak (`Avatar`, `ProfileHeader` muqovasi,
    `PortfolioCard`, `ImageDropzone` preview'i). Tashqi `https://…`
    havolalar o'zgarishsiz o'tadi. Yangi joyda rasm ko'rsatsangiz — buni
    unutmang, aks holda yuklangan rasm 404 bo'ladi.
  - **Rasmlar `next/image` emas, oddiy `<img>`:** avatar/muqova/portfolio
    havolalari foydalanuvchidan keladi (tashqi host ham bo'lishi mumkin),
    `next/image` esa har bir mumkin bo'lgan hostni `next.config`da oldindan
    ro'yxatga olishni talab qiladi. Har bir `<img>`da `onError` fallback bor.
  - **`lib/api.ts` multipart:** `request()` `body instanceof FormData`
    bo'lsa `Content-Type`ni **o'rnatmaydi** — brauzer uni boundary bilan
    o'zi qo'yishi shart. `api.uploadImage(file)` shuni ishlatadi.
  - **Sana formati raqamli** (`month: '2-digit'`), oy nomi emas:
    Chrome'da **o'zbek oy nomlari yo'q** — `month: 'long'` sayt standart
    lokalida "2026 M07" bo'lib chiqadi. (Bu Chrome ICU chegarasi, butun
    saytga tegishli: `format.relativeTime` ham uz'da "-2 d" beradi.)
- `badges.tsx` — `LevelBadge`, `StackBadge`, `VerifiedBadge` (7 qiymatli `VerificationLevel`:
  none/junior/strong-junior/middle/strong-middle/senior/strong-senior — `types/domain.ts`).
  `lib/utils.ts#displayTier(verificationLevels, primaryDirection)` — bitta "headline"
  belgi kerak bo'lgan joyda (`SiteNav` UserMenu, admin/users jadvali): `primaryDirection`
  tanlangan bo'lsa o'sha yo'nalish darajasi, aks holda barcha yo'nalishlar orasidan eng
  yuqorisi. `JobCard`/`JobDetailDialog`dagi `rating.verificationLevel` esa backend
  tomonidan **o'sha e'lonning `stack`iga mos** darajaga oldindan hisoblab beriladi
  (`jobController` — bu yerda frontendda qayta hisoblash shart emas).
- `QuestionCard`, `Timer`, `ResultCard`, `AntiCheatBanner`, `ViolationDialog` — test oqimi.
  `test/page.tsx` anti-cheat'ni ulaydi (`useAntiCheat` REST) va `proctor` namespace'dan
  matn oladi; savol matni/variantlari backend'dan lokalizatsiyalangan holda keladi
  (`api.startTest` `locale` yuboradi). Modal ochilganda savol taymeri pauza qilinadi.
- `lib/hidden.ts` — yashirilgan e'lonlar (localStorage `ishbor_hidden`, `favorites.ts`
  bilan bir xil `useSyncExternalStore` shabloni).
- `login/page.tsx` — parolni ko'rsatish (ko'z), `confirmPassword`, `noValidate` + maydon
  ostidagi lokalizatsiyalangan xatolar (`auth.err*`). `jobs/new` — maosh diapazoni va
  maydon validatsiyasi (`post.err*`).
- `components/form-field.tsx` — `login/page.tsx` va `profile/page.tsx` bo'lishadigan
  `Field`, `PasswordField` (ko'z ikonkasi bilan), `inputCls`, `isPasswordStrongEnough`
  (`backend/src/validation/userSchemas.ts`dagi `passwordPolicy`ni oynalaydi), `EMAIL_RE`.
- `components/region-select.tsx` + `lib/regions.ts` — joylashuv tanlagich: 12 viloyat +
  Qoraqalpog'iston Respublikasi + Toshkent shahri (`regions` namespace, `t(slug)`),
  pastda "Boshqa" tanlansa erkin matn inputi chiqadi. `value`/`onChange` hali ham oddiy
  `string` (backend `Job.location` erkin matn maydonicha qoladi — bu faqat UI yordamchisi,
  enum emas). `jobs/new/page.tsx` (e'lon joylashuvi) va asosiy `page.tsx` (sidebar
  joylashuv filtri) da ishlatiladi.
- **Responsive:** breakpointlar bir bosqichga siljitilgan (`sm→md`, `md→lg`, `lg→xl`) —
  mobil uslub kengroq ekranlargacha ushlab turadi. `SiteNav` hamburger va
  e'lonlar sahifasi (`page.tsx`) "Filtrlar" tugmasi ikkalasi ham mobil'da
  **to'liq ekranli** (full width+height) overlay/sidebar ochadi — chapdan
  slayd bilan (`animate-in fade-in slide-in-from-left`), yopilganda ham
  silliq (`animate-out fade-out slide-out-to-left`, `duration-300`).
  Ochish/yopish animatsiyasi `hooks/useAnimatedOverlay.ts` orqali — overlay
  yopilgandan keyin ham `duration-300` davomida DOM'da qoladi, shu payt
  chiqish animatsiyasi o'ynaydi. `JobCard` 320px gacha: sarlavha/kompaniya
  nomi `truncate` emas `break-words` (wrap), footer qatori `flex-wrap`.
  Mobil-xavfsiz `ui/dialog` (`w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]`),
  formalar `sm:`(→`md:`) da ustunli.
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

`api.me().isQaTester` bo'lsa (faqat `qa@ishbor.uz` — backend: `User.isQaTester`,
batafsil `backend/CLAUDE.md`), faol test paytida "QA: Avtomatik tugatish (5/5)"
tugmasi chiqadi — `api.autoCompleteTest(sessionId)` sessiyani darhol to'g'ri
javoblar bilan yakunlaydi, natija oddiy `submitTest` bilan bir xil `ResultCard`
oqimidan o'tadi. Anti-cheat/lokalizatsiyani cooldownsiz, testni istalgan payt
qayta boshlab tez-tez sinash uchun.

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

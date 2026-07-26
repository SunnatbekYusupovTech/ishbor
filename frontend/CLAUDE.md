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
aniqlanmagan; shu sabab qaytarilgan). Admin panelda chrome yo'qligi endi
**`components/SiteChrome.tsx`** (client komponent) orqali — `usePathname()`
`/admin` bilan boshlansa yalang'och `<main>` qaytaradi, aks holda pastdagi
3-ustunli dashboard qobig'i. `layout.tsx` (ildiz) shu `SiteChrome`ni
`{children}` atrofida o'raydi — boshqa hech qanday layout fayli yo'q.

### Dashboard qobig'i (3-ustunli, `components/dashboard/`)

Eski bitta gorizontal `SiteNav` (nav linklar + avatar-dropdown bitta headerda)
**3-ustunli dashboard** ko'rinishiga almashtirildi — chap doimiy nav-sidebar,
yupqa header, o'ng widget-panel; markaziy sahifalar (jobs/profil) o'z
logikasi/state/API chaqiruvlarini **to'liq saqlab qoladi**, faqat joylashuvi
o'zgaradi. Admin qamrovga kirmaydi (yuqoriga qarang).

- **`TopHeader.tsx`** — yupqa, sticky: mobil hamburger, logo, global qidiruv
  input (`Enter` → `/?q=<so'z>`ga o'tadi; `page.tsx` buni `saved=1` bilan bir
  xil naqshda o'qib `query` state'ni to'ldiradi), `NotificationsBell` (bo'sh
  holat popover'i, backend'siz — eski SiteNav'dan ko'chirilgan), avatar (endi
  dropdown emas — to'g'ridan-to'g'ri `/u/<handle>`ga link, chunki to'liq menyu
  sidebar'da).
- **`LeftSidebar.tsx`** — `lg:` va undan yuqorida doimiy/sticky ustun (`lg:w-64`),
  undan past — header hamburgeri bilan ochiladigan fullscreen off-canvas
  (`useAnimatedOverlay`, eski mobil-menyu naqshi). Ichki `SidebarNavContent`
  ikkalasida ham qayta ishlatiladi: asosiy nav (Jobs/Leaderboard/Post a job/
  Admin), Saqlanganlar qatori (eski header yuragi o'rniga), **sahifa
  yuboradigan slot-kontent** (pastga qarang — jobs sahifasining filtrlari),
  profil-menyu qatorlari (My stacks/My projects/My reviews/Account settings —
  `/u/<handle>#anchor`), til/tema tugmalari, Chiqish (`LogoutDialog` shu yerda).
- **`RightSidebar.tsx`** — faqat `SiteChrome`da `pathname === '/' ||
  pathname.startsWith('/u/')` bo'lganda va faqat tizimga kirgan holda
  (`xl:` va undan yuqorida, `xl:w-72`): verifikatsiya xulosasi + "Testni
  topshirish" CTA, saqlangan e'lonlar mini-ro'yxati (`useFavorites()` faqat
  ID beradi — mavjud `api.getJobs()`ni qayta chaqirib ID bo'yicha filtrlaydi,
  sarlavhalar bilan), tezkor havolalar.
- **`SidebarSlotContext.tsx`** — `SidebarSlotProvider` + `useSidebarSlot()`.
  `LeftSidebar` layout darajasida (page'lardan tashqarida) yashagani uchun,
  jobs sahifasi o'z filter-JSX'ini shu context orqali "push" qiladi
  (`useEffect`, unmount'da `null`) — **hech qanday state/hook page'dan
  chiqmaydi**, faqat render joyi o'zgaradi. Hozircha faqat `page.tsx`
  ishlatadi; yangi sahifa o'z sidebar-vidjetini xohlasa shu naqshni
  qaytarsin (route-group emas — mavjud pathname-check konvensiyasiga mos).
- **`hooks/useCurrentUser.ts`** — `api.me()` + `ishbor:me-updated` tinglovchi
  bitta joyda (`SiteChrome`), natija `TopHeader`/`LeftSidebar`/`RightSidebar`ga
  prop sifatida uzatiladi — har biri alohida so'rov yubormasin deb.

- `page.tsx` — **e'lonlar sahifasi** (asosiy): rol segmenti, qidiruv, card grid
  (filtrlar/saqlangan-qidiruvlar endi yuqoridagi `SidebarSlotContext` orqali
  `LeftSidebar`da ko'rinadi — sahifaning o'zi bitta ustun).
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
- `profile/page.tsx` — **endi faqat redirect**: tizimga kirmagan bo'lsa
  `/login?next=/profile`ga, kirgan bo'lsa `api.me()` orqali o'z
  `/u/<username-yoki-id>`iga `router.replace` qiladi. Yagona profil sahifasi
  endi `u/[handle]/page.tsx` — eski bookmark/havolalar shu orqali ishlayveradi.
- `u/[handle]/page.tsx` — **yagona profil sahifasi** (`/u/<username>`, yoki
  username tanlamagan eski akkauntlar uchun `/u/<id>` — backend ikkalasini
  ham hal qiladi). Ilgari alohida bo'lgan "shaxsiy" (`/profile`) va "ommaviy"
  (`/u/[handle]`) sahifalar shu bittasiga birlashtirildi — stacklar, portfolio,
  sharhlar va hisob sozlamalari bittasida, hammaga ko'rinadigan qilib (egalikka
  bog'liq bo'limlar bundan mustasno). Tizimga kirmasdan ham ochiladi; javobdagi
  `isOwner` qo'shish/tahrirlash/o'chirish tugmalarini yoqadi (serverda ham
  egalik qayta tekshiriladi — batafsil `backend/CLAUDE.md` → "Frilanser profili").
  Tuzilishi (yuqoridan pastga, har bo'lim `scroll-mt-24` bilan anchor-navigatsiya
  uchun `id` olib yuradi):
  1. `ProfileHeader` (muqova + avatar + ism/@username + onlayn nuqta +
     mutaxassislik + ko'nikma teglari).
  2. `components/profile/StacksSection.tsx` (`id="stacks"`) — 4 yo'nalish uchun
     `DirectionProgress` progress-barlar (hammaga ko'rinadi, `GET /users/profile/:handle`
     javobidagi `verificationLevels`dan — ommaviy javobda allaqachon bor edi),
     **egasiga** esa qo'shimcha `primaryDirection` tanlagich (4 tugma, `api.updateMe`
     bilan optimistik saqlanadi) + eng yaxshi natija/urinishlar + "Testni
     topshirish" tugmasi.
  3. Ikki ustun `lg:grid-cols-[minmax(0,1fr)_300px]` — chapda `AboutSection` +
     `SocialLinksSection` + `PortfolioSection` (`id="portfolio"`), o'ngda sticky
     `ProfileSidebar`.
  4. `ReviewsSection` (`id="reviews"`, to'liq kenglikda).
  5. `components/profile/AccountSection.tsx` (`id="account"`, **faqat
     `profile.isOwner`**) — ism/email/parol (eski `EditProfileCard` mantig'i,
     `api.updateMe`) + `isQaTester` banneri + `DangerZoneCard` (akkountni
     o'chirish, `api.deleteMe`). Bu bo'lim uchun kerak `email`/`isQaTester`
     (ommaviy javobda yo'q) — sahifa `isOwner===true` bo'lganda bitta qo'shimcha
     `api.me()` chaqiradi.
  `EditProfileDialog` (ommaviy maydonlar — username/specialization/skills/about/
  avatar/cover/country/language/timezone/socials) o'zgarishsiz qoladi, hammasi
  bitta `PATCH /auth/me`da saqlanadi. Username o'zgarsa sahifa yangi handle'ga
  `router.replace` qiladi (aks holda URL ishlamay qolardi).
  **`LeftSidebar`dagi profil-menyu qatorlari** (My stacks/My projects/My
  reviews/Account settings) bitta "Profile" link o'rniga to'rtta anchor-link:
  `#stacks`, `#portfolio`, `#reviews`, `#account` — barchasi bir xil
  `/u/<handle>`ga, faqat boshqa anchor bilan (Next.js `Link` bir xil route'da
  hash bilan navigatsiya qilganda avtomatik scroll qiladi, qo'shimcha JS
  shart emas).
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
  bilishi shart emas, shaffof ishlaydi. Har bir `fetch` `credentials: 'include'`
  bilan yuboriladi (frontend :3000 / backend :5000 turli origin bo'lgani uchun
  shart) — buni olib tashlama, aks holda brauzer cookie'larni umuman
  jo'natmaydi/qabul qilmaydi.
- **Auth token — endi httpOnly cookie'da, localStorage'da EMAS:** haqiqiy
  access/refresh tokenlarni backend `Set-Cookie` (`HttpOnly`+`Secure`(prod)+
  `SameSite`) orqali o'rnatadi/tozalaydi — frontend kodi ularni **hech qachon
  o'qimaydi/yozmaydi**, shunchaki `credentials: 'include'` bilan so'rov
  yuboradi, brauzer qolganini o'zi qiladi (batafsil: `backend/CLAUDE.md` →
  "Auth tokenlar — httpOnly cookie'da"). `lib/api.ts`dagi `tokenStore` shu
  sabab **haqiqiy token emas** — faqat `js-cookie` bilan yozilgan, httpOnly
  BO'LMAGAN kichik `ishbor_authed` belgi-cookie atrofidagi yordamchi
  (`get(): boolean` — "oxirgi urinish muvaffaqiyatli edi"), sinxron UI
  tekshiruvlari uchun (masalan sahifa `useEffect`da darhol `/login`ga
  yo'naltirish, `api.me()` javobini kutmasdan). Haqiqiy avtorizatsiya har doim
  serverda, httpOnly cookie orqali tekshiriladi — bu belgi buzilsa/qo'lda
  o'zgartirilsa ham hech narsani ochmaydi. `tokenStore.markAuthed()` —
  `api.login`/`api.register`/muvaffaqiyatli refresh ichida avtomatik
  chaqiriladi (alohida chaqirish shart emas); `tokenStore.clear()` —
  `api.logout`/`logoutAllDevices` ichida. Socket.io ham xuddi shunday:
  `lib/socket.ts#createAntiCheatSocket(sessionId)` endi token qabul qilmaydi
  — `withCredentials: true` orqali cookie avtomatik boradi.
  Chiqish `components/dashboard/LeftSidebar.tsx`dagi pastki "Chiqish" qatori
  orqali — bosilganda `LogoutDialog` ochiladi ("Barcha qurilmalardan chiqish"
  checkbox bilan): belgilansa `api.logoutAllDevices()` (har bir refresh
  tokenni bekor qiladi + cookie'larni tozalaydi), aks holda oddiy
  `api.logout()` (faqat shu qurilma). To'g'ridan-to'g'ri `tokenStore.clear()`
  ishlatma (haqiqiy sessiyani yopmaydi, faqat mahalliy belgini) — server
  tomonidagi haqiqiy revoke uchun doim `api.logout()`/`logoutAllDevices()`ni
  chaqir.
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
  belgi kerak bo'lgan joyda (`LeftSidebar` identity kartochkasi, admin/users jadvali): `primaryDirection`
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
  mobil uslub kengroq ekranlargacha ushlab turadi. `TopHeader` hamburgeri
  bosilganda `LeftSidebar` (nav + jobs-sahifa filtrlari birga, yuqoridagi
  "Dashboard qobig'i"ga qarang) mobil'da **to'liq ekranli** (full width+height)
  off-canvas ochadi — chapdan slayd bilan (`animate-in fade-in
  slide-in-from-left`), yopilganda ham silliq (`animate-out fade-out
  slide-out-to-left`, `duration-300`).
  Ochish/yopish animatsiyasi `hooks/useAnimatedOverlay.ts` orqali — overlay
  yopilgandan keyin ham `duration-300` davomida DOM'da qoladi, shu payt
  chiqish animatsiyasi o'ynaydi. `JobCard` 320px gacha: sarlavha/kompaniya
  nomi `truncate` emas `break-words` (wrap), footer qatori `flex-wrap`.
  Mobil-xavfsiz `ui/dialog` (`w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]`),
  formalar `sm:`(→`md:`) da ustunli.
- `language-selector.tsx` — premium til tanlagich (bayroq + kod, animatsion dropdown,
  klaviatura bilan boshqarish, `lib/locale-preference.ts` orqali localStorage'da saqlash).
  Bayroqlar `flags.tsx` (SVG — emoji bayroqlar Windows'da harf ko'rinadi). `LeftSidebar`da ishlatiladi.

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
- **Layout (e'lonlar sahifasi):** yuqorida keng qidiruv + rol segmenti; filtrlar/
  Faoliyatingiz/Saqlangan qidiruvlar/malaka-promo/mehmon-kirish endi sahifaning
  o'zida emas — `SidebarSlotContext` orqali global `LeftSidebar`da ko'rinadi
  (yuqoridagi "Dashboard qobig'i"ga qarang). Markaziy ustun **bitta ustunli**
  keng karta lentasi.
- **Header (`TopHeader`) + `LeftSidebar` + `RightSidebar`:** qizil `ish` logo
  mark + wordmark header'da, global qidiruv, o'ngda bildirishnoma qo'ng'irog'i
  (empty-state popover) + avatar (link). Nav linklar, saqlanganlar, profil-menyu,
  locale/theme, Kirish/Chiqish — `LeftSidebar`da. O'ng widget-panel faqat
  `/` va `/u/*`da (`RightSidebar`).
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
  `admin/*` (dashboard, users, jobs, sessions, questions), `LeftSidebar` (admin link).
- **Sardor** — `hooks/*` (anti-cheat), `lib/socket.ts`, `AntiCheatBanner`, `ViolationDialog`, login.

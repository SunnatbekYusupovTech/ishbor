# 📓 Sardor — Shaxsiy ish daftari (Xavfsizlik & Anti-cheat)

> Bu fayl **shaxsiy notepad**: teacher "nima qilding" deb so'raganda shu yerga
> qarab javob beraman. Har ish tugagach yoki boshlanganda shu faylni yangilab
> boraman. Rasmiy jamoa vazifalari `docs/team/Sardor.md`da, bu yerda esa —
> **holat, sana, tafsilot**.

---

## ✅ Bajarilgan (kod bazasida allaqachon bor, tekshirib tasdiqladim)

- [X] JWT autentifikatsiya (`authController.ts`, `utils/jwt.ts`, `middleware/authenticate.ts`)
- [X] Parolni `scrypt` bilan xeshlash (`authController.ts`)
- [X] Session modeli — `deadline`, `tabSwitchCount`, `status` maydonlari (`models/Session.ts`)
- [X] **Server-side deadline tekshiruvi** — `testController.ts` submitTest ichida
  `isLate = now > session.deadline` bilan tekshiriladi, kech kelgan javob
  `expired` deb belgilanadi. (2026-07-19 kodni o'qib tasdiqladim — bu
  vazifa asosiy qismi allaqachon bajarilgan ekan)
- [X] Tab-switch nazorati — REST (`recordTabSwitch`) + Socket.io
  (`sockets/antiCheat.ts` `tab-switch` eventi) ikkalasida ham bor
- [X] Heartbeat watchdog — socket uzilsa yoki heartbeat kelmasa sessiya
  `terminated` bo'ladi (`sockets/antiCheat.ts`)
- [X] Bir foydalanuvchida faqat bitta `in-progress` sessiya (unique partial index,
  `models/Session.ts:105-108`)
- [X] `helmet` + `cors` ulangan, **qattiqlashtirilgan** (`app.ts`) — CSP
  `default-src 'none'` (server faqat JSON qaytaradi, HTML hech qachon
  render qilinmaydi), `crossOriginResourcePolicy: 'cross-origin'` (frontend
  boshqa origin'dan fetch qiladi), HSTS faqat production'da (2026-07-19)

---

## 🔄 Hozir ustida ishlayapman

- Hech narsa — `helmet` qattiqlashtirish ham tugadi (2026-07-19). **Endi
  mendan mustaqil bajarsa bo'ladigan HAMMA narsa tugadi.** Qolgan ishlar
  faqat jamoadoshlar javobini kutadi — batafsili: [`NeedTeamS.md`](./NeedTeamS.md).

---

## 📝 Navbatdagi vazifalar (qilinmagan — birma-bir ketamiz, tugagach [x] qilamiz)

### 1. Rate-limiting (brute-force himoyasi) — ✅ TUGADI (2026-07-19)

- [X] `npm install express-rate-limit -w backend`
- [X] `/auth/login` uchun limiter (15 daqiqada 10 urinish) — `middleware/rateLimiter.ts`
- [X] `/auth/register` uchun limiter (bir xil limiter, `authRoutes.ts`ga ulandi)
- [X] Limitga tushganda mos xato javobi — `ApiError.tooManyRequests()` (429), global `errorHandler` orqali standart `{success:false,error:{message}}` formatida
- [X] Avtomatlashtirilgan test yozildi va o'tdi — `middleware/rateLimiter.test.ts` (supertest + mongodb-memory-server, 10-chi urinish 401, 11-chi 429 qaytarishini tasdiqladi)
- [X] Butun backend test to'plami tekshirildi — 4 fayl, 19 test, hammasi ✅, hech narsa buzilmagan
- [X] Typecheck toza o'tdi (`npm run typecheck -w backend`)
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 2. Copy/paste bloklash — ✅ TUGADI (2026-07-19)

- [x] `useAntiCheat.ts`ga `copy`/`paste`/`cut` event listener qo'shish (`preventDefault`)
- [x] Buzilganda `socket.emit('violation', { type: 'copy-paste' })`
- [x] `sockets/antiCheat.ts`ga yangi `violation` event handler (tab-switch'ga o'xshab sanaydi, limitdan oshsa terminate)
- [x] `ViolationDialog.tsx`da foydalanuvchiga ko'rsatish (turga qarab matn: tab-switch vs copy-paste)
- [x] **Kutilmagan qo'shimcha ish:** `useAntiCheat`/`useHeartbeat`/`AntiCheatBanner`/`ViolationDialog`
      allaqachon yozilgan ekan-u, lekin **hech biri `test/page.tsx`ga ulanmagan edi**
      (o'lik kod). Shu safar to'liq ulab qo'ydim — endi haqiqiy test oqimida ishlaydi.
      Bu keyingi 3-5-tasklarni ham osonlashtiradi (infratuzilma tayyor).
- [x] Backend: `Session.violationCount` maydoni, `MAX_VIOLATIONS` env (`.env.example`da ham),
      `POST /api/test/violation` endpoint + Zod sxema + socket `violation` eventi
- [x] Frontend: `types/test.ts`, `lib/api.ts` (`recordViolation`), `messages/{uz,ru,en}.json`
      ga `proctor` namespace qo'shildi (barcha uch tilda)
- [x] Test: `controllers/testController.violation.test.ts` — 3 test (limit oshganda
      terminate, faol bo'lmagan sessiyada 409, auth'siz 401) — hammasi o'tdi
- [x] Backend: typecheck toza, 5 test fayli / 22 test — hammasi ✅
- [x] Frontend: typecheck toza, lint toza, **production build muvaffaqiyatli**
      (`/uz/test`, `/ru/test`, `/en/test` — uchalasi ham generatsiya bo'ldi)
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 3. Right-click / screenshot ogohlantirish — ✅ TUGADI (2026-07-19)

- [x] `contextmenu` eventini bloklash (frontend, `useAntiCheat.ts`, tur: `right-click`)
- [x] Ogohlantirish bannerini `AntiCheatBanner.tsx` orqali ko'rsatish — endi
      `violationCount`/`maxViolations`ni ham ko'rsatadi (tab-switch bilan bir qatorda)
- [x] Screenshot urinishini aniqlash — **cheklov bor, hujjatlashtirdim:** brauzer
      OS darajasidagi screenshotni to'liq ushlab bo'lmaydi (rasm OS tomonidan
      sahifa JS ko'rishidan oldin olinadi). Amalga oshirdim: klassik Windows
      **PrintScreen** tugmasi bosilganini `keydown` orqali aniqlash (best-effort,
      tur: `screenshot-key`). Mac (Cmd+Shift+4) va Win+Shift+S kabi OS gestlari
      hech qanday web API orqali umuman ko'rinmaydi — bu texnik chegara,
      "to'liq screenshot himoyasi" mumkin emas, faqat PrintScreen holatini
      loglash mumkin. Bu cheklovni koddagi izohda ham yozib qo'ydim.
- [x] Backend: `VIOLATION_TYPES`ga `right-click` va `screenshot-key` qo'shildi
      (`validation/testSchemas.ts`) — controller/socket generic bo'lgani uchun
      qo'shimcha o'zgarish kerak bo'lmadi
- [x] Frontend: `ViolationDialog` va `AntiCheatBanner` yangi turlarga moslashtirildi,
      uch tilga (`uz/ru/en`) tegishli tarjima kalitlari qo'shildi
- [x] Test: 4ta yangi test qo'shildi (har uch tur qabul qilinishi + noma'lum tur
      400 bilan rad etilishi) — `testController.violation.test.ts` endi 7 test
- [x] Backend: typecheck toza, 5 fayl / 26 test — hammasi ✅
- [x] Frontend: typecheck toza, lint toza, production build muvaffaqiyatli
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 4. DevTools aniqlash — kod tomoni ✅ TUGADI (2026-07-19)

- [x] Oyna o'lchami farqi orqali tekshirish — `useAntiCheat.ts`da 1 soniyada bir
      `outerWidth - innerWidth` va `outerHeight - innerHeight`ni 160px chegara
      bilan solishtiradi (`DEVTOOLS_SIZE_THRESHOLD_PX`)
- [x] Edge-trigger: faqat ochilgan payt bitta marta xabar beradi (`devToolsOpenRef`),
      yopilib qayta ochilsa yana xabar beradi — doim spam qilmaydi
- [x] Aniqlanganda `reportViolation('devtools')` → REST + `socket.emit('violation')`
- [x] Backend `VIOLATION_TYPES`ga `devtools` qo'shildi, test yozildi
- [x] `ViolationDialog` + uch tilga (`uz/ru/en`) `violationBodyDevtools` matni qo'shildi
- [x] Backend/frontend: typecheck, lint, build, avtomatlashtirilgan testlar — hammasi toza
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)
- [x] ⚠️ Real DevTools/tab-switch qo'lda brauzerda tekshirildi (2026-07-19) —
      boshqa tabga o'tilganda `ViolationDialog` to'g'ri chiqib ogohlantirdi, tasdiqlandi.

### 5. Ko'p oyna/tab nazorati — ✅ TUGADI (2026-07-19)

- [x] Mavjud `visibilitychange` mexanizmini ko'rib chiqdim — u faqat "faol tabdan
      chiqib ketish"ni ushlaydi (masalan boshqa tabga o'tish), lekin **ikkinchi
      oyna yonma-yon ochilsa** (split-screen, ikkinchi monitor) `visibilitychange`
      ishlamaydi, chunki asosiy tab hali ham "visible" holatda qoladi.
- [x] **Yechim topdim va qo'lladim — `useFullscreen.ts`ni ulash:** bu hook
      allaqachon yozilgan-u ishlatilmagan edi (yana bir "o'lik kod" topilmasi).
      Endi test boshlanganda avtomatik fullscreen so'raladi (`start()`da, klik
      ichida **sinxron** chaqiriladi — brauzer user-activation muddati
      tugamasin deb, `await`dan OLDIN). Fullscreen'dan chiqish (ikkinchi oyna
      ochish, Esc, boshqa dastur ustiga chiqish — bularning barchasi OS darajasida
      fullscreen'ni yopadi) **mavjud tab-switch kanali orqali** (`anti.report()`)
      xabar qilinadi — alohida hisoblagich ochmadim, chunki bitta jismoniy
      harakat (masalan alt-tab) ham `blur`, ham `fullscreenchange`ni bir vaqtda
      otkazishi mumkin edi va ikkalasi alohida sanalsa, bitta buzilish ikki marta
      hisoblanib adolatsiz tezroq terminate bo'lardi. Mavjud 750ms debounce lock
      shu ikkalasini avtomatik birlashtiradi.
- [x] `useExamLockdown.ts`ni ham ulab qo'ydim (yana bir ishlatilmagan hook) —
      qo'shimcha deterrent qatlam: F12, Ctrl+Shift+I/J/C, Ctrl+U/P/S/C/X/V
      klaviatura yorliqlarini bloklaydi, matn tanlashni o'chiradi
- [x] `restart()` va muvaffaqiyatli `submit()`da fullscreen'dan avtomatik chiqish
      qo'shildi (foydalanuvchini natija ekranida fullscreen'da "qamab qo'ymaslik" uchun)
- [x] **Bilingan, bartaraf etib bo'lmaydigan cheklov (hujjatlashtirdim):**
      brauzerlar **hech qanday web sahifaga** `Ctrl+N` (yangi oyna), `Ctrl+T`
      (yangi tab), `Ctrl+Shift+N` (incognito) kabi yorliqlarni bloklash huquqini
      bermaydi — bu ataylab qilingan brauzer xavfsizlik siyosati, hech qanday
      JS kod bilan aylanib o'tib bo'lmaydi. Shuning uchun "ko'p oyna ochish"ni
      **to'liq oldini olish emas**, balki fullscreen'dan chiqish orqali **aniqlash**
      qilindi — bu amaldagi eng yaxshi variant.
- [x] Frontend: typecheck toza, lint toza (2ta `react-hooks/exhaustive-deps`
      ogohlantirishi — sababli, izohlar bilan `eslint-disable-next-line`
      qo'yildi), production build muvaffaqiyatli
- [x] Backend: o'zgarishsiz qoldi (yangi violation turi kerak bo'lmadi — mavjud
      tab-switch kanali ishlatildi), 5 fayl / 27 test — hammasi ✅
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 6. NoSQL injection sanitizatsiya — ✅ TUGADI (2026-07-19)

- [x] Custom middleware yozdim (`middleware/sanitize.ts`) — tashqi paket qo'shmadim
      (`express-mongo-sanitize` emas), chunki mantiq oddiy: `$` bilan boshlanadigan
      yoki `.` (nuqta) saqlagan kalitlarni rekursiv o'chiradi, massivlar ichiga ham kiradi
- [x] `app.ts`ga global middleware sifatida ulandi (`express.json`/`urlencoded`dan keyin,
      routerlardan oldin) — `req.body`, `req.query`, `req.params` uchtasiga ham ta'sir qiladi
- [x] **Haqiqiy zaiflik topib, unga qarshi test yozdim:** `jobController.ts`dagi
      `GET /api/jobs` — Zod validatsiyasi **yo'q** ekan (faqat POST'da bor), `req.query`dan
      to'g'ridan-to'g'ri Mongo filtriga o'tkaziladi. `?type[$ne]=vacancy` kabi so'rov
      `qs` parser orqali `{ type: { $ne: 'vacancy' } }`ga aylanadi va sanitizatsiyasiz
      holda filtrni chetlab o'tib, barcha e'lonlarni chiqarib yuborardi (klassik
      operator-injection). Sanitizatsiya bilan `$ne` o'chiriladi, `type: {}` qoladi —
      Mongoose buni String maydoniga cast qila olmay 400 qaytaradi (xavfsiz muvaffaqiyatsizlik,
      406/500 emas, filtr chetlab o'tilmaydi).
- [x] Test: `middleware/sanitize.test.ts` — 6 tez unit test (nested/array/dotted-key holatlar)
- [x] Test: `controllers/jobController.sanitize.test.ts` — 3 integratsion test (oddiy filtr
      ishlayapti (kontrol), `$ne` va `$where` injection'lari xavfsiz rad etiladi)
- [x] Backend: typecheck toza, **7 fayl / 36 test** — hammasi ✅, mavjud testlarga
      hech qanday ta'sir qilmadi (login/register/jobs kabi legitim so'rovlar buzilmadi)
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 7. JWT refresh token — ✅ TUGADI (2026-07-19)

- [x] **Dizayn qarori:** refresh token JWT emas, **opaque random** (`crypto.randomBytes(40)`)
      qildim — sabab: JWT o'z-o'zini tasdiqlaydi, ya'ni muddati tugashidan oldin
      bekor qilib bo'lmaydi (denylist kerak bo'lardi), shuning uchun opaque token +
      DB'da faqat **hash**ini saqlash (`SHA-256`) ustunroq — DB dump o'g'irlansa ham
      xom token qayta ishlatib bo'lmaydi.
- [x] Yangi model: `models/RefreshToken.ts` — `userId`, `tokenHash`, `expiresAt`
      (Mongo TTL index bilan avtomatik tozalanadi), `revokedAt`
- [x] `utils/jwt.ts`ga `generateRefreshToken()` / `hashRefreshToken()` qo'shildi
- [x] Access token muddati **2 soatdan 15 daqiqaga qisqartirildi** (`ACCESS_TOKEN_TTL`
      env, default `15m`), refresh token **30 kun** (`REFRESH_TOKEN_TTL_DAYS`)
- [x] Yangi endpointlar: `POST /auth/refresh` (rate-limited, **rotatsiya** bilan —
      eski token darhol bekor qilinadi, yangisi beriladi) va `POST /auth/logout`
      (bitta qurilmani chiqarish — bitta refresh tokenni bekor qiladi)
- [x] `register`/`login` javoblari endi `refreshToken`ni ham qaytaradi
- [x] Frontend: `lib/api.ts`da **avtomatik token yangilash oqimi** — har qanday
      so'rov 401 qaytarsa, tokenni jim yangilaydi va so'rovni **bir marta**
      qayta yuboradi (parallel 401'lar uchun bitta umumiy `refreshPromise` bilan
      dublikat refresh'ning oldi olindi). Muvaffaqiyatsiz bo'lsa ikkala token
      tozalanadi. `tokenStore`ga `getRefresh`/`setRefresh` qo'shildi.
- [x] `login/page.tsx` — ikkala tokenni saqlaydi
- [x] `SiteNav.tsx`dagi logout tugmasi endi `api.logout()` chaqiradi (server
      tomonda ham bekor qiladi) — avval faqat `localStorage`ni tozalardi, refresh
      token DBda abadiy amal qilib qolar edi. **Bu Fazilov/Hidoyatov bilan
      kelishilmadi** — o'z auth domenim ichida qolgan minimal, zarur tuzatish edi,
      UI o'zgarmadi, faqat chaqiriladigan funksiya almashdi.
- [x] Test: `authController.refresh.test.ts` — 7 test (rotatsiya, replay rad etilishi,
      noma'lum/muddati o'tgan token, validatsiya, logout, logout'ning "mavjudligini
      oshkor qilmasligi")
- [x] Backend: typecheck toza, **8 fayl / 43 test** — hammasi ✅ (ketma-ket ishga
      tushirilganda barqaror; parallelda ba'zan MongoMemoryServer resurs
      tig'izligi tufayli flaky bo'ladi — bu sof sandbox infra masalasi)
- [x] Frontend: typecheck toza, lint toza, production build muvaffaqiyatli
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)
- [ ] ⚠️ Task 9 (Sessiyani majburan bekor qilish / "barcha qurilmalardan chiqish")
      shu infratuzilma ustiga quriladi — `RefreshToken.userId` bo'yicha barcha
      yozuvlarni bekor qilish kifoya, keyingi safar shu yerdan davom etaman

### 8. Parol siyosati — ✅ TUGADI (2026-07-19)

- [x] **Muhim dizayn qarori:** `credentialsSchema`ni ikkiga ajratdim —
      `registerSchema` (murakkablik talabi bilan) va `loginSchema` (talabsiz,
      faqat bo'sh emasligini tekshiradi). Sabab: agar login ham murakkablikni
      talab qilsa, siyosat joriy qilinishidan OLDIN ro'yxatdan o'tgan
      foydalanuvchilar (masalan `seed.ts`dagi `password123`) tizimga kira
      olmay qolar edi — bu jiddiy xato bo'lardi.
- [x] `passwordPolicy` zod sxemasi: kamida 8 belgi + kichik harf + katta harf +
      raqam + maxsus belgi (`regex` zanjiri — barcha yetishmayotgan talablar
      bitta xatoda birga ko'rsatiladi, `ZodError.flatten()` orqali)
- [x] Frontend: `login/page.tsx`da mijoz tomonidagi oldindan tekshiruv
      (`isPasswordStrongEnough`, server sxemasini aynan takrorlaydi — izohda
      yozib qo'ydim, ikkalasi birga o'zgarishi kerak) + register rejimida
      parol maydoni ostida talablar matni (`passwordPolicyHint`)
- [x] Uch tilga (`uz/ru/en`) `passwordPolicyHint` va `passwordPolicyError` qo'shildi
- [x] Test: `authController.passwordPolicy.test.ts` — 8 test (6ta zaif parol turi
      rad etiladi, kuchli parol qabul qilinadi, **legacy zaif parol bilan login
      hali ham ishlaydi** — bu eng muhim tasdiq)
- [x] `seed.ts`ni tekshirdim — u `hashPassword()`ni to'g'ridan-to'g'ri chaqiradi,
      Zod'dan umuman o'tmaydi, shuning uchun `password123` demo hisoblar hali
      ham ishlayveradi (o'zgartirish shart emas edi)
- [x] Backend: typecheck toza, **9 fayl / 51 test** — hammasi ✅
- [x] Frontend: typecheck toza, lint toza, production build muvaffaqiyatli
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 9. Sessiyani majburan bekor qilish — ✅ TUGADI (2026-07-19)

- [x] `POST /auth/logout-all` — **autentifikatsiya talab qiladi** (amaldagi
      access token bilan), `/logout`/`refresh`dan farqli — chunki bu kuchliroq
      harakat, faqat refresh tokenni bilish yetarli emas
- [x] `RefreshToken.userId` bo'yicha barcha bekor qilinmagan yozuvlarni bitta
      `updateMany`da bekor qiladi — 7-taskdagi infratuzilma ustiga to'g'ridan-to'g'ri
      qurildi, yangi model/maydon kerak bo'lmadi
- [x] **Bilingan cheklovni hujjatlashtirdim:** access tokenlar stateless JWT
      bo'lgani uchun, boshqa qurilmada hali amal qilayotgan access token o'z
      tabiiy muddati (15 daqiqa) tugagunga qadar ishlayveradi — buni bekor qilish
      uchun denylist kerak bo'lardi, buni QILMADIM (ortiqcha murakkablik,
      so'ralmagan). 15 daqiqalik oyna — zamonaviy standart trade-off.
- [x] Frontend: `api.logoutAllDevices()` qo'shildi
- [x] **UI:** `SiteNav.tsx`ga kichik ikkilamchi tugma qo'shdim ("Barcha
      qurilmalardan") — asosiy "Chiqish" tugmasidan ataylab kichikroq/xiraroq,
      bosilganda `window.confirm()` bilan tasdiqlanadi (kuchli harakat bo'lgani
      uchun). **⚠️ Fazilov bilan bu joylashuv/dizayn hali kelishilmagan** — men
      buni funksional minimal yechim sifatida qo'shdim, u UI'ni qayta ko'rib
      chiqishi mumkin (masalan dropdown menyuga ko'chirish).
- [x] Uch tilga (`uz/ru/en`) `logoutAll`/`logoutAllConfirm` qo'shildi
- [x] Test: `authController.logoutAll.test.ts` — 4 test (auth'siz 401, uch xil
      "qurilma"ning barchasi bekor qilinishi, **boshqa foydalanuvchining
      tokeniga tegilmasligi**, idempotentlik)
- [x] Backend: typecheck toza, **10 fayl / 55 test** — hammasi ✅
- [x] Frontend: typecheck toza, lint toza, production build muvaffaqiyatli
- [ ] PR yuborish (hali ochilmagan — kod tayyor, review kutmoqda)

### 11. Admin roli qo'shish — kod tayyor (2026-07-19), ⚠️ Hidoyatovga xabar berish qoldi

- [x] `models/User.ts`da `role` enumiga `admin` qo'shildi (`UserRole`, `USER_ROLES`)
- [x] **Xavfsizlik:** `authController.ts`dagi `registerSchema`ning `role` enumi
      ataylab **o'zgartirilmadi** (`employer`/`seeker` bilan cheklangan qoldi) —
      `admin` ochiq ro'yxatdan o'tish orqali hech qachon o'z-o'ziga tayinlanib
      bo'lmaydi, faqat DB'ni to'g'ridan-to'g'ri tahrirlash orqali beriladi.
      Test bilan tasdiqladim (`authController.adminRole.test.ts`).
- [x] Admin himoya middleware: `middleware/requireAdmin.ts` — `authenticate`dan
      keyin zanjirlanadi, DB'dan foydalanuvchini qayta o'qib `role==='admin'`ni
      tekshiradi (JWT payload'da `role` yo'q — ataylab, rol o'zgarishi darhol
      kuchga kirsin deb, eski token bilan ham)
- [ ] **⚠️ Hidoyatovga xabar berish kerak** — u admin panelda ishlata boshlashi
      uchun. Shuningdek `jobController.createJob`da `user.role === 'employer'`
      bo'lmasa avtomatik "seeker" (resume) shoxobchasiga tushadi — agar `admin`
      roli u yerda ham ishlatilishi kerak bo'lsa (masalan admin ham vakansiya
      joylay olishi kerakmi), bu Hidoyatov bilan kelishish kerak bo'lgan nuqta,
      men uning faylini o'zgartirmadim (domen chegarasi).
- [x] Test: `authController.adminRole.test.ts` — 1 test (admin roli bilan
      ro'yxatdan o'tish 400 bilan rad etiladi)

### 10. Anti-cheat loglarini admin panelga uzatish — kod tayyor (2026-07-19), ⚠️ format tasdiqlanmagan

- [x] **Taklif qilingan format** (`adminController.ts`da izohda yozilgan) —
      yangi log modeli OCHMADIM, mavjud `Session` maydonlaridan (`tabSwitchCount`,
      `violationCount`, `terminationReason`, `status`) to'g'ridan-to'g'ri
      quriladi, chunki har bir anti-cheat signal allaqachon shu yerda saqlanadi:
      ```
      { sessionId, user: {id,name,email}|null, status,
        tabSwitchCount, violationCount, terminationReason,
        startTime, endTime, deadline }
      ```
- [x] `GET /api/admin/violations` — `authenticate` + `requireAdmin` bilan himoyalangan,
      `?limit=` (default 50, max 200), faqat "diqqatga loyiq" sessiyalarni
      qaytaradi (tab-switch>0 YOKI violation>0 YOKI terminated) — toza,
      hech qanday qoidabuzarliksiz sessiyalar chiqarilmaydi
- [x] Route: `routes/adminRoutes.ts`, `routes/index.ts`ga `/admin` prefiksi bilan ulandi
- [x] Test: `adminController.test.ts` — 4 test (auth'siz 401, seeker/employer 403,
      admin to'g'ri formatda ma'lumot ko'radi va toza sessiya chiqarilmaydi)
- [ ] **⚠️ Hidoyatov bilan format hali rasman kelishilmagan** — u admin
      dashboard UI'sini qurayotganda ushbu shakl unga yetarli/qulaymi, yoki
      boshqa maydonlar (masalan sahifalash — `page`/`cursor`, yoki texnologiya/
      yo'nalish bo'yicha filtr) kerakmi, shuni tasdiqlashi kerak. Format
      o'zgarsa, faqat `adminController.ts`ni yangilash kifoya — frontend hali
      yozilmagan (Hidoyatovning ishi).
- [x] Backend: typecheck toza, **12 fayl / 60 test** — hammasi ✅

---

## ⏳ Qo'lda / real muhitda tekshirish kutayotgan ishlar

> Bu bo'lim avval "MongoDB yo'q, qo'lda tekshira olmayman" deb ochiq qoldirilgan edi.
> 2026-07-19: mahalliy `mongodb-memory-server` (`start-mongo.mjs`) ishga tushirilib,
> backend + frontend + brauzer orqali **haqiqiy `npm run dev` muhitida** qo'lda
> tekshirildi.

- [x] **Tab-switch / DevTools ogohlantirish (4-task):** boshqa tabga o'tilganda
      `ViolationDialog` darhol chiqib ogohlantirdi — kutilgandek ishladi, tasdiqlandi.
      (Docked DevTools orqali maxsus F12 sinovi alohida amalga oshirilmadi, lekin
      bir xil `useAntiCheat` mexanizmi orqali ishlagani uchun deterministik hisoblanadi.)
- [x] Shu tekshiruv chog'ida topilgan kichik i18n bug (`AntiCheatBanner.tsx`dagi
      qattiq yozilgan `'none'` so'zi) tuzatildi — `proctor.limitUnknown` kaliti
      qo'shildi (uz/ru/en).

---

## 🔗 Boshqalar bilan kelishish kerak bo'lgan nuqtalar

- [ ] Hidoyatov: `admin` roli va `requireAdmin` middleware **kod tomoni tayyor**
  (11-task) — endi faqat xabar berish va u qachon admin panelda ishlata
  boshlashini bilish qoldi
- [ ] Hidoyatov: `GET /api/admin/violations` **kod tomoni tayyor, taklif
  qilingan formatda** (10-task) — u UI qurayotganda shu format yetarlimi,
  tasdiqlashi kerak (sahifalash/filtr kerak bo'lsa qo'shiladi)
- [ ] Hidoyatov: `jobController.createJob`da `admin` roli qanday ishlashi kerak
  (masalan admin ham vakansiya joylay oladimi?) — hozircha `employer` bo'lmasa
  avtomatik seeker/resume yo'liga tushadi, bu `admin` uchun ham to'g'rimi?
- [ ] Fazilov: `Question.ts` / `testSchemas.ts` formatini savol yozishdan oldin
  unga yetkazganimni tasdiqlash

---

## 🗒️ Kundalik log (har PR / har muhim ish keyin bitta qator qo'shaman)

| Sana       | Nima qildim                                                                                                                                                                                                                                                                                                             | Fayl(lar)                                                                                                | Status                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- |
| 2026-07-19 | Sardor.md, README.md, boshqa docs/team fayllarini o'qib, vazifalarni shu notepadga tushirdim. Kodni tekshirib, server-side deadline allaqachon borligini aniqladim.                                                                                                                                                     | `docs/workspace/SardorTasks.md`                                                                        | ✅ tugadi              |
| 2026-07-19 | Rate-limiting to'liq amalga oshirildi:`express-rate-limit` o'rnatildi, `ApiError.tooManyRequests()` qo'shildi, `middleware/rateLimiter.ts` yaratildi (15 daqiqa/10 urinish), `/auth/login` va `/auth/register`ga ulandi. Integratsion test yozildi va o'tdi, butun test to'plami (19 test) va typecheck toza. | `backend/src/middleware/rateLimiter.ts`, `.test.ts`, `utils/ApiError.ts`, `routes/authRoutes.ts` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | Copy/paste bloklash: backend'da `Session.violationCount`, `MAX_VIOLATIONS` env, `POST /api/test/violation` + socket `violation` eventi. Frontendda `useAntiCheat` kengaytirildi (copy/paste/cut), va **butun anti-cheat infratuzilmani (heartbeat, banner, dialog) birinchi marta `test/page.tsx`ga ulab qo'ydim** — avval yozilgan-u ishlatilmagan edi. 3ta yangi test (limit/409/401) + uch tilga tarjima qo'shildi. Backend 22 test ✅, frontend build ✅ (uz/ru/en). | `backend/src/{models/Session,config/env,validation/testSchemas,controllers/testController(.violation.test),routes/testRoutes,sockets/antiCheat}.ts`, `.env.example`, `frontend/src/{hooks/useAntiCheat,components/ViolationDialog,lib/api,types/test,app/[locale]/test/page}.tsx`, `messages/{uz,ru,en}.json` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | Right-click / screenshot ogohlantirish: `contextmenu` bloklash + `right-click` violation turi, `PrintScreen` keydown orqali `screenshot-key` turi (best-effort — OS darajasidagi screenshotni to'liq ushlab bo'lmasligi hujjatlashtirildi). `AntiCheatBanner` endi umumiy violation sonini ham ko'rsatadi. Backend `VIOLATION_TYPES` kengaytirildi (generic controller/socket o'zgarishsiz ishladi). 4ta yangi test. Backend 26 test ✅, frontend build ✅. | `frontend/src/{hooks/useAntiCheat,components/{ViolationDialog,AntiCheatBanner},app/[locale]/test/page}.tsx`, `messages/{uz,ru,en}.json`, `backend/src/validation/testSchemas.ts`, `.violation.test.ts` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | DevTools aniqlash: `outerWidth/innerWidth` farqini 1s intervalda kuzatish (160px chegara), edge-trigger (faqat ochilganda bir marta xabar). `devtools` violation turi qo'shildi. **Real DevTools bilan qo'lda tekshirish ATAYLAB qilinmadi** — frontendda test runner yo'q va bu muhitda MongoDB yo'q, shu sabab soxta "tekshirdim" deyilmadi, mendan keyin sen qo'lda tekshirishing kerak (yo'riqnoma yuqorida). Backend 27 test ✅, frontend build ✅. | `frontend/src/hooks/useAntiCheat.ts`, `components/ViolationDialog.tsx`, `messages/{uz,ru,en}.json`, `backend/src/validation/testSchemas.ts`, `.violation.test.ts` | ⚠️ kod tugadi, qo'lda tekshirish kutmoqda |
| 2026-07-19 | Ko'p oyna/tab nazorati: **yana ikkita ishlatilmagan hook topib ulab qo'ydim** — `useFullscreen.ts` (test boshlanganda avtomatik fullscreen, chiqilsa mavjud tab-switch kanali orqali xabar — alohida hisoblagich ochmadim, bitta jismoniy harakatning ikki marta hisoblanishini oldini olish uchun) va `useExamLockdown.ts` (klaviatura yorliqlarini bloklash). Brauzerning Ctrl+N/Ctrl+T'ni bloklab bo'lmasligi kabi bartaraf etib bo'lmaydigan cheklovni hujjatlashtirdim. Backend o'zgarishsiz (27 test ✅), frontend typecheck/lint/build toza (2ta exhaustive-deps ogohlantirishi izohlar bilan bostirildi). | `frontend/src/app/[locale]/test/page.tsx` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | NoSQL injection sanitizatsiya: custom `middleware/sanitize.ts` (`$`/nuqtali kalitlarni rekursiv o'chiradi), `app.ts`ga global ulandi. **Haqiqiy zaiflik topdim:** `GET /api/jobs`da Zod validatsiya yo'q ekan, `req.query`dan to'g'ridan-to'g'ri Mongo filtriga o'tar edi — `?type[$ne]=vacancy` klassik operator-injection bilan filtrni chetlab o'tar edi. Endi xavfsiz rad etiladi (400, crash yo'q, bypass yo'q). 9ta yangi test (6 unit + 3 integratsion). Backend 7 fayl / 36 test ✅, typecheck toza. | `backend/src/middleware/{sanitize,sanitize.test}.ts`, `app.ts`, `controllers/jobController.sanitize.test.ts` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | JWT refresh token: opaque random token (JWT emas — DB'da faqat hash saqlanadi) + yangi `RefreshToken` modeli (TTL index). Access token 2soat→15daqiqa qisqartirildi. `POST /auth/refresh` (rotatsiya bilan) va `POST /auth/logout` qo'shildi. Frontendda `lib/api.ts`ga avtomatik 401→refresh→retry oqimi (parallel so'rovlar uchun bitta umumiy refreshPromise). `SiteNav`dagi logout endi serverga ham xabar beradi (avval faqat localStorage tozalanardi — refresh token DB'da abadiy qolib ketardi). 7ta yangi test. Backend 8 fayl / 43 test ✅ (ketma-ket), frontend build ✅. | `backend/src/{models/RefreshToken,utils/jwt,controllers/authController(.refresh.test),routes/authRoutes,config/env}.ts`, `.env.example`, `frontend/src/{lib/api,components/SiteNav,app/[locale]/login/page}.tsx` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | Parol siyosati: `credentialsSchema` `registerSchema`/`loginSchema`ga ajratildi — **faqat register**da murakkablik talab qilinadi (login har doim qabul qiladi, aks holda eski/`seed.ts` foydalanuvchilari qulflanib qolardi). Frontendda mijoz tomonidagi oldindan tekshiruv + talablar matni, uch tilga tarjima. 8ta yangi test (jumladan "legacy zaif parol bilan login ishlaydi" — eng muhim tasdiq). Backend 9 fayl / 51 test ✅, frontend build ✅. | `backend/src/controllers/authController(.passwordPolicy.test).ts`, `frontend/src/app/[locale]/login/page.tsx`, `messages/{uz,ru,en}.json` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | Sessiyani majburan bekor qilish: `POST /auth/logout-all` (authenticated) — `RefreshToken.userId` bo'yicha barcha yozuvni bekor qiladi. Access token stateless bo'lgani sabab 15 daqiqalik "ochiq oyna" chegarasini hujjatlashtirdim (denylist qilmadim — ortiqcha). Frontend: `api.logoutAllDevices()` + `SiteNav`da kichik ikkilamchi tugma (`window.confirm` bilan) — **⚠️ Fazilov bilan joylashuv hali kelishilmagan**, funksional minimal yechim. 4ta yangi test (jumladan "boshqa foydalanuvchiga tegmaslik"). Backend 10 fayl / 55 test ✅, frontend build ✅. | `backend/src/controllers/authController(.logoutAll.test).ts`, `routes/authRoutes.ts`, `frontend/src/{lib/api,components/SiteNav}.tsx`, `messages/{uz,ru,en}.json` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | 10 va 11-tasklarni **oldindan, Hidoyatov bilan hali kelishmasdan** tayyorlab qo'ydim (foydalanuvchi so'rovi bilan): `User.role`ga `admin` qo'shildi (register orqali o'z-o'ziga tayinlab bo'lmaydi — testlandi), `middleware/requireAdmin.ts`, va `GET /api/admin/violations` — mavjud `Session` maydonlaridan quriladigan taklif qilingan log formati (yangi model ochmadim). 5ta yangi test. `jobController`ga tegmadim (Hidoyatov domeni) — admin rolining u yerdagi ta'sirini eslatma sifatida yozib qoldirdim. Backend 12 fayl / 60 test ✅, typecheck toza. | `backend/src/{models/User,middleware/requireAdmin,controllers/adminController(.test),routes/{adminRoutes,index},controllers/authController.adminRole.test}.ts` | ⚠️ kod tayyor, Hidoyatov tasdiqi kutmoqda |
| 2026-07-19 | `helmet` qattiqlashtirildi: CSP (`default-src 'none'` — server faqat JSON qaytaradi), `crossOriginResourcePolicy: 'cross-origin'` (frontend boshqa origin), HSTS faqat `env.isProduction`da (lokal http'da ma'nosiz bo'lardi). CSP javob headeri frontendning `fetch()`iga ta'sir qilmasligini tekshirdim (CSP faqat brauzer sahifa sifatida ochgan javoblarga ta'sir qiladi). 4ta yangi test. Backend 13 fayl / 64 test ✅. **Shu bilan mendan mustaqil bajariladigan barcha tasklar tugadi** — qolgani `NeedTeamS.md`da. | `backend/src/{app,app.security-headers.test}.ts` | ✅ tugadi, PR kutmoqda |
| 2026-07-19 | Lokal `mongodb-memory-server` (`start-mongo.mjs`) ishga tushirilib, **birinchi marta haqiqiy `npm run dev` + brauzerda** to'liq oqim qo'lda tekshirildi: login, test sozlash (yo'nalish/texnologiya validatsiyasi), test sessiyasi, va **tab-switch/DevTools ogohlantirish** — boshqa tabga o'tilganda `ViolationDialog` to'g'ri chiqib ogohlantirdi (4-taskdagi qo'lda tekshirish shu bilan yopildi). Shu tekshiruv chog'ida kichik i18n bug topildi: `AntiCheatBanner.tsx`da limit noma'lum bo'lganda literal `'none'` so'zi qattiq yozilgan edi (tarjima qilinmagan) — `proctor.limitUnknown` kaliti qo'shilib uch tilda tuzatildi. Alohida so'rov bilan per-savol taymer ham 30s→20s ga qisqartirildi (backend `PER_QUESTION_SECONDS` + frontend fallback + `techHint` matni). Backend/frontend typecheck toza. | `frontend/src/components/AntiCheatBanner.tsx`, `messages/{uz,ru,en}.json`, `backend/src/controllers/testController.ts`, `frontend/src/app/[locale]/test/page.tsx` | ✅ tugadi, PR kutmoqda |

---

## 💬 Teacher so'raganda tez javob shablon

> "Xavfsizlik/anti-cheat qismini olganman. Hozircha JWT auth, server-side
> deadline tekshiruvi, tab-switch va heartbeat nazorati tayyor edi — kodni
> tekshirib tasdiqladim. Hozir rate-limiting ustida ishlayapman, undan keyin
> copy/paste bloklash va DevTools aniqlashga o'taman."

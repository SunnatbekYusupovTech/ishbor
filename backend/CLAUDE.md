# CLAUDE.md — Backend (Ishbor API)

> Ildizdagi `/CLAUDE.md` ni ham o'qing — umumiy kontekst o'sha yerda.

## Nima bu

Xavfsiz malaka tasdiqlash (anti-cheat) API + ish e'lonlari backend. Express +
Mongoose + Socket.io + JWT, TypeScript.

## Ishga tushirish

```bash
npm run dev -w backend        # nodemon + tsx (port .env PORT, default 5000)
npm run build -w backend      # tsc + tsc-alias → dist/
npm run seed -w backend       # demo user + e'lonlar
npm run test -w backend       # Vitest (mongodb-memory-server)
npm run typecheck -w backend  # tsc --noEmit
```

## Arxitektura oqimi

`index.ts` → `app.ts` (`createApp`: helmet, cors, json, `/api` routes, error handler)
→ `routes/index.ts` → controller → model. Socket.io alohida `sockets/antiCheat.ts` da.

- **Xatolar:** `ApiError` (utils) tashlanadi, `middleware/errorHandler` ushlaydi.
  Controllerlar `asyncHandler` bilan o'ralgan.
- **Validatsiya:** Zod sxemalar `validation/`, `middleware/validate` orqali.
- **Security headers:** `helmet` `app.ts`da qattiqlashtirilgan holda ulangan —
  CSP `default-src 'none'` (server faqat JSON qaytaradi, HTML render qilmaydi),
  `crossOriginResourcePolicy: 'cross-origin'` (frontend boshqa origin'dan
  fetch qiladi), HSTS faqat `env.isProduction`da (lokal http'da o'chirilgan).
- **Auth:** `middleware/authenticate` JWT ni tekshiradi, `req.user` ni to'ldiradi
  (`types/express.d.ts`). Token `utils/jwt`.
- **Access + refresh token:** access token qisqa muddatli (`env.accessTokenTtl`,
  default 15m). Refresh token **JWT emas** — opaque random (`generateRefreshToken`),
  faqat SHA-256 hash'i `models/RefreshToken.ts`da saqlanadi (TTL index, `env.refreshTokenTtlDays`,
  default 30 kun). `POST /auth/refresh` — rotatsiya bilan (eski token darhol bekor
  qilinadi, yangisi qaytariladi); `POST /auth/logout` — bitta refresh tokenni bekor
  qiladi. Barcha qurilmalardan chiqish (hali yozilmagan) shu modelning `userId`
  bo'yicha ko'p yozuvni bekor qilishi kifoya — bu allaqachon `POST /auth/logout-all`
  sifatida amalga oshirilgan (authenticated, `RefreshToken.userId`ga `updateMany`).
  Bilingan chegara: access token o'zining 15 daqiqalik muddati tugagunga qadar
  boshqa qurilmada ishlayveradi (stateless JWT, denylist qilinmagan — ataylab).
- **Parol siyosati:** `authController.ts`dagi `passwordPolicy` (kamida 8 belgi +
  katta/kichik harf + raqam + belgi) faqat `registerSchema`da ishlaydi.
  `loginSchema` — parolni murakkablikka tekshirmaydi (istalgan bo'sh bo'lmagan
  string). Bu **ataylab** shunday: siyosat keyin qattiqlashtirilsa ham, eski
  parol bilan ro'yxatdan o'tgan foydalanuvchilar (masalan `seed.ts`dagi
  `password123`) tizimga kira olishda davom etadi.
- **Rate-limiting:** `middleware/rateLimiter.ts` (`authRateLimiter`) — `/auth/login`
  va `/auth/register` uchun 15 daqiqada 10 urinish, oshsa `429 Too Many Requests`
  (`ApiError.tooManyRequests`). Boshqa endpoint qo'shsang shu paterndan foydalan.
- **Anti-cheat violations (non-tab-switch):** `Session.violationCount` — copy/paste,
  right-click, devtools va h.k. uchun umumiy sanoq. `POST /api/test/violation`
  (`{ sessionId, type }`, `type` — `validation/testSchemas.ts` dagi `VIOLATION_TYPES`
  enumidan: `copy-paste` | `right-click` | `screenshot-key` | `devtools`) + `sockets/antiCheat.ts`dagi
  `violation` socket eventi (REST bilan bir xil mantiq, tab-switch'dagi dual-path
  patern bilan bir xil). Limit `env.maxViolations` (`MAX_VIOLATIONS`, default 5) —
  oshsa sessiya `terminated` bo'ladi. Controller/socket generic (`type: string`),
  yangi buzilish turi qo'shsang faqat `VIOLATION_TYPES`ga qo'sh — boshqa joyni
  o'zgartirish shart emas.
  > Diqqat: OS darajasidagi screenshot (masalan Snipping Tool, Cmd+Shift+4) hech
  > qanday web API orqali sahifaga ko'rinmaydi — bu texnik chegara. Faqat klassik
  > Windows PrintScreen tugmasi `keydown` orqali aniqlanadi (best-effort).
- **NoSQL injection sanitizatsiya:** `middleware/sanitize.ts` (`sanitizeInput`) —
  `app.ts`da global ulangan (`express.json`/`urlencoded`dan keyin, routerlardan oldin).
  `req.body`/`req.query`/`req.params`dagi `$` bilan boshlanadigan yoki `.` saqlagan
  kalitlarni rekursiv (massivlar ichida ham) o'chiradi — Mongo operator-injection
  (`{$ne:...}`, `{$where:...}`) va dotted-path injection'dan himoya. Zod'i yo'q
  route'lar (masalan `GET /jobs`) uchun ham ishlaydi — bu yerda haqiqiy zaiflik
  bor edi (`?type[$ne]=vacancy` filtrni chetlab o'tardi), sanitizatsiya bilan
  tuzatildi. Yangi query-asosli endpoint qo'shsang, Zod validatsiyasiga qo'shimcha
  ravishda bu qatlam avtomatik ishlaydi — alohida ulash shart emas.
- **Javob formati:** har doim `{ success: true, data }` yoki xatoda
  `{ success: false, error: { message, details? } }`.
- **Admin:** `User.role` endi `admin`ni ham qamraydi, lekin **faqat DB'ni
  to'g'ridan-to'g'ri tahrirlash orqali** beriladi — `registerSchema`ning `role`
  enumi ataylab `employer`/`seeker` bilan cheklangan qoldi (o'z-o'ziga tayinlab
  bo'lmaydi). `middleware/requireAdmin.ts` — `authenticate`dan keyin
  zanjirlanadi, har so'rovda DB'dan qayta tekshiradi (JWT'da `role` yo'q,
  shuning uchun rol o'zgarishi eski token bilan ham darhol kuchga kiradi).
  `GET /api/admin/violations` (`routes/adminRoutes.ts`) — **⚠️ Hidoyatov bilan
  hali rasman tasdiqlanmagan** taklif qilingan formatda, mavjud `Session`
  maydonlaridan quriladi (yangi log modeli yo'q). Batafsil:
  `docs/workspace/SardorTasks.md` 10/11-tasklar.

## Modellar

- **User** — (frilanser profili maydonlari uchun pastdagi "Frilanser profili"
  bo'limiga qarang) `role` (employer|seeker|admin — `admin` faqat DB orqali beriladi),
  `verificationLevels` — **har yo'nalish uchun alohida** daraja (`Record<Direction, Tier>`,
  `frontend`/`backend`/`fullstack`/`mobile` — frontend testidan o'tish backend haqida
  hech narsa demaydi). `Tier` 7 qiymatli: `none`, `junior`, `strong-junior`, `middle`,
  `strong-middle`, `senior`, `strong-senior` — o'tilgan texnologiyalar soni bo'yicha
  (1→junior, 2→strong-junior, 3→middle, 4→strong-middle, 5→senior, 6+→strong-senior,
  `scoringService.levelFromPassedCount`). `primaryDirection` — foydalanuvchining o'zi
  tanlagan "men kimman" (`PATCH /auth/me` orqali tahrirlanadi, faqat ko'rsatish uchun,
  hech narsani ochmaydi/blokламайди). `bestPercentage`, `bestScore`, `attempts` — umumiy
  (yo'nalishlarga bo'linmagan). Reyting shu yerdan.
- **Job** — `type` (vacancy|resume), `level`, `stack`, `postedBy` (→User), denormallashtirilgan `postedByName`,
  `location`, `salaryMin`, `salaryMax`.
- **Question** — test savoli (`technology`, `category`, daraja, variantlar).
- **Session** — test sessiyasi, tab-switch/heartbeat nazorati, `direction` (qaysi
  yo'nalish uchun ekanligi — `finalizeSession` faqat shu yo'nalishning
  `verificationLevels`ini yangilaydi).
- **RefreshToken** — `userId`, `tokenHash` (SHA-256, xom token hech qachon saqlanmaydi),
  `expiresAt` (TTL index), `revokedAt`.
- **PortfolioItem** — frilanser profilidagi bitta ish (`userId`, `title`,
  `category`, `description`, `imageUrl`, `link`). **Ataylab alohida
  kolleksiya** (`User` ichida massiv emas): ishlar soni cheklanmagan, embed
  qilingan massiv esa har bir `User` o'qishida (login, reyting, e'lonlar
  ro'yxati) o'qilib, bekorga narx qilardi.
- **Review** — profilga qoldirilgan sharh (`targetUserId`, `authorId`,
  denormallashtirilgan `authorName`/`authorAvatarUrl`, `rating` 1–5, `text`).
  `(targetUserId, authorId)` bo'yicha **unique compound index** — bitta
  foydalanuvchi bitta profilga faqat bitta sharh qoldiradi; qayta yuborish
  eskisini yangilaydi (upsert), ya'ni bitta akkaunt reytingni to'plab
  ketolmaydi.

## Test (assessment) engine

- `config/catalog.ts` — yo'nalish → texnologiyalar, har texnologiyaga savol soni.
- `data/questions.ts` — savollar bazasi (ingliz, kanonik — ballash indeks bo'yicha).
- `data/questionTranslations.ts` — RU/UZ savol tarjimalari (texnologiya + tartib bo'yicha).
  `seed.ts` `<tech>-<n>` `key` va `translations` ni `Question` hujjatiga biriktiradi.
  `startTest` `locale` (body yoki `Accept-Language`) bo'yicha lokalizatsiya qiladi;
  variantlar **kanonik tartibda** bir xil `order` bilan aralashadi — ballash o'zgarmaydi.
  **Tarjimalar faqat qayta seed'dan keyin ko'rinadi** (`npm run seed -w backend`).
- `services/scoringService.ts` — ballash mantiqi (unit test bilan).
- `sockets/antiCheat.ts` — real-time qoidabuzarlik kuzatuvi.
- Tuning `.env` orqali: `TEST_DURATION_MINUTES`, `HEARTBEAT_TIMEOUT_MS`, `MAX_TAB_SWITCHES`.
- **Cooldown:** `testController.startTest` **har urinishda emas**, faqat
  ketma-ket har **3-chi** boshlashda (`COOLDOWN_EVERY_N_STARTS`, kod ichida
  qattiq belgilangan) foydalanuvchining oxirgi tugatilgan urinishidan keyin
  `TEST_ATTEMPT_COOLDOWN_MINUTES` (default 10) o'tmaguncha yangi sessiya
  ochilishiga yo'l qo'ymaydi — skript orqali qayta-qayta start→submit qilib,
  qaytarilgan `percentage`ni to'g'ri javoblarni topish uchun oracle sifatida
  ishlatishning oldini oladi, lekin oddiy foydalanuvchi 1-2 marta erkin qayta
  urinib ko'rishi mumkin. Agar oxirgi urinish `TEST_LOW_SCORE_THRESHOLD`dan
  (default 50%) past bo'lsa, cooldown `TEST_LOW_SCORE_COOLDOWN_MULTIPLIER`ga
  (default 3, ya'ni 30 daqiqa) ko'paytiriladi — tez-tez past-sifatli qayta urinishni yanada
  qiyinlashtiradi. `testRateLimiter` (`middleware/rateLimiter.ts`) — IP
  bo'yicha qo'shimcha himoya qatlami.
- **Sessiyani qayta boshlash (restart):** oldin faol (`in-progress`) sessiya
  bor bo'lsa, oddiy (QA bo'lmagan) foydalanuvchi uchun ham endi `409` bilan
  butunlay bloklanmaydi — masalan boshqa tilda qayta boshlash uchun
  `MAX_FREE_RESTARTS` (2) marta **bepul** qayta boshlash mumkin (eski sessiya
  `terminated` + `terminationReason: 'Abandoned by user restart.'` qilib
  belgilanadi). 2 martadan oshsa, oddiy cooldown bilan bir xil
  `TEST_ATTEMPT_COOLDOWN_MINUTES` kutish talab qilinadi (`429`) — tez-tez
  qayta boshlab cooldown/ko'rilgan-savol mantig'ini chetlab o'tishning oldini
  oladi. QA test hisobi bundan ham mustasno — pastga qarang.
- **Ko'rilgan savollarni istisno qilish:** `startTest` foydalanuvchining
  barcha oldingi sessiyalaridagi `questionIds`ni (`Session.find({userId}).distinct(...)`)
  yig'ib, shu ro'yxatdan tashqaridagi savollarni birinchi navbatda taklif
  qiladi (`$nin` bilan `$sample`) — takroriy urinishlarda xotirlab
  olingan savollar emas, yangi savollar chiqadi. Agar texnologiya uchun
  ko'rilmagan savollar yetarli bo'lmasa, qolganini ko'rilganlardan
  to'ldiradi (test qisqarib qolmasin deb).
- **QA/anti-cheat test hisobi (`User.isQaTester`):** `qa@ishbor.uz` / `password123`
  (`seed.ts` orqali seed qilinadi) — oddiy `seeker`, lekin `startTest` ikkita
  qo'riqchidan mustasno: (1) cooldown gate umuman ishlamaydi, (2) "allaqachon
  faol sessiya bor" konflikti o'rniga eski `in-progress` sessiya avtomatik
  `terminated` qilinib, yangisi darhol boshlanadi — ya'ni testni istalgan
  vaqt yarmida qayta boshlash mumkin. Bundan tashqari `POST /test/auto-complete`
  (faqat shu akkaunt uchun, aks holda `403`) sessiyani **darhol 5/5 to'g'ri
  javob bilan** yakunlaydi — `testController.ts`dagi `finalizeSession()`
  orqali `submitTest` bilan bir xil ballash/badge-berish yo'lidan o'tadi.
  Frontendda `test/page.tsx` `api.me().isQaTester` bo'lsa faol test paytida
  "QA: Avtomatik tugatish (5/5)" tugmasini ko'rsatadi (`messages/*.json` →
  `test.qaAutoFinish`). Maqsad — anti-cheat va natija oqimini (ResultCard,
  badge, uz/ru/en lokalizatsiya) real cooldown/savollarsiz tez-tez sinash.
- **Registratsiya IP-limiti:** `authController.register` bitta IP'dan
  `MAX_ACCOUNTS_PER_IP` (default 2) dan ortiq akkaunt ro'yxatdan o'tishiga
  yo'l qo'ymaydi (`User.registrationIp`, `403`) — mavjud akkauntlarga
  tegmaydi, faqat yangi ro'yxatdan o'tishni cheklaydi. Ataylab yumshoq
  (default 2) — umumiy IP'lar (ofis, universitet, NAT) keng tarqalgan,
  qattiqroq limit haqiqiy foydalanuvchilarni bloklab qo'yishi mumkin.
- **AI orqali savol generatsiyasi:**
  - `services/groqQuestionGenerator.ts` — sof Groq chaqiruvchi (DB'siz),
    ikkala quyidagi joy tomonidan ishlatiladi. **Bitta chaqiruvda EN + RU + UZ**
    ni birga so'raydi (`translations: { ru, uz }`) — variantlar soni va tartibi
    ingliz kanonik bilan bir xil bo'lishi majburiy (aks holda savol butunlay
    tashlab yuboriladi — `generateQuestions` ichida himoya filtri bor,
    mos kelmagan tarjima per-candidate shuffle'ni buzib qo'yishi mumkin edi).
    Prompt yana aniq talab qiladi: barcha variantlar bir xil uzunlik/uslubda
    bo'lishi kerak (AI generatsiya qilingan testlardagi klassik kamchilik —
    eng uzun/batafsil variant deyarli har doim to'g'ri javob bo'lib chiqadi,
    shuning uchun aniq taqiqlangan) va to'g'ri javob indeksi savoldan-savolga
    har xil pozitsiyada bo'lishi kerak. **Diqqat:** AI tarjima sifati kafolatsiz
    (model ba'zan noto'g'ri belgi/skript aralashtirib qo'yishi mumkin) —
    strukturaviy tekshiruv bor (variantlar soni mos kelishi), lekin tarjima
    matnining tabiiyligi qo'lda tekshirilmagan.
  - `services/questionImportService.ts` — savollarni bazaga yozadi
    (`translations` maydoni bilan birga, agar mavjud bo'lsa), matn bo'yicha
    (katta-kichik harf/probel farqisiz) **dublikatlarni o'tkazib yuboradi**,
    `category`ni `technology`ga tenglashtirib to'ldiradi (`seed.ts`
    konvensiyasi bilan bir xil). Tarjimasiz savollar `startTest`da
    `localizeContent` orqali kanonik inglizchaga fallback qiladi.
  - `scripts/generateQuestions.ts` (`npm run generate-questions`) — alohida,
    uzoq muddatli process (API server bilan bir jarayonda emas). Groq
    chaqirib, natijani o'zining `POST /api/webhooks/questions`iga yuboradi
    (DB bilan to'g'ridan-to'g'ri ishlamaydi — butunlay boshqa joyda deploy
    qilinishi mumkin). `node-cron` bilan o'z-o'zini rejalashtiradi
    (`GENERATE_CRON`, default kuniga bir marta soat 03:00). `RUN_ONCE=true`
    — bir martalik test uchun. Kerakli env: `GROQ_API_KEY`, `WEBHOOK_URL`,
    `QUESTION_IMPORT_SECRET`.
  - `services/autoRefillService.ts` (`maybeRefill`) — **in-process**,
    `startTest`dan chaqiriladi: agar texnologiyaning umumiy savol soni
    `AUTO_REFILL_THRESHOLD`dan (default 15) kam bo'lsa, fon rejimida
    (await qilinmasdan — foydalanuvchi so'rovini bloklamaydi) Groq'dan
    yangi partiya so'rab, to'g'ridan-to'g'ri `questionImportService` orqali
    bazaga yozadi. Bitta texnologiya uchun `AUTO_REFILL_COOLDOWN_MINUTES`
    (default 30) ichida faqat bir marta ishga tushadi (xotiradagi debounce
    — process qayta ishga tushsa tozalanadi). `GROQ_API_KEY` sozlanmagan
    bo'lsa jimgina hech narsa qilmaydi.
- **Savol import webhook (`POST /api/webhooks/questions`):** tashqi
  avtomatlashtirish (yuqoridagi skript, yoki Make.com) uchun — JWT o'rniga
  `X-Webhook-Secret` header (`QUESTION_IMPORT_SECRET`) bilan himoyalangan
  (`middleware/verifyWebhookSecret.ts`). Secret sozlanmagan bo'lsa route
  `503` qaytaradi (ochiq qolib ketmaydi). Body: `{ questions: [{ technology,
  difficulty, text, options, correctAnswer }] }` — `validation/webhookSchemas.ts`
  qattiq tekshiradi (`technology` faqat `ALL_TECHNOLOGIES`dan,
  `correctAnswer` `options` chegarasidan oshmasligi kerak). Import mantig'i
  (dublikat tekshiruvi, `category` to'ldirish) `questionImportService`da.

## Frilanser profili (`/u/<handle>` uchun backend)

`controllers/profileController.ts` + `models/PortfolioItem.ts` + `models/Review.ts`.

- **`User`dagi yangi maydonlar:** `username` (ommaviy `@handle`, **`sparse`
  unique** — bu maydon paydo bo'lishidan oldin ochilgan akkauntlarda yo'q,
  shuning uchun `null`lar unique indexda to'qnashmasin deb `sparse`),
  `avatarUrl`, `coverUrl` (kompyuterdan yuklangan fayl **yoki** tashqi
  havola — pastdagi "Rasm yuklash" bo'limiga qarang), `specialization`, `skills[]`,
  `about`, `socials` (7 tarmoq: telegram/instagram/linkedin/github/behance/
  dribbble/website), `country`, `language`, `timezone` (IANA zona — mahalliy
  vaqtni **klient** hisoblaydi), `lastSeenAt`.
- **Onlayn holati:** `lastSeenAt` `getMe`da yangilanadi, lekin **throttle**
  bilan (`ONLINE_TOUCH_MS`, 2 daqiqa) — klient har sahifa yuklanishida
  `/auth/me` chaqiradi, har chaqiruvda yozish bekorga bo'lardi. Yozuv
  fire-and-forget: xato bo'lsa so'rovga chiqmaydi (holat kosmetik).
  "Onlayn" = `Date.now() - lastSeenAt < ONLINE_WINDOW_MS` (5 daqiqa) —
  oyna throttle'dan sezilarli keng bo'lishi shart.
- **`username` avtomatik beriladi:** `authController.generateUsername` —
  email local-part'idan, to'qnashuvda `2`, `3`, … qo'shiladi. Topilmasa
  registratsiya baribir davom etadi (profil `id` orqali ochiladi).
- **Handle ikki xil bo'ladi:** `resolveUser` avval `username` bo'yicha,
  topilmasa `ObjectId` bo'yicha qidiradi — eski akkauntlar `/u/<id>` bilan
  ham ochiladi.
- **`middleware/optionalAuthenticate.ts`** — token bo'lsa `req.user`ni
  to'ldiradi, bo'lmasa/yaroqsiz bo'lsa **hech qachon 401 tashlamaydi**.
  Ommaviy, lekin egasiga boshqacha ko'rinadigan sahifalar uchun
  (`isOwner`/`isMine` bayroqlari). Holatni **o'zgartiradigan** har bir
  endpoint hamon oddiy `authenticate` ortida.
- **Egalik tekshiruvi — so'rov filtrida:** portfolio/sharh mutatsiyalari
  `{ _id, userId: req.user.userId }` bilan qidiradi, ya'ni birovnikini
  tahrirlashga urinish hech nimaga mos kelmay `404` qaytaradi. UI'da
  tugmani yashirish — faqat ko'rinish, himoya emas.
- **Bo'sh satr = maydonni tozalash:** `PATCH /auth/me` va portfolio
  `PATCH`ida `''` yuborilsa maydon `$unset` qilinadi (profilda umuman
  ko'rsatilmaydi); kalitni umuman yubormaslik — "tegma" degani.
  `validation/userSchemas.ts`dagi `linkField`/`textField` shu shartnomani
  tekshiradi.
  > **Diqqat (mongoose tuzog'i):** `socials` — nested subdocument.
  > `{...user.socials}` bilan nusxalash **maydonlarni emas, mongoose
  > ichki xossalarini** ko'chiradi. Shuning uchun `applyProfileFields`
  > har bir tarmoqni `user.set('socials.<platform>', …)` bilan alohida
  > yozadi (`undefined` — unset). Bu xatolik test bilan ushlangan.
- **Sharhlar:** `POST /users/profile/:handle/reviews` — o'zini sharhlash
  `403`; qayta yuborish eskisini **upsert** bilan yangilaydi. O'chirishni
  faqat muallif qila oladi.
- **Kaskad:** `deleteMe` endi `PortfolioItem` va `Review`ni ham o'chiradi —
  sharhlar **ikkala yo'nalishda** (profilga kelganlari + o'zi yozganlari,
  aks holda o'chirilgan muallif nomi boshqa profilda osilib qolardi).
- Testlar: `controllers/profileController.test.ts` (29 ta) — ommaviy o'qish,
  email/hash sizib chiqmasligi, begona portfolio/sharhni tahrirlab
  bo'lmasligi, bo'sh-satr tozalash, username validatsiya/409/rename.

## Rasm yuklash (upload)

`POST /api/uploads/image` (`authenticate` + `uploadRateLimiter`) →
`{ url: '/uploads/<uuid>.<ext>', bytes, mime }`. Fayllar `env.uploadDir`
(default `backend/uploads/`, `.gitignore`da) ichiga yoziladi va `app.ts`da
`/uploads` ostida **faqat o'qish uchun** (`express.static`) beriladi.
Servis: `services/imageStorage.ts`.

- **Nega alohida endpoint:** klient avval rasmni yuklaydi, keyin qaytgan
  URL'ni forma bilan birga saqlaydi. Shu sabab profil/portfolio endpointlari
  toza JSON bo'lib qoladi va UI hali saqlanmagan rasmni ham ko'rsata oladi.
- **URL bazada origin'siz saqlanadi** (`/uploads/...`, `http://host` emas) —
  API boshqa domenga ko'chsa, eski rasmlar o'lik hostga ishora qilib
  qolmaydi. Origin'ni klient qayta ulaydi (`frontend/src/lib/images.ts`).
- **Xavfsizlik (asosiy qarorlar):**
  - **Magic-byte tekshiruvi** (`detectImageFormat`) — `Content-Type` ham,
    fayl nomi ham **klient nazoratida**, shuning uchun formatni faqat
    faylning o'z baytlari hal qiladi. `image/png` deb belgilangan HTML
    rad etiladi (test bilan qoplangan).
  - **SVG ataylab qo'llab-quvvatlanmaydi** — SVG bu rasm emas, hujjat:
    ichida `<script>` bo'lishi mumkin va rasm URL'ini to'g'ridan-to'g'ri
    ochgan foydalanuvchida shu origin'da bajarilardi.
  - **Fayl nomi hech qachon klientdan olinmaydi** — `crypto.randomUUID()`.
    Aks holda `../` bilan yo'lni tanlash yoki birovning faylini bosib
    ketish mumkin bo'lardi.
  - `multer.memoryStorage()` — baytlar tekshirilmaguncha diskka hech narsa
    tushmaydi; `limits.fileSize` (`MAX_UPLOAD_BYTES`, default 5 MB) oqimni
    yarmida uzadi, ya'ni yolg'on `Content-Length` bilan katta allocation
    qildirib bo'lmaydi.
  - Statik `/uploads` **`/api`dan tashqarida** va `globalRateLimiter`dan
    oldin ulangan: bitta profil ko'rinishi avatar + muqova + har bir
    portfolio rasmini tortadi, ularni 200/min API budjetiga qo'shish oddiy
    ko'rishni rate-limit qilib qo'yardi. `nosniff` + `Content-Disposition:
    inline` alohida o'rnatiladi.
- **Railway deploy (postoyanniy disk):** Railway konteyner fayl tizimi
  **efemer** — har deploy'da yuklangan rasmlar yo'qoladi. Yechim: Railway
  **Volume** ulash. `env.uploadDir` `RAILWAY_VOLUME_MOUNT_PATH`ni avtomatik
  o'qiydi (Railway uni volume ulanganda o'zi beradi) → `${mount}/uploads`,
  ya'ni Railway'da faqat volume qo'shish kifoya, boshqa sozlash shart emas.
  Ikki tuzoq hal qilingan:
  1. **Yozish huquqi:** Railway volume `root`ники bo'lib ulanadi, jarayon
     esa `node` ostida ishlaydi → EACCES. `backend/docker-entrypoint.sh`
     root sifatida boshlanadi, faqat volume'ni `chown node`, keyin
     `su-exec` bilan `node`ga tushib jarayonni ishga tushiradi (Node hech
     qachon root ostida ishlamaydi). Shuning uchun `Dockerfile`da `USER node`
     yo'q — entrypoint o'zi tushiradi.
  2. **Kross-domen `<img>`:** front va backend Railway'da alohida domenlar.
     `/uploads` statikasi `Cross-Origin-Resource-Policy: cross-origin` bilan
     beriladi (helmet global), shuning uchun rasm boshqa domendagi frontga
     joylashadi. `.sh` fayllar `.gitattributes` bilan LF'da saqlanadi (CRLF
     shebang Alpine'da ishlamaydi).
  > Frontend Railway servisiga `NEXT_PUBLIC_API_URL` **build-arg** sifatida
  > backend'ning ommaviy URL'i beriladi (Dockerfile'da ARG), va backend'ning
  > `CLIENT_ORIGIN`iga front domeni qo'shiladi — aks holda CORS bloklaydi.
- **Bazada saqlanadigan qiymat** `INTERNAL_UPLOAD_RE` (`/uploads/<uuid>.<ext>`,
  anchored) bilan tekshiriladi — `startsWith('/uploads/')` yetarli emas edi:
  `deleteImage` keyinchalik shu qiymatni fayl yo'liga aylantiradi, ya'ni
  traversal satri saqlanib qolsa xavfli bo'lardi.
- **Orfan fayllarni tozalash — ikki qatlam:**
  1. **Darhol:** avatar/muqova/portfolio rasmi almashtirilganda yoki yozuv
     o'chirilganda eski fayl darhol o'chiriladi (`userController`,
     `profileController`); `deleteMe` esa akkauntning barcha rasmlarini
     (hujjatlar o'chishidan **oldin** yig'ib olib) tozalaydi.
  2. **Davriy:** `services/uploadCleanup.ts` — birgina holatni birinchi
     qatlam qoplay olmaydi: foydalanuvchi tahrirlash oynasida rasm yuklaydi
     (preview ko'rsatish uchun u darhol saqlanadi), keyin **saqlamasdan
     oynani yopadi**. Bu faylga hech kim ishora qilmaydi. Shuning uchun
     sweeper katalogni ko'rib chiqadi va **24 soatdan eski** hamda hech
     qayerda ishlatilmagan fayllarni o'chiradi. Grace period muhim: hozirgina
     yuklangan fayl ta'rifiga ko'ra "ishlatilmagan" bo'ladi, faqat
     "ishlatilmagan" bo'yicha o'chirish foydalanuvchining saqlashi bilan
     poyga qilardi. `index.ts`da rejalashtiriladi (boot'dan 60s keyin, so'ng
     har 6 soatda; timerlar `unref()`).

## Endpointlar (`/api`)

`/health` · `/auth` (register, login, refresh, logout, logout-all, me [GET/PATCH/DELETE]) ·
`/test` (catalog, start, submit, auto-complete [QA-tester only], tab-switch, violation) · `/jobs`
(GET list `?type=&level=&stack=&keyword=&location=&salaryMin=&salaryMax=&sort=`, POST create) ·
`/users` (leaderboard · GET `profile/:handle` [ommaviy, `optionalAuthenticate`] ·
POST `profile/:handle/reviews` · POST/PATCH/DELETE `me/portfolio[/:id]` ·
DELETE `me/reviews/:id`) · `/uploads` (POST `image` — rasm yuklash) · `/admin` (GET `violations`, stats, users CRUD, jobs CRUD,
sessions/list, questions/list — admin-only) · `/webhooks` (POST `questions` —
AI savol import, `X-Webhook-Secret` bilan himoyalangan).

- **`PATCH /auth/me`** (`userController.updateMe`, `validation/userSchemas.ts`) —
  o'z profilini tahrirlash: `name`/`email`/`newPassword`/`primaryDirection` **va
  barcha frilanser-profil maydonlari** (`username`, `avatarUrl`, `coverUrl`,
  `specialization`, `skills`, `about`, `socials`, `country`, `language`,
  `timezone`) — barchasi ixtiyoriy, faqat yuborilgan maydon o'zgaradi.
  `username` band bo'lsa `409`. `skills` butun ro'yxatni almashtiradi
  (registrsiz dublikatlar olib tashlanadi). `newPassword` yuborilsa `currentPassword`
  ham majburiy (schema `refine` + controllerda qayta tekshiriladi,
  `utils/password.ts#verifyPassword`). Email band bo'lsa `409`. `primaryDirection`
  `null` bilan tozalanadi, DIRECTIONS enumiga qarshi tekshiriladi.
- **`PATCH /admin/users/:id`** (`adminController.updateUser`) — `role` va/yoki
  bitta `direction` + `verificationLevel` (Tier) juftligini yangilaydi
  (`update['verificationLevels.<direction>'] = tier`) — butun xaritani emas,
  faqat bitta yo'nalishni.
- **`DELETE /auth/me`** (`userController.deleteMe`) — parol bilan tasdiqlangan
  o'z-o'zini o'chirish. Kaskad: `Job.deleteMany({postedBy})`,
  `Session.deleteMany({userId})`, `RefreshToken.deleteMany({userId})`, keyin
  `User` hujjati o'chiriladi — orfan yozuv qolmaydi.
- `hashPassword`/`verifyPassword` `utils/password.ts`ga chiqarilgan (avval
  `authController.ts`da mahalliy edi) — `register`, `updateMe`, `deleteMe`
  bittasidan foydalanadi.

> `GET /jobs` e'lon egasining reytingini `populate` qilib qaytaradi (`rating` maydoni).
> Barcha admin endpointlar `authenticate` + `adminOnly` middleware bilan himoyalangan.

## Konvensiyalar

- **CORS:** `CLIENT_ORIGIN` (`.env`) — comma-separated ro'yxat (`env.clientOrigins`,
  `config/env.ts`), `app.ts`dagi `cors()` va `sockets/antiCheat.ts`dagi socket.io
  CORS'ga to'g'ridan-to'g'ri array sifatida beriladi. Prod'da deploy qilingan
  frontend domenini shu ro'yxatga qo'sh (masalan
  `http://localhost:3000,https://ishbor-frontend.vercel.app`) — aks holda
  brauzer preflight so'rovni CORS xatosi bilan bloklaydi.
- Path alias `@/` → `backend/src/`.
- Yangi endpoint: model → controller (`asyncHandler`) → Zod sxema → route → `routes/index.ts` ga ulash.
- Sirlarni hech qachon commit qilma; `.env.example` ni yangilab qo'y.

## 📝 Hujjatni yangilab borish (MAJBURIY)

Yangi endpoint / model / servis / konvensiya qo'shsangiz — shu `backend/CLAUDE.md`
ni **o'sha PR ichida** yangilang. Yangi `.env` o'zgaruvchi bo'lsa `.env.example` ni
ham. Batafsil qoida: ildiz `/CLAUDE.md` → "Hujjatlarni yangilab borish".

## Domen egalari (`docs/team/`)

- **Sardor** — auth, jwt, middleware, sockets/antiCheat, User/Session/RefreshToken, config,
  infra, admin **auth/xavfsizlik** qatlami (`requireAdmin`, `role`, `/admin/violations`).
- **Fazilov** — data/questions, config/catalog (savol kontenti).
- **Hidoyatov** — jobController, jobRoutes, Job, jobSchemas + admin **panel/biznes mantiq**
  (CRUD, moderatsiya, dashboard UI) — Sardorning admin auth qatlami ustiga quriladi.

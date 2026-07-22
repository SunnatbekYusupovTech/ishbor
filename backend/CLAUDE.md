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

- **User** — `role` (employer|seeker|admin — `admin` faqat DB orqali beriladi),
  `verificationLevel` (none|junior|middle|senior),
  `bestPercentage`, `bestScore`, `attempts`. Reyting shu yerdan.
- **Job** — `type` (vacancy|resume), `level`, `stack`, `postedBy` (→User), denormallashtirilgan `postedByName`,
  `location`, `salaryMin`, `salaryMax`.
- **Question** — test savoli (`technology`, `category`, daraja, variantlar).
- **Session** — test sessiyasi, tab-switch/heartbeat nazorati.
- **RefreshToken** — `userId`, `tokenHash` (SHA-256, xom token hech qachon saqlanmaydi),
  `expiresAt` (TTL index), `revokedAt`.

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
- **Cooldown:** `testController.startTest` foydalanuvchining oxirgi tugatilgan
  urinishidan keyin `TEST_ATTEMPT_COOLDOWN_MINUTES` (default 10) o'tmaguncha
  yangi sessiya ochilishiga yo'l qo'ymaydi — skript orqali qayta-qayta
  start→submit qilib, qaytarilgan `percentage`ni to'g'ri javoblarni topish
  uchun oracle sifatida ishlatishning oldini oladi. Agar oxirgi urinish
  `TEST_LOW_SCORE_THRESHOLD`dan (default 50%) past bo'lsa, cooldown
  `TEST_LOW_SCORE_COOLDOWN_MULTIPLIER`ga (default 3, ya'ni 30 daqiqa)
  ko'paytiriladi — tez-tez past-sifatli qayta urinishni yanada
  qiyinlashtiradi. `testRateLimiter` (`middleware/rateLimiter.ts`) — IP
  bo'yicha qo'shimcha himoya qatlami.
- **Ko'rilgan savollarni istisno qilish:** `startTest` foydalanuvchining
  barcha oldingi sessiyalaridagi `questionIds`ni (`Session.find({userId}).distinct(...)`)
  yig'ib, shu ro'yxatdan tashqaridagi savollarni birinchi navbatda taklif
  qiladi (`$nin` bilan `$sample`) — takroriy urinishlarda xotirlab
  olingan savollar emas, yangi savollar chiqadi. Agar texnologiya uchun
  ko'rilmagan savollar yetarli bo'lmasa, qolganini ko'rilganlardan
  to'ldiradi (test qisqarib qolmasin deb).
- **Registratsiya IP-limiti:** `authController.register` bitta IP'dan
  `MAX_ACCOUNTS_PER_IP` (default 2) dan ortiq akkaunt ro'yxatdan o'tishiga
  yo'l qo'ymaydi (`User.registrationIp`, `403`) — mavjud akkauntlarga
  tegmaydi, faqat yangi ro'yxatdan o'tishni cheklaydi. Ataylab yumshoq
  (default 2) — umumiy IP'lar (ofis, universitet, NAT) keng tarqalgan,
  qattiqroq limit haqiqiy foydalanuvchilarni bloklab qo'yishi mumkin.
- **AI orqali savol generatsiyasi:**
  - `services/groqQuestionGenerator.ts` — sof Groq chaqiruvchi (DB'siz),
    ikkala quyidagi joy tomonidan ishlatiladi.
  - `services/questionImportService.ts` — savollarni bazaga yozadi,
    matn bo'yicha (katta-kichik harf/probel farqisiz) **dublikatlarni
    o'tkazib yuboradi**, `category`ni `technology`ga tenglashtirib
    to'ldiradi (`seed.ts` konvensiyasi bilan bir xil).
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

## Endpointlar (`/api`)

`/health` · `/auth` (register, login, refresh, logout, logout-all, me) · `/test`
(catalog, start, submit, tab-switch, violation) · `/jobs`
(GET list `?type=&level=&stack=&keyword=&location=&salaryMin=&salaryMax=&sort=`, POST create) ·
`/users` (leaderboard) · `/admin` (GET `violations`, stats, users CRUD, jobs CRUD,
sessions/list, questions/list — admin-only) · `/webhooks` (POST `questions` —
AI savol import, `X-Webhook-Secret` bilan himoyalangan).

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

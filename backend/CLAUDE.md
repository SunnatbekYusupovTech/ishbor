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
- **Auth:** `middleware/authenticate` JWT ni tekshiradi, `req.user` ni to'ldiradi
  (`types/express.d.ts`). Token `utils/jwt`.
- **Javob formati:** har doim `{ success: true, data }` yoki xatoda
  `{ success: false, error: { message, details? } }`.

## Modellar

- **User** — `role` (employer|seeker), `verificationLevel` (none|junior|middle|senior),
  `bestPercentage`, `bestScore`, `attempts`. Reyting shu yerdan.
- **Job** — `type` (vacancy|resume), `level`, `stack`, `postedBy` (→User), denormallashtirilgan `postedByName`.
- **Question** — test savoli (`technology`, `category`, daraja, variantlar).
- **Session** — test sessiyasi, tab-switch/heartbeat nazorati.

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

## Endpointlar (`/api`)

`/health` · `/auth` (register, login, me) · `/test` (catalog, start, submit,
tab-switch) · `/jobs` (GET list `?type=&level=&stack=`, POST create) · `/users`
(leaderboard).

> `GET /jobs` e'lon egasining reytingini `populate` qilib qaytaradi (`rating` maydoni).

## Konvensiyalar

- Path alias `@/` → `backend/src/`.
- Yangi endpoint: model → controller (`asyncHandler`) → Zod sxema → route → `routes/index.ts` ga ulash.
- Sirlarni hech qachon commit qilma; `.env.example` ni yangilab qo'y.

## 📝 Hujjatni yangilab borish (MAJBURIY)

Yangi endpoint / model / servis / konvensiya qo'shsangiz — shu `backend/CLAUDE.md`
ni **o'sha PR ichida** yangilang. Yangi `.env` o'zgaruvchi bo'lsa `.env.example` ni
ham. Batafsil qoida: ildiz `/CLAUDE.md` → "Hujjatlarni yangilab borish".

## Domen egalari (`docs/team/`)

- **Sardor** — auth, jwt, middleware, sockets/antiCheat, User/Session, config, infra.
- **Fazilov** — data/questions, config/catalog (savol kontenti).
- **Hidoyatov** — jobController, jobRoutes, Job, jobSchemas + admin (yangi).

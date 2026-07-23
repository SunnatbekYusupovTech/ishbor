# CLAUDE.md — Ishbor Skill Portal

> Bu fayl har bir Claude Code sessiyasida avtomatik yuklanadi. Loyihaning umumiy
> konteksti shu yerda — kim prompt bermasin, kontekst yo'qolmaydi.

## Loyiha nima?

**Ishbor** — malaka tasdiqlash (skill assessment) + ish e'lonlari platformasi.
Ish qidiruvchilar xavfsiz, anti-cheat himoyali test topshirib "tasdiqlangan" daraja
(junior/middle/senior) oladi; ish beruvchilar vakansiya joylaydi. Barchasi bitta
e'lonlar sahifasida ko'rinadi va daraja/yo'nalish bo'yicha filtrlanadi.

## Texnologiyalar

**Monorepo** (npm workspaces): `backend` + `frontend`.

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3,
  shadcn/ui (Radix), next-intl (uz/ru/en), next-themes, lucide-react, socket.io-client
- **Backend:** Express 4, TypeScript, Mongoose 8 (MongoDB), Socket.io, JWT
  (`jsonwebtoken`), Zod validatsiya, helmet, cors. Test: Vitest + supertest +
  mongodb-memory-server.

## Papka tuzilishi

```
backend/src/
  config/      env, db, catalog (stack→texnologiyalar)
  controllers/ auth, user, job, test
  middleware/  authenticate, validate, errorHandler
  models/      User, Job, Question, Session
  routes/      index → /auth /test /jobs /users (+ /health)
  services/    scoringService (ballash)
  sockets/     antiCheat (real-time)
  validation/  Zod sxemalar (jobSchemas, testSchemas)
  data/        questions (savollar bazasi)
  scripts/     seed
frontend/src/
  app/[locale]/ page (e'lonlar), login, leaderboard, test, jobs/new, layout
  components/   JobCard, JobDetailDialog, rating, badges, SiteNav,
                QuestionCard, Timer, ResultCard, AntiCheat*, ui/*
  hooks/        useCountdown, useHeartbeat, useAntiCheat, useExamLockdown, useFullscreen
  lib/          api (fetch klient), socket, utils (cn)
  i18n/         routing, navigation, request
  messages/     uz.json, ru.json, en.json
```

## Ishga tushirish

```bash
npm run dev              # backend (5000) + frontend (3000) birga
npm run build            # ikkalasini build qiladi
npm run lint             # ikkalasini lint qiladi
npm run seed -w backend  # demo ma'lumot (employer@ishbor.uz / seeker@ishbor.uz, parol: password123)
npm run test -w backend  # Vitest
```
Muhit o'zgaruvchilari: `backend/.env` (namuna: `backend/.env.example`),
`frontend/.env.local` (namuna: `frontend/.env.local.example`).

## Muhim konvensiyalar

- **API javob formati:** `{ success, data }` yoki xatoda `{ success: false, error: { message, details } }`. Frontend `lib/api.ts` `payload.data` ni qaytaradi.
- **Auth:** JWT `localStorage`da `ishbor_token` kaliti ostida (`tokenStore`). REST va Socket.io bir xil token ishlatadi.
- **i18n:** har yangi matn **uz/ru/en uchtala** `messages/*.json` ga qo'shilishi shart. Komponentda `useTranslations('namespace')`.
- **Path alias:** ikkala tomonda ham `@/` → `src/`.
- **Rollar:** `User.role` = `employer | seeker` (admin panel uchun `admin` roli keyin qo'shiladi).
- **Import qilinadigan tiplar:** `frontend/src/types/domain.ts` (Job, Me, LeaderboardEntry, Catalog, JobRating...).

## Yaqinda qilingan ishlar

- **6-pog'onali yo'nalish-bo'yicha malaka darajasi (Sardor):** `User.verificationLevel`
  (bitta, 4 qiymat) o'rniga `verificationLevels` — **har yo'nalish** (frontend/backend/
  fullstack/mobile) uchun alohida, 7 qiymatli `Tier` (none/junior/strong-junior/middle/
  strong-middle/senior/strong-senior; 1/3/5 o'tilgan texnologiya = junior/middle/senior,
  juft sonlar = "strong" varianti). `Session.direction` saqlanadi, `finalizeSession`
  faqat o'sha yo'nalishni yangilaydi. `primaryDirection` — foydalanuvchi profilida
  o'zi tanlaydigan "men kimman" (faqat ko'rsatish uchun). Profil sahifasida har
  yo'nalish uchun width-based progress bar (`DirectionProgress`). Resume joylash
  endi **tanlangan stack**ka mos darajaga qarab ochiladi (`jobs/new`). Batafsil:
  `backend/CLAUDE.md` → "Modellar", `frontend/CLAUDE.md` → "Marshrutlar".
- **QA/anti-cheat test hisobi + trilingual AI savol tarjimasi + mobil responsive
  (Sardor):** `qa@ishbor.uz` (`User.isQaTester`) — cooldown va "faol sessiya bor"
  qo'riqchilaridan mustasno, `POST /test/auto-complete` bilan sessiyani darhol
  5/5 yakunlaydi (test/page.tsx'da "QA: Avtomatik tugatish" tugmasi) — anti-cheat
  oqimini uz/ru/en'da tez-tez sinash uchun. Batafsil: `backend/CLAUDE.md` →
  "Test (assessment) engine". AI orqali generatsiya qilingan savollar endi
  Groq'dan bitta chaqiruvda EN+RU+UZ tarjima bilan keladi. Mobil UI: e'lonlar
  sahifasi sidebar'i va header menyu endi mobil'da to'liq ekranli (full
  width+height), chapdan slayd bilan ochiladigan/yopiladigan (animate-in/out,
  duration-300) overlay; breakpointlar bir bosqichga siljitildi (`sm→md→lg→xl`);
  e'lon kartalari 320px gacha wrap bo'ladigan qilib moslashtirildi.
- **AI orqali savol generatsiyasi + anti-cheat/anti-abuse mustahkamlash (Sardor):**
  `backend/src/scripts/generateQuestions.ts` (`npm run generate-questions`) —
  Groq (bepul) orqali savollar generatsiya qilib, o'zining
  `POST /api/webhooks/questions` webhook'iga yuboradi (`X-Webhook-Secret`
  bilan himoyalangan, `node-cron` bilan o'z-o'zini rejalashtiradi). Qo'shimcha:
  `TEST_ATTEMPT_COOLDOWN_MINUTES` (skript orqali score-oracle hujumidan
  himoya), global + test-specific rate-limit, `navigator.webdriver` bot
  aniqlash, `debugger`-trap DevTools aniqlash, admin sessiyalar sahifasida
  shubhali (IP o'zgargan / juda tez tugagan) sessiyalarni belgilash.
  Batafsil: `backend/CLAUDE.md` → "Test (assessment) engine".
- **Kengaytirilgan filtrlar:** `Job` modeliga `location`, `salaryMin`/`salaryMax` qo'shildi.
  Server-side keyword qidiruv (title, company, description, postedByName), location filter,
  salary range filter, sort (newest/oldest/salary_asc/salary_desc). Frontendda barcha yangi
  filtrlar UI ga qo'shildi (joylashuv inputi, maosh min/max, sort select, kengaytirilgan filtrlar toggle).
- **Admin panel (yangi modul):**
  - Backend: `adminOnly` middleware, `adminController` (stats, users CRUD, jobs CRUD, sessions,
    questions), `adminRoutes`
  - Frontend: Dashboard, Users, Jobs, Sessions, Questions sahifalari
  - `User` modeliga `admin` roli qo'shildi
  - `SiteNav` da faqat adminlarga ko'rinadigan Admin linki
- **hh.uz-uslubidagi redizayn** (Fazilov): dizayn-token'lar **ko'k `primary`** (harakat
  aksenti, `#0069f5`) + **qizil `brand`** (faqat logo/xato, `#d6001c`), `success` yashil
  maosh uchun. Onest + JetBrains Mono (`next/font`), radius `0.75rem`. Batafsil:
  `frontend/CLAUDE.md` → "Dizayn tili".
- **E'lonlar sahifasi — hh.uz job-board layout:**
  - Yuqorida keng qidiruv + rol segmenti; pastda **ikki ustun** — chapda sticky sidebar
    vidjetlar (Faoliyatingiz/Saqlanganlar, Filtrlar, Saqlangan qidiruvlar preset'lari,
    malaka-promo, mehmon-kirish), o'ngda **bitta ustunli keng karta lentasi**.
  - `SiteNav` header: qizil `ish` logo, `Toshkent` city pill, saqlanganlar (yurak+counter),
    bildirishnoma qo'ng'irog'i (empty-state popover).
  - `JobCard`: keng "orol" karta — ko'k `BadgeCheck` verifikatsiya, `EyeOff` yashirish +
    `Heart` saqlash, ko'k `Bog'lanish`; bosilganda `JobDetailDialog`.
  - **Saqlanganlar:** `lib/favorites.ts` (localStorage + `useSyncExternalStore`) — header,
    kartalar va sidebar counteri sinxron.
  - **Reyting:** `jobController` egasining test natijalarini `populate` qiladi;
    `components/rating.tsx` yulduz + avatar.
  - Yangi fayllar: `lib/favorites.ts`, `components/rating.tsx`, `components/JobDetailDialog.tsx`.
- **Responsive + i18n + UX tuzatishlar (butun sayt):**
  - **Test savollari lokalizatsiyasi:** ingliz kanonik (ballash indeks bo'yicha), RU/UZ
    tarjimalar `backend/src/data/questionTranslations.ts` da (texnologiya + tartib bo'yicha).
    `Question` modeliga `key` + `translations` qo'shildi; `seed.ts` `<tech>-<n>` kalit va
    tarjimalarni biriktiradi; `testController.startTest` `locale` (body yoki
    `Accept-Language`) bo'yicha lokalizatsiya qiladi va **kanonik tartibda** variantlarni
    aynan bir xil `order` bilan aralashtiradi (ballash o'zgarmaydi). **Diqqat:** tarjimalar
    ishlashi uchun `npm run seed -w backend` qayta ishga tushirilishi shart.
  - **Anti-cheat test sahifasiga ulandi:** `useAntiCheat` (REST) + `AntiCheatBanner` +
    `ViolationDialog`; `proctor` namespace uch tilga qo'shildi. Modal ochilganda savol
    taymeri **pauza** qilinadi (modal "Keyingi"ni bosmaydi), hisoblagich backend'dan.
  - **Login/register:** parolni ko'rsatish (ko'z ikonkasi), `confirmPassword`, brauzer
    validatsiyasi o'chirildi (`noValidate`) — maydon ostida lokalizatsiyalangan xatolar.
  - **Buglar:** yashirilgan e'lonlar `lib/hidden.ts` (localStorage); maosh diapazoni
    validatsiyasi (`jobs/new`); "Boshlash" 0 texnologiyada disabled + hint; ICU plural
    (`selectedSummary`, `warningsLeft`); mobil header menyusi (hamburger); mobil-xavfsiz
    `Dialog` (ekran chetlariga tegmaydi, `max-h`).
  - Yangi fayllar: `backend/src/data/questionTranslations.ts`, `frontend/src/lib/hidden.ts`.

## Jamoaviy taqsimot

Loyiha 3 o'quvchiga bo'lingan — batafsil `docs/team/` da:
- **`docs/team/Sardor.md`** — Xavfsizlik & Anti-cheat (eng og'ir yadro)
- **`docs/team/Fazilov.md`** — UI dizayn & Test kontenti (har stack uchun savollar)
- **`docs/team/Hidoyatov.md`** — Admin panel, e'lonlar, filtrlar, narxlar, buglar

Har kim o'z domenining backend + frontend qismini to'liq egallaydi. Umumiy fayllar
(`lib/api.ts`, `types/domain.ts`, `messages/*.json`, `routes/index.ts`) — faqat o'z
bo'limini qo'shadi, kichik va tez-tez PR qiladi.

## Ish tartibi (GitHub)

- `main` himoyalangan — faqat PR orqali; har PR kamida 1 review.
- Branch nomi ish bo'yicha: `feature/...`, `fix/...`, `content/...`.
- Har kuni `git pull origin main`. `.env` fayllar **hech qachon** commit qilinmaydi.
- **PR shabloni:** `.github/pull_request_template.md` — har PR'da checklist avtomatik chiqadi.
- **CODEOWNERS:** `.github/CODEOWNERS` — har papkaga avtomatik reviewer biriktiradi.
  GitHub akkauntlar: Sardor=`@SARDORALOYEV`, Fazilov=`@Kamron5505`, Hidoyatov=`@zone24uzz`.

## 📝 Hujjatlarni yangilab borish (MAJBURIY)

**Har qanday yangi o'zgarish kiritilganda tegishli `.md` fayllar ham shu PR ichida
yangilanishi shart.** Hujjat kod bilan birga yangilanadi — keyinga qoldirilmaydi.

Qachon nima yangilanadi:

| O'zgarish turi | Yangilanadigan fayl |
|---|---|
| Yangi feature / katta o'zgarish | ildiz `CLAUDE.md` → "Yaqinda qilingan ishlar" |
| Backend: yangi endpoint, model, servis, konvensiya | `backend/CLAUDE.md` |
| Frontend: yangi sahifa, komponent, dizayn qoidasi | `frontend/CLAUDE.md` |
| Vazifa bajarildi / yangi vazifa paydo bo'ldi | tegishli `docs/team/*.md` (checklist) |
| Domen egaligi o'zgardi | `docs/team/README.md` |
| Yangi `.env` o'zgaruvchi | `*.env.example` + tegishli CLAUDE.md |

**PR checklist** (har PR tavsifiga qo'shing):
- [ ] Kod o'zgarishi tugadi va lokal test/lint o'tdi
- [ ] Tegishli `CLAUDE.md` / `docs/team/*.md` yangilandi
- [ ] Yangi matn bo'lsa `messages/{uz,ru,en}.json` uchtala tilga qo'shildi

> Claude bilan ishlaganda: kod o'zgartirgandan so'ng doim tegishli `.md` fayllarni
> ham yangila — kontekst keyingi sessiyalarda yo'qolmasligi uchun.

## Gotcha (diqqat)

- MongoDB Atlas'ga bu muhitda **SRV (`mongodb+srv://`) orqali ulanib bo'lmaydi** — DNS
  hal qilinmaydi. To'g'ridan-to'g'ri (non-SRV) ulanish satridan foydalaning.

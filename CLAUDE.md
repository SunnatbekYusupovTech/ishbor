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

- **E'lonlar sahifasi to'liq qayta dizayn** (zamonaviy UI):
  - Rol segmenti (Hammasi / Ish beruvchilar / Ish qidiruvchilar), yo'nalish + daraja filtrlari, matnli qidiruv, natijalar soni, skeleton yuklanish.
  - Flex/grid card layout; ish beruvchi = indigo, ish qidiruvchi = emerald aksent.
  - Card ustiga bosilganda **to'liq detal modal** (`JobDetailDialog`) — barcha ma'lumot + reyting + bog'lanish.
  - **Reyting tizimi:** `jobController` e'lon egasining test natijalarini (`verificationLevel`, `bestPercentage`, urinishlar) `populate` qiladi; `components/rating.tsx` yulduzli reyting + avatar chizadi.
  - Yangi fayllar: `components/rating.tsx`, `components/JobDetailDialog.tsx`.

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
- **CODEOWNERS:** `.github/CODEOWNERS` — har papkaga avtomatik reviewer biriktiradi
  (⚠️ ichidagi `@sardor/@fazilov/@hidoyatov` haqiqiy GitHub username'lar bilan almashtirilsin).

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

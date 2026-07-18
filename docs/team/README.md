# 👥 Jamoa taqsimoti — Ishbor Skill Portal

Loyiha 3 o'quvchiga bo'lingan. Har kim o'z domenining **backend + frontend** qismini
to'liq egallaydi (full-stack). Batafsil vazifalar har kimning faylida.

| O'quvchi | GitHub | Domen | Fayl |
|---|---|---|---|
| **Sardor** | [@SARDORALOYEV](https://github.com/SARDORALOYEV) | 🔐 Xavfsizlik & Anti-cheat (eng og'ir yadro) | [Sardor.md](./Sardor.md) |
| **Fazilov** | [@Kamron5505](https://github.com/Kamron5505) | 🎨 UI dizayn & Test kontenti (har stack uchun savollar) | [Fazilov.md](./Fazilov.md) |
| **Hidoyatov** | [@zone24uzz](https://github.com/zone24uzz) | 🛠 Admin panel, e'lonlar, filtrlar, narxlar, buglar | [Hidoyatov.md](./Hidoyatov.md) |

## Umumiy fayllar (hamma tegadi — ehtiyot bo'ling)

`frontend/src/lib/api.ts` · `frontend/src/types/domain.ts` ·
`frontend/messages/{uz,ru,en}.json` · `backend/src/routes/index.ts`

Qoida: faqat o'z bo'limingni qo'sh, o'chirma; kichik va tez-tez PR qil.

## Bog'liqliklar (kelishib olish shart)

1. **Admin roli:** Sardor `User.role` ga `admin` qo'shadi → Hidoyatov ishlatadi.
2. **Savollar → ballash:** Fazilovning savollari Sardorning `Question`/`testSchemas` formatiga mos bo'lsin.
3. **UI komponentlar:** Fazilovning `components/ui/*` va `rating.tsx` ni Hidoyatov admin panelda ishlatadi.
4. **Anti-cheat loglari:** Sardor beradi → Hidoyatov admin dashboardda ko'rsatadi.

## Ish tartibi

- `main` himoyalangan — faqat PR orqali; har PR kamida 1 review.
- Branch: `feature/...`, `fix/...`, `content/...` (ish bo'yicha nomlanadi).
- Har kuni `git pull origin main`. `.env` fayllar **hech qachon** commit qilinmaydi.

## 📝 Hujjatlarni yangilab borish (MAJBURIY)

**Har qanday yangi o'zgarish kiritilganda tegishli `.md` fayllar ham shu PR ichida
yangilanishi shart** — hujjat kod bilan birga yuriladi:

- Feature/katta o'zgarish → ildiz `CLAUDE.md` ("Yaqinda qilingan ishlar")
- Backend/Frontend o'zgarishi → `backend/CLAUDE.md` / `frontend/CLAUDE.md`
- Vazifa bajarildi yoki yangi vazifa → o'zingizning `docs/team/*.md` checklisti
- Egalik o'zgardi → shu `README.md`

Batafsil PR checklist: ildiz `/CLAUDE.md` → "Hujjatlarni yangilab borish".

> Loyihaning texnik konteksti: ildizdagi `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`.

# 🔐 Sardor — Xavfsizlik & Anti-cheat (eng og'ir "yadro")

> Loyihaning eng murakkab, ishonchni talab qiladigan qismi. Bu — tizimning "dvigateli".

---

## 🎯 Asosiy mas'uliyat

Autentifikatsiya, xavfsizlik, anti-cheat tizimi va backend infratuzilmasi. Foydalanuvchi ma'lumotlari va test halolligini himoya qilish sen zimmangda.

---

## 📂 Mavjud kod (egalik qilasan)

### Backend
| Fayl | Vazifasi |
|---|---|
| `backend/src/sockets/antiCheat.ts` | Real-time anti-cheat socket mantiq |
| `backend/src/middleware/authenticate.ts` | JWT tekshiruv middleware |
| `backend/src/middleware/validate.ts` | Kiruvchi ma'lumot validatsiyasi |
| `backend/src/middleware/errorHandler.ts` | Markaziy xato boshqaruv |
| `backend/src/utils/jwt.ts` | Token yaratish/tekshirish |
| `backend/src/utils/{ApiError,asyncHandler,logger}.ts` | Infra utilitalar |
| `backend/src/controllers/authController.ts` | Ro'yxatdan o'tish / kirish |
| `backend/src/routes/authRoutes.ts` | Auth endpointlar |
| `backend/src/models/User.ts` | Foydalanuvchi modeli |
| `backend/src/models/Session.ts` | Test sessiyasi (tab-switch nazorati) |
| `backend/src/config/{env,db}.ts` | Muhit va DB ulanishi |

### Frontend
| Fayl | Vazifasi |
|---|---|
| `frontend/src/hooks/useAntiCheat.ts` | Anti-cheat hook |
| `frontend/src/hooks/useExamLockdown.ts` | Ekran qulflash |
| `frontend/src/hooks/useFullscreen.ts` | To'liq ekran rejimi |
| `frontend/src/hooks/useHeartbeat.ts` | Server bilan doimiy aloqa |
| `frontend/src/components/AntiCheatBanner.tsx` | Ogohlantirish banneri |
| `frontend/src/components/ViolationDialog.tsx` | Qoidabuzarlik oynasi |
| `frontend/src/lib/socket.ts` | Socket.io klient |

---

## 🚀 Yangi vazifalar (doimiy ish)

- [x] **Anti-cheat kuchaytirish:** ~~copy/paste bloklash~~ ✅, ~~DevTools aniqlash~~ ✅, ~~ko'p oyna/tab nazorati~~ ✅
      (fullscreen-asosli, brauzer cheklovi sababli 100% oldini olib bo'lmaydi — batafsili notepadda),
      ~~right-click va screenshot ogohlantirish~~ ✅ (screenshot faqat PrintScreen holatida — texnik chegara, batafsili notepadda)
      — barcha kod tomoni tugadi. **Real brauzerda qo'lda tekshirildi (2026-07-19):** boshqa tabga
      o'tilganda `ViolationDialog` to'g'ri chiqdi va ogohlantirdi — qo'lda tekshirish bosqichi yopildi.
      Shu safar kichik i18n xatosi ham topildi va tuzatildi: `AntiCheatBanner.tsx`da limit hali
      noma'lum bo'lganda literal inglizcha `'none'` so'zi qattiq yozilgan edi (uz/ru interfeysida ham
      shunday chiqardi) — endi `proctor.limitUnknown` tarjima kaliti orqali uch tilda to'g'ri ko'rsatiladi.
- [x] **Server tomonda taymer nazorati** — `testController.ts`da `Session.deadline` bilan tekshiriladi (⚠️ eng muhim, tasdiqlandi)
- [x] **Rate-limiting** — `middleware/rateLimiter.ts`, `/auth/login` va `/auth/register` uchun 15 daqiqada 10 urinish (2026-07-19)
- [x] Input sanitizatsiya (NoSQL injection himoyasi) — `middleware/sanitize.ts`, global ulandi (2026-07-19)
- [x] `helmet` sozlamalarini qattiqlashtirish — CSP, CORP, shartli HSTS (2026-07-19)
- [x] **JWT refresh token** — opaque token + `RefreshToken` modeli, rotatsiya,
      `POST /auth/refresh`/`logout`, frontendda avtomatik yangilash oqimi (2026-07-19)
- [x] **Parol siyosati** — faqat register uchun murakkablik talabi, login har doim
      qabul qiladi (legacy foydalanuvchilar qulflanib qolmasin) (2026-07-19)
- [x] **Sessiyani majburan bekor qilish** — `POST /auth/logout-all`, barcha
      refresh tokenlarni bekor qiladi, `SiteNav`da UI (⚠️ Fazilov bilan
      joylashuv hali kelishilmagan) (2026-07-19)
- [x] Anti-cheat hodisalarini loglash va admin panelga uzatish — `GET /api/admin/violations`
      kod tomoni tayyor (taklif qilingan formatda, `admin` roli bilan himoyalangan)
      (2026-07-19). ⚠️ Hidoyatov formatni hali tasdiqlamagan — batafsili notepadda.

> Batafsil, bosqichma-bosqich checklist: [`docs/workspace/SardorTasks.md`](../workspace/SardorTasks.md)

---

## 🔗 Kim bilan kelishasan

- **Hidoyatov (admin):** ~~`User.ts` ga `admin` roli qo'shasan; admin himoya middleware yozasan. Anti-cheat loglarini admin dashboard uchun berasan.~~ Kod tomoni tayyor (2026-07-19) — `admin` roli, `requireAdmin` middleware, `GET /api/admin/violations`. Endi faqat Hidoyatov bilan format/vaqt tasdiqlash qoldi.
- **Fazilov (test):** savollar formati (`Question.ts`, `testSchemas.ts`) va ballash tizimi bo'yicha kelishasan.

---

## ⚠️ Umumiy fayllar (ehtiyot bo'l)

`lib/api.ts`, `types/domain.ts`, `routes/index.ts` — faqat o'z bo'limingni qo'sh, kichik va tez-tez PR qil.

## 📌 Ish tartibi
- `main` ga to'g'ridan-to'g'ri push yo'q — faqat PR orqali
- Branch nomi: `feature/security-...`, `fix/anticheat-...`
- Har PR'ni kamida 1 kishi review qiladi
- Har kuni `git pull origin main`
- `.env` faylni **hech qachon** commit qilma
- 📝 **Kod o'zgarganda tegishli `.md` / `CLAUDE.md` ni ham shu PR'da yangila** (majburiy)

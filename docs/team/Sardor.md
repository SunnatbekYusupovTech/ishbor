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

- [ ] **Anti-cheat kuchaytirish:** copy/paste bloklash, DevTools aniqlash, ko'p oyna/tab nazorati, right-click va screenshot ogohlantirish
- [ ] **Server tomonda taymer nazorati** — klient vaqtni aldab bo'lmasin (⚠️ eng muhim)
- [ ] **Rate-limiting** + `helmet` + input sanitizatsiya (brute-force va injection himoyasi)
- [ ] **JWT refresh token** + parol siyosati + sessiyani majburan bekor qilish
- [ ] Anti-cheat hodisalarini loglash va admin panelga uzatish

---

## 🔗 Kim bilan kelishasan

- **Hidoyatov (admin):** `User.ts` ga **`admin` roli** qo'shasan; admin himoya middleware yozasan. Anti-cheat loglarini admin dashboard uchun berasan.
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

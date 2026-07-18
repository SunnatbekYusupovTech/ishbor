# 🛠 Hidoyatov — Admin panel, e'lonlar, filtrlar, narxlar, buglar

> Boshqaruv va biznes qismi. Katta mustaqil modul — admin panel.

---

## 🎯 Asosiy mas'uliyat

Ish e'lonlari tizimi, kengaytirilgan filtrlar, yangi admin panel, narx/tariflar va butun loyiha bo'ylab xatolarni tuzatish.

---

## 📂 Mavjud kod (egalik qilasan)

### Backend
| Fayl | Vazifasi |
|---|---|
| `backend/src/controllers/jobController.ts` | E'lonlar mantiq (ro'yxat, yaratish) |
| `backend/src/routes/jobRoutes.ts` | E'lon endpointlar |
| `backend/src/models/Job.ts` | E'lon modeli |
| `backend/src/validation/jobSchemas.ts` | E'lon validatsiyasi |

### Frontend
| Fayl | Vazifasi |
|---|---|
| `frontend/src/app/[locale]/page.tsx` | E'lonlar asosiy sahifasi |
| `frontend/src/app/[locale]/jobs/new/page.tsx` | Yangi e'lon berish |
| `frontend/src/components/JobCard.tsx` | E'lon kartasi |
| `frontend/src/components/JobDetailDialog.tsx` | E'lon detallari modal |

---

## 🚀 Yangi vazifalar (doimiy ish)

- [ ] **Admin panel (yangi katta modul):**
  - E'lonlar / foydalanuvchilarni boshqarish (CRUD)
  - Moderatsiya (nomaqbul e'lonlarni o'chirish/tasdiqlash)
  - Fazilov yozgan savollarni tasdiqlash
  - Statistika dashboard
  - Anti-cheat hodisalarini ko'rish (Sardordan ma'lumot keladi)
- [ ] **Kengaytirilgan filtrlar:** maosh oralig'i, joylashuv, sana bo'yicha saralash, kalit so'z
- [ ] **Narxlar / tariflar:** e'lon joylash uchun to'lov / premium e'lonlar
- [ ] **Bug tracking:** GitHub Issues'ni yuritish va xatolarni tuzatish (butun loyiha bo'ylab)

---

## 🔗 Kim bilan kelishasan

- **Sardor (auth):** admin panel uchun `User.role` ga **`admin`** roli va admin himoya middleware kerak — Sardor qo'shadi, sen ishlatasan. Anti-cheat loglarini u beradi.
- **Fazilov (UI):** admin panelda uning `components/ui/*` va `rating.tsx` komponentlaridan foydalanasan.

---

## ⚠️ Umumiy fayllar (ehtiyot bo'l)

`lib/api.ts`, `types/domain.ts`, `messages/*.json`, `routes/index.ts` — faqat o'z bo'limingni qo'sh, kichik va tez-tez PR qil.

## 📌 Ish tartibi
- `main` ga to'g'ridan-to'g'ri push yo'q — faqat PR orqali
- Branch nomi: `feature/admin-...`, `feature/jobs-...`, `fix/...`
- Har PR'ni kamida 1 kishi review qiladi
- Har kuni `git pull origin main`
- `.env` faylni **hech qachon** commit qilma
- 📝 **Kod o'zgarganda tegishli `.md` / `CLAUDE.md` ni ham shu PR'da yangila** (majburiy)

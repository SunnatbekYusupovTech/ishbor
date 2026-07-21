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

- [x] **Kengaytirilgan filtrlar:**
  - `location` maydoni (model, controller, frontend)
  - `salaryMin`/`salaryMax` — maosh oralig'i bo'yicha filterlash
  - `keyword` — server-side to'liq matnli qidiruv (title, company, description, postedByName)
  - `sort` — `newest`, `oldest`, `salary_asc`, `salary_desc`
  - Frontendda: joylashuv inputi, maosh diapazoni, sort select, kengaytirilgan filtrlar toggle
- [x] **Admin panel (yangi katta modul):**
  - **Backend:**
    - `User` modeliga `admin` roli qo'shildi
    - `adminOnly` middleware yozildi
    - `adminController` — statistika (`/stats`), foydalanuvchilarni CRUD (`/users`), e'lonlarni boshqarish (`/jobs`), anti-cheat sessiyalar (`/sessions`), savollar bazasi (`/questions`)
    - `adminRoutes` ni `routes/index.ts` ga ulash
  - **Frontend:**
    - Dashboard (`/admin`) — statistik kartalar, bo'limlar bo'yicha tahlil
    - Users (`/admin/users`) — qidiruv, pagination, o'chirish
    - Jobs (`/admin/jobs`) — qidiruv, pagination, o'chirish
    - Sessions (`/admin/sessions`) — status filter, anti-cheat loglari
    - Questions (`/admin/questions`) — texnologiya va qiyinchilik bo'yicha filter
    - `SiteNav` ga admin linki (faqat admin roliga)
- [ ] **Narxlar / tariflar:** e'lon joylash uchun to'lov / premium e'lonlar
- [ ] **Bug tracking / fixes (navbatdagi):**

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

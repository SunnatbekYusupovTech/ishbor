# 🎨 Fazilov — UI dizayn & Test kontenti

> Asosan interfeys + har stack uchun yangi test savollarini yozib chiqasan (katta, tugamaydigan ish).

---

## 🎯 Asosiy mas'uliyat

Butun ilovaning ko'rinishi (UI/UX) va test savollari bazasi. Sayt zamonaviy, qulay va izchil bo'lishi hamda har texnologiya bo'yicha sifatli savollar bo'lishi sen zimmangda.

---

## 📂 Mavjud kod (egalik qilasan)

### Frontend UI
| Fayl | Vazifasi |
|---|---|
| `frontend/src/components/ui/*` | button, card, dialog, alert, progress |
| `frontend/src/components/theme-*` | Mavzu (light/dark) |
| `frontend/src/components/badges.tsx` | Daraja/stack nishonlari |
| `frontend/src/components/rating.tsx` | Yulduzli reyting + avatar |
| `frontend/src/app/[locale]/layout.tsx` | Umumiy layout |
| `frontend/src/app/globals.css` | Global uslublar, ranglar |
| `frontend/src/app/[locale]/test/page.tsx` | Test sahifasi (UI) |
| `frontend/src/components/QuestionCard.tsx` | Savol kartasi |
| `frontend/src/components/Timer.tsx` | Taymer UI |
| `frontend/src/components/ResultCard.tsx` | Natija kartasi |
| `frontend/messages/{uz,ru,en}.json` | Tarjimalar (i18n) |

### Test kontenti
| Fayl | Vazifasi |
|---|---|
| `backend/src/data/questions.ts` | **Savollar bazasi** |
| `backend/src/config/catalog.ts` | Stack → texnologiyalar ro'yxati |

---

## 🚀 Yangi vazifalar (doimiy ish)

- [ ] **Har stack uchun qo'shimcha savollar** (`data/questions.ts`):
  - Frontend, Backend, Fullstack, Mobile
  - Har texnologiya bo'yicha ko'proq savol
  - Junior / Middle / Senior darajalarda
  - > Bu tugamaydigan kontent ishi — doim savol qo'shib borasan
- [ ] Butun UI izchilligi: responsive, dark mode, animatsiyalar, bo'sh/loading holatlar
- [ ] Yangi sahifalar dizayni
- [ ] Dizayn-tizim: ranglar, shriftlar, spacing standartlari

---

## 🔗 Kim bilan kelishasan

- **Sardor (test yadrosi):** yozgan savollaring `Question.ts` va `testSchemas.ts` formatiga mos bo'lishi kerak. Ballash tizimiga (`scoringService`) mos savol tuzasan.
- **Hidoyatov (admin/e'lonlar):** sening `components/ui/*` va `rating.tsx` komponentlaringni u admin panelda ishlatadi — barqaror interfeys ber.

---

## ⚠️ Umumiy fayllar (ehtiyot bo'l)

`messages/*.json`, `lib/api.ts`, `types/domain.ts` — faqat o'z bo'limingni qo'sh, kichik va tez-tez PR qil.

## 📌 Ish tartibi
- `main` ga to'g'ridan-to'g'ri push yo'q — faqat PR orqali
- Branch nomi: `feature/ui-...`, `content/questions-...`
- Har PR'ni kamida 1 kishi review qiladi
- Har kuni `git pull origin main`
- `.env` faylni **hech qachon** commit qilma
- 📝 **Kod o'zgarganda tegishli `.md` / `CLAUDE.md` ni ham shu PR'da yangila** (majburiy)

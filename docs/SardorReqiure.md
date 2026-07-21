# SardorReqiure — Sardorning qonun-qoidalari

> Bu hujjat Sardor (SARDORALOYEV) tomonidan `gojo` branchida qilingan
> o'zgarishlarga asoslangan. Admin panel ishlari Sardorning xavfsizlik/anti-cheat
> moduliga tayanadi — conflict chiqmasligi uchun quyidagi qoidalarga to'liq rioya
> qilish shart.

---

## 1. User.role — `admin` faqat DB orqali beriladi

`UserRole = 'employer' | 'seeker' | 'admin'`

- **Registration (`registerSchema`):** faqat `employer` / `seeker` ni qabul qiladi
- **`admin`** rolini hech kim o'ziga o'zi bera olmaydi — faqat MongoDB Compass/shell
  orqali qo'lda beriladi
- JWT ichida **role saqlanmaydi** — har safar DB dan tekshiriladi

**Manba:** `backend/src/models/User.ts`

---

## 2. Admin middleware — `requireAdmin`

> `middleware/requireAdmin.ts` — `authenticate` dan keyin zanjirlanadi

- Har so'rovda DB'dan foydalanuvchini qayta o'qib rolni tekshiradi
- `requireAdmin` deb nomlangan (adminOnly emas!)
- Ishlatilishi: `router.get('/path', authenticate, requireAdmin, handler)`

**Manba:** `backend/src/middleware/requireAdmin.ts`

---

## 3. Admin violations endpoint — GET /api/admin/violations

- `backend/src/controllers/adminController.ts` da `getViolations` funksiyasi
- Yangi log modeli yo'q — mavjud `Session` maydonlaridan quradi:
  - `sessionId`, `user: {id,name,email} | null`, `status`,
    `tabSwitchCount`, `violationCount`, `terminationReason`,
    `startTime`, `endTime`, `deadline`
- `?limit=` bor (default 50, max 200)
- Faqat "diqqatga loyiq" sessiyalarni qaytaradi:
  `tabSwitchCount > 0 OR violationCount > 0 OR status === 'terminated'`
- `backend/src/routes/adminRoutes.ts` da `GET /violations` endpointi

**Manba:** `backend/src/controllers/adminController.ts`

---

## 4. Umumiy fayllarga DIQQAT bilan ishlash

Quyidagi fayllarga Sardor ham teggan — merge conflict ehtimoli bor:

| Fayl | Nima o'zgargan |
|---|---|
| `backend/src/routes/index.ts` | `/admin` route ulangan |
| `backend/src/models/User.ts` | `admin` roli qo'shilgan |
| `backend/src/controllers/authController.ts` | Refresh token, password policy, logoutAll |
| `backend/src/app.ts` | Helmet, CORS, sanitize middleware |
| `backend/src/config/env.ts` | Yangi env vars (`accessTokenTtl`, `refreshTokenTtlDays`, ...) |
| `backend/src/utils/jwt.ts` | Refresh token support (generateRefreshToken, hashRefreshToken) |
| `frontend/src/lib/api.ts` | Refresh token, logoutAllDevices |
| `frontend/src/components/SiteNav.tsx` | LogoutAll button |
| `frontend/src/app/[locale]/jobs/new/page.tsx` | Telefon formati + employer/seeker |
| `frontend/messages/{uz,ru,en}.json` | Yangi translation keys |

**Har bir o'zgarishni qo'lda birlashtirish kerak — override qilish mumkin emas!**

---

## 5. Sardorning branchi

- **Branch nomi:** `gojo`
- **Holati:** Draft PR #2, hali `main` ga merge qilinmagan
- **Ish boshlashdan oldin:** `git pull origin gojo` qilib olish kerak
- **PR:** https://github.com/SunnatbekYusupovTech/ishbor/pull/2

---

## 6. Ochiq savollar (Sardor bilan muhokama qilish kerak)

1. **`jobController.createJob` da admin roli:** admin vakansiya joylay oladimi?
   Hozir `role !== 'employer'` bo'lsa seeker yo'liga tushadi.

2. **Violations endpoint formati:** admin dashboard uchun sahifalash (page/cursor)
   yoki yo'nalish/texnologiya bo'yicha filtr kerakmi?

3. **`routes/index.ts`:** ikkala branchda ham o'zgargan — merge conflict
   bo'lsa birgalikda hal qilish kerak.

---

## 7. Ishlash tartibi

1. `git fetch --all` — Sardorning so'nggi o'zgarishlarini olish
2. Har bir conflictni qo'lda hal qilish (override emas, birlashtirish!)
3. Typecheck o'tkazish (`cd backend && npx tsc --noEmit`)
4. Agar testlar bo'lsa, `cd backend && npx vitest run`
5. Hujjatlarni yangilash
6. PR description ga Sardorning PR #2 havolasini qo'shish

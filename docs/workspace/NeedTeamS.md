# 🤝 NeedTeamS — Sardor uchun jamoa bilan kelishish kerak bo'lgan nuqtalar

> Bu fayl faqat **boshqalarga bog'liq** narsalarni saqlaydi — o'zim yakka
> holda bajara olmaydigan yoki tasdiq/qaror kerak bo'lgan ishlar. Sof texnik
> holat (nima tugagan, nima qolgan) uchun [`SardorTasks.md`](./SardorTasks.md)ga
> qara — bu yerda esa faqat **kim bilan, nima haqida gaplashish kerakligi**.

---

## 🛠 Hidoyatov bilan (Admin panel, e'lonlar)

### 1. Admin roli — tayyor, faqat xabar berish qoldi
`User.role`ga `admin` qo'shildi, `middleware/requireAdmin.ts` yozildi. **Muhim:**
`admin` roli ochiq ro'yxatdan o'tish orqali hech qachon o'z-o'ziga tayinlanmaydi —
faqat men (yoki kimdir) DB'ni to'g'ridan-to'g'ri tahrirlab beradi.

**Hidoyatovga aytish kerak:**
- Admin panelni qura boshlaganda `authenticate` + `requireAdmin` middlewarelarini
  qanday zanjirlash kerakligini ko'rsataman (`routes/adminRoutes.ts`da namuna bor).
- U birinchi admin hisobni qachon kerak qilishini bilish kerak — men DB'da
  qo'lda bitta foydalanuvchini `admin` qilib beraman (masalan seed skriptga
  qo'shamizmi yoki qo'lda Mongo orqalimi — shuni ham kelishish kerak).

### 2. Anti-cheat loglari — format tasdiqlash kerak
`GET /api/admin/violations` tayyor — quyidagi formatda qaytaradi:
```json
{
  "sessionId": "...",
  "user": { "id": "...", "name": "...", "email": "..." },
  "status": "terminated",
  "tabSwitchCount": 2,
  "violationCount": 6,
  "terminationReason": "Exceeded max integrity violations (5).",
  "startTime": "...", "endTime": "...", "deadline": "..."
}
```
**Hidoyatovdan so'rash kerak:**
- Dashboard UI uchun shu maydonlar yetarlimi, yoki texnologiya/yo'nalish ham
  kerakmi (hozir yo'q — kerak bo'lsa `Session.questionIds`dan chiqarib bo'ladi)?
- Sahifalash (`page`/`cursor`) kerakmi, yoki hozirgi `?limit=` (default 50, max
  200) yetarlimi? Hozir juda ko'p buzilish bo'lsa eskilari ko'rinmay qoladi.
- Filtr kerakmi (masalan faqat `terminated` bo'lganlarni ko'rsatish, yoki sana
  oralig'i bo'yicha)?

### 3. `jobController.createJob`da `admin` roli qanday ishlashi kerak?
Hozir kod: `user.role === 'employer'` bo'lmasa avtomatik seeker/resume yo'liga
tushadi. Endi `admin` degan uchinchi variant bor — bu **Hidoyatovning fayli**
(`jobController.ts`), men tegmadim.

**Hidoyatovdan so'rash kerak:**
- Admin ham vakansiya joylay olishi kerakmi (masalan test uchun)?
- Yoki admin umuman `/jobs` orqali emas, faqat admin panel orqali ishlaydimi?

---

## 🎨 Fazilov bilan (UI, test kontenti)

### 4. Savol formati — yozishdan oldin tasdiqlash
Fazilov `data/questions.ts`ga yangi savollar qo'shishdan oldin, ular
`models/Question.ts` va `validation/testSchemas.ts` formatiga mos bo'lishi
kerak (`technology`, `difficulty`, `options` 2-6 ta, `correctAnswer` index).

**Fazilovga yetkazish kerak:** savol yozishni boshlashdan oldin shu ikki
faylni bir marta birga ko'rib chiqamiz — keyin u mustaqil davom etaveradi.

### 5. "Barcha qurilmalardan chiqish" tugmasi — dizayn ko'rib chiqilishi kerak
`SiteNav.tsx`ga men funksional, lekin **minimal** dizaynli tugma qo'ydim:
asosiy "Chiqish" tugmasi yonida kichikroq/xiraroq matn, bosilganda
`window.confirm()` orqali tasdiqlanadi.

**Fazilovdan so'rash kerak:**
- Bu joylashuv (SiteNav'da ikkinchi kichik tugma) mos keladimi, yoki
  foydalanuvchi profili/sozlamalar sahifasi kabi boshqa joyga ko'chirilsinmi?
- `window.confirm()` o'rniga o'ziga xos dizaynli tasdiqlash modali (masalan
  loyihada allaqachon bor `Dialog` komponenti) ishlatilsinmi?

---

## 📋 Suhbat uchun tezkor checklist

Uchrashganda shu tartibda o'tish mumkin:
- [ ] Hidoyatovga: admin roli va `/admin/violations` tayyorligini ko'rsataman
- [ ] Hidoyatov: format/sahifalash/filtr kerakligini aytadi → kerak bo'lsa men tuzataman
- [ ] Hidoyatov: birinchi admin hisobni qachon kerak qilishini aytadi
- [ ] Hidoyatov: `admin` roli `createJob`da qanday ishlashi kerakligini hal qiladi
- [ ] Fazilovga: savol formatini ko'rsataman, savollar yozishga ruxsat beradi
- [ ] Fazilov: logout-all tugmasining joylashuvi/dizayni bo'yicha fikr beradi

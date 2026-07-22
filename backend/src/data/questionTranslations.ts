/**
 * Localised question content (RU + UZ) for every seeded question.
 *
 * English is the CANONICAL source in `questions.ts` — it stays the scoring
 * reference (options + correctAnswer are index-based). These translations mirror
 * each question by `technology` and its 0-based position WITHIN that technology's
 * group in `seedQuestions`. Crucially, every `options` array here is in the SAME
 * canonical order as the English options, so the per-candidate option shuffle
 * (applied server-side) works identically across languages and scoring is never
 * affected.
 *
 * Missing entries gracefully fall back to English at serve time.
 */

export interface LocalizedText {
  text: string;
  options: string[];
}

export interface QuestionTranslation {
  ru: LocalizedText;
  uz: LocalizedText;
}

/** technology → ordered list of translations (index matches seedQuestions order). */
export const questionTranslations: Record<string, QuestionTranslation[]> = {
  html: [
    {
      ru: {
        text: 'Какой элемент — правильный семантический выбор для единственного, доминирующего содержимого документа?',
        options: ['<section>', '<main>', '<article>', '<div>'],
      },
      uz: {
        text: 'Hujjatning yagona, asosiy mazmuni uchun qaysi element to‘g‘ri semantik tanlov hisoblanadi?',
        options: ['<section>', '<main>', '<article>', '<div>'],
      },
    },
    {
      ru: {
        text: 'Что делает атрибут `defer` у тега <script>?',
        options: [
          'Выполняется немедленно, блокируя разбор HTML',
          'Загружается параллельно и выполняется после завершения разбора, сохраняя порядок',
          'Выполняется сразу после загрузки, порядок не гарантируется',
          'Полностью запрещает загрузку скрипта',
        ],
      },
      uz: {
        text: '<script> tegidagi `defer` atributi nima qiladi?',
        options: [
          'HTML tahlilini bloklab, darhol bajariladi',
          'Parallel yuklanadi va tahlil tugagach, tartibni saqlagan holda bajariladi',
          'Yuklanishi bilan bajariladi, tartib kafolatlanmaydi',
          'Skriptning umuman yuklanishiga yo‘l qo‘ymaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Каково основное назначение элемента <picture>?',
        options: [
          'Предоставить несколько адаптивных/арт-директированных источников изображения',
          'Рисовать графику через JavaScript',
          'Встроить видеопоток',
          'Создать кликабельную карту-изображение',
        ],
      },
      uz: {
        text: '<picture> elementining asosiy vazifasi nima?',
        options: [
          'Bir nechta moslashuvchan/art-yo‘naltirilgan rasm manbalarini taqdim etish',
          'JavaScript orqali grafika chizish',
          'Video oqimini joylashtirish',
          'Bosiladigan rasm xaritasini yaratish',
        ],
      },
    },
    {
      ru: {
        text: 'Какой ARIA-атрибут заставляет live-регион сообщать об обновлениях, не прерывая пользователя?',
        options: ['aria-hidden="true"', 'aria-live="polite"', 'role="presentation"', 'aria-disabled'],
      },
      uz: {
        text: 'Qaysi ARIA atributi live-hududni foydalanuvchini bo‘lmasdan yangilanishlar haqida e’lon qildiradi?',
        options: ['aria-hidden="true"', 'aria-live="polite"', 'role="presentation"', 'aria-disabled'],
      },
    },
    {
      ru: {
        text: 'Что контролирует <meta name="viewport" content="width=device-width, initial-scale=1">?',
        options: [
          'Кодировку символов',
          'Адаптивный viewport вёрстки на мобильных устройствах',
          'SEO meta-описание',
          'Размер favicon',
        ],
      },
      uz: {
        text: '<meta name="viewport" content="width=device-width, initial-scale=1"> nimani boshqaradi?',
        options: [
          'Belgilar kodlanishini',
          'Mobil qurilmalarda moslashuvchan layout viewport’ini',
          'SEO meta-tavsifni',
          'Favicon o‘lchamini',
        ],
      },
    },
  ],
  css: [
    {
      ru: {
        text: 'Что из перечисленного само по себе создаёт новый контекст наложения (stacking context)?',
        options: ['float: left', 'position: relative (без z-index)', 'opacity меньше 1', 'display: block'],
      },
      uz: {
        text: 'Quyidagilardan qaysi biri o‘zi yangi stacking context (qatlamlanish konteksti) hosil qiladi?',
        options: ['float: left', 'position: relative (z-index’siz)', 'opacity 1 dan kichik', 'display: block'],
      },
    },
    {
      ru: {
        text: 'При `box-sizing: border-box` заданная `width` включает:',
        options: [
          'Только содержимое',
          'Содержимое + padding',
          'Содержимое + padding + border',
          'Содержимое + padding + border + margin',
        ],
      },
      uz: {
        text: '`box-sizing: border-box` bo‘lganda, belgilangan `width` nimalarni o‘z ichiga oladi?',
        options: [
          'Faqat kontentni',
          'Kontent + padding',
          'Kontent + padding + border',
          'Kontent + padding + border + margin',
        ],
      },
    },
    {
      ru: {
        text: 'У какого селектора наивысшая специфичность?',
        options: ['#id', '.class.class', 'div p a', 'a:hover'],
      },
      uz: {
        text: 'Qaysi selektorning spetsifikligi eng yuqori?',
        options: ['#id', '.class.class', 'div p a', 'a:hover'],
      },
    },
    {
      ru: {
        text: 'Что создаёт `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`?',
        options: [
          'Ровно одну колонку 200px',
          'Столько колонок минимум по 200px, сколько помещается, каждая гибкая до 1fr',
          'Фиксированные колонки 200px, которые не растут',
          'Строки вместо колонок',
        ],
      },
      uz: {
        text: '`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` nima hosil qiladi?',
        options: [
          'Aniq bitta 200px ustun',
          'Sig‘gancha kamida 200px’li ustunlar, har biri 1fr gacha cho‘ziluvchan',
          'O‘smaydigan qat’iy 200px ustunlar',
          'Ustunlar o‘rniga qatorlar',
        ],
      },
    },
    {
      ru: {
        text: 'Какое значение `position` убирает элемент из обычного потока и позиционирует относительно ближайшего позиционированного предка?',
        options: ['static', 'relative', 'absolute', 'sticky'],
      },
      uz: {
        text: 'Qaysi `position` qiymati elementni oddiy oqimdan chiqarib, eng yaqin joylashtirilgan ajdodga nisbatan joylashtiradi?',
        options: ['static', 'relative', 'absolute', 'sticky'],
      },
    },
  ],
  bootstrap: [
    {
      ru: {
        text: 'Сколько колонок в стандартной сеточной системе Bootstrap?',
        options: ['10', '12', '16', '24'],
      },
      uz: {
        text: 'Bootstrap’ning standart grid tizimida nechta ustun bor?',
        options: ['10', '12', '16', '24'],
      },
    },
    {
      ru: {
        text: 'Какие классы делают колонку на всю ширину на мобильном и в половину ширины начиная с брейкпоинта md?',
        options: ['col-6', 'col-md-6', 'col-12 col-md-6', 'col-sm-6'],
      },
      uz: {
        text: 'Qaysi klasslar ustunni mobil qurilmada to‘liq kenglikda, md brekpointidan boshlab yarim kenglikda qiladi?',
        options: ['col-6', 'col-md-6', 'col-12 col-md-6', 'col-sm-6'],
      },
    },
    {
      ru: {
        text: 'Какое утверждение о Bootstrap 5 ВЕРНО?',
        options: [
          'Он по-прежнему требует jQuery',
          'Он отказался от зависимости jQuery и использует чистый JavaScript',
          'В нём полностью убрали сеточную систему',
          'Он поддерживает только Internet Explorer',
        ],
      },
      uz: {
        text: 'Bootstrap 5 haqidagi qaysi fikr TO‘G‘RI?',
        options: [
          'U hali ham jQuery talab qiladi',
          'U jQuery bog‘liqligidan voz kechdi va sof JavaScript ishlatadi',
          'U grid tizimini butunlay olib tashladi',
          'U faqat Internet Explorer’ni qo‘llab-quvvatlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Какой утилитарный класс горизонтально центрирует блочный элемент авто-отступами?',
        options: ['mx-auto', 'text-center', 'float-center', 'center-block'],
      },
      uz: {
        text: 'Qaysi yordamchi klass blok elementni avto-margin bilan gorizontal markazga joylashtiradi?',
        options: ['mx-auto', 'text-center', 'float-center', 'center-block'],
      },
    },
    {
      ru: {
        text: 'Чем `.container-fluid` отличается от `.container`?',
        options: [
          'Он фиксированной ширины на каждом брейкпоинте',
          'Он занимает 100% ширины на каждом брейкпоинте',
          'Он добавляет рамку по умолчанию',
          'Разницы нет',
        ],
      },
      uz: {
        text: '`.container-fluid` `.container`’dan nimasi bilan farq qiladi?',
        options: [
          'U har bir brekpointda qat’iy kenglikda',
          'U har bir brekpointda 100% kenglikni egallaydi',
          'U standart ramka qo‘shadi',
          'Farqi yo‘q',
        ],
      },
    },
  ],
  tailwind: [
    {
      ru: {
        text: 'Что делает утилита `space-x-4`?',
        options: [
          'Добавляет горизонтальный интервал между дочерними элементами',
          'Добавляет padding элементу',
          'Задаёт фиксированную ширину',
          'Влияет только на gap в CSS grid',
        ],
      },
      uz: {
        text: '`space-x-4` utilitasi nima qiladi?',
        options: [
          'Farzand elementlar orasiga gorizontal masofa qo‘shadi',
          'Elementga padding qo‘shadi',
          'Qat’iy kenglik o‘rnatadi',
          'Faqat CSS grid gap’iga ta’sir qiladi',
        ],
      },
    },
    {
      ru: {
        text: 'Как применить утилиту только при наведении (hover) в Tailwind?',
        options: ['hover-bg-blue-500', 'hover:bg-blue-500', ':hover-bg-blue-500', 'on-hover:bg-blue-500'],
      },
      uz: {
        text: 'Tailwind’da utilitani faqat hover holatida qanday qo‘llash mumkin?',
        options: ['hover-bg-blue-500', 'hover:bg-blue-500', ':hover-bg-blue-500', 'on-hover:bg-blue-500'],
      },
    },
    {
      ru: {
        text: 'Для чего используется директива `@apply`?',
        options: [
          'Запуск JavaScript внутри CSS',
          'Композиция существующих утилитарных классов в собственный CSS-класс',
          'Объявление медиа-запросов',
          'Импорт веб-шрифтов',
        ],
      },
      uz: {
        text: '`@apply` direktivasi nima uchun ishlatiladi?',
        options: [
          'CSS ichida JavaScript ishga tushirish',
          'Mavjud utilitar klasslarni maxsus CSS klassga birlashtirish',
          'Media-so‘rovlarni e’lon qilish',
          'Veb-shriftlarni import qilish',
        ],
      },
    },
    {
      ru: {
        text: 'С движком JIT, как задать произвольную ширину 137px?',
        options: ['w-137', 'w-[137px]', 'w-(137px)', 'width-137'],
      },
      uz: {
        text: 'JIT dvigateli bilan 137px o‘zboshimcha kenglikni qanday berish mumkin?',
        options: ['w-137', 'w-[137px]', 'w-(137px)', 'width-137'],
      },
    },
    {
      ru: {
        text: 'При настройке `darkMode: "class"`, какой префикс применяет стили в тёмном режиме?',
        options: [
          'dark:* (активен, когда у предка есть класс `dark`)',
          '@dark',
          'theme-dark:*',
          'night:*',
        ],
      },
      uz: {
        text: '`darkMode: "class"` sozlanganda, qaysi prefiks qorong‘i rejimda uslublarni qo‘llaydi?',
        options: [
          'dark:* (ajdodda `dark` klassi bo‘lganda faol)',
          '@dark',
          'theme-dark:*',
          'night:*',
        ],
      },
    },
  ],
  javascript: [
    {
      ru: {
        text: 'Что вернёт `typeof NaN`?',
        options: ['"NaN"', '"number"', '"undefined"', '"object"'],
      },
      uz: {
        text: '`typeof NaN` nimani qaytaradi?',
        options: ['"NaN"', '"number"', '"undefined"', '"object"'],
      },
    },
    {
      ru: {
        text: 'Каков результат `[1, 2, 3].reduce((a, b) => a + b)`?',
        options: ['6', '[1, 2, 3]', '"123"', 'TypeError'],
      },
      uz: {
        text: '`[1, 2, 3].reduce((a, b) => a + b)` natijasi nima?',
        options: ['6', '[1, 2, 3]', '"123"', 'TypeError'],
      },
    },
    {
      ru: {
        text: 'Что лучше всего описывает разницу между `==` и `===`?',
        options: [
          'Разницы нет',
          '`===` сравнивает значение и тип без приведения; `==` выполняет приведение типов',
          '`==` проверяет тип, `===` — нет',
          '`===` работает только с числами',
        ],
      },
      uz: {
        text: '`==` va `===` o‘rtasidagi farqni eng yaxshi nima ifodalaydi?',
        options: [
          'Farqi yo‘q',
          '`===` qiymat va turni o‘zgartirishsiz solishtiradi; `==` tur o‘zgartirishini bajaradi',
          '`==` turni tekshiradi, `===` esa yo‘q',
          '`===` faqat sonlar bilan ishlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Чем разрешается `Promise.allSettled`?',
        options: [
          'Отклоняется при первом отклонении',
          'Массивом {status, value|reason} для каждого промиса независимо от исхода',
          'Только первым разрешённым значением',
          'Тем же результатом, что и Promise.race',
        ],
      },
      uz: {
        text: '`Promise.allSettled` nima bilan hal bo‘ladi (resolve)?',
        options: [
          'Birinchi rad etishda rad etadi',
          'Har bir promise uchun natijadan qat’i nazar {status, value|reason} massivi bilan',
          'Faqat birinchi hal bo‘lgan qiymat bilan',
          'Promise.race bilan bir xil natija bilan',
        ],
      },
    },
    {
      ru: {
        text: 'Что замыкание (closure) захватывает из окружающей области видимости?',
        options: [
          'Снимок-копию значений переменных на момент определения',
          'Живую ссылку на переменные в окружающей лексической области',
          'Только глобальные переменные',
          'Ничего — замыкания не захватывают переменные',
        ],
      },
      uz: {
        text: 'Closure (yopilma) o‘rab turgan qamrovdan nimani ushlab qoladi?',
        options: [
          'Aniqlash paytidagi o‘zgaruvchilar qiymatining nusxa-suratini',
          'O‘rab turgan leksik qamrovdagi o‘zgaruvchilarga jonli havolani',
          'Faqat global o‘zgaruvchilarni',
          'Hech nimani — closure’lar o‘zgaruvchilarni ushlamaydi',
        ],
      },
    },
  ],
  typescript: [
    {
      ru: {
        text: 'Чем `unknown` отличается от `any`?',
        options: [
          'Они идентичны',
          '`unknown` требует сужения или утверждения типа, прежде чем с ним работать',
          '`unknown` отключает всю проверку типов',
          '`unknown` присваивается только числу',
        ],
      },
      uz: {
        text: '`unknown` `any`’dan nimasi bilan farq qiladi?',
        options: [
          'Ular bir xil',
          '`unknown` bilan ishlashdan oldin tur toraytirishni yoki tasdiqlashni talab qiladi',
          '`unknown` barcha tur tekshiruvini o‘chiradi',
          '`unknown` faqat number’ga tayinlanadi',
        ],
      },
    },
    {
      ru: {
        text: 'Что такое размеченное объединение (discriminated union)?',
        options: [
          'Объединение, члены которого имеют общее литеральное свойство, используемое для сужения варианта',
          'Любое объединение двух и более типов',
          'Пересечение объектных типов',
          'Обобщённое ограничение через extends',
        ],
      },
      uz: {
        text: 'Discriminated union (belgilangan birlashma) nima?',
        options: [
          'A’zolari variantni toraytirish uchun umumiy literal xususiyatga ega bo‘lgan birlashma',
          'Ikki yoki undan ortiq turning istalgan birlashmasi',
          'Obyekt turlarining kesishmasi',
          'extends orqali generik cheklov',
        ],
      },
    },
    {
      ru: {
        text: 'Во что вычисляется `keyof { a: 1; b: 2 }`?',
        options: ['"a" | "b"', '1 | 2', 'string', 'never'],
      },
      uz: {
        text: '`keyof { a: 1; b: 2 }` nimaga aylanadi?',
        options: ['"a" | "b"', '1 | 2', 'string', 'never'],
      },
    },
    {
      ru: {
        text: 'Что предотвращает тип `readonly string[]`?',
        options: [
          'Чтение элементов',
          'Мутирующие методы (push/pop) и присваивание по индексу',
          'Итерацию через for..of',
          'Доступ к .length',
        ],
      },
      uz: {
        text: '`readonly string[]` turi nimaning oldini oladi?',
        options: [
          'Elementlarni o‘qishni',
          'O‘zgartiruvchi metodlar (push/pop) va indeks bo‘yicha tayinlashni',
          'for..of bilan iteratsiyani',
          '.length’ga kirishni',
        ],
      },
    },
    {
      ru: {
        text: 'Каков эффект `as const` на объектном литерале?',
        options: [
          'Делает каждое свойство изменяемым',
          'Расширяет типы свойств до их базовых типов',
          'Создаёт глубоко readonly-значение с суженными литеральными типами',
          'Превращает объект в экземпляр класса',
        ],
      },
      uz: {
        text: 'Obyekt literalida `as const`’ning ta’siri qanday?',
        options: [
          'Har bir xususiyatni o‘zgaruvchan qiladi',
          'Xususiyat turlarini asosiy turlargacha kengaytiradi',
          'Toraytirilgan literal turlar bilan chuqur readonly qiymat hosil qiladi',
          'Obyektni klass nusxasiga aylantiradi',
        ],
      },
    },
  ],
  react: [
    {
      ru: {
        text: 'Почему React-хуки нельзя вызывать условно?',
        options: [
          'Исключительно из соображений производительности',
          'React связывает состояние с хуками по порядку вызова, который должен быть стабильным между рендерами',
          'Это лишь предпочтение стиля линтера',
          'JavaScript запрещает условный вызов функций',
        ],
      },
      uz: {
        text: 'Nega React Hook’larni shartli ravishda chaqirib bo‘lmaydi?',
        options: [
          'Faqat unumdorlik sabablari uchun',
          'React holatni hook’larga chaqiruv tartibi bo‘yicha bog‘laydi, u renderlar orasida barqaror bo‘lishi shart',
          'Bu shunchaki linter uslubi tavsiyasi',
          'JavaScript funksiyalarni shartli chaqirishni taqiqlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Что делает `useMemo`?',
        options: [
          'Мемоизирует вычисленное значение между рендерами на основе зависимостей',
          'Запускает побочные эффекты после рендера',
          'Создаёт изменяемый ref',
          'Является псевдонимом useState',
        ],
      },
      uz: {
        text: '`useMemo` nima qiladi?',
        options: [
          'Bog‘liqliklar asosida hisoblangan qiymatni renderlar orasida memoizatsiya qiladi',
          'Renderdan keyin nojo‘ya effektlarni ishga tushiradi',
          'O‘zgaruvchan ref hosil qiladi',
          'useState’ning taxallusi',
        ],
      },
    },
    {
      ru: {
        text: 'Какими должны быть `key`-пропсы в списках?',
        options: [
          'Всегда индексом массива',
          'Стабильными, уникальными идентификаторами, привязанными к каждому элементу',
          'Случайным значением, перегенерируемым каждый рендер',
          'Необязательными и игнорируемыми React',
        ],
      },
      uz: {
        text: 'Ro‘yxatdagi `key` prop’lari qanday bo‘lishi kerak?',
        options: [
          'Har doim massiv indeksi',
          'Har bir elementga bog‘langan barqaror, noyob identifikatorlar',
          'Har renderda qayta hosil qilinadigan tasodifiy qiymat',
          'Ixtiyoriy va React tomonidan e’tiborsiz qoldiriladi',
        ],
      },
    },
    {
      ru: {
        text: 'Что из перечисленного надёжно вызывает повторный рендер?',
        options: [
          'Мутация объекта состояния на месте',
          'Вызов сеттера состояния с новым значением/ссылкой',
          'Присваивание в `.current` рефа',
          'Прямое редактирование DOM-узла',
        ],
      },
      uz: {
        text: 'Quyidagilardan qaysi biri qayta renderni ishonchli ishga tushiradi?',
        options: [
          'Holat obyektini joyida o‘zgartirish',
          'Holat setter’ini yangi qiymat/havola bilan chaqirish',
          'Ref’ning `.current`’iga tayinlash',
          'DOM tugunini to‘g‘ridan-to‘g‘ri tahrirlash',
        ],
      },
    },
    {
      ru: {
        text: 'Какова роль массива зависимостей в `useEffect`?',
        options: [
          'Он задаёт начальное состояние компонента',
          'Он контролирует, когда эффект перезапускается, сравнивая зависимости между рендерами',
          'Он мемоизирует весь компонент',
          'Он декоративен и ни на что не влияет',
        ],
      },
      uz: {
        text: '`useEffect`’dagi bog‘liqliklar massivining vazifasi nima?',
        options: [
          'U komponentning boshlang‘ich holatini o‘rnatadi',
          'U bog‘liqliklarni renderlar orasida solishtirib, effekt qachon qayta ishlashini boshqaradi',
          'U butun komponentni memoizatsiya qiladi',
          'U bezak uchun va hech ta’sir qilmaydi',
        ],
      },
    },
  ],
  vue: [
    {
      ru: {
        text: 'Какой API Vue 3 ввёл `setup()` и композиционные функции?',
        options: ['Options API', 'Composition API', 'Mixins', 'Vuex'],
      },
      uz: {
        text: 'Vue 3’ning qaysi API’si `setup()` va composable funksiyalarni joriy qildi?',
        options: ['Options API', 'Composition API', 'Mixins', 'Vuex'],
      },
    },
    {
      ru: {
        text: 'Что возвращает `ref()` в Vue 3?',
        options: [
          'Простое развёрнутое значение',
          'Реактивную обёртку-объект, доступную через свойство `.value`',
          'Вычисляемое свойство',
          'Только сырой DOM-узел',
        ],
      },
      uz: {
        text: 'Vue 3’da `ref()` nimani qaytaradi?',
        options: [
          'Oddiy o‘ralmagan qiymatni',
          '`.value` xususiyati orqali kiriladigan reaktiv o‘rovchi obyektni',
          'Hisoblanuvchi xususiyatni',
          'Faqat xom DOM tugunini',
        ],
      },
    },
    {
      ru: {
        text: 'Какая директива привязывает атрибут к выражению (сокращение `:`)?',
        options: ['v-model', 'v-bind', 'v-on', 'v-if'],
      },
      uz: {
        text: 'Qaysi direktiva atributni ifodaga bog‘laydi (qisqartma `:`)?',
        options: ['v-model', 'v-bind', 'v-on', 'v-if'],
      },
    },
    {
      ru: {
        text: 'Как ведут себя `computed`-свойства во Vue?',
        options: [
          'Они пересчитываются при каждом обращении',
          'Они кэшируются и пересчитываются только при изменении реактивной зависимости',
          'Они ведут себя точно как методы',
          'Они не реактивны',
        ],
      },
      uz: {
        text: 'Vue’da `computed` xususiyatlar o‘zini qanday tutadi?',
        options: [
          'Ular har murojaatda qayta hisoblanadi',
          'Ular keshlanadi va faqat reaktiv bog‘liqlik o‘zgarganda qayta hisoblanadi',
          'Ular xuddi metodlar kabi ishlaydi',
          'Ular reaktiv emas',
        ],
      },
    },
    {
      ru: {
        text: 'Что обеспечивает `v-model` на элементе формы?',
        options: [
          'Только одностороннюю привязку от состояния к отображению',
          'Двустороннюю привязку между вводом и связанным состоянием',
          'Обработку событий без привязки данных',
          'Условный рендеринг',
        ],
      },
      uz: {
        text: '`v-model` forma elementida nimani ta’minlaydi?',
        options: [
          'Faqat holatdan ko‘rinishga bir tomonlama bog‘lanishni',
          'Kiritish va bog‘langan holat o‘rtasida ikki tomonlama bog‘lanishni',
          'Ma’lumot bog‘lanishisiz hodisalarni qayta ishlashni',
          'Shartli renderlashni',
        ],
      },
    },
  ],
  nextjs: [
    {
      ru: {
        text: 'В Next.js App Router компоненты по умолчанию являются:',
        options: ['Клиентскими компонентами', 'Серверными компонентами', 'Только статическими компонентами', 'Только edge-компонентами'],
      },
      uz: {
        text: 'Next.js App Router’da komponentlar standart holatda qanday bo‘ladi?',
        options: ['Client Component’lar', 'Server Component’lar', 'Faqat statik komponentlar', 'Faqat edge komponentlar'],
      },
    },
    {
      ru: {
        text: 'Какая функция Pages Router получает данные во время сборки?',
        options: ['getServerSideProps', 'getStaticProps', 'useEffect', 'getInitialProps'],
      },
      uz: {
        text: 'Pages Router’ning qaysi funksiyasi build vaqtida ma’lumot oladi?',
        options: ['getServerSideProps', 'getStaticProps', 'useEffect', 'getInitialProps'],
      },
    },
    {
      ru: {
        text: 'Как включить клиентскую интерактивность компонента в App Router?',
        options: [
          'Добавить директиву "use server"',
          'Добавить директиву "use client" в начало файла',
          'Экспортировать `const client = true`',
          'Ничего — все компоненты клиентские по умолчанию',
        ],
      },
      uz: {
        text: 'App Router’da komponentni client tarafida interaktiv qilishga qanday yoqiladi?',
        options: [
          '"use server" direktivasini qo‘shish',
          'Fayl boshiga "use client" direktivasini qo‘shish',
          '`const client = true` eksport qilish',
          'Hech nima — barcha komponentlar standart bo‘yicha client',
        ],
      },
    },
    {
      ru: {
        text: 'Что в первую очередь предоставляет компонент `next/image`?',
        options: [
          'Оптимизацию SEO-текста',
          'Автоматическое изменение размера, ленивую загрузку и оптимизацию современных форматов изображений',
          'Клиентскую маршрутизацию',
          'Обработку глобального CSS',
        ],
      },
      uz: {
        text: '`next/image` komponenti birinchi navbatda nimani ta’minlaydi?',
        options: [
          'SEO matnini optimallashtirish',
          'Rasmlarni avtomatik o‘lchamlash, kechiktirilgan yuklash va zamonaviy format optimizatsiyasi',
          'Client tarafida marshrutlash',
          'Global CSS bilan ishlash',
        ],
      },
    },
    {
      ru: {
        text: 'В App Router файл `loading.tsx` в сегменте маршрута предоставляет:',
        options: [
          'Кастомную страницу 404',
          'Автоматический UI загрузки на основе Suspense для этого сегмента',
          'Внедрение глобальной таблицы стилей',
          'Edge middleware',
        ],
      },
      uz: {
        text: 'App Router’da marshrut segmentidagi `loading.tsx` fayli nimani ta’minlaydi?',
        options: [
          'Maxsus 404 sahifasini',
          'Ushbu segment uchun Suspense’ga asoslangan avtomatik yuklanish UI’sini',
          'Global uslublar jadvalini kiritishni',
          'Edge middleware’ni',
        ],
      },
    },
  ],
  git: [
    {
      ru: {
        text: 'Чем `git rebase` отличается от `git merge`?',
        options: [
          'Функционально они идентичны',
          'Rebase переприменяет коммиты на новую основу (переписывая историю, линейно); merge создаёт коммит слияния',
          'Rebase удаляет ветки',
          'Rebase работает только с удалёнными репозиториями',
        ],
      },
      uz: {
        text: '`git rebase` `git merge`’dan nimasi bilan farq qiladi?',
        options: [
          'Ular funksional jihatdan bir xil',
          'Rebase kommitlarni yangi asosga qayta qo‘yadi (tarixni chiziqli qayta yozib); merge esa merge kommitini yozadi',
          'Rebase branch’larni o‘chiradi',
          'Rebase faqat masofaviy repozitoriylar bilan ishlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Что делает `git reset --hard HEAD~1`?',
        options: [
          'Создаёт новую ветку на HEAD',
          'Перемещает HEAD на один коммит назад и отбрасывает изменения рабочего дерева и индекса',
          'Только снимает файлы с индекса, сохраняя изменения',
          'Отправляет предыдущий коммит на удалённый репозиторий',
        ],
      },
      uz: {
        text: '`git reset --hard HEAD~1` nima qiladi?',
        options: [
          'HEAD’da yangi branch yaratadi',
          'HEAD’ni bir kommit orqaga suradi va ishchi katalog hamda indeks o‘zgarishlarini bekor qiladi',
          'Faqat fayllarni indeksdan chiqaradi, o‘zgarishlarni saqlaydi',
          'Oldingi kommitni masofaviy repozitoriyga jo‘natadi',
        ],
      },
    },
    {
      ru: {
        text: 'В чём разница между `git fetch` и `git pull`?',
        options: [
          'Разницы нет',
          '`fetch` скачивает ссылки без интеграции; `pull` делает fetch, затем merge/rebase',
          '`pull` только скачивает без слияния',
          '`fetch` автоматически сливает в текущую ветку',
        ],
      },
      uz: {
        text: '`git fetch` va `git pull` o‘rtasidagi farq nima?',
        options: [
          'Farqi yo‘q',
          '`fetch` ref’larni birlashtirmasdan yuklaydi; `pull` fetch qilib, so‘ng merge/rebase qiladi',
          '`pull` faqat birlashtirmasdan yuklaydi',
          '`fetch` avtomatik ravishda joriy branch’ga birlashtiradi',
        ],
      },
    },
    {
      ru: {
        text: 'Что такое состояние «detached HEAD»?',
        options: [
          'Повреждённый репозиторий',
          'HEAD указывает прямо на коммит, а не на ссылку ветки',
          'Неразрешённый конфликт слияния',
          'Отслеживающая удалённая ветка',
        ],
      },
      uz: {
        text: '«detached HEAD» holati nima?',
        options: [
          'Buzilgan repozitoriy',
          'HEAD branch havolasi emas, to‘g‘ridan-to‘g‘ri kommitga ishora qiladi',
          'Hal qilinmagan merge ziddiyati',
          'Kuzatiluvchi masofaviy branch',
        ],
      },
    },
    {
      ru: {
        text: 'Каково назначение файла `.gitignore`?',
        options: [
          'Удалять отслеживаемые файлы из истории',
          'Указывать намеренно неотслеживаемые файлы, которые Git должен игнорировать',
          'Хранить учётные данные репозитория',
          'Настраивать URL удалённых репозиториев',
        ],
      },
      uz: {
        text: '`.gitignore` faylining vazifasi nima?',
        options: [
          'Kuzatilayotgan fayllarni tarixdan o‘chirish',
          'Git e’tiborsiz qoldirishi kerak bo‘lgan ataylab kuzatilmaydigan fayllarni ko‘rsatish',
          'Repozitoriy hisob ma’lumotlarini saqlash',
          'Masofaviy URL’larni sozlash',
        ],
      },
    },
  ],
  nodejs: [
    {
      ru: {
        text: 'Как микрозадачи (колбэки промисов) планируются относительно макрозадач в Node.js?',
        options: [
          'Сначала выполняются все макрозадачи, потом микрозадачи',
          'Очередь микрозадач опустошается после каждой макрозадачи, перед следующей',
          'Микрозадачи никогда не выполняются',
          'Они делят одну FIFO-очередь с таймерами',
        ],
      },
      uz: {
        text: 'Node.js’da mikrovazifalar (Promise callback’lari) makrovazifalarга nisbatan qanday rejalashtiriladi?',
        options: [
          'Avval barcha makrovazifalar, so‘ng mikrovazifalar bajariladi',
          'Mikrovazifalar navbati har bir makrovazifadan keyin, keyingisidan oldin bo‘shatiladi',
          'Mikrovazifalar hech qachon bajarilmaydi',
          'Ular taymerlar bilan yagona FIFO navbatni bo‘lishadi',
        ],
      },
    },
    {
      ru: {
        text: 'Когда выполняются колбэки `process.nextTick`?',
        options: [
          'После всех I/O-колбэков',
          'До продолжения цикла событий, впереди очереди микрозадач промисов',
          'Только после срабатывания таймеров',
          'Они никогда не выполняются',
        ],
      },
      uz: {
        text: '`process.nextTick` callback’lari qachon bajariladi?',
        options: [
          'Barcha I/O callback’laridan keyin',
          'Hodisalar sikli davom etishidan oldin, Promise mikrovazifalar navbatidan oldinda',
          'Faqat taymerlar ishga tushgandan keyin',
          'Ular hech qachon bajarilmaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Какая функция является механизмом импорта модулей CommonJS?',
        options: ['import', 'require()', 'include()', 'use()'],
      },
      uz: {
        text: 'Qaysi funksiya CommonJS modul import mexanizmi hisoblanadi?',
        options: ['import', 'require()', 'include()', 'use()'],
      },
    },
    {
      ru: {
        text: 'Что лучше всего описывает модель выполнения Node.js?',
        options: [
          'Многопоточная и блокирующая по умолчанию',
          'Однопоточный, неблокирующий ввод-вывод через цикл событий, опирающийся на пул потоков libuv',
          'Движок рендеринга браузера',
          'Движок реляционной базы данных',
        ],
      },
      uz: {
        text: 'Node.js ish modelini eng yaxshi nima ifodalaydi?',
        options: [
          'Standart bo‘yicha ko‘p oqimli va bloklovchi',
          'Bir oqimli, bloklamaydigan I/O — hodisalar sikli orqali, libuv oqim havzasiga tayangan',
          'Brauzer render dvigateli',
          'Relyatsion ma’lumotlar bazasi dvigateli',
        ],
      },
    },
    {
      ru: {
        text: 'Что обрабатывает класс `Buffer` в Node.js?',
        options: ['Асинхронное время', 'Сырые двоичные данные', 'HTTP-маршрутизацию', 'HTML-шаблонизацию'],
      },
      uz: {
        text: 'Node.js’dagi `Buffer` klassi nimani boshqaradi?',
        options: ['Asinxron vaqtni', 'Xom ikkilik ma’lumotlarni', 'HTTP marshrutlashni', 'HTML shablonlashni'],
      },
    },
  ],
  express: [
    {
      ru: {
        text: 'Какова стандартная сигнатура функции middleware в Express?',
        options: ['(req, res)', '(req, res, next)', '(next)', '(err)'],
      },
      uz: {
        text: 'Express’da middleware funksiyasining standart imzosi qanday?',
        options: ['(req, res)', '(req, res, next)', '(next)', '(err)'],
      },
    },
    {
      ru: {
        text: 'Какой встроенный middleware разбирает JSON-тело запроса в современном Express?',
        options: ['Только внешний пакет body-parser', 'express.json()', 'express.raw()', 'Middleware не нужен'],
      },
      uz: {
        text: 'Zamonaviy Express’da qaysi o‘rnatilgan middleware JSON so‘rov tanasini tahlil qiladi?',
        options: ['Faqat tashqi body-parser paketi', 'express.json()', 'express.raw()', 'Middleware kerak emas'],
      },
    },
    {
      ru: {
        text: 'Почему в Express важен порядок регистрации middleware?',
        options: [
          'Это не имеет значения',
          'Middleware выполняется в порядке регистрации, поэтому маршрут или обработчик может быть перекрыт более ранними',
          'Middleware выполняется по алфавиту имён',
          'Middleware выполняется в случайном порядке',
        ],
      },
      uz: {
        text: 'Nega Express’da middleware ro‘yxatga olish tartibi muhim?',
        options: [
          'Bu muhim emas',
          'Middleware ro‘yxatga olingan tartibda ishlaydi, shuning uchun marshrut yoki ishlovchi oldingilari bilan to‘silishi mumkin',
          'Middleware nomlar bo‘yicha alifbo tartibida ishlaydi',
          'Middleware tasodifiy tartibda ishlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Как Express распознаёт middleware обработки ошибок?',
        options: [
          'По имени функции',
          'По сигнатуре с четырьмя аргументами `(err, req, res, next)`',
          'По объявлению async',
          'По специальному пути маршрута',
        ],
      },
      uz: {
        text: 'Express xatoliklarni qayta ishlovchi middleware’ni qanday aniqlaydi?',
        options: [
          'Funksiya nomi bo‘yicha',
          'To‘rt argumentli `(err, req, res, next)` imzosi bo‘yicha',
          'async deb e’lon qilinishi bo‘yicha',
          'Maxsus marshrut yo‘li bo‘yicha',
        ],
      },
    },
    {
      ru: {
        text: 'Что делает `res.status(201).json(data)`?',
        options: [
          'Устанавливает cookie с именем 201',
          'Устанавливает HTTP-статус 201 и отправляет `data` в виде JSON-ответа',
          'Выполняет редирект на /201',
          'Устанавливает заголовок без отправки тела',
        ],
      },
      uz: {
        text: '`res.status(201).json(data)` nima qiladi?',
        options: [
          '201 nomli cookie o‘rnatadi',
          'HTTP statusni 201 ga o‘rnatadi va `data`’ni JSON javob sifatida yuboradi',
          '/201 ga qayta yo‘naltiradi',
          'Tana yubormasdan sarlavha o‘rnatadi',
        ],
      },
    },
  ],
  mongodb: [
    {
      ru: {
        text: 'Какой этап агрегации случайно выбирает документы?',
        options: ['$match', '$sample', '$random', '$limit'],
      },
      uz: {
        text: 'Qaysi agregatsiya bosqichi hujjatlarni tasodifiy tanlaydi?',
        options: ['$match', '$sample', '$random', '$limit'],
      },
    },
    {
      ru: {
        text: 'Составной индекс `{ a: 1, b: 1 }` эффективно поддерживает запросы по:',
        options: [
          'Только b',
          'Только a, либо a и b вместе (префикс индекса) — но не по одному b эффективно',
          'Только по одному b',
          'Ни по одному полю',
        ],
      },
      uz: {
        text: 'Kompozit indeks `{ a: 1, b: 1 }` qaysi so‘rovlarni samarali qo‘llab-quvvatlaydi?',
        options: [
          'Faqat b bo‘yicha',
          'Faqat a, yoki a va b birga (indeks prefiksi) — lekin faqat b samarasiz',
          'Faqat b yolg‘iz',
          'Hech bir maydon bo‘yicha',
        ],
      },
    },
    {
      ru: {
        text: 'Что выполняет этап агрегации `$lookup`?',
        options: [
          'Левое внешнее соединение с другой коллекцией',
          'Полнотекстовый поиск',
          'Сортировку в памяти',
          'Проекцию полей',
        ],
      },
      uz: {
        text: '`$lookup` agregatsiya bosqichi nimani bajaradi?',
        options: [
          'Boshqa kolleksiyaga chap tashqi join',
          'To‘liq matnli qidiruv',
          'Xotirada saralash',
          'Maydonlarni proyeksiyalash',
        ],
      },
    },
    {
      ru: {
        text: 'Какое утверждение о поле `_id` ВЕРНО?',
        options: [
          'Оно необязательно и никогда не индексируется',
          'Оно обязательно, уникально и индексируется автоматически (по умолчанию ObjectId)',
          'Оно всегда должно быть строкой',
          'Оно общее для документов в коллекции',
        ],
      },
      uz: {
        text: '`_id` maydoni haqidagi qaysi fikr TO‘G‘RI?',
        options: [
          'U ixtiyoriy va hech qachon indekslanmaydi',
          'U majburiy, noyob va avtomatik indekslanadi (standart bo‘yicha ObjectId)',
          'U har doim satr bo‘lishi kerak',
          'U kolleksiyadagi hujjatlar uchun umumiy',
        ],
      },
    },
    {
      ru: {
        text: 'Что гарантирует write concern `w: "majority"`?',
        options: [
          'Отправку без подтверждения (fire-and-forget)',
          'Запись подтверждается после того, как её применит большинство участников набора реплик',
          'Только первичный узел применяет её без подтверждения',
          'Журналирование отключено',
        ],
      },
      uz: {
        text: '`w: "majority"` write concern nimani kafolatlaydi?',
        options: [
          'Tasdiqsiz jo‘natish (fire-and-forget)',
          'Yozuv replika to‘plamining ko‘pchilik a’zolari uni qo‘llagach tasdiqlanadi',
          'Faqat asosiy (primary) tugun uni tasdiqsiz qo‘llaydi',
          'Jurnal yuritish o‘chirilgan',
        ],
      },
    },
  ],
  sql: [
    {
      ru: {
        text: 'Какой JOIN возвращает все строки из левой таблицы и совпавшие из правой (NULL там, где нет совпадения)?',
        options: ['INNER JOIN', 'LEFT (OUTER) JOIN', 'CROSS JOIN', 'RIGHT JOIN'],
      },
      uz: {
        text: 'Qaysi JOIN chap jadvaldagi barcha qatorlarni va o‘ngdagi mos qatorlarni qaytaradi (mos kelmasa NULL)?',
        options: ['INNER JOIN', 'LEFT (OUTER) JOIN', 'CROSS JOIN', 'RIGHT JOIN'],
      },
    },
    {
      ru: {
        text: 'Какой уровень изоляции предотвращает «грязное» чтение, но всё ещё допускает неповторяющееся чтение?',
        options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
      },
      uz: {
        text: 'Qaysi izolyatsiya darajasi «iflos» o‘qishning oldini oladi, lekin takrorlanmaydigan o‘qishga hali yo‘l qo‘yadi?',
        options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
      },
    },
    {
      ru: {
        text: 'Что делает конструкция `GROUP BY`?',
        options: [
          'Фильтрует отдельные строки до агрегации',
          'Группирует строки с общими значениями, чтобы агрегатные функции применялись к каждой группе',
          'Сортирует итоговый набор результатов',
          'Соединяет две таблицы',
        ],
      },
      uz: {
        text: '`GROUP BY` bo‘limi nima qiladi?',
        options: [
          'Agregatsiyadan oldin alohida qatorlarni filtrlaydi',
          'Umumiy qiymatli qatorlarni guruhlaydi, shunda agregat funksiyalar har bir guruhga qo‘llanadi',
          'Yakuniy natija to‘plamini saralaydi',
          'Ikki jadvalni birlashtiradi',
        ],
      },
    },
    {
      ru: {
        text: 'В чём разница между `WHERE` и `HAVING`?',
        options: [
          'Они взаимозаменяемы',
          'WHERE фильтрует строки до группировки; HAVING фильтрует группы после агрегации',
          'HAVING работает до группировки; WHERE — после',
          'WHERE работает только внутри соединений',
        ],
      },
      uz: {
        text: '`WHERE` va `HAVING` o‘rtasidagi farq nima?',
        options: [
          'Ular bir-birining o‘rnini bosadi',
          'WHERE guruhlashdan oldin qatorlarni filtrlaydi; HAVING agregatsiyadan keyin guruhlarni filtrlaydi',
          'HAVING guruhlashdan oldin ishlaydi; WHERE — keyin',
          'WHERE faqat join’lar ichida ishlaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Ограничение PRIMARY KEY гарантирует, что столбец(ы):',
        options: [
          'Допускают nullable-дубликаты',
          'Уникальны и не-null, с поддержкой индекса',
          'Только не-null, но могут дублироваться',
          'Ссылаются на другую таблицу',
        ],
      },
      uz: {
        text: 'PRIMARY KEY cheklovi ustun(lar) haqida nimani kafolatlaydi?',
        options: [
          'Nullable takrorlanishga yo‘l qo‘yadi',
          'Noyob va null bo‘lmagan, indeks bilan ta’minlangan',
          'Faqat null bo‘lmagan, lekin takrorlanishi mumkin',
          'Boshqa jadvalga havola qiladi',
        ],
      },
    },
  ],
  rest: [
    {
      ru: {
        text: 'Какой HTTP-метод идемпотентен и используется для полной замены ресурса?',
        options: ['POST', 'PUT', 'PATCH', 'GET'],
      },
      uz: {
        text: 'Qaysi HTTP metod idempotent va resursni to‘liq almashtirish uchun ishlatiladi?',
        options: ['POST', 'PUT', 'PATCH', 'GET'],
      },
    },
    {
      ru: {
        text: 'Что означает HTTP-статус 409?',
        options: [
          'Ресурс не найден',
          'Запрос конфликтует с текущим состоянием сервера',
          'Клиент не авторизован',
          'Общая ошибка сервера',
        ],
      },
      uz: {
        text: 'HTTP status 409 nimani bildiradi?',
        options: [
          'Resurs topilmadi',
          'So‘rov serverning joriy holati bilan ziddiyatga tushdi',
          'Mijoz avtorizatsiyadan o‘tmagan',
          'Umumiy server xatosi',
        ],
      },
    },
    {
      ru: {
        text: 'Какой код статуса лучше всего отражает успешное создание нового ресурса?',
        options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
      },
      uz: {
        text: 'Yangi resurs muvaffaqiyatli yaratilganini qaysi status kod eng yaxshi ifodalaydi?',
        options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
      },
    },
    {
      ru: {
        text: 'Что означает «безсостоятельность» (statelessness) в REST?',
        options: [
          'Сервер хранит сессионное состояние каждого клиента',
          'Каждый запрос несёт всю нужную информацию; сервер не хранит сессионное состояние клиента между запросами',
          'API не может использовать базу данных',
          'Ответы никогда не могут кэшироваться',
        ],
      },
      uz: {
        text: 'REST’dagi «holatsizlik» (statelessness) nimani anglatadi?',
        options: [
          'Server har bir mijozning sessiya holatini saqlaydi',
          'Har bir so‘rov kerakli barcha ma’lumotni olib yuradi; server so‘rovlar orasida mijoz sessiya holatini saqlamaydi',
          'API ma’lumotlar bazasidan foydalana olmaydi',
          'Javoblar hech qachon keshlanmaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Чем PATCH отличается от PUT?',
        options: [
          'Они идентичны',
          'PATCH применяет частичное обновление; PUT заменяет ресурс целиком',
          'PATCH заменяет весь ресурс; PUT — частично',
          'PATCH удаляет ресурс',
        ],
      },
      uz: {
        text: 'PATCH PUT’dan nimasi bilan farq qiladi?',
        options: [
          'Ular bir xil',
          'PATCH qisman yangilashni qo‘llaydi; PUT resursni butunlay almashtiradi',
          'PATCH butun resursni almashtiradi; PUT — qisman',
          'PATCH resursni o‘chiradi',
        ],
      },
    },
  ],
  swift: [
    {
      ru: {
        text: 'Что такое Optional в Swift?',
        options: [
          'Тип, который может содержать значение или `nil`, требующий распаковки перед использованием',
          'Значение, которое никогда не может быть nil',
          'Разновидность протокола',
          'Конструкция цикла',
        ],
      },
      uz: {
        text: 'Swift’da Optional nima?',
        options: [
          'Qiymat yoki `nil` saqlashi mumkin bo‘lgan, ishlatishdan oldin ochishni talab qiluvchi tur',
          'Hech qachon nil bo‘lmaydigan qiymat',
          'Protokol turi',
          'Sikl konstruksiyasi',
        ],
      },
    },
    {
      ru: {
        text: 'В чём разница между `let` и `var` в Swift?',
        options: [
          'Оба изменяемы',
          '`let` объявляет неизменяемую константную привязку; `var` — изменяемую переменную',
          '`let` изменяем, `var` — константа',
          'Разницы нет',
        ],
      },
      uz: {
        text: 'Swift’da `let` va `var` o‘rtasidagi farq nima?',
        options: [
          'Ikkalasi ham o‘zgaruvchan',
          '`let` o‘zgarmas doimiy bog‘lanishni e’lon qiladi; `var` o‘zgaruvchan o‘zgaruvchini',
          '`let` o‘zgaruvchan, `var` doimiy',
          'Farqi yo‘q',
        ],
      },
    },
    {
      ru: {
        text: 'Каково назначение оператора `guard`?',
        options: [
          'Создавать цикл',
          'Ранний выход из потока управления, который обязан покинуть область при провале условия, привязывая распакованные optional для дальнейшего использования',
          'Объявлять класс',
          'Управлять памятью вручную',
        ],
      },
      uz: {
        text: '`guard` operatorining vazifasi nima?',
        options: [
          'Sikl yaratish',
          'Shart bajarilmasa qamrovni tark etishi shart bo‘lgan erta chiqish; ochilgan optional’larni keyingi foydalanish uchun bog‘laydi',
          'Klass e’lon qilish',
          'Xotirani qo‘lda boshqarish',
        ],
      },
    },
    {
      ru: {
        text: 'Чем структуры отличаются от классов в Swift?',
        options: [
          'Оба — ссылочные типы',
          'Структуры — значимые типы (копируются при присваивании); классы — ссылочные',
          'Структуры — ссылочные; классы — значимые',
          'Разницы нет',
        ],
      },
      uz: {
        text: 'Swift’da struct’lar klasslardan nimasi bilan farq qiladi?',
        options: [
          'Ikkalasi ham havola (reference) turlari',
          'Struct’lar qiymat turlari (tayinlashda nusxalanadi); klasslar havola turlari',
          'Struct’lar havola turlari; klasslar qiymat turlari',
          'Farqi yo‘q',
        ],
      },
    },
    {
      ru: {
        text: 'Что такое ARC в Swift?',
        options: [
          'Встроенный UI-фреймворк',
          'Automatic Reference Counting — автоматическое управление памятью для экземпляров классов',
          'Сетевая библиотека',
          'Планировщик конкурентности',
        ],
      },
      uz: {
        text: 'Swift’da ARC nima?',
        options: [
          'O‘rnatilgan UI freymvork',
          'Automatic Reference Counting — klass nusxalari uchun avtomatik xotira boshqaruvi',
          'Tarmoq kutubxonasi',
          'Parallellik rejalashtiruvchisi',
        ],
      },
    },
  ],
  kotlin: [
    {
      ru: {
        text: 'В чём разница между `val` и `var` в Kotlin?',
        options: [
          'Оба изменяемы',
          '`val` — только для чтения (неизменяемая) ссылка; `var` — изменяемая',
          '`val` изменяем, `var` — только для чтения',
          'Разницы нет',
        ],
      },
      uz: {
        text: 'Kotlin’da `val` va `var` o‘rtasidagi farq nima?',
        options: [
          'Ikkalasi ham o‘zgaruvchan',
          '`val` faqat o‘qish uchun (o‘zgarmas) havola; `var` o‘zgaruvchan',
          '`val` o‘zgaruvchan, `var` faqat o‘qish uchun',
          'Farqi yo‘q',
        ],
      },
    },
    {
      ru: {
        text: 'Что означает тип `String?` в Kotlin?',
        options: [
          'Строку, которая никогда не может быть null',
          'Nullable-строку, которая может содержать null и требует безопасных вызовов (?.) или проверок',
          'Список строк',
          'Строку, которая всегда null',
        ],
      },
      uz: {
        text: 'Kotlin’da `String?` turi nimani anglatadi?',
        options: [
          'Hech qachon null bo‘lmaydigan satrni',
          'null saqlashi mumkin bo‘lgan va xavfsiz chaqiruv (?.) yoki tekshiruvni talab qiluvchi nullable satrni',
          'Satrlar ro‘yxatini',
          'Har doim null bo‘lgan satrni',
        ],
      },
    },
    {
      ru: {
        text: 'Что даёт объявление `data class`?',
        options: [
          'Базовый класс UI-компонента',
          'Автогенерируемые equals(), hashCode(), toString() и copy() из свойств первичного конструктора',
          'Абстрактный класс без реализации',
          'Гарантированный синглтон',
        ],
      },
      uz: {
        text: '`data class` e’lon qilinishi nimani beradi?',
        options: [
          'UI komponenti asosiy klassini',
          'Asosiy konstruktor xususiyatlaridan avtomatik equals(), hashCode(), toString() va copy()',
          'Amalga oshirilishisiz abstrakt klassni',
          'Kafolatlangan singleton’ni',
        ],
      },
    },
    {
      ru: {
        text: 'Для чего используется `companion object`?',
        options: [
          'Создание нескольких экземпляров',
          'Хранение членов, привязанных к самому классу (аналог статических членов)',
          'Управление корутинами',
          'Определение интерфейсов',
        ],
      },
      uz: {
        text: '`companion object` nima uchun ishlatiladi?',
        options: [
          'Bir nechta nusxa yaratish',
          'Klassning o‘ziga bog‘langan a’zolarni saqlash (statik a’zolarga o‘xshash)',
          'Coroutine’larni boshqarish',
          'Interfeyslarni aniqlash',
        ],
      },
    },
    {
      ru: {
        text: 'Для чего используются корутины в Kotlin?',
        options: [
          'Определение UI-макетов',
          'Асинхронная неблокирующая конкурентность с помощью suspend-функций',
          'Внедрение зависимостей',
          'Сериализация объектов',
        ],
      },
      uz: {
        text: 'Kotlin’da coroutine’lar nima uchun ishlatiladi?',
        options: [
          'UI maketlarini aniqlash',
          'suspend funksiyalar yordamida asinxron, bloklamaydigan parallellik',
          'Bog‘liqlik in’ektsiyasi',
          'Obyektlarni serializatsiya qilish',
        ],
      },
    },
  ],
  'react-native': [
    {
      ru: {
        text: 'Какой базовый компонент эффективно рендерит длинные списки, монтируя только видимые элементы?',
        options: ['ScrollView', 'FlatList', 'View', 'Text'],
      },
      uz: {
        text: 'Qaysi asosiy komponent uzun ro‘yxatlarni faqat ko‘rinadigan elementlarni o‘rnatib, samarali renderlaydi?',
        options: ['ScrollView', 'FlatList', 'View', 'Text'],
      },
    },
    {
      ru: {
        text: 'Как выполняется стилизация в React Native?',
        options: [
          'Внешними CSS-файлами',
          'JavaScript-объектами стилей (StyleSheet) с системой вёрстки на основе Flexbox',
          'Инлайновыми HTML-атрибутами style',
          'SCSS-таблицами стилей',
        ],
      },
      uz: {
        text: 'React Native’da uslublash qanday amalga oshiriladi?',
        options: [
          'Tashqi CSS fayllari bilan',
          'Flexbox’ga asoslangan layout tizimidan foydalanuvchi JavaScript uslub obyektlari (StyleSheet) bilan',
          'Inline HTML style atributlari bilan',
          'SCSS uslublar jadvallari bilan',
        ],
      },
    },
    {
      ru: {
        text: 'Что исторически связывает JavaScript с нативными модулями в React Native?',
        options: [
          'Обычные HTTP-запросы',
          'Асинхронный мост (теперь во многом заменён на JSI в новой архитектуре)',
          'WebSockets',
          'localStorage',
        ],
      },
      uz: {
        text: 'React Native’da JavaScript’ni native modullar bilan tarixan nima bog‘laydi?',
        options: [
          'Oddiy HTTP so‘rovlar',
          'Asinxron ko‘prik (yangi arxitekturada asosan JSI bilan almashtirilgan)',
          'WebSocket’lar',
          'localStorage',
        ],
      },
    },
    {
      ru: {
        text: 'Компонент `<View>` наиболее аналогичен какому веб-элементу?',
        options: ['<span>', 'контейнеру <div>', '<input>', '<script>'],
      },
      uz: {
        text: '`<View>` komponenti qaysi veb-elementga eng o‘xshash?',
        options: ['<span>', '<div> konteyneriga', '<input>', '<script>'],
      },
    },
    {
      ru: {
        text: 'Какое утверждение о React Native ВЕРНО?',
        options: [
          'Он рендерит UI внутри WebView',
          'Он рендерит в реальные нативные компоненты платформы',
          'Он поддерживает только Android',
          'Он манипулирует DOM браузера',
        ],
      },
      uz: {
        text: 'React Native haqidagi qaysi fikr TO‘G‘RI?',
        options: [
          'U UI’ni WebView ichida renderlaydi',
          'U haqiqiy native platforma komponentlariga renderlaydi',
          'U faqat Android’ni qo‘llab-quvvatlaydi',
          'U brauzer DOM’ini boshqaradi',
        ],
      },
    },
  ],
  flutter: [
    {
      ru: {
        text: 'В Flutter практически всё в UI — это:',
        options: ['Виджет', 'Класс-компонент', 'Шаблон', 'Директива'],
      },
      uz: {
        text: 'Flutter’da UI’dagi deyarli hamma narsa — bu:',
        options: ['Widget', 'Komponent klassi', 'Shablon', 'Direktiva'],
      },
    },
    {
      ru: {
        text: 'Что отличает StatefulWidget от StatelessWidget?',
        options: [
          'Разницы нет',
          'StatefulWidget хранит изменяемое состояние, которое может вызывать перестроение через setState(); StatelessWidget неизменяем',
          'StatelessWidget хранит изменяемое состояние',
          'StatefulWidget никогда не может перестраиваться',
        ],
      },
      uz: {
        text: 'StatefulWidget’ni StatelessWidget’dan nima farqlaydi?',
        options: [
          'Farqi yo‘q',
          'StatefulWidget setState() orqali qayta qurishni chaqira oladigan o‘zgaruvchan holatni saqlaydi; StatelessWidget o‘zgarmas',
          'StatelessWidget o‘zgaruvchan holatni saqlaydi',
          'StatefulWidget hech qachon qayta qurilmaydi',
        ],
      },
    },
    {
      ru: {
        text: 'Что представляет `Future` в Dart?',
        options: [
          'Синхронное, уже доступное значение',
          'Значение или ошибку, которые станут доступны позже (асинхронно)',
          'Поддерево виджетов',
          'Поток из множества значений во времени',
        ],
      },
      uz: {
        text: 'Dart’da `Future` nimani ifodalaydi?',
        options: [
          'Sinxron, allaqachon mavjud qiymatni',
          'Keyinroq (asinxron) mavjud bo‘ladigan qiymat yoki xatoni',
          'Widget’lar quyi daraxtini',
          'Vaqt bo‘yicha ko‘p qiymatlar oqimini',
        ],
      },
    },
    {
      ru: {
        text: 'Что делает вызов `setState()`?',
        options: [
          'Переходит на новый экран',
          'Сообщает фреймворку, что внутреннее состояние изменилось, поэтому виджет перестраивается',
          'Уничтожает виджет',
          'Выполняет сетевой запрос',
        ],
      },
      uz: {
        text: '`setState()` chaqiruvi nima qiladi?',
        options: [
          'Yangi ekranga o‘tadi',
          'Freymvorkga ichki holat o‘zgarganini bildiradi, shunda widget qayta quriladi',
          'Widget’ni yo‘q qiladi',
          'Tarmoq so‘rovini bajaradi',
        ],
      },
    },
    {
      ru: {
        text: 'Что такое `BuildContext` во Flutter?',
        options: [
          'Соединение с базой данных',
          'Дескриптор расположения виджета в дереве виджетов',
          'Объект конфигурации темы',
          'Сетевой клиент',
        ],
      },
      uz: {
        text: 'Flutter’da `BuildContext` nima?',
        options: [
          'Ma’lumotlar bazasi ulanishi',
          'Widget’ning widget daraxtidagi joylashuvi uchun deskriptor (ishorat)',
          'Mavzu konfiguratsiyasi obyekti',
          'Tarmoq mijozi',
        ],
      },
    },
  ],
};

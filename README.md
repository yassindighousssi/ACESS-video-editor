# ACESS Video Editor

> **محرر فيديو ميسّر** لذوي الإعاقة البصرية والمبصرين على حدٍّ سواء.
> An accessible, non-visual video editing environment for blind and sighted users.

---

## English

**ACESS Video Editor** is a keyboard-driven, screen-reader friendly video editor.
It is built around an announcement engine that delivers all feedback in **bilingual
Arabic/English** speech, so users can work without ever looking at the screen.

### Features

- **Rooms-based navigation** — move between Project, Media, Timeline, Effects, Text,
  Export, Settings and Help rooms with the arrow keys; open a room with Enter.
- **Announcement engine** — every action is spoken bilingually (AR/EN) with
  importance levels (`all`, `important`, `critical_only`).
- **Trilingual UI (AR / EN / FR)** — full translation system with bundled static
  locales and support for user-supplied locale files. Switch with the language
  selector (`Ctrl+Shift+L`).
- **Project management** — create, open, save and persist projects as JSON.
- **Media pipeline** — import media from the file system into an in-memory library.
- **Timeline editing** — cut, delete and reorder clips.
- **Effects engine** — speed, fade, color, text, transform, audio and generative
  effects with composable pipelines.
- **Self-update system (PUS)** — version checking against GitHub releases, checksum
  verification (SHA-256), download/install with progress, and automatic restart.
- **Gated release versioning** — `npm run build` never touches the version file;
  only release builds bump the build number from the newest Git tag.

### Project structure

```
src/
  core/
    infrastructure/   File system, fetch, timers, processes, logging
    model/            Project, Media, Timeline, Clips, Settings models
    rooms/            Room navigation + AnnouncementEngine
    media/            Media import & library
    effects/          Effect registry and pipelines
    commands/         Command bus
    updates/          Update checker, downloader, installer, UI (PUS)
    i18n/             Locale loader, translator, language selector, announcements
  ui/
    hooks/            React hooks (useTranslation, …)
    components/       React UI layer
scripts/              clean + gated version bump tooling
```

### Requirements

- Node.js 22+
- npm

### Getting started

```bash
npm install          # install dependencies
npm test             # run the Jest suites
npm run test:coverage# run tests with coverage report
npm run lint         # type-check (tsc --noEmit)
npm run build        # dev build (never mutates the version file)
npm run build:release# release build (increments the build number from the Git tag)
```

### Versioning

The canonical version lives in `src/core/updates/common/current-version.json`.
`scripts/update-version.js` runs on every build but **only writes** when the build is
a release (`BUILD_TYPE=release`, `IS_RELEASE=true`, or `--release`):

1. reads the newest tag via `git describe --tags --abbrev=0`;
2. falls back to `current-version.json`, then `package.json`;
3. writes the resolved version with `build + 1`.

Dev builds (`npm run build`) leave the file untouched. See
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full Git Flow and release
workflow.

### Internationalization (i18n)

- Bundled locales: `src/core/i18n/locales/{ar,en,fr}.json` (nested keys).
- `LocaleLoader` loads user locales from the `locales/` folder via the file engine.
- `Translator` exposes synchronous `t(key, params)` lookup and async `setLanguage`.
- `AnnouncementTranslator` produces `{ textAr, textEn }` for the announcement engine.
- `useTranslation()` React hook re-renders on language change.
- A locale-parity test enforces identical key sets across all locales.

### Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and the changelog in
[docs/CHANGELOG.md](docs/CHANGELOG.md). Pull requests are welcome — please follow
Conventional Commits and the Git Flow branching model.

---

## العربية

**محرر فيديو ACESS** هو محرر فيديو يعمل بالكامل عبر لوحة المفاتيح وقرّاء الشاشة،
صُمِّم لتمكين المستخدمين من التحرير دون الحاجة إلى النظر إلى الشاشة، من خلال نظام
إعلانات ناطق ثنائي اللغة (العربية/الإنجليزية).

### المزايا

- **تنقّل بالغرف** — تحرّك بين غرف المشروع والوسائط والخط الزمني والتأثيرات والنصوص
  والتصدير والإعدادات والمساعدة بأسهم لوحة المفاتيح، وافتح أي غرفة بمفتاح Enter.
- **محرك الإعلانات** — كل إجراء يُنطق بلغتين مع مستويات أهمية
  (`all`، `important`، `critical_only`).
- **واجهة ثلاثية اللغة (عربي / إنجليزي / فرنسي)** — نظام ترجمة متكامل مع ملفات
  لغات مدمجة ودعم لملفات لغات مخصّصة من المستخدم. بدّل اللغة عبر منتقي اللغة
  (`Ctrl+Shift+L`).
- **إدارة المشاريع** — إنشاء وفتح وحفظ المشاريع وتخزينها بصيغة JSON.
- **مسار الوسائط** — استيراد الوسائط من نظام الملفات إلى مكتبة في الذاكرة.
- **تحرير الخط الزمني** — قصّ وحذف وإعادة ترتيب المقاطع.
- **محرك التأثيرات** — السرعة والتلاشي والتصحيح اللوني والنص والتحويل والصوت
  والتأثيرات التوليدية مع خطوط أنابيب قابلة للتركيب.
- **نظام التحديث الذاتي (PUS)** — فحص الإصدارات مقابل إصدارات GitHub، والتحقق من
  المجموع الاختباري (SHA-256)، والتنزيل/التثبيت مع مؤشر تقدم، وإعادة تشغيل تلقائية.
- **ترقيم الإصدارات المقنَّن** — أمر `npm run build` لا يمسّ ملف الإصدار إطلاقًا؛
  فقط بناء الإصدارات الرسمية يرفع رقم البناء اعتمادًا على أحدث وسم Git.

### هيكل المشروع

```
src/
  core/
    infrastructure/   أنظمة الملفات والشبكة والمؤقّتات والعمليات والسجلات
    model/            نماذج المشروع والوسائط والخط الزمني والمقاطع والإعدادات
    rooms/            تنقّل الغرف + محرك الإعلانات
    media/            استيراد الوسائط والمكتبة
    effects/          سجلّ التأثيرات وخطوط الأنابيب
    commands/         ناقل الأوامر
    updates/          فاحص التحديثات، التنزيل، التثبيت، الواجهة (PUS)
    i18n/             محمّل اللغات، المترجم، منتقي اللغة، الإعلانات
  ui/
    hooks/            خطافات React (useTranslation، …)
    components/       طبقة واجهة React
scripts/              أدوات التنظيف ورفع الإصدار المقنَّن
```

### المتطلبات

- Node.js 22 فأعلى
- npm

### البدء

```bash
npm install           # تثبيت الاعتماديات
npm test              # تشغيل اختبارات Jest
npm run test:coverage # تشغيل الاختبارات مع تقرير التغطية
npm run lint          # فحص الأنواع (tsc --noEmit)
npm run build         # بناء تطويري (لا يعدّل ملف الإصدار إطلاقًا)
npm run build:release # بناء رسمي (يرفع رقم البناء من وسم Git)
```

### الترقيم

يقع الإصدار المرجعي في `src/core/updates/common/current-version.json`، ويعمل
`scripts/update-version.js` مع كل بناء لكنه **لا يكتب أي شيء** إلا إذا كان البناء
رسميًا (`BUILD_TYPE=release` أو `IS_RELEASE=true` أو `--release`):

1. يقرأ أحدث وسم عبر `git describe --tags --abbrev=0`؛
2. يعتمد على `current-version.json` ثم `package.json` كبديل؛
3. يكتب الإصدار المحسوم مع `build + 1`.

أما البناء التطويري (`npm run build`) فلا يمسّ الملف. اطّلع على
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) لتفاصيل Git Flow ومسار الإصدارات.

### التدويل (i18n)

- اللغات المدمجة: `src/core/i18n/locales/{ar,en,fr}.json` (مفاتيح متداخلة).
- `LocaleLoader` يحمّل لغات المستخدم من مجلد `locales/` عبر محرك الملفات.
- `Translator` يوفر بحثًا متزامنًا `t(key, params)` و `setLanguage` غير متزامن.
- `AnnouncementTranslator` يولّد `{ textAr, textEn }` لمحرك الإعلانات.
- خطاف `useTranslation()` في React يُحدِّث الواجهة عند تغيير اللغة.
- اختبار تكافؤ اللغات يضمن تطابق مجموعات المفاتيح في كل اللغات.

### المساهمة

راجع [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) وسجلّ التغييرات في
[docs/CHANGELOG.md](docs/CHANGELOG.md). نرحّب بطلبات السحب — يرجى الالتزام
بـ Conventional Commits ونموذج Git Flow.

---

## License / الترخيص

Private project. All rights reserved. / مشروع خاص — جميع الحقوق محفوظة.

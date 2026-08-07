# Contributing / المساهمة

Thank you for contributing to **ACESS Video Editor**.
شكرًا لاهتمامك بالمساهمة في **محرر فيديو ACESS**.

## English

### Development workflow

1. Fork the repository and clone it.
2. Install dependencies: `npm install`.
3. Create a feature branch off `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/my-feature
   ```
4. Make your changes. Keep changes focused and covered by tests.
5. Run the full gate before pushing:
   ```bash
   npm run lint        # tsc --noEmit
   npm run test:coverage
   npm run build
   ```
   The Jest coverage thresholds (statements 90, lines 90, functions 90, branches 80)
   must pass.
6. Commit with a [Conventional Commit](https://www.conventionalcommits.org/) message:
   - `feat(scope): description`
   - `fix(scope): description`
   - `refactor(scope): description`
   - `docs(scope): description`
   - `test(scope): description`
7. Push and open a pull request into `develop`.

### Branching model (Git Flow)

- `main` — production-ready releases only. Every release is tagged `vX.Y.Z`.
- `develop` — integration branch for feature work.
- `feat/*`, `fix/*` — short-lived branches merged back into `develop`.

### Release workflow

1. From `develop`, create a release branch and a tag:
   ```bash
   git checkout -b release/v1.0.0 develop
   npm run build:release   # bumps the build number from the Git tag
   git tag v1.0.0
   git push origin v1.0.0
   git checkout main && git merge --no-ff release/v1.0.0
   git checkout develop && git merge --no-ff release/v1.0.0
   ```
2. The `release.yml` workflow builds the release, runs the full gate, and (when a
   tag is pushed) produces the packaged artifact.

### Code style

- TypeScript strict mode with `noUncheckedIndexedAccess`.
- CommonJS modules, ES2022 target.
- No comments unless they add real value.
- All core modules expose a barrel `index.ts` with only the public surface.
- New user-facing strings must be added to all locales in
  `src/core/i18n/locales/` (a parity test enforces identical key sets).

### Tests

- Jest with `ts-jest`. Unit tests live next to the code (`*.test.ts`).
- React hook/component tests use `@testing-library/react` under `jsdom`.
- Mock infrastructure lives in `src/core/infrastructure/testing/test-harness.ts`.

## العربية

### سير العمل التطويري

1. انسخ المستودع (Fork) واستنسخه.
2. ثبّت الاعتماديات: `npm install`.
3. أنشئ فرع ميزة من `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/my-feature
   ```
4. أجرِ تغييراتك مع تغطية بالاختبارات.
5. قبل الرفع نفّذ الفحص الكامل:
   ```bash
   npm run lint        # tsc --noEmit
   npm run test:coverage
   npm run build
   ```
   يجب اجتياز عتبات تغطية Jest (البنود 90، الأسطر 90، الدوال 90، الفروع 80).
6. ارفع بالاتزامات وفق صيغة Conventional Commits:
   - `feat(scope): description`
   - `fix(scope): description`
   - `refactor(scope): description`
   - `docs(scope): description`
   - `test(scope): description`
7. ادفع الفرع وافتح طلب سحب نحو `develop`.

### نموذج الفروع (Git Flow)

- `main` — إصدارات جاهزة للإنتاج فقط، وكل إصدار يحمل وسمًا `vX.Y.Z`.
- `develop` — فرع التكامل لكل المزايا.
- `feat/*` و `fix/*` — فروع قصيرة العمر تُدمج في `develop`.

### سير عمل الإصدارات

1. من `develop` أنشئ فرع إصدار ووسمًا:
   ```bash
   git checkout -b release/v1.0.0 develop
   npm run build:release   # يرفع رقم البناء من وسم Git
   git tag v1.0.0
   git push origin v1.0.0
   git checkout main && git merge --no-ff release/v1.0.0
   git checkout develop && git merge --no-ff release/v1.0.0
   ```
2. ينفّذ سير عمل `release.yml` البناء الرسمي والفحص الكامل، وينتج الحزمة عند دفع
   وسم.

### نمط الكود

- TypeScript صارم مع `noUncheckedIndexedAccess`.
- وحدات CommonJS وهدف ES2022.
- لا تعليقات إلا عند الحاجة الفعلية.
- كل وحدة أساسية تُصدِّر ملف برميل `index.ts` يحتوي السطح العام فقط.
- أي نص جديد موجه للمستخدم يجب إضافته إلى كل اللغات في
  `src/core/i18n/locales/` (اختبار التكافؤ يفرض ذلك).

### الاختبارات

- Jest مع `ts-jest`. اختبارات الوحدة بجوار الكود (`*.test.ts`).
- اختبارات خطافات React تعتمد `@testing-library/react` ضمن بيئة `jsdom`.
- البنية المخصّصة للاختبارات في `src/core/infrastructure/testing/test-harness.ts`.

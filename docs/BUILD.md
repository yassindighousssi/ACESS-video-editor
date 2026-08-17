# بناء نسخة Windows (EXE) — دليل مختصر

هذا الدليل يشرح كيفية بناء نسخة ويندوز القابلة للتشغيل من الكود المصدري.

## المتطلبات

- Windows 10/11 (x64)
- Node.js v22+ و npm
- اتصال بالإنترنت (لتحميل Electron و NSIS عند أول بناء)

## خطوات البناء

```powershell
# 1) تثبيت الاعتماديات (مرة واحدة)
npm install

# 2) التحقق من الجودة (اختياري لكن موصى به)
npm run lint
npm test

# 3) بناء الكود الأساسي
npm run build

# 4) توليد الأيقونة (مرة واحدة)
npm run make:icon

# 5) بناء الرندر + Electron + حزم EXE
npm run build:exe
```

أو أمر واحد لكل شيء:

```powershell
npm run make
```

## النواتج

| الملف | الوصف |
| --- | --- |
| `ACESS-Video-Editor-Portable.exe` | نسخة محمولة — تعمل دون تثبيت |
| `ACESS-Video-Editor-Setup.exe` | مثبّت بنقرة واحدة (NSIS) |
| `release/` | مجلد النواتج الخام |

## تشغيل بدون بناء (للمستخدم النهائي)

- انقر مزدوجاً على `ACESS-Video-Editor-Portable.exe` (محمول) أو
- انقر مزدوجاً على `ACESS-Video-Editor-Setup.exe` للتثبيت الدائم.

## الإصدارات (Releases)

الملفات النهائية تُرفع تلقائياً إلى GitHub Releases تحت الوسم `v1.0.0`.

## أدوات البناء

- Electron 43.4.0 — shell سطح المكتب
- electron-builder 26.15.3 — الحزم (portable + NSIS)
- Vite 8 — بناء واجهة الرندر
- TypeScript 5.9 — الكود الأساسي

## ملاحظات

- التوقيع: غير موقّع رقمياً (قد تظهر تحذيرات SmartScreen — اختر "More info" ثم "Run anyway").
- عند أول تشغيل للمحمول قد يستغرق فك الضغط بضع ثوانٍ.

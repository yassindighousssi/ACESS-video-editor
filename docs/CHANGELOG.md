# Changelog

All notable changes to **ACESS Video Editor** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the project
uses [Semantic Versioning](https://semver.org/) with a build number.

## [Unreleased]

## [1.0.0] - 2026-08-08

### Added

- **Unified Translation System (UTS)** — `src/core/i18n/`:
  - `LocaleLoader` — loads bundled static locales or user-supplied locale files
    from the `locales/` folder through the file engine; validates required keys.
  - `Translator` — synchronous `t(key, params)` lookup, async `setLanguage`,
    cross-locale `tIn`, caching, and change listeners.
  - `LanguageSelector` — programmatic selection and a bilingual announcement of
    available languages.
  - `AnnouncementTranslator` — produces `{ textAr, textEn }` bilingual text for the
    announcement engine.
  - `useTranslation()` React hook — re-renders the UI on language change.
  - Bundled locales with full key parity across Arabic, English and French.
- **Conditional, release-gated versioning**:
  - `scripts/update-version.js` bumps the build number only on release builds,
    sourced from the newest `git describe --tags` tag.
  - `scripts/clean.js` removes `dist/` and `node_modules/.cache`.
  - `npm run build` never mutates the version file; `npm run build:release` does.
- **Tests** — full i18n coverage (loader, translator, language selector,
  announcement adapter, locale parity, barrel, React hook) and UpdateUI wiring
  through `AnnouncementTranslator`.

### Changed

- `UpdateUI` announcement methods are now async and accept an optional
  `AnnouncementTranslator`; when provided, update messages are translated through
  the i18n layer instead of hardcoded strings.
- `UpdateManager` awaits all UI feedback calls.
- `LocaleLoader.getAvailableLanguages` propagates listing failures when no static
  locales exist.
- Locale validation rejects array payloads in addition to primitives.

### Fixed

- JSON locale imports in `src/core/i18n/locales/index.ts` referenced a wrong
  relative path.

## [0.1.0] - 2026-07-xx

### Added

- Initial project scaffold: rooms-based navigation, announcement engine, project,
  media, timeline, effects, commands, update system (PUS), test suites, and
  CI-ready configuration.

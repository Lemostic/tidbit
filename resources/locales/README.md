# tidbit translations

Each locale lives in `resources/locales/<locale>/translation.json` and must keep the same nested keys as `zh-CN/translation.json`.

- Use a BCP 47 language tag for `<locale>`, such as `fr`, `de`, `ja`, or `pt-BR`.
- Copy the Simplified Chinese file, translate values only, and keep placeholders such as `{{count}}` unchanged.
- Add the locale code and display name to `supportedLocales` in `src/i18n/index.ts`.
- Run `pnpm test` to verify locale completeness before opening a pull request.

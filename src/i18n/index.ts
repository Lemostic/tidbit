import { useCallback, useSyncExternalStore } from "react";
import en from "../../resources/locales/en/translation.json";
import zhCN from "../../resources/locales/zh-CN/translation.json";

export type Locale = "zh-CN" | "en";
type TranslationTree = typeof zhCN;

export const supportedLocales: ReadonlyArray<{ code: Locale; label: string }> = [
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
];

const resources: Record<Locale, TranslationTree> = { "zh-CN": zhCN, en };
const storageKey = "app-locale";
const listeners = new Set<() => void>();

export function loadLocale(): Locale {
  return localStorage.getItem(storageKey) === "en" ? "en" : "zh-CN";
}

export function setLocale(locale: Locale) {
  localStorage.setItem(storageKey, locale);
  document.documentElement.lang = locale;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = () => listener();
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}

function lookup(locale: Locale, key: string): string {
  let value: unknown = resources[locale];
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object") return key;
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value === "string") return value;
  if (locale !== "zh-CN") return lookup("zh-CN", key);
  return key;
}

export function translate(key: string, params?: Record<string, string | number>, locale = loadLocale()) {
  let value = lookup(locale, key);
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replaceAll(`{{${name}}}`, String(replacement));
  }
  return value;
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, loadLocale, () => "zh-CN" as Locale);
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(key, params, locale), [locale]);
  return { locale, setLocale, t };
}

document.documentElement.lang = loadLocale();

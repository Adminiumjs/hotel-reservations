/**
 * Area bundle: **nav** — the words Adminium's sidebar shows for this app
 * (`surface.json`): the section heading, the guest site's front page, and each
 * screen a path leads to. The screens' own sentences live in `house/`.
 *
 * The heading is the kind of app, never a house's name: every hotel that
 * installs it gets the same sidebar, and its own name is its settings'.
 */
import type { LocaleTag } from "../locales.ts";

const EN = {
  "chrome.brand": "Hotel",
  "chrome.brand.site": "Home",
  "chrome.nav.rooms": "Rooms",
  "chrome.nav.myreservation": "Your reservation",
  "chrome.nav.findus": "Find us",
  "chrome.nav.today": "Today",
  "chrome.nav.rack": "Room rack",
  "chrome.nav.calendar": "Calendar",
  "chrome.nav.reservations": "Reservations",
};
type Words = Record<keyof typeof EN, string>;

const DE: Words = {
  "chrome.brand": "Hotel",
  "chrome.brand.site": "Startseite",
  "chrome.nav.rooms": "Zimmer",
  "chrome.nav.myreservation": "Ihre Reservierung",
  "chrome.nav.findus": "Anfahrt",
  "chrome.nav.today": "Heute",
  "chrome.nav.rack": "Zimmerspiegel",
  "chrome.nav.calendar": "Kalender",
  "chrome.nav.reservations": "Reservierungen",
};
const FR: Words = {
  "chrome.brand": "Hôtel",
  "chrome.brand.site": "Accueil",
  "chrome.nav.rooms": "Chambres",
  "chrome.nav.myreservation": "Votre réservation",
  "chrome.nav.findus": "Nous trouver",
  "chrome.nav.today": "Aujourd’hui",
  "chrome.nav.rack": "Tableau des chambres",
  "chrome.nav.calendar": "Calendrier",
  "chrome.nav.reservations": "Réservations",
};
const CS: Words = {
  "chrome.brand": "Hotel",
  "chrome.brand.site": "Úvod",
  "chrome.nav.rooms": "Pokoje",
  "chrome.nav.myreservation": "Vaše rezervace",
  "chrome.nav.findus": "Kde nás najdete",
  "chrome.nav.today": "Dnes",
  "chrome.nav.rack": "Přehled pokojů",
  "chrome.nav.calendar": "Kalendář",
  "chrome.nav.reservations": "Rezervace",
};
const DA: Words = {
  "chrome.brand": "Hotel",
  "chrome.brand.site": "Forside",
  "chrome.nav.rooms": "Værelser",
  "chrome.nav.myreservation": "Din reservation",
  "chrome.nav.findus": "Find os",
  "chrome.nav.today": "I dag",
  "chrome.nav.rack": "Værelsesoversigt",
  "chrome.nav.calendar": "Kalender",
  "chrome.nav.reservations": "Reservationer",
};
const ZH_CN: Words = {
  "chrome.brand": "酒店",
  "chrome.brand.site": "首页",
  "chrome.nav.rooms": "客房",
  "chrome.nav.myreservation": "我的预订",
  "chrome.nav.findus": "如何找到我们",
  "chrome.nav.today": "今天",
  "chrome.nav.rack": "房态表",
  "chrome.nav.calendar": "日历",
  "chrome.nav.reservations": "预订",
};
const ZH_TW: Words = {
  "chrome.brand": "飯店",
  "chrome.brand.site": "首頁",
  "chrome.nav.rooms": "客房",
  "chrome.nav.myreservation": "您的訂房",
  "chrome.nav.findus": "交通資訊",
  "chrome.nav.today": "今天",
  "chrome.nav.rack": "房態表",
  "chrome.nav.calendar": "行事曆",
  "chrome.nav.reservations": "訂房",
};
const AR: Words = {
  "chrome.brand": "الفندق",
  "chrome.brand.site": "الرئيسية",
  "chrome.nav.rooms": "الغرف",
  "chrome.nav.myreservation": "حجزك",
  "chrome.nav.findus": "كيف تصل إلينا",
  "chrome.nav.today": "اليوم",
  "chrome.nav.rack": "لوحة الغرف",
  "chrome.nav.calendar": "التقويم",
  "chrome.nav.reservations": "الحجوزات",
};

export const nav = {
  "en-US": EN,
  "de-DE": DE,
  "fr-FR": FR,
  "cs-CZ": CS,
  "da-DK": DA,
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  "ar-EG": AR,
} satisfies Record<LocaleTag, Words>;

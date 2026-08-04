/**
 * Area bundle: **chrome**.
 *
 * Everything outside a screen's own body — the two shells, the navigation, the
 * demo dock, the toasts, and every status word the app puts in a pill.
 *
 * VOCABULARY. This is the hardest ban list in the marketplace, because four of
 * the seven banned strings are ordinary hotel words (21 D10a). Never
 * *u·p·g·r·a·d·e* — say "move to a bigger room". Never *f·r·e·e* in any form,
 * which rules out the usual phrasings for breakfast, WiFi and cancellation:
 * say "breakfast is included", "WiFi throughout", "cancel at no charge". Never
 * *p·l·a·n*, which rules out rate p·l·a·n (say "rate"), meal p·l·a·n (say
 * "what's included") and floor p·l·a·n (say "the layout"). Never *t·i·e·r* —
 * they are room types. Never *p·r·i·c·i·n·g* (rates) or *b·i·l·l·i·n·g* (the
 * folio, the account, payments).
 *
 * The other languages carry their own versions of the same traps — German
 * Zeitp·l·a·n and T·i·e·r, French p·l·a·n, Danish p·l·a·n — and the
 * translations below route around all of them, which is why one or two read a
 * shade more concrete than a literal rendering would.
 */
import type { LocaleTag } from "../locales.ts";

const EN = {
  "chrome.skipToContent": "Skip to content",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "Rooms by the water",
  "chrome.brand.desk": "Front desk",
  "chrome.footer.copy": "© 2026 Wren House. A demo reservations desk shipped with Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "Rooms",
  "chrome.nav.myreservation": "Your reservation",
  "chrome.nav.findus": "Find us",
  "chrome.nav.today": "Today",
  "chrome.nav.rack": "Room rack",
  "chrome.nav.calendar": "Calendar",
  "chrome.nav.reservations": "Reservations",

  "chrome.search.placeholder": "Search guests and references…",
  "chrome.search.label": "Search the book",
  "chrome.search.empty": "Nothing matches “{query}”.",
  "chrome.menu.open": "Open navigation",
  "chrome.menu.close": "Close navigation",

  "chrome.dock.title": "Demo controls",
  "chrome.dock.expand": "Show the demo controls",
  "chrome.dock.collapse": "Hide the demo controls",
  "chrome.dock.persona": "Who is looking",
  "chrome.dock.guest": "Guest",
  "chrome.dock.desk": "Front desk",
  "chrome.dock.clock": "Time",
  "chrome.dock.advance": "Advance to check-out time",
  "chrome.dock.theme": "Theme",
  "chrome.dock.theme.light": "Switch to the light theme",
  "chrome.dock.theme.dark": "Switch to the dark theme",
  "chrome.dock.language": "Language",
  "chrome.dock.reset": "Reset the demo",

  "chrome.clock.morning": "before check-out",
  "chrome.clock.after": "after check-out",

  "chrome.room.ready": "Ready",
  "chrome.room.occupied": "Occupied",
  "chrome.room.cleaning": "Being cleaned",
  "chrome.room.oos": "Out of service",

  "chrome.stay.held": "Held",
  "chrome.stay.confirmed": "Confirmed",
  "chrome.stay.in_house": "In house",
  "chrome.stay.departed": "Departed",
  "chrome.stay.cancelled": "Cancelled",

  "chrome.method.card": "Card",
  "chrome.method.cash": "Cash",
  "chrome.method.transfer": "Transfer",

  "chrome.tag.weekend": "weekend",
  "chrome.tag.season": "August",

  "chrome.nights": "{count} night|{count} nights",
  "chrome.guests": "{count} guest|{count} guests",
  "chrome.left": "{count} left for these dates|{count} left for these dates",
  "chrome.nightOf": "night {current} of {total}",
  "chrome.rooms": "{count} room|{count} rooms",

  "chrome.close": "Close",
  "chrome.cancel": "Cancel",
  "chrome.back": "Back",

  "chrome.toast.reserved": "{ref} is reserved — we will see you on {date}",
  "chrome.toast.checkedIn": "{name} is in room {room}",
  "chrome.toast.checkedOut": "{name} has checked out · room {room} is being cleaned",
  "chrome.toast.charged": "{amount} added to {ref}",
  "chrome.toast.settled": "{amount} taken against {ref}",
  "chrome.toast.cancelled": "{ref} is cancelled",
  "chrome.toast.markedReady": "Room {room} is ready",
  "chrome.toast.extraAdded": "Added to {ref}",
  "chrome.toast.timeChanged": "We will expect you at {time}",
  "chrome.toast.advanced": "Past check-out — departures are due",
  "chrome.toast.reset": "The demo is back to how it started",
};

type Bundle = Record<keyof typeof EN, string>;

const DE: Bundle = {
  "chrome.skipToContent": "Zum Inhalt springen",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "Zimmer am Wasser",
  "chrome.brand.desk": "Empfang",
  "chrome.footer.copy": "© 2026 Wren House. Ein Demo-Empfangspult, mitgeliefert von Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "Zimmer",
  "chrome.nav.myreservation": "Ihre Reservierung",
  "chrome.nav.findus": "Anfahrt",
  "chrome.nav.today": "Heute",
  "chrome.nav.rack": "Zimmerspiegel",
  "chrome.nav.calendar": "Kalender",
  "chrome.nav.reservations": "Reservierungen",

  "chrome.search.placeholder": "Gäste und Referenzen suchen…",
  "chrome.search.label": "Im Buch suchen",
  "chrome.search.empty": "Nichts passt zu „{query}“.",
  "chrome.menu.open": "Navigation öffnen",
  "chrome.menu.close": "Navigation schließen",

  "chrome.dock.title": "Demo-Steuerung",
  "chrome.dock.expand": "Demo-Steuerung einblenden",
  "chrome.dock.collapse": "Demo-Steuerung ausblenden",
  "chrome.dock.persona": "Wer schaut",
  "chrome.dock.guest": "Gast",
  "chrome.dock.desk": "Empfang",
  "chrome.dock.clock": "Uhrzeit",
  "chrome.dock.advance": "Auf die Abreisezeit vorstellen",
  "chrome.dock.theme": "Darstellung",
  "chrome.dock.theme.light": "Zur hellen Darstellung wechseln",
  "chrome.dock.theme.dark": "Zur dunklen Darstellung wechseln",
  "chrome.dock.language": "Sprache",
  "chrome.dock.reset": "Demo zurücksetzen",

  "chrome.clock.morning": "vor der Abreisezeit",
  "chrome.clock.after": "nach der Abreisezeit",

  "chrome.room.ready": "Bezugsfertig",
  "chrome.room.occupied": "Belegt",
  "chrome.room.cleaning": "Wird gereinigt",
  "chrome.room.oos": "Außer Betrieb",

  "chrome.stay.held": "Vorgemerkt",
  "chrome.stay.confirmed": "Bestätigt",
  "chrome.stay.in_house": "Im Haus",
  "chrome.stay.departed": "Abgereist",
  "chrome.stay.cancelled": "Storniert",

  "chrome.method.card": "Karte",
  "chrome.method.cash": "Bar",
  "chrome.method.transfer": "Überweisung",

  "chrome.tag.weekend": "Wochenende",
  "chrome.tag.season": "August",

  "chrome.nights": "{count} Nacht|{count} Nächte",
  "chrome.guests": "{count} Gast|{count} Gäste",
  "chrome.left": "noch {count} für diese Daten|noch {count} für diese Daten",
  "chrome.nightOf": "Nacht {current} von {total}",
  "chrome.rooms": "{count} Zimmer|{count} Zimmer",

  "chrome.close": "Schließen",
  "chrome.cancel": "Abbrechen",
  "chrome.back": "Zurück",

  "chrome.toast.reserved": "{ref} ist reserviert — wir sehen uns am {date}",
  "chrome.toast.checkedIn": "{name} ist in Zimmer {room}",
  "chrome.toast.checkedOut": "{name} ist abgereist · Zimmer {room} wird gereinigt",
  "chrome.toast.charged": "{amount} auf {ref} gebucht",
  "chrome.toast.settled": "{amount} auf {ref} kassiert",
  "chrome.toast.cancelled": "{ref} ist storniert",
  "chrome.toast.markedReady": "Zimmer {room} ist bezugsfertig",
  "chrome.toast.extraAdded": "Zu {ref} hinzugefügt",
  "chrome.toast.timeChanged": "Wir erwarten Sie um {time}",
  "chrome.toast.advanced": "Nach der Abreisezeit — Abreisen sind fällig",
  "chrome.toast.reset": "Die Demo ist wieder im Ausgangszustand",
};

const FR: Bundle = {
  "chrome.skipToContent": "Aller au contenu",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "Des chambres au bord de l’eau",
  "chrome.brand.desk": "Réception",
  "chrome.footer.copy": "© 2026 Wren House. Une réception de démonstration livrée avec Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "Chambres",
  "chrome.nav.myreservation": "Votre réservation",
  "chrome.nav.findus": "Nous trouver",
  "chrome.nav.today": "Aujourd’hui",
  "chrome.nav.rack": "Tableau des chambres",
  "chrome.nav.calendar": "Calendrier",
  "chrome.nav.reservations": "Réservations",

  "chrome.search.placeholder": "Rechercher clients et références…",
  "chrome.search.label": "Rechercher dans le registre",
  "chrome.search.empty": "Rien ne correspond à « {query} ».",
  "chrome.menu.open": "Ouvrir la navigation",
  "chrome.menu.close": "Fermer la navigation",

  "chrome.dock.title": "Commandes de démonstration",
  "chrome.dock.expand": "Afficher les commandes de démonstration",
  "chrome.dock.collapse": "Masquer les commandes de démonstration",
  "chrome.dock.persona": "Qui regarde",
  "chrome.dock.guest": "Client",
  "chrome.dock.desk": "Réception",
  "chrome.dock.clock": "Heure",
  "chrome.dock.advance": "Avancer à l’heure des départs",
  "chrome.dock.theme": "Thème",
  "chrome.dock.theme.light": "Passer au thème clair",
  "chrome.dock.theme.dark": "Passer au thème sombre",
  "chrome.dock.language": "Langue",
  "chrome.dock.reset": "Réinitialiser la démonstration",

  "chrome.clock.morning": "avant l’heure des départs",
  "chrome.clock.after": "après l’heure des départs",

  "chrome.room.ready": "Prête",
  "chrome.room.occupied": "Occupée",
  "chrome.room.cleaning": "En nettoyage",
  "chrome.room.oos": "Hors service",

  "chrome.stay.held": "Bloquée",
  "chrome.stay.confirmed": "Confirmée",
  "chrome.stay.in_house": "Sur place",
  "chrome.stay.departed": "Partie",
  "chrome.stay.cancelled": "Annulée",

  "chrome.method.card": "Carte",
  "chrome.method.cash": "Espèces",
  "chrome.method.transfer": "Virement",

  "chrome.tag.weekend": "week-end",
  "chrome.tag.season": "août",

  "chrome.nights": "{count} nuit|{count} nuits",
  "chrome.guests": "{count} personne|{count} personnes",
  "chrome.left": "il en reste {count} à ces dates|il en reste {count} à ces dates",
  "chrome.nightOf": "nuit {current} sur {total}",
  "chrome.rooms": "{count} chambre|{count} chambres",

  "chrome.close": "Fermer",
  "chrome.cancel": "Annuler",
  "chrome.back": "Retour",

  "chrome.toast.reserved": "{ref} est réservée — à bientôt le {date}",
  "chrome.toast.checkedIn": "{name} est en chambre {room}",
  "chrome.toast.checkedOut": "{name} est parti · la chambre {room} est en nettoyage",
  "chrome.toast.charged": "{amount} ajouté à {ref}",
  "chrome.toast.settled": "{amount} encaissé sur {ref}",
  "chrome.toast.cancelled": "{ref} est annulée",
  "chrome.toast.markedReady": "La chambre {room} est prête",
  "chrome.toast.extraAdded": "Ajouté à {ref}",
  "chrome.toast.timeChanged": "Nous vous attendons à {time}",
  "chrome.toast.advanced": "Après l’heure des départs — les départs sont dus",
  "chrome.toast.reset": "La démonstration est revenue à son état initial",
};

const CS: Bundle = {
  "chrome.skipToContent": "Přejít na obsah",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "Pokoje u vody",
  "chrome.brand.desk": "Recepce",
  "chrome.footer.copy": "© 2026 Wren House. Ukázková recepce dodávaná s Adminiem.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "Pokoje",
  "chrome.nav.myreservation": "Vaše rezervace",
  "chrome.nav.findus": "Kde nás najdete",
  "chrome.nav.today": "Dnes",
  "chrome.nav.rack": "Přehled pokojů",
  "chrome.nav.calendar": "Kalendář",
  "chrome.nav.reservations": "Rezervace",

  "chrome.search.placeholder": "Hledat hosty a rezervace…",
  "chrome.search.label": "Hledat v knize",
  "chrome.search.empty": "Nic neodpovídá „{query}“.",
  "chrome.menu.open": "Otevřít navigaci",
  "chrome.menu.close": "Zavřít navigaci",

  "chrome.dock.title": "Ovládání ukázky",
  "chrome.dock.expand": "Zobrazit ovládání ukázky",
  "chrome.dock.collapse": "Skrýt ovládání ukázky",
  "chrome.dock.persona": "Kdo se dívá",
  "chrome.dock.guest": "Host",
  "chrome.dock.desk": "Recepce",
  "chrome.dock.clock": "Čas",
  "chrome.dock.advance": "Posunout na čas odjezdů",
  "chrome.dock.theme": "Motiv",
  "chrome.dock.theme.light": "Přepnout na světlý motiv",
  "chrome.dock.theme.dark": "Přepnout na tmavý motiv",
  "chrome.dock.language": "Jazyk",
  "chrome.dock.reset": "Obnovit ukázku",

  "chrome.clock.morning": "před časem odjezdů",
  "chrome.clock.after": "po čase odjezdů",

  "chrome.room.ready": "Připraven",
  "chrome.room.occupied": "Obsazen",
  "chrome.room.cleaning": "Uklízí se",
  "chrome.room.oos": "Mimo provoz",

  "chrome.stay.held": "Držená",
  "chrome.stay.confirmed": "Potvrzená",
  "chrome.stay.in_house": "V domě",
  "chrome.stay.departed": "Odjel",
  "chrome.stay.cancelled": "Zrušená",

  "chrome.method.card": "Kartou",
  "chrome.method.cash": "Hotově",
  "chrome.method.transfer": "Převodem",

  "chrome.tag.weekend": "víkend",
  "chrome.tag.season": "srpen",

  "chrome.nights": "{count} noc|{count} noci|{count} nocí",
  "chrome.guests": "{count} host|{count} hosté|{count} hostů",
  "chrome.left": "zbývá {count} na tyto termíny|zbývají {count} na tyto termíny|zbývá {count} na tyto termíny",
  "chrome.nightOf": "{current}. noc z {total}",
  "chrome.rooms": "{count} pokoj|{count} pokoje|{count} pokojů",

  "chrome.close": "Zavřít",
  "chrome.cancel": "Zrušit",
  "chrome.back": "Zpět",

  "chrome.toast.reserved": "{ref} je rezervována — uvidíme se {date}",
  "chrome.toast.checkedIn": "{name} je v pokoji {room}",
  "chrome.toast.checkedOut": "{name} odjel · pokoj {room} se uklízí",
  "chrome.toast.charged": "{amount} přidáno k {ref}",
  "chrome.toast.settled": "{amount} přijato k {ref}",
  "chrome.toast.cancelled": "{ref} je zrušena",
  "chrome.toast.markedReady": "Pokoj {room} je připraven",
  "chrome.toast.extraAdded": "Přidáno k {ref}",
  "chrome.toast.timeChanged": "Očekáváme vás v {time}",
  "chrome.toast.advanced": "Po čase odjezdů — odjezdy jsou splatné",
  "chrome.toast.reset": "Ukázka je zpět ve výchozím stavu",
};

const DA: Bundle = {
  "chrome.skipToContent": "Gå til indhold",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "Værelser ved vandet",
  "chrome.brand.desk": "Receptionen",
  "chrome.footer.copy": "© 2026 Wren House. En demo-reception, der følger med Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "Værelser",
  "chrome.nav.myreservation": "Din reservation",
  "chrome.nav.findus": "Find os",
  "chrome.nav.today": "I dag",
  "chrome.nav.rack": "Værelsesoversigt",
  "chrome.nav.calendar": "Kalender",
  "chrome.nav.reservations": "Reservationer",

  "chrome.search.placeholder": "Søg gæster og referencer…",
  "chrome.search.label": "Søg i bogen",
  "chrome.search.empty": "Intet matcher “{query}”.",
  "chrome.menu.open": "Åbn navigation",
  "chrome.menu.close": "Luk navigation",

  "chrome.dock.title": "Demo-styring",
  "chrome.dock.expand": "Vis demo-styringen",
  "chrome.dock.collapse": "Skjul demo-styringen",
  "chrome.dock.persona": "Hvem kigger",
  "chrome.dock.guest": "Gæst",
  "chrome.dock.desk": "Reception",
  "chrome.dock.clock": "Tid",
  "chrome.dock.advance": "Ryk frem til udtjekningstid",
  "chrome.dock.theme": "Tema",
  "chrome.dock.theme.light": "Skift til lyst tema",
  "chrome.dock.theme.dark": "Skift til mørkt tema",
  "chrome.dock.language": "Sprog",
  "chrome.dock.reset": "Nulstil demoen",

  "chrome.clock.morning": "før udtjekning",
  "chrome.clock.after": "efter udtjekning",

  "chrome.room.ready": "Klar",
  "chrome.room.occupied": "Optaget",
  "chrome.room.cleaning": "Bliver gjort rent",
  "chrome.room.oos": "Ude af drift",

  "chrome.stay.held": "Holdt",
  "chrome.stay.confirmed": "Bekræftet",
  "chrome.stay.in_house": "I huset",
  "chrome.stay.departed": "Rejst",
  "chrome.stay.cancelled": "Annulleret",

  "chrome.method.card": "Kort",
  "chrome.method.cash": "Kontant",
  "chrome.method.transfer": "Overførsel",

  "chrome.tag.weekend": "weekend",
  "chrome.tag.season": "august",

  "chrome.nights": "{count} nat|{count} nætter",
  "chrome.guests": "{count} gæst|{count} gæster",
  "chrome.left": "{count} tilbage på de datoer|{count} tilbage på de datoer",
  "chrome.nightOf": "nat {current} af {total}",
  "chrome.rooms": "{count} værelse|{count} værelser",

  "chrome.close": "Luk",
  "chrome.cancel": "Annullér",
  "chrome.back": "Tilbage",

  "chrome.toast.reserved": "{ref} er reserveret — vi ses den {date}",
  "chrome.toast.checkedIn": "{name} er på værelse {room}",
  "chrome.toast.checkedOut": "{name} er rejst · værelse {room} bliver gjort rent",
  "chrome.toast.charged": "{amount} lagt på {ref}",
  "chrome.toast.settled": "{amount} modtaget på {ref}",
  "chrome.toast.cancelled": "{ref} er annulleret",
  "chrome.toast.markedReady": "Værelse {room} er klar",
  "chrome.toast.extraAdded": "Lagt på {ref}",
  "chrome.toast.timeChanged": "Vi venter dig kl. {time}",
  "chrome.toast.advanced": "Efter udtjekning — afrejserne skal ordnes",
  "chrome.toast.reset": "Demoen er tilbage ved udgangspunktet",
};

const ZH_CN: Bundle = {
  "chrome.skipToContent": "跳到主要内容",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "临水客房",
  "chrome.brand.desk": "前台",
  "chrome.footer.copy": "© 2026 Wren House。随 Adminium 提供的前台演示系统。",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "客房",
  "chrome.nav.myreservation": "我的预订",
  "chrome.nav.findus": "如何找到我们",
  "chrome.nav.today": "今天",
  "chrome.nav.rack": "房态表",
  "chrome.nav.calendar": "日历",
  "chrome.nav.reservations": "预订",

  "chrome.search.placeholder": "搜索客人与预订号…",
  "chrome.search.label": "在预订簿中搜索",
  "chrome.search.empty": "没有与“{query}”匹配的内容。",
  "chrome.menu.open": "打开导航",
  "chrome.menu.close": "关闭导航",

  "chrome.dock.title": "演示控件",
  "chrome.dock.expand": "显示演示控件",
  "chrome.dock.collapse": "隐藏演示控件",
  "chrome.dock.persona": "以谁的视角",
  "chrome.dock.guest": "客人",
  "chrome.dock.desk": "前台",
  "chrome.dock.clock": "时间",
  "chrome.dock.advance": "跳到退房时间之后",
  "chrome.dock.theme": "主题",
  "chrome.dock.theme.light": "切换到浅色主题",
  "chrome.dock.theme.dark": "切换到深色主题",
  "chrome.dock.language": "语言",
  "chrome.dock.reset": "重置演示",

  "chrome.clock.morning": "退房时间之前",
  "chrome.clock.after": "退房时间之后",

  "chrome.room.ready": "可入住",
  "chrome.room.occupied": "已入住",
  "chrome.room.cleaning": "打扫中",
  "chrome.room.oos": "停用",

  "chrome.stay.held": "暂留",
  "chrome.stay.confirmed": "已确认",
  "chrome.stay.in_house": "在店",
  "chrome.stay.departed": "已离店",
  "chrome.stay.cancelled": "已取消",

  "chrome.method.card": "刷卡",
  "chrome.method.cash": "现金",
  "chrome.method.transfer": "转账",

  "chrome.tag.weekend": "周末",
  "chrome.tag.season": "八月",

  "chrome.nights": "{count} 晚",
  "chrome.guests": "{count} 位客人",
  "chrome.left": "这些日期还剩 {count} 间",
  "chrome.nightOf": "第 {current} 晚，共 {total} 晚",
  "chrome.rooms": "{count} 间客房",

  "chrome.close": "关闭",
  "chrome.cancel": "取消",
  "chrome.back": "返回",

  "chrome.toast.reserved": "{ref} 已预订 —— {date} 见",
  "chrome.toast.checkedIn": "{name} 已入住 {room} 房",
  "chrome.toast.checkedOut": "{name} 已离店 · {room} 房正在打扫",
  "chrome.toast.charged": "已在 {ref} 上记入 {amount}",
  "chrome.toast.settled": "已在 {ref} 上收取 {amount}",
  "chrome.toast.cancelled": "{ref} 已取消",
  "chrome.toast.markedReady": "{room} 房已可入住",
  "chrome.toast.extraAdded": "已加入 {ref}",
  "chrome.toast.timeChanged": "我们将在 {time} 恭候",
  "chrome.toast.advanced": "已过退房时间 —— 离店该办了",
  "chrome.toast.reset": "演示已恢复到初始状态",
};

const ZH_TW: Bundle = {
  "chrome.skipToContent": "跳到主要內容",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "臨水客房",
  "chrome.brand.desk": "櫃檯",
  "chrome.footer.copy": "© 2026 Wren House。隨 Adminium 提供的櫃檯示範系統。",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "客房",
  "chrome.nav.myreservation": "我的訂房",
  "chrome.nav.findus": "如何找到我們",
  "chrome.nav.today": "今天",
  "chrome.nav.rack": "房態表",
  "chrome.nav.calendar": "行事曆",
  "chrome.nav.reservations": "訂房",

  "chrome.search.placeholder": "搜尋客人與訂房編號…",
  "chrome.search.label": "在訂房簿中搜尋",
  "chrome.search.empty": "沒有符合「{query}」的項目。",
  "chrome.menu.open": "開啟導覽",
  "chrome.menu.close": "關閉導覽",

  "chrome.dock.title": "示範控制項",
  "chrome.dock.expand": "顯示示範控制項",
  "chrome.dock.collapse": "隱藏示範控制項",
  "chrome.dock.persona": "以誰的角度",
  "chrome.dock.guest": "客人",
  "chrome.dock.desk": "櫃檯",
  "chrome.dock.clock": "時間",
  "chrome.dock.advance": "跳到退房時間之後",
  "chrome.dock.theme": "主題",
  "chrome.dock.theme.light": "切換為淺色主題",
  "chrome.dock.theme.dark": "切換為深色主題",
  "chrome.dock.language": "語言",
  "chrome.dock.reset": "重設示範",

  "chrome.clock.morning": "退房時間之前",
  "chrome.clock.after": "退房時間之後",

  "chrome.room.ready": "可入住",
  "chrome.room.occupied": "已入住",
  "chrome.room.cleaning": "整理中",
  "chrome.room.oos": "停用",

  "chrome.stay.held": "暫留",
  "chrome.stay.confirmed": "已確認",
  "chrome.stay.in_house": "在店",
  "chrome.stay.departed": "已離店",
  "chrome.stay.cancelled": "已取消",

  "chrome.method.card": "刷卡",
  "chrome.method.cash": "現金",
  "chrome.method.transfer": "轉帳",

  "chrome.tag.weekend": "週末",
  "chrome.tag.season": "八月",

  "chrome.nights": "{count} 晚",
  "chrome.guests": "{count} 位客人",
  "chrome.left": "這些日期還剩 {count} 間",
  "chrome.nightOf": "第 {current} 晚，共 {total} 晚",
  "chrome.rooms": "{count} 間客房",

  "chrome.close": "關閉",
  "chrome.cancel": "取消",
  "chrome.back": "返回",

  "chrome.toast.reserved": "{ref} 已訂房 —— {date} 見",
  "chrome.toast.checkedIn": "{name} 已入住 {room} 房",
  "chrome.toast.checkedOut": "{name} 已離店 · {room} 房整理中",
  "chrome.toast.charged": "已在 {ref} 上記入 {amount}",
  "chrome.toast.settled": "已在 {ref} 上收取 {amount}",
  "chrome.toast.cancelled": "{ref} 已取消",
  "chrome.toast.markedReady": "{room} 房已可入住",
  "chrome.toast.extraAdded": "已加入 {ref}",
  "chrome.toast.timeChanged": "我們將於 {time} 恭候",
  "chrome.toast.advanced": "已過退房時間 —— 該辦離店了",
  "chrome.toast.reset": "示範已回到起始狀態",
};

const AR: Bundle = {
  "chrome.skipToContent": "تخطَّ إلى المحتوى",
  "chrome.brand": "Wren House",
  "chrome.brand.site": "غرف على الماء",
  "chrome.brand.desk": "مكتب الاستقبال",
  "chrome.footer.copy": "© 2026 Wren House. مكتب حجوزات تجريبي يأتي مع Adminium.",
  "chrome.footer.chip": "adminium.dev/demo/hotel-reservations",

  "chrome.nav.rooms": "الغرف",
  "chrome.nav.myreservation": "حجزك",
  "chrome.nav.findus": "كيف تصل إلينا",
  "chrome.nav.today": "اليوم",
  "chrome.nav.rack": "لوحة الغرف",
  "chrome.nav.calendar": "التقويم",
  "chrome.nav.reservations": "الحجوزات",

  "chrome.search.placeholder": "ابحث عن الضيوف أو أرقام الحجز…",
  "chrome.search.label": "البحث في السجل",
  "chrome.search.empty": "لا شيء يطابق «{query}».",
  "chrome.menu.open": "فتح التنقل",
  "chrome.menu.close": "إغلاق التنقل",

  "chrome.dock.title": "أدوات العرض",
  "chrome.dock.expand": "إظهار أدوات العرض",
  "chrome.dock.collapse": "إخفاء أدوات العرض",
  "chrome.dock.persona": "من ينظر",
  "chrome.dock.guest": "ضيف",
  "chrome.dock.desk": "الاستقبال",
  "chrome.dock.clock": "الوقت",
  "chrome.dock.advance": "التقدّم إلى موعد المغادرة",
  "chrome.dock.theme": "المظهر",
  "chrome.dock.theme.light": "التبديل إلى المظهر الفاتح",
  "chrome.dock.theme.dark": "التبديل إلى المظهر الداكن",
  "chrome.dock.language": "اللغة",
  "chrome.dock.reset": "إعادة ضبط العرض",

  "chrome.clock.morning": "قبل موعد المغادرة",
  "chrome.clock.after": "بعد موعد المغادرة",

  "chrome.room.ready": "جاهزة",
  "chrome.room.occupied": "مشغولة",
  "chrome.room.cleaning": "قيد التنظيف",
  "chrome.room.oos": "خارج الخدمة",

  "chrome.stay.held": "محجوزة مبدئيًا",
  "chrome.stay.confirmed": "مؤكَّدة",
  "chrome.stay.in_house": "في الفندق",
  "chrome.stay.departed": "غادر",
  "chrome.stay.cancelled": "ملغاة",

  "chrome.method.card": "بطاقة",
  "chrome.method.cash": "نقدًا",
  "chrome.method.transfer": "تحويل",

  "chrome.tag.weekend": "عطلة نهاية الأسبوع",
  "chrome.tag.season": "أغسطس",

  "chrome.nights": "{count} ليلة|ليلة واحدة|ليلتان|{count} ليالٍ|{count} ليلة|{count} ليلة",
  "chrome.guests": "{count} ضيف|ضيف واحد|ضيفان|{count} ضيوف|{count} ضيفًا|{count} ضيف",
  "chrome.left":
    "بقيت {count} لهذه التواريخ|بقيت واحدة لهذه التواريخ|بقيت اثنتان لهذه التواريخ|بقيت {count} لهذه التواريخ|بقيت {count} لهذه التواريخ|بقيت {count} لهذه التواريخ",
  "chrome.nightOf": "الليلة {current} من {total}",
  "chrome.rooms": "{count} غرفة|غرفة واحدة|غرفتان|{count} غرف|{count} غرفة|{count} غرفة",

  "chrome.close": "إغلاق",
  "chrome.cancel": "إلغاء",
  "chrome.back": "رجوع",

  "chrome.toast.reserved": "تم حجز {ref} — نراك في {date}",
  "chrome.toast.checkedIn": "{name} في الغرفة {room}",
  "chrome.toast.checkedOut": "غادر {name} · الغرفة {room} قيد التنظيف",
  "chrome.toast.charged": "أُضيف {amount} إلى {ref}",
  "chrome.toast.settled": "حُصّل {amount} على {ref}",
  "chrome.toast.cancelled": "أُلغي {ref}",
  "chrome.toast.markedReady": "الغرفة {room} جاهزة",
  "chrome.toast.extraAdded": "أُضيف إلى {ref}",
  "chrome.toast.timeChanged": "بانتظارك في {time}",
  "chrome.toast.advanced": "بعد موعد المغادرة — المغادرات مستحقة",
  "chrome.toast.reset": "عاد العرض إلى حالته الأولى",
};

export const chrome = {
  "en-US": EN,
  "de-DE": DE,
  "fr-FR": FR,
  "cs-CZ": CS,
  "da-DK": DA,
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  "ar-EG": AR,
} satisfies Record<LocaleTag, Record<keyof typeof EN, string>>;

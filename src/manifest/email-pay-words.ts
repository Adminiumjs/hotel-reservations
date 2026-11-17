/**
 * What the emails say of money paid online, in the eight languages the app
 * ships — sent only beside the value each line reads (a block tied to it with
 * `showWhen`), so with payments off, or nothing paid online, every email
 * reads exactly as it did.
 *
 *   - the reservation: what the guest is paying online as they reserve, or
 *     what they paid (part, the rest at the desk; or all of it);
 *   - a cancellation or a no-show: what is on its way back to the card, what
 *     the hotel will give back, or that it keeps the payment (a late
 *     cancellation, a no-show) unless it gives it back. Each takes the place
 *     of the sentence "Nothing is charged." (`nothing`, the language's own,
 *     exactly as the cancellation's words have it);
 *   - the folio so far: what the guest owes, and a button to pay it online
 *     while the stay can be paid online.
 *
 * EVERY LANGUAGE BUT ENGLISH IS AN UNREVIEWED DRAFT until a native speaker has
 * read it. `{{…}}` are the outbox's variables, left exactly as they are.
 */
import type { Tag } from "./labels.ts";

export interface PayWords {
  /** The names of the two kinds sent while the house takes payments online, as the Emails page lists them. */
  madeName: string;
  owingName: string;
  /** The language's own "Nothing is charged.", as the cancellation emails end it. */
  nothing: string;
  payPending: string;
  paidPart: string;
  paidFull: string;
  back: string;
  willRefund: string;
  houseWillRefund: string;
  keeps: string;
  owe: string;
  payButton: string;
  payNote: string;
}

export const PAY_WORDS: Record<Tag, PayWords> = {
  "en-US": {
    madeName: "Reservation made, paying online",
    owingName: "The folio so far, with a pay link",
    nothing: "Nothing is charged.",
    payPending: "You are paying {{stay.pay_pending.money}} online. Your receipt comes in its own email. Anything not paid online is settled at the desk.",
    paidPart: "Paid {{stay.online_part.money}} online. The rest is settled at the desk.",
    paidFull: "Paid in full online: {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} is on its way back to your card.",
    willRefund: "The hotel will refund {{stay.online_kept.money}}.",
    houseWillRefund: "We will refund {{stay.online_kept.money}}.",
    keeps: "The hotel keeps your payment unless it refunds it.",
    owe: "You owe {{stay.balance.money}}.",
    payButton: "Pay {{stay.balance.money}} online",
    payNote: "The button opens a pay link. You'll pay on the Stripe or PayPal page. You can also settle at the desk.",
  },
  "de-DE": {
    madeName: "Reservierung eingegangen, online bezahlbar",
    owingName: "Die Zwischenrechnung, mit Zahlungslink",
    nothing: "Es wird nichts berechnet.",
    payPending: "Sie bezahlen {{stay.pay_pending.money}} online. Ihre Quittung kommt in einer eigenen E-Mail. Was nicht online bezahlt ist, begleichen Sie an der Rezeption.",
    paidPart: "{{stay.online_part.money}} online bezahlt. Den Rest begleichen Sie an der Rezeption.",
    paidFull: "Online vollständig bezahlt: {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} sind auf dem Weg zurück auf Ihre Karte.",
    willRefund: "Das Hotel erstattet Ihnen {{stay.online_kept.money}}.",
    houseWillRefund: "Wir erstatten Ihnen {{stay.online_kept.money}}.",
    keeps: "Das Hotel behält Ihre Zahlung, sofern es sie nicht erstattet.",
    owe: "Offen sind noch {{stay.balance.money}}.",
    payButton: "{{stay.balance.money}} online bezahlen",
    payNote: "Der Button öffnet einen Zahlungslink. Sie bezahlen auf der Stripe- oder PayPal-Seite. Sie können auch an der Rezeption bezahlen.",
  },
  "fr-FR": {
    madeName: "Réservation effectuée, paiement en ligne",
    owingName: "La note du séjour à ce jour, avec un lien de paiement",
    nothing: "Vous ne payez rien.",
    payPending: "Vous payez {{stay.pay_pending.money}} en ligne. Votre reçu arrive dans un e-mail séparé. Ce qui n'est pas payé en ligne se règle à la réception.",
    paidPart: "{{stay.online_part.money}} payés en ligne. Le reste se règle à la réception.",
    paidFull: "Payé en totalité en ligne : {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} vous sont remboursés sur votre carte.",
    willRefund: "L'hôtel vous remboursera {{stay.online_kept.money}}.",
    houseWillRefund: "Nous vous rembourserons {{stay.online_kept.money}}.",
    keeps: "L'hôtel conserve votre paiement, sauf s'il vous le rembourse.",
    owe: "Il vous reste {{stay.balance.money}} à payer.",
    payButton: "Payer {{stay.balance.money}} en ligne",
    payNote: "Le bouton ouvre un lien de paiement. Vous payez sur la page Stripe ou PayPal. Vous pouvez aussi régler à la réception.",
  },
  "da-DK": {
    madeName: "Reservation foretaget, betaling online",
    owingName: "Opholdsregningen indtil nu, med betalingslink",
    nothing: "Der opkræves intet.",
    payPending: "Du betaler {{stay.pay_pending.money}} online. Din kvittering kommer i sin egen e-mail. Det, der ikke er betalt online, betaler du i receptionen.",
    paidPart: "{{stay.online_part.money}} betalt online. Resten betaler du i receptionen.",
    paidFull: "Betalt fuldt ud online: {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} er på vej tilbage til dit kort.",
    willRefund: "Hotellet refunderer {{stay.online_kept.money}}.",
    houseWillRefund: "Vi refunderer {{stay.online_kept.money}}.",
    keeps: "Hotellet beholder din betaling, medmindre det refunderer den.",
    owe: "Du skylder {{stay.balance.money}}.",
    payButton: "Betal {{stay.balance.money}} online",
    payNote: "Knappen åbner et betalingslink. Du betaler på Stripe- eller PayPal-siden. Du kan også betale i receptionen.",
  },
  "cs-CZ": {
    madeName: "Rezervace provedena, platba online",
    owingName: "Průběžný účet pobytu, s platebním odkazem",
    nothing: "Nic se neúčtuje.",
    payPending: "Platíte online {{stay.pay_pending.money}}. Potvrzení přijde v samostatném e-mailu. Co nezaplatíte online, zaplatíte na recepci.",
    paidPart: "Online zaplaceno {{stay.online_part.money}}. Zbytek zaplatíte na recepci.",
    paidFull: "Online zaplaceno v plné výši: {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} se vrací na vaši kartu.",
    willRefund: "Hotel vám vrátí {{stay.online_kept.money}}.",
    houseWillRefund: "Vrátíme vám {{stay.online_kept.money}}.",
    keeps: "Hotel si vaši platbu ponechá, pokud vám ji nevrátí.",
    owe: "Zbývá zaplatit {{stay.balance.money}}.",
    payButton: "Zaplatit {{stay.balance.money}} online",
    payNote: "Tlačítko otevře platební odkaz. Zaplatíte na stránce Stripe nebo PayPal. Zaplatit můžete i na recepci.",
  },
  "ar-EG": {
    madeName: "حجز تم، مع الدفع عبر الإنترنت",
    owingName: "حساب الإقامة حتى الآن، مع رابط الدفع",
    nothing: "لا يُحتسب أي مبلغ.",
    payPending: "أنت تدفع {{stay.pay_pending.money}} عبر الإنترنت. يصلك الإيصال في رسالة منفصلة. ما لا يُدفع عبر الإنترنت يُسدَّد في مكتب الاستقبال.",
    paidPart: "دُفع {{stay.online_part.money}} عبر الإنترنت. الباقي يُسدَّد في مكتب الاستقبال.",
    paidFull: "دُفع المبلغ كاملًا عبر الإنترنت: {{stay.online_full.money}}.",
    back: "{{stay.online_back.money}} في طريقه إلى بطاقتك.",
    willRefund: "سيعيد الفندق {{stay.online_kept.money}}.",
    houseWillRefund: "سنعيد إليك {{stay.online_kept.money}}.",
    keeps: "يحتفظ الفندق بالمبلغ المدفوع ما لم يُعِده.",
    owe: "عليك {{stay.balance.money}}.",
    payButton: "ادفع {{stay.balance.money}} عبر الإنترنت",
    payNote: "يفتح الزر رابط دفع. ستدفع على صفحة Stripe أو PayPal. يمكنك أيضًا الدفع في مكتب الاستقبال.",
  },
  "zh-CN": {
    madeName: "已预订，可网上付款",
    owingName: "目前的住宿结算单，附付款链接",
    nothing: "不收取任何费用。",
    payPending: "你正在网上支付 {{stay.pay_pending.money}}。收据将另行发送邮件。未在网上支付的部分在前台结清。",
    paidPart: "已在网上支付 {{stay.online_part.money}}。其余在前台结清。",
    paidFull: "已在网上全额支付：{{stay.online_full.money}}。",
    back: "{{stay.online_back.money}} 正在退回你的卡。",
    willRefund: "酒店将退还 {{stay.online_kept.money}}。",
    houseWillRefund: "我们将退还 {{stay.online_kept.money}}。",
    keeps: "除非酒店退款，否则保留你的付款。",
    owe: "你还需支付 {{stay.balance.money}}。",
    payButton: "在网上支付 {{stay.balance.money}}",
    payNote: "按钮会打开付款链接。你将在 Stripe 或 PayPal 页面付款。也可以在前台结清。",
  },
  "zh-TW": {
    madeName: "已訂房，可線上付款",
    owingName: "目前的住宿結算單，附付款連結",
    nothing: "不收取任何費用。",
    payPending: "你正在線上支付 {{stay.pay_pending.money}}。收據將另行寄送郵件。未線上支付的部分在櫃檯結清。",
    paidPart: "已線上支付 {{stay.online_part.money}}。其餘在櫃檯結清。",
    paidFull: "已線上全額支付：{{stay.online_full.money}}。",
    back: "{{stay.online_back.money}} 正在退回你的卡。",
    willRefund: "飯店將退還 {{stay.online_kept.money}}。",
    houseWillRefund: "我們將退還 {{stay.online_kept.money}}。",
    keeps: "除非飯店退款，否則保留你的付款。",
    owe: "你還需支付 {{stay.balance.money}}。",
    payButton: "線上支付 {{stay.balance.money}}",
    payNote: "按鈕會開啟付款連結。你將在 Stripe 或 PayPal 頁面付款。也可以在櫃檯結清。",
  },
};

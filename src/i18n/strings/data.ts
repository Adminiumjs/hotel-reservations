/**
 * Area bundle: **data**.
 *
 * The seed's own nouns: the four room types and the words for what is in them,
 * the two out-of-service reasons, the one note a guest left for the desk, the
 * extras and the folio's payment lines. Guest names, staff names and the
 * address stay literal in the seed — a name is a name in every language.
 *
 * Read the room-type copy once for the ban list before changing it. "Breakfast
 * is included" rather than the obvious phrasing, "WiFi throughout" rather than
 * the other one, and a bigger room is never an u·p·g·r·a·d·e.
 */
import type { LocaleTag } from "../locales.ts";

const EN = {
  "data.type.snug": "Snug single",
  "data.type.snug.blurb": "A small room at the back, quiet as anything.",
  "data.type.snug.long":
    "One bed, one window over the yard, and the quietest corner of the house. We give it to people who are here to walk and come back tired.",
  "data.type.garden": "Garden double",
  "data.type.garden.blurb": "Doors onto the walled garden.",
  "data.type.garden.long":
    "A double bed and a pair of doors that open onto the walled garden. Most of the house is these, and most people who come back ask for one.",
  "data.type.harbour": "Harbour double",
  "data.type.harbour.blurb": "The water, and the boats going out.",
  "data.type.harbour.long":
    "Front of the house, up a floor, looking straight out at the water. The boats go out early and you will hear them, which people either love or move room over.",
  "data.type.loft": "Loft suite",
  "data.type.loft.blurb": "The whole top floor, with a sitting room.",
  "data.type.loft.long":
    "Under the roof, with a sitting room, a sofa bed and windows on both sides. Four of them, and they go first in August.",

  "data.feature.single": "A single bed",
  "data.feature.double": "A double bed",
  "data.feature.sofa": "A sofa bed",
  "data.feature.sitting": "Its own sitting room",
  "data.feature.bath": "Bath and shower",
  "data.feature.shower": "Shower room",
  "data.feature.wifi": "WiFi throughout",
  "data.feature.tea": "Tea and coffee",
  "data.feature.desk": "A desk and a lamp",
  "data.feature.garden": "Doors to the garden",
  "data.feature.water": "Looks at the water",
  "data.feature.robes": "Robes and slippers",

  "data.oos.shower": "The shower is being replaced",
  "data.oos.window": "Waiting on the window repair",

  "data.note.late": "We are driving down and may be later than we said — please hold the room.",

  "data.extra.breakfast": "Breakfast in the morning",
  "data.extra.parking": "A space in the yard",
  "data.extra.late": "A late leaving",

  "data.charge.breakfast": "Breakfast",
  "data.charge.parking": "Parking",
  "data.charge.late": "A late leaving",
  "data.charge.bar": "Something from the bar",

  "data.pay.deposit": "Deposit taken when the room was held",
  "data.pay.settled": "Settled at the desk",
  "data.pay.desk": "Taken at the desk",
};

type Bundle = Record<keyof typeof EN, string>;

const DE: Bundle = {
  "data.type.snug": "Kleines Einzelzimmer",
  "data.type.snug.blurb": "Ein kleiner Raum nach hinten heraus, mucksmäuschenstill.",
  "data.type.snug.long":
    "Ein Bett, ein Fenster zum Hof und die ruhigste Ecke des Hauses. Wir geben es Leuten, die zum Wandern kommen und müde zurückkehren.",
  "data.type.garden": "Gartenzimmer",
  "data.type.garden.blurb": "Türen zum ummauerten Garten.",
  "data.type.garden.long":
    "Ein Doppelbett und zwei Türen, die sich zum ummauerten Garten öffnen. Das meiste vom Haus sind diese, und die meisten Wiederkehrer fragen danach.",
  "data.type.harbour": "Hafenzimmer",
  "data.type.harbour.blurb": "Das Wasser und die auslaufenden Boote.",
  "data.type.harbour.long":
    "Zur Vorderseite hinaus, eine Etage höher, mit freiem Blick aufs Wasser. Die Boote laufen früh aus, und man hört sie — die einen lieben das, die anderen ziehen um.",
  "data.type.loft": "Dachsuite",
  "data.type.loft.blurb": "Das ganze Dachgeschoss, mit Wohnraum.",
  "data.type.loft.long":
    "Unter dem Dach, mit eigenem Wohnraum, einem Schlafsofa und Fenstern nach beiden Seiten. Vier davon, und im August sind sie zuerst weg.",

  "data.feature.single": "Ein Einzelbett",
  "data.feature.double": "Ein Doppelbett",
  "data.feature.sofa": "Ein Schlafsofa",
  "data.feature.sitting": "Eigener Wohnraum",
  "data.feature.bath": "Wanne und Dusche",
  "data.feature.shower": "Duschbad",
  "data.feature.wifi": "WLAN im ganzen Haus",
  "data.feature.tea": "Tee und Kaffee",
  "data.feature.desk": "Schreibtisch und Lampe",
  "data.feature.garden": "Türen zum Garten",
  "data.feature.water": "Blick aufs Wasser",
  "data.feature.robes": "Bademäntel und Slipper",

  "data.oos.shower": "Die Dusche wird erneuert",
  "data.oos.window": "Wartet auf die Fensterreparatur",

  "data.note.late":
    "Wir kommen mit dem Auto und werden vielleicht später als angegeben — bitte halten Sie uns das Zimmer.",

  "data.extra.breakfast": "Frühstück am Morgen",
  "data.extra.parking": "Ein Stellplatz im Hof",
  "data.extra.late": "Späteres Auschecken",

  "data.charge.breakfast": "Frühstück",
  "data.charge.parking": "Stellplatz",
  "data.charge.late": "Späteres Auschecken",
  "data.charge.bar": "Etwas von der Bar",

  "data.pay.deposit": "Anzahlung bei der Zimmerreservierung",
  "data.pay.settled": "Am Empfang beglichen",
  "data.pay.desk": "Am Empfang kassiert",
};

const FR: Bundle = {
  "data.type.snug": "Petite simple",
  "data.type.snug.blurb": "Une petite chambre sur l’arrière, silencieuse.",
  "data.type.snug.long":
    "Un lit, une fenêtre sur la cour, et le coin le plus calme de la maison. Nous la donnons aux gens venus marcher et qui rentrent fatigués.",
  "data.type.garden": "Double jardin",
  "data.type.garden.blurb": "Des portes sur le jardin clos.",
  "data.type.garden.long":
    "Un lit double et deux portes qui ouvrent sur le jardin clos. La maison en est surtout faite, et la plupart de ceux qui reviennent en redemandent une.",
  "data.type.harbour": "Double sur le port",
  "data.type.harbour.blurb": "L’eau, et les bateaux qui sortent.",
  "data.type.harbour.long":
    "Sur le devant, un étage plus haut, face à l’eau. Les bateaux sortent tôt et on les entend : certains adorent, d’autres changent de chambre.",
  "data.type.loft": "Suite sous les toits",
  "data.type.loft.blurb": "Tout le dernier étage, avec un salon.",
  "data.type.loft.long":
    "Sous le toit, avec un salon, un canapé-lit et des fenêtres des deux côtés. Il y en a quatre, et en août elles partent les premières.",

  "data.feature.single": "Un lit simple",
  "data.feature.double": "Un lit double",
  "data.feature.sofa": "Un canapé-lit",
  "data.feature.sitting": "Son propre salon",
  "data.feature.bath": "Baignoire et douche",
  "data.feature.shower": "Salle d’eau",
  "data.feature.wifi": "WiFi partout",
  "data.feature.tea": "Thé et café",
  "data.feature.desk": "Un bureau et une lampe",
  "data.feature.garden": "Portes sur le jardin",
  "data.feature.water": "Vue sur l’eau",
  "data.feature.robes": "Peignoirs et chaussons",

  "data.oos.shower": "La douche est en cours de remplacement",
  "data.oos.window": "En attente de la réparation de la fenêtre",

  "data.note.late":
    "Nous venons en voiture et risquons d’arriver plus tard que prévu — merci de garder la chambre.",

  "data.extra.breakfast": "Le petit-déjeuner",
  "data.extra.parking": "Une place dans la cour",
  "data.extra.late": "Un départ tardif",

  "data.charge.breakfast": "Petit-déjeuner",
  "data.charge.parking": "Stationnement",
  "data.charge.late": "Départ tardif",
  "data.charge.bar": "Quelque chose au bar",

  "data.pay.deposit": "Acompte pris à la réservation",
  "data.pay.settled": "Réglé à la réception",
  "data.pay.desk": "Encaissé à la réception",
};

const CS: Bundle = {
  "data.type.snug": "Útulný jednolůžkový",
  "data.type.snug.blurb": "Malý pokoj vzadu, naprosto tichý.",
  "data.type.snug.long":
    "Jedna postel, jedno okno do dvora a nejtišší kout domu. Dáváme ho lidem, kteří sem jezdí chodit a vracejí se unavení.",
  "data.type.garden": "Zahradní dvoulůžkový",
  "data.type.garden.blurb": "Dveře do zahrady za zdí.",
  "data.type.garden.long":
    "Manželská postel a dvoje dveře do zahrady za zdí. Většina domu jsou tyhle a většina těch, kdo se vracejí, si o ně říká.",
  "data.type.harbour": "Přístavní dvoulůžkový",
  "data.type.harbour.blurb": "Voda a lodě vyplouvající ven.",
  "data.type.harbour.long":
    "Do ulice, o patro výš, přímo na vodu. Lodě vyplouvají brzy a je je slyšet — jedni to milují, druzí se stěhují.",
  "data.type.loft": "Podkrovní apartmá",
  "data.type.loft.blurb": "Celé podkroví, i s obývacím pokojem.",
  "data.type.loft.long":
    "Pod střechou, s obývacím pokojem, rozkládací pohovkou a okny na obě strany. Jsou čtyři a v srpnu mizí první.",

  "data.feature.single": "Jednolůžko",
  "data.feature.double": "Manželská postel",
  "data.feature.sofa": "Rozkládací pohovka",
  "data.feature.sitting": "Vlastní obývací pokoj",
  "data.feature.bath": "Vana i sprcha",
  "data.feature.shower": "Sprchový kout",
  "data.feature.wifi": "WiFi v celém domě",
  "data.feature.tea": "Čaj a káva",
  "data.feature.desk": "Stůl a lampička",
  "data.feature.garden": "Dveře do zahrady",
  "data.feature.water": "Výhled na vodu",
  "data.feature.robes": "Župany a pantofle",

  "data.oos.shower": "Vyměňuje se sprcha",
  "data.oos.window": "Čeká se na opravu okna",

  "data.note.late":
    "Jedeme autem a možná dorazíme později, než jsme psali — prosím podržte nám pokoj.",

  "data.extra.breakfast": "Ranní snídaně",
  "data.extra.parking": "Místo na dvoře",
  "data.extra.late": "Pozdější odjezd",

  "data.charge.breakfast": "Snídaně",
  "data.charge.parking": "Parkování",
  "data.charge.late": "Pozdější odjezd",
  "data.charge.bar": "Něco z baru",

  "data.pay.deposit": "Záloha při rezervaci pokoje",
  "data.pay.settled": "Vyrovnáno na recepci",
  "data.pay.desk": "Přijato na recepci",
};

const DA: Bundle = {
  "data.type.snug": "Lille enkeltværelse",
  "data.type.snug.blurb": "Et lille værelse bagud, helt stille.",
  "data.type.snug.long":
    "Én seng, ét vindue ud mod gården og husets stilleste hjørne. Vi giver det til dem, der er her for at gå ture og kommer trætte hjem.",
  "data.type.garden": "Havedobbelt",
  "data.type.garden.blurb": "Døre ud til den lukkede have.",
  "data.type.garden.long":
    "En dobbeltseng og et par døre ud til den lukkede have. Det meste af huset er af den slags, og de fleste, der kommer igen, beder om et.",
  "data.type.harbour": "Havnedobbelt",
  "data.type.harbour.blurb": "Vandet og bådene, der stikker ud.",
  "data.type.harbour.long":
    "Ud mod gaden, en etage oppe, lige ud til vandet. Bådene stikker tidligt ud, og man hører dem — nogle elsker det, andre flytter værelse.",
  "data.type.loft": "Tagsuite",
  "data.type.loft.blurb": "Hele øverste etage, med en stue.",
  "data.type.loft.long":
    "Under taget, med egen stue, en sovesofa og vinduer til begge sider. Der er fire, og i august går de først.",

  "data.feature.single": "En enkeltseng",
  "data.feature.double": "En dobbeltseng",
  "data.feature.sofa": "En sovesofa",
  "data.feature.sitting": "Sin egen stue",
  "data.feature.bath": "Badekar og bruser",
  "data.feature.shower": "Baderum med bruser",
  "data.feature.wifi": "WiFi i hele huset",
  "data.feature.tea": "Te og kaffe",
  "data.feature.desk": "Skrivebord og lampe",
  "data.feature.garden": "Døre til haven",
  "data.feature.water": "Kigger ud på vandet",
  "data.feature.robes": "Badekåber og futter",

  "data.oos.shower": "Bruseren bliver skiftet",
  "data.oos.window": "Venter på vinduesreparationen",

  "data.note.late":
    "Vi kører herned og kommer måske senere end aftalt — hold gerne værelset til os.",

  "data.extra.breakfast": "Morgenmad",
  "data.extra.parking": "En plads i gården",
  "data.extra.late": "Sen afrejse",

  "data.charge.breakfast": "Morgenmad",
  "data.charge.parking": "Parkering",
  "data.charge.late": "Sen afrejse",
  "data.charge.bar": "Noget fra baren",

  "data.pay.deposit": "Depositum taget da værelset blev holdt",
  "data.pay.settled": "Afregnet i receptionen",
  "data.pay.desk": "Modtaget i receptionen",
};

const ZH_CN: Bundle = {
  "data.type.snug": "温馨单人房",
  "data.type.snug.blurb": "后院一侧的小房间，安静极了。",
  "data.type.snug.long":
    "一张床、一扇朝院子的窗，是全屋最安静的角落。我们把它留给来这儿走路、回来累坏了的人。",
  "data.type.garden": "花园双人房",
  "data.type.garden.blurb": "推门就是围墙花园。",
  "data.type.garden.long":
    "一张双人床，两扇门直通围墙花园。屋子里多半是这种房，回头客也多半点它。",
  "data.type.harbour": "海港双人房",
  "data.type.harbour.blurb": "水面，还有出港的船。",
  "data.type.harbour.long":
    "临街的一侧，往上一层，正对着水面。船一早就出港，声音听得见——有人很爱，有人会换房。",
  "data.type.loft": "阁楼套房",
  "data.type.loft.blurb": "整个顶层，带一间起居室。",
  "data.type.loft.long":
    "在屋顶下面，带起居室、一张沙发床，两侧都有窗。一共四间，八月里最先订完。",

  "data.feature.single": "一张单人床",
  "data.feature.double": "一张双人床",
  "data.feature.sofa": "一张沙发床",
  "data.feature.sitting": "独立起居室",
  "data.feature.bath": "浴缸与淋浴",
  "data.feature.shower": "淋浴间",
  "data.feature.wifi": "全屋 WiFi",
  "data.feature.tea": "茶与咖啡",
  "data.feature.desk": "书桌与台灯",
  "data.feature.garden": "通往花园的门",
  "data.feature.water": "可看到水面",
  "data.feature.robes": "浴袍与拖鞋",

  "data.oos.shower": "正在更换淋浴设备",
  "data.oos.window": "等待窗户修好",

  "data.note.late": "我们自驾过来，可能比说好的时间晚一些——请帮忙留着房间。",

  "data.extra.breakfast": "第二天的早餐",
  "data.extra.parking": "院里的一个车位",
  "data.extra.late": "延迟退房",

  "data.charge.breakfast": "早餐",
  "data.charge.parking": "停车",
  "data.charge.late": "延迟退房",
  "data.charge.bar": "吧台消费",

  "data.pay.deposit": "留房时收取的订金",
  "data.pay.settled": "已在前台结清",
  "data.pay.desk": "前台收取",
};

const ZH_TW: Bundle = {
  "data.type.snug": "溫馨單人房",
  "data.type.snug.blurb": "後院一側的小房間，安靜得很。",
  "data.type.snug.long":
    "一張床、一扇朝院子的窗，是全屋最安靜的角落。我們把它留給來這裡走路、回來累壞了的人。",
  "data.type.garden": "花園雙人房",
  "data.type.garden.blurb": "推門就是圍牆花園。",
  "data.type.garden.long":
    "一張雙人床，兩扇門直通圍牆花園。屋子裡多半是這種房，回頭客也多半指名它。",
  "data.type.harbour": "海港雙人房",
  "data.type.harbour.blurb": "水面，還有出港的船。",
  "data.type.harbour.long":
    "臨街的一側，往上一層，正對著水面。船一早就出港，聲音聽得見——有人很愛，有人會換房。",
  "data.type.loft": "閣樓套房",
  "data.type.loft.blurb": "整個頂樓，附一間起居室。",
  "data.type.loft.long":
    "在屋頂底下，附起居室、一張沙發床，兩側都有窗。一共四間，八月裡最先訂完。",

  "data.feature.single": "一張單人床",
  "data.feature.double": "一張雙人床",
  "data.feature.sofa": "一張沙發床",
  "data.feature.sitting": "獨立起居室",
  "data.feature.bath": "浴缸與淋浴",
  "data.feature.shower": "淋浴間",
  "data.feature.wifi": "全屋 WiFi",
  "data.feature.tea": "茶與咖啡",
  "data.feature.desk": "書桌與檯燈",
  "data.feature.garden": "通往花園的門",
  "data.feature.water": "看得到水面",
  "data.feature.robes": "浴袍與拖鞋",

  "data.oos.shower": "正在更換淋浴設備",
  "data.oos.window": "等待窗戶修好",

  "data.note.late": "我們自行開車過來，可能比說好的時間晚一些——請幫忙留著房間。",

  "data.extra.breakfast": "隔天的早餐",
  "data.extra.parking": "院裡的一個車位",
  "data.extra.late": "延後退房",

  "data.charge.breakfast": "早餐",
  "data.charge.parking": "停車",
  "data.charge.late": "延後退房",
  "data.charge.bar": "吧檯消費",

  "data.pay.deposit": "留房時收取的訂金",
  "data.pay.settled": "已在櫃檯結清",
  "data.pay.desk": "櫃檯收取",
};

const AR: Bundle = {
  "data.type.snug": "غرفة مفردة صغيرة",
  "data.type.snug.blurb": "غرفة صغيرة في الخلف، هادئة تمامًا.",
  "data.type.snug.long":
    "سرير واحد، ونافذة على الفناء، وأهدأ ركن في البيت. نعطيها لمن يأتي للمشي ويعود متعبًا.",
  "data.type.garden": "غرفة مزدوجة على الحديقة",
  "data.type.garden.blurb": "أبواب تفتح على الحديقة المسوَّرة.",
  "data.type.garden.long":
    "سرير مزدوج وبابان يفتحان على الحديقة المسوَّرة. معظم البيت من هذا النوع، ومعظم من يعود يطلبها.",
  "data.type.harbour": "غرفة مزدوجة على المرفأ",
  "data.type.harbour.blurb": "الماء، والقوارب وهي تخرج.",
  "data.type.harbour.long":
    "في واجهة البيت، بطابق أعلى، تطل مباشرة على الماء. القوارب تخرج مبكرًا وستسمعها — بعضهم يحب ذلك وبعضهم يغيّر الغرفة.",
  "data.type.loft": "جناح علوي",
  "data.type.loft.blurb": "الطابق العلوي كله، بغرفة جلوس.",
  "data.type.loft.long":
    "تحت السقف، بغرفة جلوس وأريكة سرير ونوافذ على الجهتين. أربعة منها فقط، وتُحجز أولًا في أغسطس.",

  "data.feature.single": "سرير مفرد",
  "data.feature.double": "سرير مزدوج",
  "data.feature.sofa": "أريكة سرير",
  "data.feature.sitting": "غرفة جلوس خاصة",
  "data.feature.bath": "بانيو ودُش",
  "data.feature.shower": "حمّام بدُش",
  "data.feature.wifi": "واي فاي في كل أنحاء البيت",
  "data.feature.tea": "شاي وقهوة",
  "data.feature.desk": "مكتب ومصباح",
  "data.feature.garden": "أبواب على الحديقة",
  "data.feature.water": "تطل على الماء",
  "data.feature.robes": "أرواب ونعال",

  "data.oos.shower": "يجري استبدال الدُش",
  "data.oos.window": "بانتظار إصلاح النافذة",

  "data.note.late": "سنأتي بالسيارة وقد نتأخر عمّا ذكرنا — نرجو الاحتفاظ بالغرفة لنا.",

  "data.extra.breakfast": "الإفطار في الصباح",
  "data.extra.parking": "مكان في الفناء",
  "data.extra.late": "مغادرة متأخرة",

  "data.charge.breakfast": "إفطار",
  "data.charge.parking": "موقف",
  "data.charge.late": "مغادرة متأخرة",
  "data.charge.bar": "شيء من البار",

  "data.pay.deposit": "عربون عند حجز الغرفة",
  "data.pay.settled": "سُدّد عند المكتب",
  "data.pay.desk": "حُصّل عند المكتب",
};

export const data = {
  "en-US": EN,
  "de-DE": DE,
  "fr-FR": FR,
  "cs-CZ": CS,
  "da-DK": DA,
  "zh-CN": ZH_CN,
  "zh-TW": ZH_TW,
  "ar-EG": AR,
} satisfies Record<LocaleTag, Record<keyof typeof EN, string>>;

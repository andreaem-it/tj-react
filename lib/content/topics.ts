import type { Topic } from "@/lib/content/types";

/**
 * Registry di topic ed entità di TechJournal.
 *
 * ## Perché sta nel repo e non in WordPress
 *
 * L'API `tj/v1` non espone tag né tassonomie oltre alla categoria, e la
 * categoria non descrive l'argomento: nel campione reale degli ultimi articoli,
 * cinque pezzi su iPhone 18 sono distribuiti fra `apple`, `tecnologia`,
 * `intelligenza-artificiale` e `offerte`. Derivare i topic dal testo con un
 * registry versionato:
 *
 * - vale **retroattivamente** su tutto l'archivio, senza migrazioni;
 * - non costa nulla per pageview (nessuna chiamata LLM in render, §30);
 * - è ispezionabile e testabile: non può inventare un argomento.
 *
 * Il prezzo è una riga da aggiungere qui quando nasce un argomento nuovo. In
 * cambio l'assegnazione è deterministica e riproducibile.
 *
 * ## Regole di compilazione di una voce
 *
 * 1. **`hub: false` se esiste già un archivio di categoria sullo stesso
 *    argomento.** `/apple`, `/iphone`, `/mac`, `/ios` si posizionano già: un
 *    hub gemello competerebbe con loro invece di aggiungere qualcosa (§70). Le
 *    voci senza hub restano indispensabili all'estrazione di entità e alla
 *    risoluzione di specificità.
 * 2. **Nessun alias che sia una parola italiana comune.** "Meta" (obiettivo),
 *    "Air", "Pro", "Watch", "Store" da soli non sono alias: producono falsi
 *    positivi in massa. Si usa la forma composta ("Apple Watch", "App Store").
 * 3. **`matchCase: true` per gli acronimi.** Vedi `TopicAlias`.
 * 4. **`description` senza stato corrente.** Niente "attualmente in beta 6",
 *    niente numeri di versione: quei dati arrivano dagli articoli, non da qui,
 *    e una descrizione che invecchia è una descrizione da manutenere.
 * 5. **`compatibility` può puntare a uno slug non ancora presente** nel
 *    database Compatibilità: l'hub verifica l'esistenza a render time e mostra
 *    il collegamento solo se la scheda c'è. Così `ios-27` si collega da sé il
 *    giorno in cui viene inserito, senza modifiche al codice.
 */
export const TOPICS: readonly Topic[] = [
  // ---------------------------------------------------------------------------
  // Aziende
  // ---------------------------------------------------------------------------
  {
    slug: "apple",
    name: "Apple",
    kind: "company",
    aliases: ["Apple", "Cupertino"],
    description:
      "Tutto su Apple: prodotti, software, servizi, decisioni societarie e regolatorie.",
    hub: false,
    archiveHref: "/apple",
  },
  {
    slug: "google",
    name: "Google",
    kind: "company",
    aliases: ["Google", "Alphabet"],
    description:
      "Google fra Android, Pixel, ricerca e modelli di intelligenza artificiale.",
    searchTerms: ["Google"],
    related: ["android", "gemini", "pixel"],
  },
  {
    slug: "samsung",
    name: "Samsung",
    kind: "company",
    aliases: ["Samsung"],
    description:
      "Samsung come produttore di smartphone, display e memorie, e come fornitore di Apple.",
    searchTerms: ["Samsung"],
    related: ["android"],
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    kind: "company",
    aliases: ["Microsoft"],
    description: "Microsoft fra Windows, Office, cloud e intelligenza artificiale.",
    searchTerms: ["Microsoft"],
    related: ["windows", "copilot"],
  },
  {
    slug: "openai",
    name: "OpenAI",
    kind: "company",
    aliases: ["OpenAI"],
    description: "OpenAI, i suoi modelli e il loro impatto sui prodotti di consumo.",
    searchTerms: ["OpenAI"],
    related: ["chatgpt", "intelligenza-artificiale"],
  },
  {
    slug: "nvidia",
    name: "Nvidia",
    kind: "company",
    aliases: ["Nvidia"],
    description: "Nvidia e le GPU che alimentano l'infrastruttura dell'intelligenza artificiale.",
    searchTerms: ["Nvidia"],
    related: ["intelligenza-artificiale"],
  },
  {
    slug: "sony",
    name: "Sony",
    kind: "company",
    aliases: ["Sony"],
    description: "Sony fra PlayStation, sensori fotografici e audio.",
    searchTerms: ["Sony"],
    related: ["playstation"],
  },
  {
    slug: "amazon",
    name: "Amazon",
    kind: "company",
    aliases: ["Amazon"],
    description: "Amazon fra dispositivi, servizi cloud e commercio elettronico.",
    searchTerms: ["Amazon"],
  },
  {
    slug: "qualcomm",
    name: "Qualcomm",
    kind: "company",
    aliases: ["Qualcomm", "Snapdragon"],
    description: "Qualcomm e i modem e SoC Snapdragon che equipaggiano il mondo Android.",
    searchTerms: ["Qualcomm"],
    related: ["android"],
  },

  // ---------------------------------------------------------------------------
  // Sistemi operativi — famiglie
  // ---------------------------------------------------------------------------
  {
    slug: "ios",
    name: "iOS",
    kind: "os-family",
    aliases: ["iOS"],
    description: "Il sistema operativo di iPhone, versione per versione.",
    hub: false,
    archiveHref: "/ios",
  },
  {
    slug: "ipados",
    name: "iPadOS",
    kind: "os-family",
    aliases: ["iPadOS"],
    description: "Il sistema operativo di iPad, fra multitasking, Stage Manager e produttività.",
    searchTerms: ["iPadOS"],
    related: ["ipad", "ios"],
  },
  {
    slug: "macos",
    name: "macOS",
    kind: "os-family",
    aliases: ["macOS", "Mac OS"],
    description: "Il sistema operativo dei Mac, versione per versione.",
    hub: false,
    archiveHref: "/macos",
  },
  {
    slug: "watchos",
    name: "watchOS",
    kind: "os-family",
    aliases: ["watchOS"],
    description: "Il sistema operativo di Apple Watch, fra salute, quadranti e autonomia.",
    searchTerms: ["watchOS"],
    related: ["apple-watch"],
  },
  {
    slug: "tvos",
    name: "tvOS",
    kind: "os-family",
    aliases: ["tvOS"],
    description: "Il sistema operativo di Apple TV e dell'esperienza Apple sul televisore.",
    searchTerms: ["tvOS"],
    related: ["apple-tv"],
  },
  {
    slug: "visionos",
    name: "visionOS",
    kind: "os-family",
    aliases: ["visionOS", "xrOS"],
    description:
      "Il sistema operativo di Apple Vision Pro e della piattaforma di spatial computing.",
    searchTerms: ["visionOS"],
    related: ["vision-pro"],
  },
  {
    slug: "android",
    name: "Android",
    kind: "os-family",
    aliases: ["Android"],
    description: "Android, i suoi aggiornamenti e il confronto continuo con iOS.",
    searchTerms: ["Android"],
    related: ["google", "ios"],
  },
  {
    slug: "windows",
    name: "Windows",
    kind: "os-family",
    aliases: ["Windows"],
    description: "Windows fra aggiornamenti, requisiti hardware e integrazione con l'AI.",
    searchTerms: ["Windows"],
    related: ["microsoft"],
  },

  // ---------------------------------------------------------------------------
  // Sistemi operativi — release. Gli hub con maggiore valore: raccolgono una
  // storia che oggi è dispersa su più categorie.
  // ---------------------------------------------------------------------------
  {
    slug: "ios-27",
    name: "iOS 27",
    kind: "os-release",
    aliases: ["iOS 27"],
    description:
      "Novità, beta, funzioni e dispositivi compatibili della prossima major release di iOS.",
    parent: "ios",
    searchTerms: ["iOS 27"],
    related: ["ipados-27", "apple-intelligence", "siri", "iphone-18"],
    compatibility: { kind: "os", slug: "ios-27" },
  },
  {
    slug: "ios-26",
    name: "iOS 26",
    kind: "os-release",
    aliases: ["iOS 26"],
    description:
      "Aggiornamenti, correzioni di sicurezza e funzioni introdotte nel ciclo di iOS 26.",
    parent: "ios",
    searchTerms: ["iOS 26"],
    related: ["ios-27"],
    compatibility: { kind: "os", slug: "ios-26-4" },
  },
  {
    slug: "ipados-27",
    name: "iPadOS 27",
    kind: "os-release",
    aliases: ["iPadOS 27"],
    description: "Novità e dispositivi compatibili della prossima major release di iPadOS.",
    parent: "ipados",
    searchTerms: ["iPadOS 27"],
    related: ["ios-27", "ipad"],
  },
  {
    slug: "macos-27",
    name: "macOS 27",
    kind: "os-release",
    aliases: ["macOS 27", "macOS Golden Gate"],
    description: "Novità, beta e Mac compatibili della prossima major release di macOS.",
    parent: "macos",
    searchTerms: ["macOS 27", "macOS Golden Gate"],
    related: ["ios-27", "mac"],
  },
  {
    slug: "macos-tahoe",
    name: "macOS Tahoe",
    kind: "os-release",
    aliases: ["macOS Tahoe", "Tahoe 26"],
    description: "Aggiornamenti e funzioni del ciclo macOS Tahoe.",
    parent: "macos",
    searchTerms: ["macOS Tahoe"],
    related: ["macos-27", "mac"],
  },
  {
    slug: "watchos-27",
    name: "watchOS 27",
    kind: "os-release",
    aliases: ["watchOS 27"],
    description: "Novità, beta e Apple Watch compatibili con la prossima release di watchOS.",
    parent: "watchos",
    searchTerms: ["watchOS 27"],
    related: ["apple-watch", "ios-27"],
  },
  {
    slug: "tvos-27",
    name: "tvOS 27",
    kind: "os-release",
    aliases: ["tvOS 27"],
    description: "Novità e beta della prossima release di tvOS per Apple TV.",
    parent: "tvos",
    searchTerms: ["tvOS 27"],
    related: ["apple-tv", "ios-27"],
  },
  {
    slug: "visionos-27",
    name: "visionOS 27",
    kind: "os-release",
    aliases: ["visionOS 27"],
    description: "Novità e beta della prossima release di visionOS per Apple Vision Pro.",
    parent: "visionos",
    searchTerms: ["visionOS 27"],
    related: ["vision-pro", "ios-27"],
  },

  // ---------------------------------------------------------------------------
  // Famiglie di dispositivi
  // ---------------------------------------------------------------------------
  {
    slug: "iphone",
    name: "iPhone",
    kind: "device-family",
    aliases: ["iPhone"],
    description: "Tutto su iPhone: modelli, aggiornamenti, prezzi e supporto software.",
    hub: false,
    archiveHref: "/iphone",
  },
  {
    slug: "ipad",
    name: "iPad",
    kind: "device-family",
    aliases: ["iPad"],
    description: "Tutto su iPad: modelli, iPadOS e accessori.",
    hub: false,
    archiveHref: "/ipad",
  },
  {
    slug: "mac",
    name: "Mac",
    kind: "device-family",
    aliases: ["Mac", "MacBook", "MacBook Air", "MacBook Pro", "iMac", "Mac mini", "Mac Studio"],
    description: "Tutto sui Mac: Apple Silicon, macOS e gamma di prodotto.",
    hub: false,
    archiveHref: "/mac",
  },
  {
    slug: "apple-watch",
    name: "Apple Watch",
    kind: "device-family",
    aliases: ["Apple Watch", "Watch Ultra", "Watch Series"],
    description: "Apple Watch fra salute, sport, autonomia e watchOS.",
    searchTerms: ["Apple Watch"],
    related: ["watchos"],
  },
  {
    slug: "airpods",
    name: "AirPods",
    kind: "device-family",
    aliases: ["AirPods"],
    description: "AirPods e AirPods Pro: audio, funzioni di salute uditiva e integrazione con iOS.",
    searchTerms: ["AirPods"],
    related: ["apple-health"],
  },
  {
    slug: "vision-pro",
    name: "Apple Vision Pro",
    kind: "device-family",
    aliases: ["Vision Pro", "Apple Vision"],
    description: "Apple Vision Pro e il visore Apple per lo spatial computing.",
    hub: false,
    archiveHref: "/vision-pro",
  },
  {
    slug: "apple-tv",
    name: "Apple TV",
    kind: "device-family",
    aliases: ["Apple TV"],
    description: "Apple TV come dispositivo e come piattaforma di contenuti.",
    searchTerms: ["Apple TV"],
    related: ["tvos"],
  },
  {
    slug: "homepod",
    name: "HomePod",
    kind: "device-family",
    aliases: ["HomePod"],
    description: "HomePod e l'audio Apple in casa, fra Siri e domotica.",
    searchTerms: ["HomePod"],
    related: ["siri", "smart-home"],
  },
  {
    slug: "airtag",
    name: "AirTag",
    kind: "device-family",
    aliases: ["AirTag"],
    description: "AirTag, la rete Dov'è e il tracciamento degli oggetti.",
    searchTerms: ["AirTag"],
  },
  {
    slug: "pixel",
    name: "Google Pixel",
    kind: "device-family",
    aliases: ["Google Pixel", { text: "Pixel", matchCase: true }],
    description: "Gli smartphone Pixel di Google e le funzioni Android che arrivano prima su di essi.",
    searchTerms: ["Pixel"],
    related: ["google", "android"],
  },
  {
    slug: "playstation",
    name: "PlayStation",
    kind: "device-family",
    aliases: ["PlayStation", "PS5"],
    description: "PlayStation fra console, giochi e servizi.",
    hub: false,
    archiveHref: "/playstation",
  },

  // ---------------------------------------------------------------------------
  // Modelli. Solo le generazioni ancora vive editorialmente: un hub per ogni
  // iPhone mai prodotto sarebbe la definizione di pagina doorway (§26).
  // ---------------------------------------------------------------------------
  {
    slug: "iphone-18",
    name: "iPhone 18",
    kind: "device-model",
    aliases: ["iPhone 18"],
    description:
      "Tutto quello che emerge sulla gamma iPhone 18: design, chip, fotocamere, prezzi e tempi.",
    parent: "iphone",
    searchTerms: ["iPhone 18"],
    related: ["iphone-17", "ios-27", "iphone-ultra"],
    compatibility: { kind: "device", slug: "iphone-18" },
  },
  {
    slug: "iphone-17",
    name: "iPhone 17",
    kind: "device-model",
    aliases: ["iPhone 17"],
    description:
      "La gamma iPhone 17: modelli, differenze, prezzi, aggiornamenti e convenienza nel tempo.",
    parent: "iphone",
    searchTerms: ["iPhone 17"],
    related: ["iphone-18", "ios-27"],
    compatibility: { kind: "device", slug: "iphone-17" },
  },
  {
    slug: "iphone-ultra",
    name: "iPhone Ultra",
    kind: "device-model",
    aliases: ["iPhone Ultra", "iPhone pieghevole", "iPhone Fold"],
    description:
      "Il modello di iPhone di fascia più alta e le indiscrezioni sul primo iPhone pieghevole.",
    parent: "iphone",
    searchTerms: ["iPhone Ultra", "iPhone pieghevole"],
    related: ["iphone-18"],
  },
  {
    slug: "apple-silicon",
    name: "Apple Silicon",
    kind: "feature",
    aliases: ["Apple Silicon", "chip M5", "chip M4", "Apple A20", "chip A20"],
    description:
      "I chip progettati da Apple per Mac, iPhone e iPad: prestazioni, efficienza e roadmap.",
    searchTerms: ["Apple Silicon"],
    related: ["mac", "iphone"],
  },

  // ---------------------------------------------------------------------------
  // Servizi e funzioni
  // ---------------------------------------------------------------------------
  {
    slug: "apple-intelligence",
    name: "Apple Intelligence",
    kind: "feature",
    aliases: ["Apple Intelligence"],
    description:
      "Le funzioni di intelligenza artificiale di Apple: cosa fanno, su quali dispositivi e con quali limiti.",
    searchTerms: ["Apple Intelligence"],
    related: ["siri", "ios-27", "intelligenza-artificiale"],
  },
  {
    slug: "siri",
    name: "Siri",
    kind: "feature",
    aliases: ["Siri"],
    description:
      "Siri, la sua riscrittura basata su modelli linguistici e l'integrazione con i servizi Apple.",
    searchTerms: ["Siri"],
    related: ["apple-intelligence", "ios-27", "homepod"],
  },
  {
    slug: "app-store",
    name: "App Store",
    kind: "service",
    aliases: ["App Store"],
    description:
      "App Store fra regole, commissioni, cause legali e interventi dei regolatori.",
    searchTerms: ["App Store"],
    related: ["apple", "dma"],
  },
  {
    slug: "dma",
    name: "Digital Markets Act",
    kind: "theme",
    aliases: ["Digital Markets Act", { text: "DMA", matchCase: true }],
    description:
      "Il regolamento europeo sui mercati digitali e i suoi effetti concreti su iPhone e App Store.",
    searchTerms: ["Digital Markets Act"],
    related: ["app-store", "apple"],
  },
  {
    slug: "apple-pay",
    name: "Apple Pay",
    kind: "service",
    aliases: ["Apple Pay", "Apple Cash"],
    description: "Apple Pay, i pagamenti Apple e la loro espansione nei singoli mercati.",
    searchTerms: ["Apple Pay"],
    related: ["apple-wallet"],
  },
  {
    slug: "apple-wallet",
    name: "Apple Wallet",
    kind: "service",
    aliases: ["Apple Wallet", "Wallet di Apple"],
    description: "Apple Wallet fra carte, documenti d'identità, biglietti e chiavi digitali.",
    searchTerms: ["Apple Wallet"],
    related: ["apple-pay"],
  },
  {
    slug: "icloud",
    name: "iCloud",
    kind: "service",
    aliases: ["iCloud"],
    description: "iCloud fra spazio, sincronizzazione, privacy e protezione avanzata dei dati.",
    searchTerms: ["iCloud"],
    related: ["apple"],
  },
  {
    slug: "apple-maps",
    name: "Apple Maps",
    kind: "service",
    aliases: ["Apple Maps", "Mappe di Apple"],
    description: "Apple Maps fra copertura, nuove funzioni e modello di business.",
    searchTerms: ["Apple Maps"],
  },
  {
    slug: "apple-music",
    name: "Apple Music",
    kind: "service",
    aliases: ["Apple Music"],
    description: "Apple Music fra catalogo, audio spaziale e concorrenza nello streaming.",
    searchTerms: ["Apple Music"],
  },
  {
    slug: "apple-health",
    name: "Salute e Apple",
    kind: "theme",
    aliases: ["Apple Health", "app Salute", "salute uditiva"],
    description:
      "Le funzioni di salute nei dispositivi Apple: monitoraggio, certificazioni e limiti dichiarati.",
    searchTerms: ["Apple Salute"],
    related: ["apple-watch", "airpods"],
  },

  // ---------------------------------------------------------------------------
  // Intelligenza artificiale (la categoria esiste: hub solo per i sotto-argomenti)
  // ---------------------------------------------------------------------------
  {
    slug: "intelligenza-artificiale",
    name: "Intelligenza artificiale",
    kind: "theme",
    aliases: [
      "intelligenza artificiale",
      { text: "AI", matchCase: true },
      { text: "IA", matchCase: true },
    ],
    description: "L'intelligenza artificiale nei prodotti che usiamo ogni giorno.",
    hub: false,
    archiveHref: "/ia",
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    kind: "service",
    aliases: ["ChatGPT"],
    description: "ChatGPT, i suoi modelli e la sua integrazione nei sistemi operativi.",
    searchTerms: ["ChatGPT"],
    related: ["openai", "apple-intelligence"],
  },
  {
    slug: "gemini",
    name: "Gemini",
    kind: "service",
    aliases: ["Gemini"],
    description: "Gemini, i modelli AI di Google e il loro ruolo dentro Android e Search.",
    searchTerms: ["Gemini"],
    related: ["google", "android"],
  },
  {
    slug: "copilot",
    name: "Copilot",
    kind: "service",
    aliases: ["Copilot"],
    description: "Copilot e l'intelligenza artificiale dentro Windows e Office.",
    searchTerms: ["Copilot"],
    related: ["microsoft", "windows"],
  },

  // ---------------------------------------------------------------------------
  // Temi trasversali
  // ---------------------------------------------------------------------------
  {
    slug: "smart-home",
    name: "Smart Home",
    kind: "theme",
    aliases: ["smart home", "domotica", "HomeKit", "Matter", "Home Assistant"],
    description: "La casa connessa fra standard, accessori e assistenti vocali.",
    hub: false,
    archiveHref: "/smart-home",
  },
  {
    slug: "wwdc",
    name: "WWDC",
    kind: "event",
    aliases: ["WWDC"],
    description:
      "La conferenza annuale per sviluppatori di Apple: annunci software, sessioni e conseguenze sui prodotti.",
    searchTerms: ["WWDC"],
    related: ["ios-27", "macos-27", "apple-intelligence"],
  },
  {
    slug: "apple-event",
    name: "Apple Event",
    kind: "event",
    aliases: ["Apple Event", "keynote Apple", "evento Apple"],
    description: "Gli eventi di presentazione Apple e i prodotti che ne escono.",
    searchTerms: ["Apple Event", "keynote Apple"],
    related: ["iphone-18", "wwdc"],
  },
];

/** Indice slug → topic. */
const BY_SLUG: Map<string, Topic> = new Map(TOPICS.map((topic) => [topic.slug, topic]));

/** Topic con pagina hub, nell'ordine di dichiarazione del registry. */
export const HUB_TOPICS: readonly Topic[] = TOPICS.filter((topic) => topic.hub !== false);

export function getTopic(slug: string): Topic | undefined {
  return BY_SLUG.get(slug);
}

/** Topic pubblicato su `/topic/<slug>`; `undefined` per le entità senza hub. */
export function getHubTopic(slug: string): Topic | undefined {
  const topic = BY_SLUG.get(slug);
  return topic && topic.hub !== false ? topic : undefined;
}

/**
 * Destinazione dell'argomento: l'hub se ne ha uno, altrimenti l'archivio di
 * categoria equivalente. `null` solo per le entità che non hanno né l'uno né
 * l'altro, che quindi non vanno mostrate come link.
 */
export function topicHref(topic: Topic): string | null {
  if (topic.hub === false) return topic.archiveHref ?? null;
  return `/topic/${topic.slug}`;
}

/** Query di ricerca da usare per popolare l'hub; `name` se non specificate. */
export function topicSearchTerms(topic: Topic): readonly string[] {
  return topic.searchTerms?.length ? topic.searchTerms : [topic.name];
}

/** Risolve gli slug in `related` scartando i riferimenti non esistenti. */
export function relatedTopics(topic: Topic): Topic[] {
  return (topic.related ?? [])
    .map((slug) => BY_SLUG.get(slug))
    .filter((t): t is Topic => t !== undefined);
}

import type { TechRadarOffer } from "./techradar";

interface BetaOfferInput {
  name: string;
  price: number;
  asin: string;
  image: string | null;
  url: string;
}

const RAW_BETA_OFFERS: BetaOfferInput[] = [
  {
    name: "Apple AirPods 4",
    price: 149.0,
    asin: "B0DGHWD7CT",
    image: "https://m.media-amazon.com/images/I/61DvMw16ITL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0DGHWD7CT?tag=techjournal-it-21",
  },
  {
    name: "Apple AirPods Pro 3",
    price: 209.0,
    asin: "B0FQF32239",
    image: "https://m.media-amazon.com/images/I/61VHVpa4wvL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0FQF32239?tag=techjournal-it-21",
  },
  {
    name: "Apple Watch Series 11",
    price: 349.0,
    asin: "B0FQFLQJB1",
    image: "https://m.media-amazon.com/images/I/71JPViO29PL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0FQFLQJB1?tag=techjournal-it-21",
  },
  {
    name: "iPhone 17 (256GB)",
    price: 899.0,
    asin: "B0FQGWQC6S",
    image: "https://m.media-amazon.com/images/I/61vNxSF6qeL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0FQGWQC6S?tag=techjournal-it-21",
  },
  {
    name: "MacBook Air M5 (16GB/512GB)",
    price: 965.99,
    asin: "B0GR19ZS2Z",
    image: "https://m.media-amazon.com/images/I/71ivj8pVbkL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0GR19ZS2Z?tag=techjournal-it-21",
  },
  {
    name: "MacBook Pro M5",
    price: 1977.99,
    asin: "B0FWDF8TS7",
    image: "https://m.media-amazon.com/images/I/6177MFeuPYL._AC_SX342_SY445_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0FWDF8TS7?tag=techjournal-it-21",
  },
  {
    name: "Sennheiser Momentum 4 Wireless",
    price: 179.0,
    asin: "B0B6GHW1SX",
    image: "https://m.media-amazon.com/images/I/716%2B%2B4xC2wL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0B6GHW1SX?tag=techjournal-it-21",
  },
  {
    name: "Technics EAH-AZ100E-S Earbuds",
    price: 239.0,
    asin: "B0DQPT2SR9",
    image: "https://m.media-amazon.com/images/I/71Lq%2BezdNmL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0DQPT2SR9?tag=techjournal-it-21",
  },
  {
    name: "Nothing Headphones (1)",
    price: 229.0,
    asin: "B0F1Z88FBT",
    image: "https://m.media-amazon.com/images/I/51oVhCWfK7L._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0F1Z88FBT?tag=techjournal-it-21",
  },
  {
    name: "Xiaomi Smart Band 10",
    price: 36.99,
    asin: "B0DYF64BV2",
    image: "https://m.media-amazon.com/images/I/41gTHKuMy4L._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0DYF64BV2?tag=techjournal-it-21",
  },
  {
    name: "Amazfit Bip 5",
    price: 44.55,
    asin: "B0C8NWT1QZ",
    image: "https://m.media-amazon.com/images/I/61V8VUE1dFL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0C8NWT1QZ?tag=techjournal-it-21",
  },
  {
    name: "Google Pixel Watch 4",
    price: 349.0,
    asin: "B0FJFW5WZV",
    image: null,
    url: "https://www.amazon.it/dp/B0FJFW5WZV?tag=techjournal-it-21",
  },
  {
    name: "Samsung Galaxy Watch8",
    price: 282.0,
    asin: "B0FN7865SM",
    image: null,
    url: "https://www.amazon.it/dp/B0FN7865SM?tag=techjournal-it-21",
  },
  {
    name: "Fire TV Stick 4K Max",
    price: 47.99,
    asin: "B0CW4HD359",
    image: "https://m.media-amazon.com/images/I/51Syr9Bzx9L._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0CW4HD359?tag=techjournal-it-21",
  },
  {
    name: "Kindle Paperwhite",
    price: 139.99,
    asin: "B0CFPWLGF2",
    image: "https://m.media-amazon.com/images/I/617B47bNfaL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0CFPWLGF2?tag=techjournal-it-21",
  },
  {
    name: "Echo Spot",
    price: 54.99,
    asin: "B0C2S2J7JP",
    image:
      "https://m.media-amazon.com/images/G/29/kindle/journeys/yAoaHlUHHLgGBDL2FP2FfZD8lAfU2COGq52B2FrA5MW2BgBo3D/YWU1NGJiNDIt._CB569693872_.jpg",
    url: "https://www.amazon.it/dp/B0C2S2J7JP?tag=techjournal-it-21",
  },
  {
    name: "Blink Mini Camera",
    price: 14.99,
    asin: "B07X37DT9M",
    image: "https://m.media-amazon.com/images/I/51bri3W8bxL._SL1000_.jpg",
    url: "https://www.amazon.it/dp/B07X37DT9M?tag=techjournal-it-21",
  },
  {
    name: "DJI Mini 4K Drone",
    price: 199.0,
    asin: "B0CXJ9GM3G",
    image: "https://m.media-amazon.com/images/I/61ok87O87zL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0CXJ9GM3G?tag=techjournal-it-21",
  },
  {
    name: "DJI Osmo Pocket 3",
    price: 369.0,
    asin: "B0CG19QXWD",
    image: "https://m.media-amazon.com/images/I/61qlvRI77RL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0CG19QXWD?tag=techjournal-it-21",
  },
  {
    name: "Insta360 X4",
    price: 319.0,
    asin: "B0DBQBMQH2",
    image: "https://m.media-amazon.com/images/I/61RcMQQzqgL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0DBQBMQH2?tag=techjournal-it-21",
  },
  {
    name: "Anker Charger",
    price: 20.89,
    asin: "B0BDKD2ZFP",
    image: "https://m.media-amazon.com/images/I/51Jt51VCdfL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0BDKD2ZFP?tag=techjournal-it-21",
  },
  {
    name: "Lefant M3Max Robot Vacuum",
    price: 341.99,
    asin: "B0FXWLDNPQ",
    image: "https://m.media-amazon.com/images/I/71jyKVCDXuL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0FXWLDNPQ?tag=techjournal-it-21",
  },
  {
    name: "ECOVACS DEEBOT T80 OMNI",
    price: 499.0,
    asin: "B0DZ661PGD",
    image: "https://m.media-amazon.com/images/I/61T-JFnFo3L._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0DZ661PGD?tag=techjournal-it-21",
  },
  {
    name: "ECOVACS X11 OMNICYCLONE",
    price: 799.0,
    asin: "B0FHWP5Y6P",
    image: "https://m.media-amazon.com/images/I/81n8UEz9tuL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0FHWP5Y6P?tag=techjournal-it-21",
  },
  {
    name: "Dreame Aqua10 Ultra Track",
    price: 899.0,
    asin: "B0FHHZBQRD",
    image: "https://m.media-amazon.com/images/I/71DXb98z4SL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0FHHZBQRD?tag=techjournal-it-21",
  },
  {
    name: "Dreame H15 Pro",
    price: 349.0,
    asin: "B0DT9Y8RWH",
    image: "https://m.media-amazon.com/images/I/61+AOuw9ZkL._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0DT9Y8RWH?tag=techjournal-it-21",
  },
  {
    name: "Dreame H15 Mix",
    price: 599.0,
    asin: "B0FGXNHQJZ",
    image: "https://m.media-amazon.com/images/I/71nLI7fM51L._AC_SL1500_.jpg",
    url: "https://www.amazon.it/dp/B0FGXNHQJZ?tag=techjournal-it-21",
  },
  {
    name: "LG 27U411A Monitor",
    price: 94.99,
    asin: "B0FKNKDNXN",
    image: "https://m.media-amazon.com/images/I/71WOHAmf7ML._AC_SX300_SY300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0FKNKDNXN?tag=techjournal-it-21",
  },
  {
    name: "MSI Modern 15 Notebook",
    price: 499.0,
    asin: "B0DSGDJLG4",
    image: "https://m.media-amazon.com/images/I/71lhbr2V1dL._AC_SY300_SX300_QL70_ML2_.jpg",
    url: "https://www.amazon.it/dp/B0DSGDJLG4?tag=techjournal-it-21",
  },
  {
    name: "Arcade1UP Street Fighter Legacy",
    price: 419.99,
    asin: "B0B7KGH1BL",
    image:
      "https://m.media-amazon.com/images/S/aplus-media-library-service-media/6f3b880a-c094-4fa1-8f01-b6175a2416f3.__CR0%2C0%2C1200%2C1200_PT0_SX300_V1___.jpg",
    url: "https://www.amazon.it/dp/B0B7KGH1BL?tag=techjournal-it-21",
  },
];

/** Converte i dati beta grezzi nel formato TechRadarOffer usato dal frontend. */
export function getBetaOffers(): TechRadarOffer[] {
  const now = Date.now();

  return RAW_BETA_OFFERS.map<TechRadarOffer>((item, index) => {
    // Sconto fittizio ma plausibile: 15–35% in base all'indice
    const discountPercent = 15 + (index % 5) * 5;
    const previousAvgPrice = Number((item.price / (1 - discountPercent / 100)).toFixed(2));
    const createdAt = new Date(now - index * 24 * 60 * 60 * 1000).toISOString();

    return {
      title: item.name,
      price: item.price,
      previous_avg_price: previousAvgPrice,
      discount_percent: discountPercent,
      image: item.image ?? "",
      url: item.url,
      asin: item.asin,
      created_at: createdAt,
    };
  });
}


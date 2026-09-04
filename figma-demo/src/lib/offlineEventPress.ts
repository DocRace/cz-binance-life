export type OfflineEventPressKind = "video" | "article";

export type OfflineEventPressItem = {
  id: string;
  kind: OfflineEventPressKind;
  url: string;
  featured?: boolean;
  youtubeId?: string;
};

/** August 2026 Hong Kong meetup / visit coverage. Titles live in i18n. */
export const OFFLINE_EVENT_PRESS: OfflineEventPressItem[] = [
  {
    id: "hkcd-youtube",
    kind: "video",
    featured: true,
    youtubeId: "wdcN4a8DleY",
    url: "https://www.youtube.com/watch?v=wdcN4a8DleY",
  },
  {
    id: "hkcd-recap",
    kind: "article",
    url: "https://www.hkcd.com.hk/content_app/2026-09/02/content_8772814.html",
  },
  {
    id: "hkej",
    kind: "article",
    url: "https://www.hkej.com/dailynews/finnews/article/4495643",
  },
  {
    id: "caixin",
    kind: "article",
    url: "https://finance.caixin.com/2026-08-27/102478488.html",
  },
  {
    id: "wenweipo",
    kind: "article",
    url: "https://www.wenweipo.com/a/202609/01/AP6a966ff1e4b0c1e50027140f.html",
  },
  {
    id: "hket",
    kind: "article",
    url: "https://inews.hket.com/article/4183673",
  },
  {
    id: "kr36",
    kind: "article",
    url: "https://36kr.com/p/3958638529117569",
  },
  {
    id: "edigest",
    kind: "article",
    url: "https://www.edigest.hk/news/cz-binance-hong-kong-web3-rwa-tokenization-crypto-winter-over-%e5%8d%b3%e6%99%82%e8%b2%a1%e7%b6%93-2035977/",
  },
  {
    id: "stheadline",
    kind: "article",
    url: "https://www.stheadline.com/blockchain/3610028/%E5%B9%A3%E5%9C%88%E7%89%9B%E4%BE%86%E4%BA%86%E5%97%8EBitcoin-Asia%E7%9A%84%E7%8F%BE%E5%A0%B4%E8%A7%80%E5%AF%9F%E9%84%A7%E9%80%B2%E4%B8%80",
  },
  {
    id: "wublock",
    kind: "article",
    url: "https://mp.weixin.qq.com/s/3AWVnOAphAcgy4jKpv_SWA",
  },
];

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

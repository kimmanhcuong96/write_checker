import type { Locale } from "./types";
import { SITE_ORIGIN } from "./site-config";

export type SitePath = "/" | "/about" | "/contact" | "/privacy" | "/admin" | "/404";

export const pageMetadata: Record<SitePath, { title: string; description: string; indexable: boolean }> = {
  "/": {
    title: "me2write — English Writing Practice and Feedback",
    description: "Practice English writing with CEFR-aligned feedback, guided topics, and IELTS or TOEIC writing exam practice.",
    indexable: true
  },
  "/about": {
    title: "About me2write — English Writing Practice",
    description: "Learn how me2write helps English learners practice writing and receive structured, AI-assisted feedback.",
    indexable: true
  },
  "/contact": {
    title: "Contact me2write — Support and Feedback",
    description: "Contact me2write about product feedback, bug reports, feature suggestions, partnerships, or general inquiries.",
    indexable: true
  },
  "/privacy": {
    title: "Privacy Policy — me2write",
    description: "Read how me2write handles account information, writing submissions, AI processing, cookies, and stored evaluation data.",
    indexable: true
  },
  "/admin": {
    title: "Administration — me2write",
    description: "Private me2write administration area.",
    indexable: false
  },
  "/404": {
    title: "Page Not Found — me2write",
    description: "The requested me2write page could not be found.",
    indexable: false
  }
};

const localizedHomeMetadata: Record<Locale, { title: string; description: string }> = {
  en: pageMetadata["/"],
  vi: { title: "me2write — Luyện viết tiếng Anh và nhận phản hồi", description: "Luyện viết tiếng Anh với phản hồi theo CEFR, chủ đề hướng dẫn và bài luyện viết IELTS hoặc TOEIC." },
  zh: { title: "me2write — 英语写作练习与反馈", description: "通过 CEFR 写作反馈、引导主题以及 IELTS 或 TOEIC 写作模拟练习提升英语写作。" },
  ja: { title: "me2write — 英語ライティング練習とフィードバック", description: "CEFRに沿ったフィードバック、練習トピック、IELTS・TOEIC形式の課題で英語ライティングを練習できます。" }
};

export const resolveSitePath = (pathname: string): SitePath => {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  if (normalized === "/" || normalized === "/about" || normalized === "/contact" || normalized === "/privacy") return normalized;
  if (normalized.startsWith("/admin")) return "/admin";
  return "/404";
};

const upsertMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
};

export const applyPageMetadata = (path: SitePath, locale: Locale) => {
  const metadata = path === "/" ? { ...pageMetadata[path], ...localizedHomeMetadata[locale] } : pageMetadata[path];
  document.title = metadata.title;
  upsertMeta('meta[name="description"]', "name", "description", metadata.description);
  upsertMeta('meta[name="robots"]', "name", "robots", metadata.indexable ? "index, follow" : "noindex, nofollow");
  upsertMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
  upsertMeta('meta[property="og:type"]', "property", "og:type", "website");

  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const openGraphUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (metadata.indexable) {
    const canonicalUrl = `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
    const canonicalElement = canonical ?? document.createElement("link");
    canonicalElement.rel = "canonical";
    canonicalElement.href = canonicalUrl;
    if (!canonical) document.head.append(canonicalElement);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
  } else {
    canonical?.remove();
    openGraphUrl?.remove();
  }

  const existingSchema = document.getElementById("website-structured-data");
  if (path === "/") {
    const schema = existingSchema ?? document.createElement("script");
    schema.id = "website-structured-data";
    schema.setAttribute("type", "application/ld+json");
    schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "me2write", url: `${SITE_ORIGIN}/`, description: metadata.description });
    if (!existingSchema) document.head.append(schema);
  } else {
    existingSchema?.remove();
  }
};

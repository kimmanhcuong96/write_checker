import { getContent } from "../content-i18n";
import type { Locale } from "../types";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getContent(locale);
  return <footer className="site-footer">
    <nav aria-label={copy.footer.label}>
      <div><h2>{copy.footer.product}</h2><a href="/#writing-checker">{copy.features.checker}</a><a href="/#writing-practice">{copy.features.practice}</a><a href="/#exam-practice">{copy.features.exam}</a></div>
      <div><h2>{copy.footer.information}</h2><a href="/about">{copy.footer.about}</a><a href="/contact">{copy.footer.contact}</a></div>
      <div><h2>{copy.footer.legal}</h2><a href="/privacy">{copy.footer.privacy}</a></div>
    </nav>
  </footer>;
}

import { getContent } from "../content-i18n";
import { translate } from "../i18n";
import type { Locale } from "../types";

export function SiteFooter({ locale, onNavigate }: { locale: Locale; onNavigate: (path: string) => void }) {
  const copy = getContent(locale);
  const speaking = translate(locale, "speaking");
  return <footer className="site-footer">
    <nav aria-label={copy.footer.label}>
      <div><h2>{copy.footer.product}</h2><a href="/writing-checker" onClick={(event) => { event.preventDefault(); onNavigate("/writing-checker"); }}>{copy.features.checker}</a><a href="/writing-practice" onClick={(event) => { event.preventDefault(); onNavigate("/writing-practice"); }}>{copy.features.practice}</a><a href="/exam-practice" onClick={(event) => { event.preventDefault(); onNavigate("/exam-practice"); }}>{copy.features.exam}</a></div>
      <div><h2>{copy.footer.information}</h2><a href="/about" onClick={(event) => { event.preventDefault(); onNavigate("/about"); }}>{copy.footer.about}</a><a href="/contact" onClick={(event) => { event.preventDefault(); onNavigate("/contact"); }}>{copy.footer.contact}</a><a className="ecosystem-link" href="https://me2talk.com/" target="_blank" rel="noopener noreferrer" title={speaking}>Me2Talk ↗</a><a className="ecosystem-link ecosystem-link-listen" href="https://me2listen.com/" target="_blank" rel="noopener noreferrer">Me2Listen ↗</a></div>
      <div><h2>{copy.footer.legal}</h2><a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigate("/privacy"); }}>{copy.footer.privacy}</a></div>
    </nav>
  </footer>;
}

import { getContent } from "../content-i18n";
import type { Locale } from "../types";

const CONTACT_EMAIL = "me2talk.support@gmail.com";
type PublicPath = "/about" | "/contact" | "/privacy";

export function PublicPage({ path, locale }: { path: PublicPath; locale: Locale }) {
  if (path === "/about") return <AboutPage locale={locale}/>;
  if (path === "/contact") return <ContactPage locale={locale}/>;
  return <PrivacyPage locale={locale}/>;
}

function AboutPage({ locale }: { locale: Locale }) {
  const copy = getContent(locale).about;
  return <main className="content-page centered-page"><article>
    <p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="page-intro">{copy.intro}</p>
    {copy.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
    <a className="primary-button page-action" href="/#writing-checker">{copy.action}</a>
  </article></main>;
}

function ContactPage({ locale }: { locale: Locale }) {
  const copy = getContent(locale).contact;
  return <main className="content-page centered-page"><article>
    <p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="page-intro">{copy.intro}</p>
    <section className="contact-card"><h2>{copy.emailTitle}</h2><p>{copy.emailBody}</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></section>
    <section><h2>{copy.includeTitle}</h2><p>{copy.includeBody}</p></section><p className="page-note">{copy.note}</p>
  </article></main>;
}

function PrivacyPage({ locale }: { locale: Locale }) {
  const copy = getContent(locale).privacy;
  return <main className="content-page"><article>
    <p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="last-updated">{copy.updated}</p><p className="page-intro">{copy.intro}</p>
    {copy.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
    <section><h2>{copy.contactTitle}</h2><p>{copy.contactPrefix} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>
  </article></main>;
}

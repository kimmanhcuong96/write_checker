const CONTACT_EMAIL = "me2talk.support@gmail.com";

export function PublicPage({ path }: { path: "/about" | "/contact" | "/privacy" }) {
  if (path === "/about") return <AboutPage/>;
  if (path === "/contact") return <ContactPage/>;
  return <PrivacyPage/>;
}

function AboutPage() {
  return <main className="content-page">
    <article>
      <p className="eyebrow">About us</p>
      <h1>English writing practice with useful, structured feedback</h1>
      <p className="page-intro">me2write is a writing practice application for people who want to communicate more clearly in English and better understand their current writing level.</p>
      <section><h2>What me2write does</h2><p>The application analyzes English writing against CEFR-oriented criteria and returns practical feedback on grammar, vocabulary, coherence, cohesion, sentence complexity, naturalness, and communicative effectiveness. Learners can estimate their current level or compare a draft with a selected CEFR target.</p></section>
      <section><h2>Practice for different goals</h2><p>In addition to checking an existing draft, learners can choose guided general or IELTS-style topics, work with optional timers, and complete IELTS Academic, IELTS General Training, or TOEIC Writing practice sessions.</p></section>
      <section><h2>Who it is for</h2><p>me2write is intended for English learners preparing for study, work, exams, or everyday communication. It can help users identify patterns to improve, but its automated estimates are practice guidance rather than official exam results or human expert assessment.</p></section>
      <section><h2>Our approach</h2><p>We focus on specific observations and actionable revisions. Feedback highlights strengths, priorities, corrections, and possible sentence or vocabulary improvements so learners can decide what to revise next.</p></section>
      <a className="primary-button page-action" href="/#writing-checker">Start checking your writing</a>
    </article>
  </main>;
}

function ContactPage() {
  return <main className="content-page">
    <article>
      <p className="eyebrow">Contact</p>
      <h1>Get in touch with me2write</h1>
      <p className="page-intro">We welcome clear, specific messages that help us understand your question or improve the product.</p>
      <section className="contact-card"><h2>Email support</h2><p>Contact us about general feedback, bug reports, feature suggestions, partnership opportunities, or other product inquiries.</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></section>
      <section><h2>What to include</h2><p>For a technical problem, describe what you expected, what happened, and which browser or device you used. Do not email passwords, authentication cookies, API keys, or other sensitive credentials.</p></section>
      <p className="page-note">Response times can vary. Sending a message does not create an emergency or real-time support channel.</p>
    </article>
  </main>;
}

function PrivacyPage() {
  return <main className="content-page">
    <article>
      <p className="eyebrow">Privacy policy</p>
      <h1>How me2write handles your information</h1>
      <p className="last-updated">Last updated: August 14, 2026</p>
      <p className="page-intro">This policy explains the information used by the current me2write application. It is a product notice and is not legal advice.</p>
      <section><h2>Information we collect</h2><p>When you sign in with Google, me2write receives account identifiers and may receive your email address, display name, and profile image. We store account and session records needed to authenticate you and operate the service.</p></section>
      <section><h2>Writing and analysis data</h2><p>We collect the writing you submit, selected practice or evaluation settings, word counts, generated feedback, result status, and technical usage information associated with an evaluation. Practice sessions also store their assigned tasks, answers, timing, and status.</p></section>
      <section><h2>How information is used</h2><p>We use this information to authenticate accounts, provide writing analysis and practice sessions, return and store results, prevent duplicate or excessive requests, maintain service reliability, investigate errors, and administer account access.</p></section>
      <section><h2>AI and service providers</h2><p>Submitted writing and relevant task context are sent to Cloudflare Workers AI to generate feedback. The application uses Cloudflare for website and API delivery, Neon for PostgreSQL data storage, and Google for sign-in. These providers process information as needed to deliver their services under their own terms and privacy practices.</p></section>
      <section><h2>Cookies and local storage</h2><p>me2write uses an essential, secure authentication cookie to keep signed-in sessions working. The website also stores your selected interface language in browser local storage. The current source does not include a separate advertising or behavioral analytics integration.</p></section>
      <section><h2>Storage, security, and retention</h2><p>Account, writing, result, session, and operational records are stored in the application's database. We use access controls, server-side authorization, restricted secrets, request validation, and secure cookie settings to reduce risk. No internet service can guarantee absolute security. The current application does not define a fixed automatic deletion period, so records may remain while needed to operate, secure, and maintain the service.</p></section>
      <section><h2>Your choices</h2><p>You can sign out to end the current browser session and change or clear the saved language preference through your browser. To ask about your personal information or request an available account or data action, contact us. Some records may need to be retained where reasonably necessary for security, integrity, or legal obligations.</p></section>
      <section><h2>Policy changes</h2><p>We may update this policy when the product or its data practices change. The visible “Last updated” date identifies the current version.</p></section>
      <section><h2>Contact</h2><p>Privacy questions can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></section>
    </article>
  </main>;
}

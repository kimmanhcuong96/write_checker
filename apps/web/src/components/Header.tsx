import type { User } from "../types";

export function Header({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return <header className="site-header">
    <a className="brand" href="/" aria-label="me2write home"><span>me2</span>write<i>.</i></a>
    <nav aria-label="Primary navigation">
      {user?.isAdmin && <a href="/admin/llm-usage">Usage</a>}
      <a href="https://me2talk.com" target="_blank" rel="noreferrer">Practice speaking ↗</a>
      {user && <button className="text-button" type="button" onClick={onLogout}>Sign out</button>}
    </nav>
  </header>;
}

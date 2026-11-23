// The page the knowledge base opens on (and where FlowLine's link lands): a few big buttons, nothing more.
import { useKb } from '../KbApp';
import { DAILY_LOGS_URL } from '../features';

// Simple line drawings, 24 x 24.
const ICONS = {
  logs: 'M9 3.5h6v3H9zM7.5 5H5v16h14V5h-2.5M8.5 11h7M8.5 14.5h7M8.5 18h4',
  fleet: 'M2.5 15h19l-2.8 5H5.3zM6 15v-4.5h9V15M8 10.5V7h5v3.5M16.5 15v-6',
  procedures: 'M3 6.5C3 5.7 3.7 5 4.5 5H9l2 2h8.5c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-15c-.8 0-1.5-.7-1.5-1.5zM8.5 13l2.2 2.2 4.8-4.7',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13zM15.4 15.4 20.5 20.5',
  docs: 'M6.5 3h7.5l4 4v14H6.5zM14 3v4h4M9 12h6.5M9 15.5h6.5',
  out: 'M14 4h6v6M20 4l-9 9M18 14v5c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h5',
};
const Icon = ({ name, className = 'tile-icon' }: { name: keyof typeof ICONS; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name]} /></svg>
);

export default function Welcome() {
  const { corpus: c, docsList, store } = useKb();
  const cards = c.docs.filter((d) => d.type === 'procedure').length;
  const docs = docsList.filter((d) => d.path.startsWith('docs/') && !store.isGone(d.path)).length;
  const tiles: { href: string; icon: keyof typeof ICONS; name: string; note: string }[] = [
    { href: '#/fleet', icon: 'fleet', name: 'Fleet', note: `${c.boats.length} boats` },
    { href: '#/library/procedures', icon: 'procedures', name: 'Procedures', note: `${cards} cards` },
    { href: '#/search', icon: 'search', name: 'Search', note: 'Every boat and card' },
    { href: '#/docs', icon: 'docs', name: 'Documents', note: docs ? `${docs} documents` : 'Forms and guides' },
  ];
  return (
    <div className="screen welcome">
      <section className="welcome-hero">
        <p className="welcome-kicker">River Division · Engineering</p>
        <h2 className="welcome-title">Welcome aboard</h2>
      </section>
      <a className="tile tile-main" href={DAILY_LOGS_URL}>
        <Icon name="logs" />
        <span className="tile-text"><b>Daily logs</b><span>Engine Room Log in FlowLine</span></span>
        <Icon name="out" className="tile-out" />
      </a>
      <div className="tiles">
        {tiles.map((t) => (
          <a key={t.href} className="tile" href={t.href}>
            <Icon name={t.icon} />
            <span className="tile-text"><b>{t.name}</b><span>{t.note}</span></span>
          </a>
        ))}
      </div>
      <p className="welcome-foot">
        <a href="#/settings">Settings</a>
        <span>Updated {new Date(store.builtAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </p>
    </div>
  );
}

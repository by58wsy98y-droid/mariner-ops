import { useState } from 'react';
import { useKb } from '../KbApp';

export default function Settings() {
  const { store } = useKb();
  const s = store.status();
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [adv, setAdv] = useState({ owner: store.config.owner, repo: store.config.repo, branch: store.config.branch });
  const pending = store.pendingList;
  return (
    <div className="screen">
      <section className="card">
        <h2>Saving to GitHub</h2>
        <p>
          {s.connected ? 'Connected. ' : 'Not connected yet. '}
          Changes save to <b>{store.config.owner}/{store.config.repo}</b> on the <b>{store.config.branch}</b> branch, in the {store.config.root}/ folder.
          The site republishes itself a few minutes after each save.
        </p>
        <ol className="steps">
          <li>On GitHub: your picture → <b>Settings</b> → <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b>.</li>
          <li>Name it “boat KB”, pick an expiry (up to a year), <b>Only select repositories</b> → <b>{store.config.repo}</b>.</li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b>. Generate, and copy the token.</li>
          <li>Paste it below on each phone or laptop you use. It stays on that device only.</li>
        </ol>
        <label htmlFor="gh-token">GitHub key (token)<input id="gh-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={s.connected ? '•••••••• (saved on this device)' : 'github_pat_…'} /></label>
        <div className="actions">
          <button disabled={!token.trim()} onClick={async () => { store.setToken(token); setToken(''); setMsg(await store.testConnection()); }}>Save key</button>
          {s.connected && <button className="secondary" onClick={async () => setMsg(await store.testConnection())}>Test connection</button>}
          {s.connected && <button className="secondary danger-text" onClick={() => { store.setToken(''); setMsg('Key removed from this device.'); }}>Remove key</button>}
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
        <details>
          <summary className="small">Repository and branch</summary>
          <div className="grid3">
            <label htmlFor="gh-owner">Owner<input id="gh-owner" value={adv.owner} onChange={(e) => setAdv({ ...adv, owner: e.target.value })} /></label>
            <label htmlFor="gh-repo">Repository<input id="gh-repo" value={adv.repo} onChange={(e) => setAdv({ ...adv, repo: e.target.value })} /></label>
            <label htmlFor="gh-branch">Branch<input id="gh-branch" value={adv.branch} onChange={(e) => setAdv({ ...adv, branch: e.target.value })} /></label>
          </div>
          <button className="secondary" onClick={() => { store.setConfig(adv); setMsg('Saved.'); }}>Use these</button>
        </details>
      </section>

      <section className="card">
        <h2>Waiting to save <span className="count">{pending.length}</span></h2>
        {pending.length ? (
          <>
            <ul className="plain">{pending.map((q) => <li key={q.id}><span className="muted small">{new Date(q.at).toLocaleString()}</span> {q.label}</li>)}</ul>
            {s.error && <p className="warnbox">{s.error}</p>}
            <button onClick={() => void store.sync()} disabled={!s.connected || s.syncing}>{s.syncing ? 'Saving…' : 'Save now'}</button>
          </>
        ) : (
          <p className="muted">Nothing waiting. {s.lastSaved ? `Last saved ${new Date(s.lastSaved).toLocaleString()}.` : ''}</p>
        )}
        {!store.storageOk && <p className="warnbox">This browser isn't keeping changes (storage blocked or full). Keep the page open until they're saved.</p>}
      </section>

      <section className="card">
        <h2>All files</h2>
        <p className="small">See every file in the knowledge base, edit or delete what doesn't belong, or add a page to a folder.</p>
        <a className="button secondary" href="#/files">Open all files</a>
      </section>

      <section className="card">
        <h2>This copy</h2>
        <p className="small">Published {new Date(store.builtAt).toLocaleString()}. Edits saved since then show from this device until the next publish picks them up.</p>
      </section>
    </div>
  );
}

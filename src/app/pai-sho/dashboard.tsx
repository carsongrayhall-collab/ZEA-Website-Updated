'use client';
import { useState } from 'react';
import type { Capture, Game } from '@/lib/pai-sho';
import styles from './dashboard.module.css';
type AccessRequest = { id: string; captureId: string; purpose: string; status: string; createdAt: string };
type Archive = { games: Game[]; captures: Capture[]; requests: AccessRequest[] };
const display = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
export default function Dashboard() {
  const [key, setKey] = useState(''), [archive, setArchive] = useState<Archive | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [captureUrl, setCaptureUrl] = useState('');
  const [selected, setSelected] = useState(''), [query, setQuery] = useState('');
  const [captureId, setCaptureId] = useState('');
  async function api(action?: object) {
    const result = await fetch('/api/pai-sho', { method: action ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, ...(action ? { 'Content-Type': 'application/json' } : {}) }, ...(action ? { body: JSON.stringify(action) } : {}), cache: 'no-store' });
    const data = await result.json(); if (!result.ok) throw new Error(data.error || 'Request failed.'); return data;
  }
  async function run(action?: object) {
    setBusy(true); setError(''); setNotice('');
    try { if (action) { const result = await api(action); if (result.url) setCaptureUrl(result.url); if (result.deleted !== undefined) setNotice('Archive records deleted.'); if (result.request) setNotice('Request saved. It has not been sent: app push registration is not available yet.'); }
      setArchive(await api());
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { setBusy(false); }
  }
  const games = archive?.games.filter(game => `${game.captureId} ${display(game.metadata.gameId)} ${display(game.metadata.gameMode)} ${display(game.metadata.outcome)}`.toLowerCase().includes(query.toLowerCase())) || [];
  const game = archive?.games.find(g => `${g.captureId}/${g.metadata.gameId}` === selected);
  async function downloadAll() {
    if (!archive) return;
    setBusy(true); setError('');
    try {
      const { zip, strToU8 } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      for (const game of archive.games) files[`${game.captureId}/${game.metadata.gameId}.json`] = strToU8(JSON.stringify(game, null, 2));
      const bytes = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 6 }, (error, result) => error ? reject(error) : resolve(result)));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
      const a = document.createElement('a'); a.href = url; a.download = 'pai-sho-all-games.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : 'ZIP export failed.'); }
    finally { setBusy(false); }
  }
  function download() { if (!game) return; const url = URL.createObjectURL(new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `pai-sho-${game.metadata.gameId}.json`; anchor.click(); URL.revokeObjectURL(url); }
  return <div className={styles.dashboard}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>ZEA • PRIVATE GAME ARCHIVE</p><h1>Pai Sho</h1><p>A home for every move.</p></div><span className={styles.badge}>Owner dashboard</span></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    {!archive ? <section className={styles.login}><p className={styles.eyebrow}>PRIVATE ACCESS</p><h2>Open your archive</h2><p>Sign in to manage capture links and review synchronized games.</p><form onSubmit={e => { e.preventDefault(); void run(); }}><label>Dashboard access key<input type="password" autoComplete="current-password" required value={key} onChange={e => setKey(e.target.value)} /></label><button disabled={busy}>{busy ? 'Opening…' : 'Open dashboard'}</button></form><small>Your key is kept only in this tab’s memory.</small></section> : <>
      <div className={styles.toolbar}><span>Private Blob archive</span><div><button disabled={busy} className={styles.secondary} onClick={() => void run()}>Refresh</button><button className={styles.secondary} onClick={() => { setArchive(null); setKey(''); setCaptureUrl(''); setSelected(''); }}>Lock</button></div></div>
      <div className={styles.stats}>{[[archive.games.length, 'Games captured'], [archive.games.reduce((n, g) => n + g.events.length, 0), 'Moves & events'], [archive.captures.filter(c => !c.revoked && Date.parse(c.expiresAt) > Date.now()).length, 'Active capture links']].map(([n, title]) => <div key={title}><strong>{n}</strong><span>{title}</span></div>)}</div>
      <section className={styles.card}><h2>Privacy operations</h2><p>Legacy uploads are closed. References identify capture groups, not verified people. A shared development capture can contain multiple people: verify the scope and ownership before deleting.</p><p>Daily retention cleanup removes archive records at 29 days to allow a scheduling margin within the 30-day limit. Refresh also runs cleanup. Locally downloaded exports must be deleted separately.</p><button disabled={busy} onClick={() => void run({action:'purgeExpired'})}>Run retention cleanup</button><a href="/pai-sho-compliance">Privacy and deletion information</a>
        {archive.captures.map(c => <div className={styles.capture} key={c.id}><div><strong>{c.label}</strong><small>Archive reference: {c.id}</small><small>{archive.games.filter(g => g.captureId === c.id).length} games · created {new Date(c.createdAt).toLocaleString()}</small></div><button disabled={busy} onClick={() => {if(window.confirm('Have you independently verified ownership and the scope of this entire capture group? This permanently deletes its games, pending requests and capture record.')) void run({action:'deleteCapture',id:c.id,ownershipVerified:true});}}>Delete verified archive group</button></div>)}
        <p>For records without a capture entry, use the game’s capture reference below. This is a privileged operation and is never authorized by a player name alone.</p><form onSubmit={e=>{e.preventDefault();if(window.confirm('Ownership and deletion scope verified independently? Delete this entire archive group?'))void run({action:'deleteCapture',id:captureId,ownershipVerified:true});}}><label>Archive group reference<input pattern="[a-f0-9]{64}" required value={captureId} onChange={e=>setCaptureId(e.target.value)}/></label><button disabled={busy}>Delete verified group by reference</button></form>
      </section>
      <section className={styles.card}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>03 / EXPLORE</p><h2>Game library</h2></div><button disabled={busy || !archive.games.length} className={styles.secondary} onClick={() => void downloadAll()}>Download all JSON as .zip</button><label>Search games<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Game ID, mode, or outcome" /></label></div>
        {!games.length ? <div className={styles.empty}><span aria-hidden="true">✿</span><h3>{archive.games.length ? 'No matching games' : 'Your first game belongs here'}</h3><p>{archive.games.length ? 'Try another search.' : 'Create a capture link, sync from the app, then refresh.'}</p></div> : <div className={styles.library}><div className={styles.gameList}>{games.map(g => { const value = `${g.captureId}/${g.metadata.gameId}`; return <button className={`${styles.gameButton} ${selected === value ? styles.selected : ''}`} key={value} onClick={() => setSelected(value)}><strong>{display(g.metadata.gameMode || 'Pai Sho')}</strong><span>{display(g.metadata.gameId)}</span><small>{g.events.length} events · {new Date(g.updatedAt).toLocaleString()}</small></button>; })}</div><div className={styles.viewer}>{game ? <><div className={styles.sectionHeading}><h3>Recorded moves</h3><button className={styles.secondary} onClick={download}>Download JSON</button></div><p role="status">{game.uploadStatus === 'metadata_received' ? 'Incomplete upload — metadata received; waiting for events.' : game.uploadStatus === 'complete' ? 'Complete snapshot received.' : 'Legacy record — completion not yet confirmed.'}</p><p>Archive reference: {game.captureId}</p><p>Outcome: {display(game.metadata.outcome)} · AI: {display(game.metadata.ai)}</p><details><summary>Game metadata / compact initial board</summary><p>Empty board positions are omitted from the compact board. Null fields mean a value is not yet known or does not apply.</p><pre>{JSON.stringify(game.metadata, null, 2)}</pre></details>{!game.events.length ? <p>{game.uploadStatus === 'complete' ? 'This game has no recorded moves.' : 'No events received yet.'}</p> : game.events.map(event => <details className={styles.event} key={event.eventId}><summary><span>#{event.sequence}</span> {event.actionType === 'setup' ? 'Setup · ' : ''}{display(event.rawNotation || event.actionType || event.type || 'Event')} <small>{display(event.playerSeat || event.seat)}</small></summary><pre>{JSON.stringify(event, null, 2)}</pre></details>)}</> : <div className={styles.empty}><h3>Select a game</h3><p>Inspect its full move history and original JSON.</p></div>}</div></div>}
      </section>
    </>}
  </div>;
}

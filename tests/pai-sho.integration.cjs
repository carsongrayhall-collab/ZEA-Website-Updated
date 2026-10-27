// Run against a local server connected to a dedicated test/private Blob store.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { del } = require('@vercel/blob');
const { chromium } = require('playwright');
loadEnvConfig(process.cwd());
const base = process.env.PAISHO_TEST_URL || 'http://localhost:3100';
const headers = { authorization: `Bearer ${process.env.PAISHO_ADMIN_KEY}`, 'content-type': 'application/json' };
const cleanup = [];
async function json(path, options = {}) { const r = await fetch(base + path, options); return { status: r.status, value: await r.json() }; }
async function admin(action) { const r = await json('/api/pai-sho', { headers, ...(action ? { method: 'POST', body: JSON.stringify(action) } : {}) }); assert.equal(r.status, 200, JSON.stringify(r.value)); return r.value; }
(async () => {
  let browser;
  try {
    assert.equal((await json('/api/pai-sho')).status, 401);
    assert.equal((await json('/api/pai-sho', { headers: { authorization: 'Bearer wrong' } })).status, 401);
    const { capture, url } = await admin({ action: 'createCapture', label: 'Verification — disposable test' });
    cleanup.push(`pai-sho/captures/${capture.id}.json`);
    const sync = new URL(url).pathname;
    const gameId = randomUUID();
    const post = (path, data) => json(sync + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    assert.equal((await post('/api/v1/games', { gameId: '../unsafe' })).status, 400);
    assert.equal((await post(`/api/v1/games/${gameId}/events/batch`, { events: [] })).status, 404);
    assert.equal((await post('/api/v1/games', { gameId, gameMode: 'skud', ai: 'strategic', outcome: null, trainingConsent: false })).status, 200);
    cleanup.push(`pai-sho/games/${capture.id}/${gameId}.json`);
    const events = [1, 2].map(sequence => ({ eventId: randomUUID(), sequence, rawNotation: sequence === 1 ? '1H. R3(0,8)' : '1G. W3(0,-8)', playerSeat: sequence === 1 ? 'host' : 'guest', actionType: 'plant' }));
    const path = `/api/v1/games/${gameId}/events/batch`;
    assert.equal((await post(path, { events })).status, 200);
    assert.equal((await post(path, { events })).value.total, 2);
    assert.equal((await post(path, { events: [{ ...events[0], rawNotation: 'changed' }] })).status, 409);
    assert.equal((await post(path, { events: [{ ...events[0], eventId: randomUUID() }] })).status, 409);
    assert.equal((await post(path, { events: [{ eventId: 'bad', sequence: -1 }] })).status, 400);
    const concurrent = await Promise.all([3, 4].map(sequence => post(path, { events: [{ eventId: randomUUID(), sequence, rawNotation: `Test move ${sequence}` }] })));
    concurrent.forEach(r => assert.equal(r.status, 200, JSON.stringify(r.value)));
    await post('/api/v1/games', { gameId, gameMode: 'skud', ai: 'strategic', outcome: 'host', trainingConsent: false });
    // Large metadata reproduces the compression/weak ETag failure on subsequent writes.
    const snapshots = [];
    for (let index = 0; index < 3; index++) {
      const snapshotId = randomUUID();
      cleanup.push(`pai-sho/games/${capture.id}/${snapshotId}.json`);
      const snapshot = { metadata: { gameId: snapshotId, padding: 'regression '.repeat(600), initialState: { board: Array.from({length:17},()=>Array(17).fill(null)) }, outcome: index === 2 ? 'host' : null }, events: index === 0 ? [] : [{eventId:randomUUID(), sequence:0, actionType:index === 1 ? 'setup' : 'plant'}] };
      snapshots.push(snapshot);
      assert.equal((await post('/api/v1/games/snapshot',snapshot)).status,200);
      assert.equal((await post('/api/v1/games/snapshot',snapshot)).status,200);
    }
    const partialId=randomUUID();cleanup.push(`pai-sho/games/${capture.id}/${partialId}.json`);
    await post('/api/v1/games',{gameId:partialId});
    assert.equal((await admin()).games.find(g=>g.metadata.gameId===partialId).uploadStatus,'metadata_received');
    await post('/api/v1/games/snapshot',{metadata:{gameId:partialId},events:[]});
    assert.equal((await admin()).games.find(g=>g.metadata.gameId===partialId).uploadStatus,'complete');
    assert.equal((await post('/api/v1/games/snapshot',{metadata:{gameId:randomUUID()},events:[{eventId:'bad',sequence:-1}]})).status,400);
    assert.equal((await post('/api/v1/games/snapshot',{metadata:{gameId:randomUUID(),padding:'x'.repeat(2000001)},events:[]})).status,413);
    const archive = await admin();
    for(const snapshot of snapshots){ const stored=archive.games.find(g=>g.metadata.gameId===snapshot.metadata.gameId); assert.deepEqual(stored.events,snapshot.events); assert.equal(stored.metadata.initialState.board.format,'sparse-v1'); assert.equal(stored.metadata.initialState.board.tiles.length,0); }
    const game = archive.games.find(g => g.metadata.gameId === gameId);
    assert.equal(game.events.length, 4); assert.equal(game.metadata.outcome, 'host');
    const { request } = await admin({ action: 'requestAccess', captureId: capture.id, purpose: 'Verify the consent request archive without sending a notification.' });
    cleanup.push(`pai-sho/requests/${request.id}.json`);
    assert.equal(request.status, 'awaiting_app_support'); assert.equal(request.approvedAt, null); assert.equal(request.deliveredAt, null);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/pai-sho');
    await page.getByLabel('Dashboard access key').fill(process.env.PAISHO_ADMIN_KEY);
    await page.getByRole('button', { name: 'Open dashboard' }).click();
    await page.getByRole('heading', { name: 'Game library' }).waitFor();
    await page.getByRole('button').filter({ hasText: gameId }).click();
    await page.getByRole('heading', { name: 'Recorded moves' }).waitFor();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/pai-sho-${width}.png`, fullPage: true });
    }
    const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download JSON' }).click();
    assert.match((await downloadEvent).suggestedFilename(), /pai-sho-/);
    await page.getByRole('button', { name: 'Lock', exact: true }).click();
    assert.equal(await page.getByLabel('Dashboard access key').inputValue(), ''); assert.deepEqual(errors, []);
    await admin({ action: 'revokeCapture', id: capture.id });
    assert.equal((await post('/api/v1/games', { gameId })).status, 401);
    console.log('PASS: authentication, real private Blob capture/readback, duplicate/conflicting/concurrent uploads, metadata updates, queued consent, JSON download, lock, revocation, desktop/mobile rendering.');
  } finally {
    if (browser) await browser.close();
    for (const pathname of cleanup) await del(pathname, { token: process.env.PAISHO_BLOB_READ_WRITE_TOKEN });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

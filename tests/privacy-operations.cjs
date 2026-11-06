const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const records = new Map();
let failDelete = false;
const now = Date.now();
const old = new Date(now - 31 * 86400000).toISOString();
const fresh = new Date(now - 86400000).toISOString();
const a = 'a'.repeat(64), b = 'b'.repeat(64);
const mock = {
  get: async path => records.has(path) ? { statusCode:200, stream:JSON.stringify(records.get(path)), blob:{etag:'v1'} } : null,
  put: async (path, value) => { records.set(path,JSON.parse(value)); },
  list: async ({prefix}) => ({blobs:[...records.keys()].filter(p=>p.startsWith(prefix)).map(pathname=>({pathname,uploadedAt:new Date(fresh)})),hasMore:false}),
  del: async paths => {if(failDelete) throw Error('Storage unavailable'); for(const path of paths) records.delete(path);},
  BlobPreconditionFailedError: class extends Error {}, BlobServiceRateLimited: class extends Error {},
};
const moduleObject = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('src/lib/pai-sho.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports:moduleObject.exports,require:name=>name==='@vercel/blob'?mock:require(name),process:{env:{PAISHO_BLOB_STORE_ID:'test',PAISHO_ADMIN_KEY:'test-admin'}},Response,Buffer,console,setTimeout,structuredClone});
const api=moduleObject.exports;
function put(path,value){records.set('pai-sho/'+path,value);}
(async()=>{
  assert.throws(()=>api.authorize(new Request('https://example.com')),/dashboard access key/);
  api.authorize(new Request('https://example.com',{headers:{Authorization:'Bearer test-admin'}}));
  await assert.rejects(api.captureFor('c'.repeat(64)),/Legacy archive uploads are closed/);
  put(`captures/${a}.json`,{id:a,createdAt:fresh,revoked:false});
  put(`games/${a}/one.json`,{updatedAt:fresh});
  put(`games/${b}/two.json`,{updatedAt:fresh});
  put('requests/one.json',{captureId:a,createdAt:fresh});
  failDelete=true;
  await assert.rejects(api.deleteCaptureRecords(a),/Storage unavailable/);
  assert.equal(records.get(`pai-sho/captures/${a}.json`).revoked,true,'failed deletion must still close capture');
  failDelete=false;
  assert.equal((await api.deleteCaptureRecords(a)).deleted,2);
  assert.ok(records.has(`pai-sho/games/${b}/two.json`),'must preserve other owner records');
  assert.equal((await api.deleteCaptureRecords(a)).deleted,0,'retry is idempotent');
  await assert.rejects(api.deleteCaptureRecords('../games'),/Invalid archive reference/);
  put('games/old/game.json',{updatedAt:old});
  put('requests/old.json',{createdAt:old});
  put('captures/old.json',{createdAt:old});
  assert.equal((await api.purgeExpired(now)).deleted,3);
  assert.ok(records.has(`pai-sho/games/${b}/two.json`));
  put('games/invalid/game.json',{updatedAt:'invalid'});
  await assert.rejects(api.purgeExpired(now),/Invalid archive timestamp/);
  console.log('Privacy operations: authorization, closed legacy uploads, scoped deletion, failed-delete retry, retention and malformed timestamps passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});

import { createClient } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';

const URL = 'https://hgfulxwjwjohmjslhxhq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZnVseHdqd2pvaG1qc2xoeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTY3NzIsImV4cCI6MjA4NjQ5Mjc3Mn0.zeS_K_ypfuqhdOPl3BnOqeB2tGvthbcfRMH-i_S1lzc';
const sb = createClient(URL, ANON);
const { data: auth } = await sb.auth.signInWithPassword({ email: 'pavanaofficial05@gmail.com', password: '592022' });
const token = auth.session.access_token;

const SIZE = 25 * 1024 * 1024;
const buf = Buffer.allocUnsafe(SIZE);
for (let i = 0; i < SIZE; i += 4096) buf.writeUInt32LE(Math.random() * 1e9 >>> 0, i);

async function runOnce(label, opts) {
  const path = `bench/${Date.now()}-${label}.apk`;
  const t0 = Date.now();
  let last = t0, lastB = 0;
  await new Promise((resolve, reject) => {
    const up = new tus.Upload(buf, {
      endpoint: `${URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 2000, 4000, 8000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'true', apikey: ANON },
      uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: 'app-releases', objectName: path, contentType: 'application/vnd.android.package-archive', cacheControl: '3600' },
      onError: reject, onSuccess: resolve,
      onProgress: (b) => {
        const now = Date.now();
        if (now - last > 2000) {
          console.log(`  [${label}] ${(b/1048576).toFixed(1)} MB  inst ${((b-lastB)/(now-last)*1000/1048576).toFixed(2)} MB/s`);
          last = now; lastB = b;
        }
      },
      ...opts,
    });
    up.start();
  });
  const dt = (Date.now() - t0) / 1000;
  const mbps = 25 / dt;
  console.log(`[${label}] ${dt.toFixed(2)}s — ${mbps.toFixed(2)} MB/s`);
  await sb.storage.from('app-releases').remove([path]);
  return { dt, mbps };
}

const arg = process.argv[2] || 'parallel';
let result;
if (arg === 'serial') result = await runOnce('serial', { uploadSize: SIZE });
else result = await runOnce('parallel-4', { parallelUploads: 4 });
console.log('RESULT', JSON.stringify(result));

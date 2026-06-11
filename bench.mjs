import { createClient } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';
import { Readable } from 'node:stream';

const URL = 'https://hgfulxwjwjohmjslhxhq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZnVseHdqd2pvaG1qc2xoeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTY3NzIsImV4cCI6MjA4NjQ5Mjc3Mn0.zeS_K_ypfuqhdOPl3BnOqeB2tGvthbcfRMH-i_S1lzc';

const sb = createClient(URL, ANON);
const { data: auth } = await sb.auth.signInWithPassword({ email: 'pavanaofficial05@gmail.com', password: '592022' });
const token = auth.session.access_token;

const SIZE = 25 * 1024 * 1024;
const buf = Buffer.allocUnsafe(SIZE);
for (let i = 0; i < SIZE; i += 4096) buf.writeUInt32LE(Math.random() * 1e9 >>> 0, i);

async function runOnce(label, opts) {
  const path = `bench/test-${Date.now()}-${label}.apk`;
  console.log(`\n[${label}] uploading 25 MB…`);
  const t0 = Date.now();
  await new Promise((resolve, reject) => {
    const up = new tus.Upload(buf, {
      endpoint: `${URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 2000, 4000, 8000, 16000, 30000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'true', apikey: ANON },
      uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: 'app-releases', objectName: path,
        contentType: 'application/vnd.android.package-archive', cacheControl: '3600',
      },
      onError: reject, onSuccess: resolve,
      ...opts,
    });
    up.start();
  });
  const dt = (Date.now() - t0) / 1000;
  const mbps = 25 / dt;
  console.log(`[${label}] ${dt.toFixed(2)}s — ${mbps.toFixed(2)} MB/s (${(mbps * 8).toFixed(1)} Mbps)`);
  await sb.storage.from('app-releases').remove([path]);
  return { dt, mbps };
}

const r1 = await runOnce('serial-1conn', { uploadSize: SIZE });
const r2 = await runOnce('parallel-4', { parallelUploads: 4 });
const r3 = await runOnce('parallel-4-rerun', { parallelUploads: 4 });

console.log('\n=== SUMMARY ===');
console.log(`serial   :  ${r1.dt.toFixed(2)}s  ${r1.mbps.toFixed(2)} MB/s`);
console.log(`parallel :  ${r2.dt.toFixed(2)}s  ${r2.mbps.toFixed(2)} MB/s`);
console.log(`parallel2:  ${r3.dt.toFixed(2)}s  ${r3.mbps.toFixed(2)} MB/s`);
const avg = (r2.mbps + r3.mbps) / 2;
console.log(`AVG parallel: ${avg.toFixed(2)} MB/s`);

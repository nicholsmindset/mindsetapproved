// publish-bundle: compiles the draft rules, diffs them against the last published bundle, runs the
// regression fixtures, then uploads rules-bundle.v{n}.json.gz and records the version.
//
// POST { "dryRun"?: boolean, "acceptFailures"?: boolean, "notes"?: string }
// The caller's own JWT is forwarded, so RLS and is_admin() decide; no service key is used.
import { createClient } from '@supabase/supabase-js';
import { preparePublish } from '../_shared/rules-engine.js';
import fixtures from '../_shared/fixtures.json' with { type: 'json' };

const BUCKET = 'rules-bundles';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipJson(res: Response): Promise<unknown> {
  const stream = res.body!.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in as an admin' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean; acceptFailures?: boolean; notes?: string };

  const { data: draft, error: exportError } = await supabase.rpc('export_rules');
  if (exportError) return json({ error: exportError.message }, exportError.code === '42501' ? 403 : 500);

  const { data: latestRows, error: latestError } = await supabase.rpc('latest_rule_version');
  if (latestError) return json({ error: latestError.message }, 500);
  const latest = (latestRows as Array<{ version: number; bundle_url: string }> | null)?.[0] ?? null;

  let previous = null;
  if (latest) {
    const res = await fetch(latest.bundle_url);
    if (!res.ok) return json({ error: `Could not read published bundle v${latest.version} (${res.status})` }, 502);
    previous = await gunzipJson(res);
  }

  let plan;
  try {
    plan = preparePublish({ draft, previous, fixtures, version: (latest?.version ?? 0) + 1 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 422);
  }
  const summary = {
    version: plan.bundle.version,
    ingredientCount: plan.bundle.ingredients.length,
    aliasCount: Object.keys(plan.bundle.aliases).length + Object.keys(plan.bundle.eNumbers).length,
    diff: plan.diff,
    failures: plan.failures,
    blockers: plan.blockers,
  };

  if (body.dryRun) return json({ published: false, ...summary });
  if (plan.diff.isEmpty) return json({ published: false, ...summary, error: plan.blockers[0] }, 409);
  if (plan.failures.length && !body.acceptFailures) {
    return json({ published: false, ...summary, error: `${plan.failures.length} regression label(s) now give a different verdict. Confirm the changes are intended to publish anyway.` }, 409);
  }

  const path = `rules-bundle.v${plan.bundle.version}.json.gz`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, await gzip(JSON.stringify(plan.bundle)), { contentType: 'application/gzip', upsert: false });
  if (uploadError) return json({ error: `Upload failed: ${uploadError.message}` }, 500);
  const bundleUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error: publishError } = await supabase.rpc('publish_rule_version', {
    p_version: plan.bundle.version,
    p_bundle_url: bundleUrl,
    p_ingredient_count: summary.ingredientCount,
    p_alias_count: summary.aliasCount,
    p_notes: body.notes ?? null,
  });
  if (publishError) return json({ error: publishError.message }, 500);

  return json({ published: true, bundleUrl, ...summary });
});

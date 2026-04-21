/**
 * cloudflare pages function: GET /api/health
 *
 * thin wrapper around app/lib/health-source.ts that adds edge caching.
 * reads env from cloudflare pages bindings (ctx.env), not process.env.
 */

import { fetchHealthData, type HealthEnv } from "../../app/lib/health-source";

interface EventContext {
  request: Request;
  env: HealthEnv;
  waitUntil: (p: Promise<unknown>) => void;
}

const CACHE_TTL_SECONDS = 300;

export const onRequestGet = async (ctx: EventContext) => {
  const { request, env, waitUntil } = ctx;

  const cache = (globalThis as unknown as { caches?: CacheStorage }).caches;
  const cacheKey = new Request(new URL(request.url).origin + "/api/health", {
    method: "GET",
  });

  if (cache && "default" in cache) {
    const edgeCache = (cache as unknown as { default: Cache }).default;
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  const payload = await fetchHealthData(env);

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control":
        payload.state === "ok"
          ? `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`
          : "no-store",
    },
  });

  if (payload.state === "ok" && cache && "default" in cache) {
    const edgeCache = (cache as unknown as { default: Cache }).default;
    waitUntil(edgeCache.put(cacheKey, response.clone()));
  }
  return response;
};

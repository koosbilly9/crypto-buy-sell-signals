// Cloudflare Worker: CORS proxy for CoinMarketCap top-50 listings.
// Optional secret: CMC_KEY (your free CoinMarketCap Basic API key). Without it the keyless route is used.

const ALLOWED_ORIGINS = [
  "https://koosbilly9.github.io",
  // "https://signals.to-web.co.za",   // add your own domain here when you use it
];

const QS = "start=1&limit=50&convert=USD&sort=market_cap&sort_dir=desc";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (url.pathname !== "/listings") {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const base = env.CMC_KEY
      ? "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?"
      : "https://pro-api.coinmarketcap.com/public-api/v1/cryptocurrency/listings/latest?";
    const headers = { Accept: "application/json" };
    if (env.CMC_KEY) headers["X-CMC_PRO_API_KEY"] = env.CMC_KEY;

    // cacheTtl keeps one copy for 10 minutes so visitors share a single upstream call
    const upstream = await fetch(base + QS, {
      headers,
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "upstream " + upstream.status }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  },
};

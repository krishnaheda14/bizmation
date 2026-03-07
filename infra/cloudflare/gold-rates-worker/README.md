# gold-rates-worker

This worker fetches XAU/XAG → INR prices every 5 minutes and caches computed per-gram rates in KV namespace `GOLD_RATES_KV`.

Important: set the KV namespace id in `wrangler.toml` and deploy with `wrangler deploy`.

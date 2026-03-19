# gold-rates-worker

This worker fetches:

- XAU/USD from Swissquote: https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD
- XAG/USD from Swissquote: https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAG/USD
- USD/INR from Yahoo Finance (INR=X): https://query1.finance.yahoo.com/v8/finance/chart/INR=X?interval=1m&range=1d

Then it computes XAU/XAG INR values and per-gram purity rates, and caches the output in KV namespace `GOLD_RATES_KV`.

`/gold-rates` and `/gold-rates/live` responses include `data.inputs` so you can see exact values and source URLs used in calculation.

Important: set the KV namespace id in `wrangler.toml` and deploy with `wrangler deploy`.

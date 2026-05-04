# Resale Scout eBay First

This package is the eBay-first direction for your resale app.

## What it does now

- Keeps eBay as the primary resale platform.
- Lets you enter product, condition, seller asking price and target price.
- Generates eBay active/sold links for the selected selling market.
- Converts seller asking price into AUD.
- Calculates target price realism using sold comps.
- Calculates profit/loss in AUD.
- Saves records and exports CSV.

## Automatic sold comps

Automatic sold-comps fetching requires a third-party sold-comps API endpoint or a backend service.

This package includes an **optional sold-comps API connector**:
- API endpoint field
- API key/token field
- Fetch eBay sold comps button

Expected endpoint behavior:
- The app sends query parameters:
  - `q`
  - `condition`
  - `market`
- The endpoint should return JSON containing sold listing prices.
- The app tries to find price fields named:
  - `price`
  - `soldPrice`
  - `value`
  - `amount`
  - `currentPrice`
  - `convertedCurrentPrice`

If you do not have such an API yet, use the manual fallback:
1. Open eBay Sold link.
2. Copy recent sold prices.
3. Paste them into the sold comps box.
4. Click Analyze Product.

## Why this is not fully automatic yet

A browser-only app cannot reliably scrape eBay sold pages directly because of CORS and website restrictions. For real automatic sold comps, you need:
- eBay/sold-comps API access, or
- a backend scraper/API provider.

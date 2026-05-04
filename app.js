(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const records = [];
  let currentRecord = null;

  const markets = {
    au: {
      label: "Australia",
      cur: "AUD",
      ebayCurrency: "AUD",
      ebayDomain: "www.ebay.com.au",
      amazon: (q) => `https://www.amazon.com.au/s?k=${q}&currency=AUD`,
      aliexpress: (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}&currency=AUD`
    },
    sg: {
      label: "Singapore",
      cur: "SGD",
      ebayCurrency: "SGD",
      ebayDomain: "www.ebay.com.sg",
      amazon: (q) => `https://www.amazon.sg/s?k=${q}&currency=SGD`,
      carousell: (q) => `https://www.carousell.sg/search/${q}`
    },
    jp: {
      label: "Japan",
      cur: "JPY",
      ebayCurrency: "JPY",
      ebayDomain: "www.ebay.com",
      amazon: (q) => `https://www.amazon.co.jp/s?k=${q}&currency=JPY`,
      mercari: (q) => `https://jp.mercari.com/search?keyword=${q}`
    },
    us: {
      label: "United States",
      cur: "USD",
      ebayCurrency: "USD",
      ebayDomain: "www.ebay.com",
      amazon: (q) => `https://www.amazon.com/s?k=${q}&currency=USD&language=en_US`
    },
    uk: {
      label: "United Kingdom",
      cur: "GBP",
      ebayCurrency: "GBP",
      ebayDomain: "www.ebay.co.uk",
      amazon: (q) => `https://www.amazon.co.uk/s?k=${q}&currency=GBP`
    }
  };

  const colours = ["black", "white", "grey", "gray", "red", "blue", "green", "yellow", "purple", "pink", "orange", "silver", "gold"];
  const variants = ["bluetooth", "2.4ghz", "2.4g", "wired", "wireless", "deluxe", "limited", "standard"];

  // Cache live rates briefly so repeated clicks do not hammer the API.
  const fxCache = new Map();

  function showError(error) {
    const card = $("errorCard");
    const text = $("errorText");
    if (card && text) {
      card.hidden = false;
      text.textContent = error && error.stack ? error.stack : String(error);
    }
    console.error(error);
  }

  window.addEventListener("error", (event) => showError(event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => showError(event.reason || event));

  function value(id) {
    const element = $(id);
    return element ? String(element.value || "").trim() : "";
  }

  function escapeHtml(input) {
    return String(input ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(text) {
    const status = $("status");
    if (status) status.textContent = text;
  }

  function selectedMarketKey() {
    return document.querySelector('input[name="market"]:checked')?.value || "au";
  }

  function selectedMarket() {
    return markets[selectedMarketKey()] || markets.au;
  }

  function selectedCurrency() {
    return selectedMarket().cur;
  }

  function sellerCurrency() {
    return value("buyCurrency") || selectedCurrency();
  }

  function selectedCondition() {
    return value("condition");
  }

  function syncFallbackCurrencyToMarket() {
    const currencySelect = $("buyCurrency");
    if (currencySelect && !currencySelect.value) currencySelect.value = selectedCurrency();
    setStatus(`${selectedMarket().label} selected`);
    if ($("buyCostResult") && !value("buyPrice")) {
      $("buyCostResult").className = "mini-result";
      $("buyCostResult").textContent = `Enter seller asking price number and choose its currency. Research currency is ${selectedCurrency()}.`;
    }
  }

  function conditionSearchText() {
    const condition = selectedCondition();
    const map = {
      "Brand new": "new",
      "Like new": "like new",
      "Preowned": "used preowned",
      "Loose": "loose no box",
      "Incomplete": "incomplete missing parts",
      "For parts / repair": "for parts repair",
      "Unknown": ""
    };
    return map[condition] || "";
  }

  function ebayConditionCode() {
    const condition = selectedCondition();
    const map = {
      "Brand new": "1000",
      "Like new": "1500",
      "Preowned": "3000",
      "For parts / repair": "7000"
    };
    return map[condition] || "";
  }

  function buildPhrase() {
    const rawPhrase = value("productPhrase").toLowerCase();

    if (!value("colour")) {
      const detectedColour = colours.find((colour) => new RegExp(`(^|\\s|-)${colour}(\\s|-|$)`, "i").test(rawPhrase));
      if (detectedColour) $("colour").value = detectedColour;
    }

    if (!value("variant")) {
      const detectedVariant = variants.find((variant) => rawPhrase.includes(variant));
      if (detectedVariant) $("variant").value = detectedVariant.replace("2.4g", "2.4GHz");
    }

    const parts = [value("productPhrase"), value("brand"), value("model"), value("variant"), value("colour")].filter(Boolean);
    return [...new Set(parts.join(" ").split(/\s+/).filter(Boolean))].join(" ") || "product";
  }

  function marketplaceQuery() {
    const base = buildPhrase();
    const conditionText = conditionSearchText();
    return conditionText ? `${base} ${conditionText}` : base;
  }

  function ebaySearchUrl(options = {}) {
    const market = selectedMarket();
    const params = new URLSearchParams();
    params.set("_nkw", marketplaceQuery());
    params.set("_sacat", "0");
    params.set("_ipg", "240");
    if (options.sold) {
      params.set("LH_Sold", "1");
      params.set("LH_Complete", "1");
    }
    const conditionCode = ebayConditionCode();
    if (conditionCode) params.set("LH_ItemCondition", conditionCode);
    if (market.ebayCurrency) params.set("_curr", market.ebayCurrency);
    return `https://${market.ebayDomain}/sch/i.html?${params.toString()}`;
  }

  function formatMoney(amount, currency) {
    if (!Number.isFinite(amount)) return "—";
    const rounded = currency === "JPY" ? Math.round(amount) : Math.round(amount * 100) / 100;
    if (currency === "SGD") return `S$${rounded}`;
    if (currency === "AUD") return `$${rounded} AUD`;
    if (currency === "USD") return `$${rounded} USD`;
    if (currency === "JPY") return `¥${rounded}`;
    if (currency === "GBP") return `£${rounded}`;
    return `${rounded} ${currency}`;
  }

  function parseSellerPriceNumber(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const match = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    return Number(match[0]);
  }

  async function fetchFrankfurterRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = fxCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.time < 10 * 60 * 1000) {
      return cached.rate;
    }

    // Frankfurter no-key API.
    // Primary endpoint:
    const primaryUrl = `https://api.frankfurter.dev/v1/latest?amount=1&from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`;

    let response = await fetch(primaryUrl);
    let data = await response.json();

    if (response.ok && data && data.rates && typeof data.rates[toCurrency] === "number") {
      const rate = data.rates[toCurrency];
      fxCache.set(cacheKey, { rate, time: now });
      return rate;
    }

    // Fallback for older Frankfurter deployments if v1 path ever changes.
    const fallbackUrl = `https://api.frankfurter.app/latest?amount=1&from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`;
    response = await fetch(fallbackUrl);
    data = await response.json();

    if (response.ok && data && data.rates && typeof data.rates[toCurrency] === "number") {
      const rate = data.rates[toCurrency];
      fxCache.set(cacheKey, { rate, time: now });
      return rate;
    }

    throw new Error(`Live currency conversion failed for ${fromCurrency} → ${toCurrency}.`);
  }

  async function convertLive(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    const rate = await fetchFrankfurterRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  async function calculateBuyCost(render = true) {
    const amount = parseSellerPriceNumber(value("buyPrice"));
    const fromCurrency = sellerCurrency();
    const targetCurrency = selectedCurrency();

    if (!Number.isFinite(amount)) {
      if (render) {
        $("buyCostResult").className = "mini-result";
        $("buyCostResult").textContent = `Enter seller asking price number and choose its currency. Research currency is ${targetCurrency}.`;
      }
      return { summary: "", marketSummary: "", audSummary: "", marketAmount: null, audAmount: null, currency: fromCurrency };
    }

    let convertedToMarket = null;
    let audAmount = null;
    let source = "Frankfurter live rate";

    const manualRate = Number(value("marketRateOverride"));
    if (value("rateMode") === "manual" && Number.isFinite(manualRate) && manualRate > 0) {
      convertedToMarket = amount * manualRate;
      audAmount = await convertLive(amount, fromCurrency, "AUD");
      source = "manual rate override for research currency; AUD reference uses Frankfurter";
    } else {
      convertedToMarket = await convertLive(amount, fromCurrency, targetCurrency);
      audAmount = await convertLive(amount, fromCurrency, "AUD");
    }

    const marketSummary = `${formatMoney(amount, fromCurrency)} ≈ ${formatMoney(convertedToMarket, targetCurrency)}`;
    const audSummary = `${formatMoney(amount, fromCurrency)} ≈ ${formatMoney(audAmount, "AUD")} AUD reference`;
    const summary = `${marketSummary}; ${audSummary}`;

    if (render) {
      $("buyCostResult").className = "mini-result good";
      $("buyCostResult").innerHTML = `
        <strong>Seller asking price converted</strong><br>
        ${escapeHtml(marketSummary)}<br>
        ${escapeHtml(audSummary)}<br>
        <small>${escapeHtml(source)}. Seller currency → selected research currency.</small>
      `;
    }

    return { summary, marketSummary, audSummary, marketAmount: convertedToMarket, audAmount, currency: fromCurrency, amount, source };
  }

  function openUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openSoldSearch() {
    openUrl(ebaySearchUrl({ sold: true }));
  }

  function openGoogleImages() {
    openUrl(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(buildPhrase())}`);
  }

  function openWiseConversion() {
    const amount = parseSellerPriceNumber(value("buyPrice")) || 1;
    const from = sellerCurrency();
    const to = selectedCurrency();
    openUrl(`https://wise.com/gb/currency-converter/${from.toLowerCase()}-to-${to.toLowerCase()}-rate?amount=${encodeURIComponent(amount)}`);
  }

  async function buildCurrentRecord() {
    const buy = await calculateBuyCost(false);
    return {
      product: buildPhrase(),
      condition: selectedCondition(),
      country: selectedMarket().label,
      buy: `${value("buyPrice")} ${sellerCurrency()}`.trim(),
      converted: buy.summary,
      price: value("price"),
      ebayResearch: "Use eBay Product Research for official sell-through rate.",
      url: value("listingUrl"),
      notes: value("notes"),
      date: new Date().toLocaleString()
    };
  }

  function buildLinks() {
    const productQ = encodeURIComponent(buildPhrase());
    const fullQ = encodeURIComponent(marketplaceQuery());
    const market = selectedMarket();
    const linkRows = [
      [`eBay ${market.label} Active`, ebaySearchUrl({ sold: false })],
      [`eBay ${market.label} Sold`, ebaySearchUrl({ sold: true })]
    ];

    if (market.amazon) linkRows.push([`Amazon ${market.label}`, market.amazon(fullQ)]);
    if (market.aliexpress) linkRows.push(["AliExpress", market.aliexpress(fullQ)]);
    if (market.carousell) linkRows.push(["Carousell SG", market.carousell(fullQ)]);
    if (market.mercari) linkRows.push(["Mercari JP", market.mercari(fullQ)]);

    let html = `<div class="country-group"><h3>${escapeHtml(market.label)} research links</h3><div class="link-grid">`;
    linkRows.forEach(([label, url]) => {
      html += `<a class="research-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span>Open ↗</span></a>`;
    });
    html += `</div><p class="muted">Search includes selected condition where possible: <strong>${escapeHtml(selectedCondition() || "Any condition")}</strong>.</p></div>`;

    html += `<div class="country-group"><h3>Review Search</h3><div class="link-grid">
      <a class="research-link" href="https://www.google.com/search?q=${productQ}+review" target="_blank" rel="noopener noreferrer">Google Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.youtube.com/results?search_query=${productQ}+review" target="_blank" rel="noopener noreferrer">YouTube Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.google.com/search?q=${productQ}+reddit+review" target="_blank" rel="noopener noreferrer">Reddit Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.google.com/search?q=${productQ}+problems+issues" target="_blank" rel="noopener noreferrer">Problems / Issues Search<span>Open ↗</span></a>
    </div></div>`;

    $("links").innerHTML = html;
  }

  async function analyzeProduct() {
    try {
      setStatus("Converting live rate...");
      const buy = await calculateBuyCost(true);
      currentRecord = await buildCurrentRecord();
      buildLinks();

      $("summary").innerHTML = `
        <strong>${escapeHtml(currentRecord.product)}</strong><br>
        Research country: ${escapeHtml(currentRecord.country)} / Research currency: ${escapeHtml(selectedCurrency())}<br>
        Seller ask: ${escapeHtml(value("buyPrice") || "Not set")} ${escapeHtml(sellerCurrency())}<br>
        Condition: ${escapeHtml(currentRecord.condition || "Any condition")}<br>
        Seller ask converted: ${escapeHtml(buy.marketSummary || "Not calculated")}<br>
        AUD reference: ${escapeHtml(buy.audSummary || "Not calculated")}<br>
        Target price: ${escapeHtml(currentRecord.price || "Not set")} ${escapeHtml(selectedCurrency())}<br><br>
        <strong>eBay sell-through:</strong> Open eBay Product Research and search this product phrase to use eBay’s official sell-through rate.<br><br>
        <small>Tip: Currency uses Frankfurter live rates. eBay Product Research may require you to be logged into your seller account.</small>
      `;

      $("sellThroughResult").innerHTML = `Use <strong>eBay Product Research</strong> for the official sell-through rate. Product phrase: <strong>${escapeHtml(currentRecord.product)}</strong>`;
      setStatus("Analyzed");
    } catch (error) {
      showError(error);
      $("buyCostResult").className = "mini-result bad";
      $("buyCostResult").textContent = "Currency conversion failed. Try Open Wise Conversion or use manual rate override.";
      setStatus("Error");
    }
  }

  async function saveRecord() {
    try {
      if (!currentRecord) currentRecord = await buildCurrentRecord();
      records.unshift({ ...currentRecord });
      renderRecords();
      setStatus("Saved");
    } catch (error) {
      showError(error);
    }
  }

  function renderRecords() {
    $("recordCount").textContent = records.length;
    $("records").innerHTML = records.length ? records.map((record) => `<tr>
      <td>${escapeHtml(record.product)}</td>
      <td>${escapeHtml(record.condition)}</td>
      <td>${escapeHtml(record.country)}</td>
      <td>${escapeHtml(record.buy)}</td>
      <td>${escapeHtml(record.converted)}</td>
      <td>${escapeHtml(record.price)}</td>
      <td>${escapeHtml(record.ebayResearch)}</td>
      <td>${record.url ? `<a href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer">Open</a>` : "—"}</td>
      <td>${escapeHtml(record.notes)}</td>
      <td>${escapeHtml(record.date)}</td>
    </tr>`).join("") : `<tr><td colspan="10">No saved records yet.</td></tr>`;
  }

  async function exportCsv() {
    try {
      if (!records.length) await saveRecord();
      const headers = ["Product","Condition","Research Country","Seller Ask","Converted","Target Price","eBay Research","URL","Notes","Date"];
      const rows = records.map((r) => [r.product, r.condition, r.country, r.buy, r.converted, r.price, r.ebayResearch, r.url, r.notes, r.date]);
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "resale-scout-records.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Exported");
    } catch (error) {
      showError(error);
    }
  }

  function clearForm() {
    ["productPhrase","brand","model","variant","colour","condition","listingUrl","buyPrice","marketRateOverride","price","notes"].forEach((id) => {
      const element = $(id);
      if (element) element.value = "";
    });
    $("rateMode").value = "default";
    currentRecord = null;
    $("summary").textContent = "Enter product details and click Analyze Product.";
    $("links").innerHTML = "";
    $("buyCostResult").className = "mini-result";
    $("buyCostResult").textContent = `Enter seller asking price number and choose its currency. Research currency is ${selectedCurrency()}.`;
    $("sellThroughResult").className = "sellthrough-result";
    $("sellThroughResult").textContent = "Open eBay Product Research, search your product phrase there, and use eBay’s official sell-through rate.";
    $("errorCard").hidden = true;
    setStatus("Ready");
  }

  function resetMarket() {
    const australia = document.querySelector('input[name="market"][value="au"]');
    if (australia) australia.checked = true;
    setStatus("Australia selected");
  }

  function saveWebhook() {
    localStorage.setItem("resaleScoutSheetWebhook", value("sheetWebhookUrl"));
    $("sheetStatus").className = "mini-result good";
    $("sheetStatus").textContent = "Google Sheets Web App URL saved locally.";
  }

  function loadWebhook() {
    const saved = localStorage.getItem("resaleScoutSheetWebhook") || "";
    const input = $("sheetWebhookUrl");
    if (input) input.value = saved;
  }

  async function sendToSheet() {
    const url = value("sheetWebhookUrl") || localStorage.getItem("resaleScoutSheetWebhook");
    if (!url) {
      $("sheetStatus").className = "mini-result warning";
      $("sheetStatus").textContent = "Paste your Google Sheets Web App URL first.";
      return;
    }
    if (!currentRecord) currentRecord = await buildCurrentRecord();
    $("sheetStatus").className = "mini-result";
    $("sheetStatus").textContent = "Sending to Google Sheets...";
    fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(currentRecord) })
      .then(() => { $("sheetStatus").className = "mini-result good"; $("sheetStatus").textContent = "Sent to Google Sheets. Check your sheet for the new row."; })
      .catch((error) => { showError(error); $("sheetStatus").className = "mini-result bad"; $("sheetStatus").textContent = "Could not send to Google Sheets: " + error.message; });
  }

  function bind(id, handler) {
    const element = $(id);
    if (!element) { showError(`Missing element: #${id}`); return; }
    element.addEventListener("click", handler);
  }

  function init() {
    bind("analyzeBtn", analyzeProduct);
    bind("clearBtn", clearForm);
    bind("saveBtn", saveRecord);
    bind("exportBtn", exportCsv);
    bind("resetMarketBtn", resetMarket);
    bind("googleImagesBtn", openGoogleImages);
    bind("openSoldBtn", openSoldSearch);
    bind("openResearchBtn", () => openUrl("https://www.ebay.com/sh/research"));
    bind("openWiseBtn", openWiseConversion);
    bind("saveWebhookBtn", saveWebhook);
    bind("sendSheetBtn", sendToSheet);

    document.querySelectorAll('input[name="market"]').forEach((radio) => {
      radio.addEventListener("change", () => setStatus(`${selectedMarket().label} selected`));
    });

    if ($("buyCurrency") && !$("buyCurrency").value) $("buyCurrency").value = selectedCurrency();
    loadWebhook();
    setStatus("Ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
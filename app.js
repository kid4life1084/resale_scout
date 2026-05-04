const $ = id => document.getElementById(id);

let currentRecord = null;
let records = [];

const marketConfig = {
  au: {
    label: "Australia",
    ebayDomain: "ebay.com.au",
    links: [
      ["eBay AU Active", q => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`],
      ["eBay AU Sold", q => `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
      ["Amazon AU", q => `https://www.amazon.com.au/s?k=${q}`],
      ["AliExpress", q => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
    ]
  },
  sg: {
    label: "Singapore",
    ebayDomain: "ebay.com.sg",
    links: [
      ["eBay SG Active", q => `https://www.ebay.com.sg/sch/i.html?_nkw=${q}`],
      ["eBay SG Sold", q => `https://www.ebay.com.sg/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
      ["Carousell SG", q => `https://www.carousell.sg/search/${q}`],
      ["Amazon SG", q => `https://www.amazon.sg/s?k=${q}`],
      ["AliExpress", q => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
    ]
  },
  jp: {
    label: "Japan",
    ebayDomain: "ebay.com",
    links: [
      ["eBay US Sold", q => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
      ["Amazon JP", q => `https://www.amazon.co.jp/s?k=${q}`],
      ["Yahoo Auctions JP", q => `https://auctions.yahoo.co.jp/search/search?p=${q}`],
      ["Mercari JP", q => `https://jp.mercari.com/search?keyword=${q}`],
      ["AliExpress", q => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
    ]
  },
  us: {
    label: "United States",
    ebayDomain: "ebay.com",
    links: [
      ["eBay US Active", q => `https://www.ebay.com/sch/i.html?_nkw=${q}`],
      ["eBay US Sold", q => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
      ["Amazon US", q => `https://www.amazon.com/s?k=${q}`],
      ["AliExpress", q => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
    ]
  },
  uk: {
    label: "United Kingdom",
    ebayDomain: "ebay.co.uk",
    links: [
      ["eBay UK Active", q => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}`],
      ["eBay UK Sold", q => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
      ["Amazon UK", q => `https://www.amazon.co.uk/s?k=${q}`],
      ["AliExpress", q => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
    ]
  }
};

const currencyByMarket = {
  au: { code: "AUD", symbol: "$" },
  sg: { code: "SGD", symbol: "S$" },
  jp: { code: "JPY", symbol: "¥" },
  us: { code: "USD", symbol: "$" },
  uk: { code: "GBP", symbol: "£" }
};

let exchangeRatesToAud = { AUD: 1, SGD: null, JPY: null, USD: null, GBP: null };
let exchangeRateUpdatedAt = "";

const fallbackRatesToAud = { AUD: 1, SGD: 1.15, JPY: 0.010, USD: 1.52, GBP: 2.00 };

const knownColours = ["black","white","grey","gray","red","blue","green","yellow","purple","pink","orange","silver","gold","brown","clear","transparent"];
const knownVariants = ["bluetooth","2.4ghz","2.4g","2.4 ghz","wired","wireless","usb","pro","ultimate","limited","collector","deluxe","standard","v2","v3"];

function value(id) { return $(id).value.trim(); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function escapeAttr(value) { return escapeHtml(value); }
function setStatus(text) { $("status").textContent = text; }

function selectedMarket() {
  const selected = document.querySelector('input[name="market"]:checked');
  return selected ? selected.value : "au";
}
function selectedMarkets() { return [selectedMarket()]; }
function selectedCurrency() { return currencyByMarket[selectedMarket()] || currencyByMarket.au; }

function autoDetectFields() {
  const phrase = value("productPhrase").toLowerCase();
  if (!$("colour").value.trim()) {
    const colour = knownColours.find(c => new RegExp(`(^|\\s|-)${c}(\\s|-|$)`, "i").test(phrase));
    if (colour) $("colour").value = colour;
  }
  if (!$("variant").value.trim()) {
    const variant = knownVariants.find(v => phrase.includes(v));
    if (variant) $("variant").value = variant.replace("2.4g", "2.4GHz").replace("2.4 ghz", "2.4GHz");
  }
}

function buildPhrase() {
  autoDetectFields();
  const parts = [value("productPhrase"), value("brand"), value("model"), value("variant"), value("colour")].filter(Boolean);
  return [...new Set(parts.join(" ").split(/\s+/).filter(Boolean))].join(" ") || value("listingUrl") || "product";
}

function buildApiQuery() {
  const phrase = buildPhrase();
  const condition = value("condition");
  return condition ? `${phrase} ${condition}` : phrase;
}

function parsePriceText(text, defaultCurrency = selectedCurrency().code) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  let currency = "";
  if (upper.includes("SGD") || upper.includes("S$")) currency = "SGD";
  else if (upper.includes("AUD")) currency = "AUD";
  else if (upper.includes("USD")) currency = "USD";
  else if (upper.includes("JPY") || upper.includes("¥")) currency = "JPY";
  else if (upper.includes("GBP") || upper.includes("£")) currency = "GBP";
  else currency = defaultCurrency;

  const numeric = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!numeric) return null;
  return { raw, amount: Number(numeric[0]), currency };
}

function formatMoney(amount, currency) {
  if (!Number.isFinite(amount)) return "—";
  const rounded = currency === "JPY" ? Math.round(amount) : Math.round(amount * 100) / 100;
  if (currency === "SGD") return `S$${rounded}`;
  if (currency === "AUD") return `$${rounded} AUD`;
  if (currency === "USD") return `$${rounded} USD`;
  if (currency === "JPY") return `¥${rounded}`;
  if (currency === "GBP") return `£${rounded}`;
  return `${rounded}`;
}

function parseSoldComps() {
  return value("soldPrices")
    .split(/\n|,|;/)
    .map(x => parsePriceText(x, selectedCurrency().code))
    .filter(Boolean);
}

function extractPricesFromUnknownJson(data) {
  const prices = [];
  const seen = new Set();

  function visit(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const possibleKeys = ["price", "soldPrice", "value", "amount", "currentPrice", "convertedCurrentPrice"];
    for (const key of possibleKeys) {
      if (node[key] !== undefined && node[key] !== null) {
        const maybe = typeof node[key] === "object"
          ? (node[key].value ?? node[key].amount ?? node[key].__value__ ?? "")
          : node[key];
        const parsed = parsePriceText(String(maybe), selectedCurrency().code);
        if (parsed && parsed.amount > 0) {
          const token = `${parsed.amount}-${parsed.currency}`;
          if (!seen.has(token)) {
            seen.add(token);
            prices.push(parsed);
          }
        }
      }
    }

    Object.values(node).forEach(visit);
  }

  visit(data);
  return prices.slice(0, 50);
}

async function fetchSoldComps() {
  const endpoint = value("apiEndpoint");
  const apiKey = value("apiKey");

  if (!endpoint) {
    alert("Enter a sold-comps API endpoint first, or use manual paste.");
    return;
  }

  setStatus("Fetching comps...");

  try {
    const query = buildApiQuery();
    const url = new URL(endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("condition", value("condition"));
    url.searchParams.set("market", selectedMarket());

    const headers = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data).slice(0, 800));
    }

    const prices = extractPricesFromUnknownJson(data);

    if (!prices.length) {
      throw new Error("No usable price fields found in the API response. The app looks for price, soldPrice, value, amount, currentPrice, or convertedCurrentPrice.");
    }

    $("soldPrices").value = prices.map(p => formatMoney(p.amount, p.currency)).join("\n");
    calculatePriceCheck(true);
    calculateProfitLoss(true);
    setStatus("Comps fetched");
  } catch (error) {
    console.error(error);
    setStatus("Fetch failed");
    alert("Sold-comps fetch failed:\n" + error.message);
  }
}

async function fetchRateToAud(currency) {
  if (!currency || currency === "AUD") {
    exchangeRatesToAud.AUD = 1;
    return 1;
  }
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(currency)}&to=AUD`;
    const response = await fetch(url);
    const data = await response.json();
    const rate = data?.rates?.AUD;
    if (rate && Number.isFinite(rate)) {
      exchangeRatesToAud[currency] = rate;
      exchangeRateUpdatedAt = new Date().toLocaleString();
      return rate;
    }
  } catch (error) {
    console.warn("Exchange rate fetch failed", currency, error);
  }
  if (!exchangeRatesToAud[currency]) {
    exchangeRatesToAud[currency] = fallbackRatesToAud[currency] || null;
    exchangeRateUpdatedAt = "Fallback estimate";
  }
  return exchangeRatesToAud[currency];
}

async function updateExchangeRates() {
  const selectedSellCurrency = selectedCurrency().code;
  const buyCurrency = value("buyCurrency") || "AUD";

  $("buyCostResult").className = "mini-result";
  $("buyCostResult").textContent = "Updating AUD exchange rate...";
  $("profitResult").className = "profit-result";
  $("profitResult").textContent = "Updating AUD exchange rates...";

  await Promise.all([fetchRateToAud(selectedSellCurrency), fetchRateToAud(buyCurrency)]);

  calculateBuyCost(true);
  calculatePriceCheck(true);
  calculateProfitLoss(true);
  setStatus("Rates updated");
}

function convertToAud(amount, currency) {
  if (!Number.isFinite(amount)) return null;
  if (currency === "AUD") return amount;
  const rate = exchangeRatesToAud[currency] || fallbackRatesToAud[currency];
  if (!rate) return null;
  return amount * rate;
}

function parseBuyPrice() {
  const parsed = parsePriceText(value("buyPrice"), value("buyCurrency") || "AUD");
  if (!parsed) return null;
  parsed.currency = value("buyCurrency") || parsed.currency || "AUD";
  return parsed;
}

function calculateBuyCost(render = true) {
  const buy = parseBuyPrice();
  if (!buy) {
    if (render) {
      $("buyCostResult").className = "mini-result";
      $("buyCostResult").textContent = "Enter seller asking price to see AUD conversion.";
    }
    return { summary: "", buyAud: null };
  }

  const buyAud = convertToAud(buy.amount, buy.currency);
  if (buyAud === null) {
    if (render) {
      $("buyCostResult").className = "mini-result warning";
      $("buyCostResult").innerHTML = `<strong>Exchange rate needed</strong><br>Click Update AUD exchange rates.`;
    }
    return { summary: `Exchange rate needed for ${buy.currency} to AUD.`, buyAud: null };
  }

  const summary = `${formatMoney(buy.amount, buy.currency)} ≈ ${formatMoney(buyAud, "AUD")}`;
  if (render) {
    $("buyCostResult").className = "mini-result good";
    $("buyCostResult").innerHTML = `
      <strong>Seller asking price in AUD</strong><br>
      ${escapeHtml(summary)}
      <br><small>${exchangeRateUpdatedAt ? "Rate updated: " + escapeHtml(exchangeRateUpdatedAt) : "Using current or fallback exchange estimate."}</small>
    `;
  }
  return { summary, buyAud };
}

function calculatePriceCheck(render = true) {
  const target = parsePriceText(value("price"), selectedCurrency().code);
  const comps = parseSoldComps();
  const currency = selectedCurrency().code;

  if (!target && !comps.length) {
    if (render) {
      $("priceCheckResult").className = "price-result";
      $("priceCheckResult").textContent = "Enter target price and sold comps to compare your price to the eBay market.";
    }
    return { status: "", summary: "", average: null, count: 0 };
  }

  if (!target) {
    if (render) {
      $("priceCheckResult").className = "price-result warning";
      $("priceCheckResult").innerHTML = `<strong>Target price missing</strong><br>Enter your target selling price first.`;
    }
    return { status: "warning", summary: "Target price missing.", average: null, count: comps.length };
  }

  if (!comps.length) {
    if (render) {
      $("priceCheckResult").className = "price-result warning";
      $("priceCheckResult").innerHTML = `<strong>Sold comps missing</strong><br>Your target is ${escapeHtml(formatMoney(target.amount, currency))}. Fetch or paste eBay sold comps to compare.`;
    }
    return { status: "warning", summary: `Target entered: ${formatMoney(target.amount, currency)}. Sold comps missing.`, average: null, count: 0 };
  }

  const average = comps.reduce((sum, comp) => sum + comp.amount, 0) / comps.length;
  const difference = target.amount - average;
  const percentDifference = average ? (difference / average) * 100 : 0;

  let status = "good";
  let label = "Looks realistic";
  let advice = "Your target is close to the average eBay sold price.";

  if (percentDifference > 20) {
    status = "bad";
    label = "Looks high";
    advice = "Your target is more than 20% above average sold comps. Expect slower sales or negotiation unless your item is better than the comps.";
  } else if (percentDifference > 10) {
    status = "warning";
    label = "Slightly high";
    advice = "Your target is 10–20% above average sold comps. It may still work, but check condition and variant carefully.";
  } else if (percentDifference < -15) {
    status = "good";
    label = "Competitive / possibly low";
    advice = "Your target is below average sold comps. This may sell faster, but you may be leaving money on the table.";
  }

  const summary = `${label}: target ${formatMoney(target.amount, currency)} vs average eBay sold comp ${formatMoney(average, currency)} from ${comps.length} comps (${percentDifference >= 0 ? "+" : ""}${percentDifference.toFixed(1)}%).`;

  if (render) {
    $("priceCheckResult").className = `price-result ${status}`;
    $("priceCheckResult").innerHTML = `
      <strong>${escapeHtml(label)}</strong><br>
      ${escapeHtml(advice)}
      <div class="price-metric-grid">
        <div class="price-metric"><span>Your target</span><strong>${escapeHtml(formatMoney(target.amount, currency))}</strong></div>
        <div class="price-metric"><span>Average eBay sold</span><strong>${escapeHtml(formatMoney(average, currency))}</strong></div>
        <div class="price-metric"><span>Difference</span><strong>${escapeHtml((percentDifference >= 0 ? "+" : "") + percentDifference.toFixed(1) + "%")}</strong></div>
      </div>
      <br><small>Sold comps used: ${comps.length}. Check that comps match variant, colour and condition.</small>
    `;
  }

  return { status, summary, average, count: comps.length, difference, percentDifference };
}

function calculateProfitLoss(render = true) {
  const buy = parseBuyPrice();
  const comps = parseSoldComps();
  const target = parsePriceText(value("price"), selectedCurrency().code);
  const sellCurrency = selectedCurrency().code;

  if (!buy && !comps.length && !target) {
    if (render) {
      $("profitResult").className = "profit-result";
      $("profitResult").textContent = "Enter seller asking price and eBay sold comps to calculate estimated profit/loss in AUD.";
    }
    return { summary: "", profitAud: null };
  }

  if (!buy) {
    if (render) {
      $("profitResult").className = "profit-result warning";
      $("profitResult").innerHTML = "<strong>Buy cost missing</strong><br>Enter the seller asking price first.";
    }
    return { summary: "Buy cost missing.", profitAud: null };
  }

  const buyAud = convertToAud(buy.amount, buy.currency);
  if (buyAud === null) {
    if (render) {
      $("profitResult").className = "profit-result warning";
      $("profitResult").innerHTML = `<strong>Exchange rate needed</strong><br>Click Update AUD exchange rates to convert ${escapeHtml(buy.currency)} to AUD.`;
    }
    return { summary: `Exchange rate needed for ${buy.currency} to AUD.`, profitAud: null };
  }

  let expectedSaleAmount = null;
  let basis = "";

  if (comps.length) {
    expectedSaleAmount = comps.reduce((sum, comp) => sum + comp.amount, 0) / comps.length;
    basis = `average eBay sold comp from ${comps.length} comps`;
  } else if (target) {
    expectedSaleAmount = target.amount;
    basis = "your target selling price";
  }

  if (expectedSaleAmount === null) {
    if (render) {
      $("profitResult").className = "profit-result warning";
      $("profitResult").innerHTML = `<strong>Sale price missing</strong><br>Fetch/paste sold comps or enter target selling price.`;
    }
    return { summary: "Sale price missing.", profitAud: null };
  }

  const saleAud = convertToAud(expectedSaleAmount, sellCurrency);
  if (saleAud === null) {
    if (render) {
      $("profitResult").className = "profit-result warning";
      $("profitResult").innerHTML = `<strong>Exchange rate needed</strong><br>Click Update AUD exchange rates to convert ${escapeHtml(sellCurrency)} to AUD.`;
    }
    return { summary: `Exchange rate needed for ${sellCurrency} to AUD.`, profitAud: null };
  }

  const profitAud = saleAud - buyAud;
  const profitPercent = buyAud ? (profitAud / buyAud) * 100 : 0;
  const status = profitAud >= 0 ? "good" : "bad";
  const label = profitAud >= 0 ? "Estimated profit" : "Estimated loss";

  const summary = `${label}: ${formatMoney(profitAud, "AUD")} using ${basis}. Buy cost ${formatMoney(buyAud, "AUD")}, expected sale ${formatMoney(saleAud, "AUD")}.`;

  if (render) {
    $("profitResult").className = `profit-result ${status}`;
    $("profitResult").innerHTML = `
      <strong>${escapeHtml(label)}</strong><br>
      Based on ${escapeHtml(basis)}.
      <div class="price-metric-grid">
        <div class="price-metric"><span>Buy cost in AUD</span><strong>${escapeHtml(formatMoney(buyAud, "AUD"))}</strong></div>
        <div class="price-metric"><span>Expected sale in AUD</span><strong>${escapeHtml(formatMoney(saleAud, "AUD"))}</strong></div>
        <div class="price-metric"><span>Profit / loss</span><strong>${escapeHtml(formatMoney(profitAud, "AUD"))} (${profitPercent >= 0 ? "+" : ""}${profitPercent.toFixed(1)}%)</strong></div>
      </div>
      <span class="rate-note">Estimate excludes eBay fees, shipping, tax, currency spread and payment fees.</span>
    `;
  }

  return { summary, buyAud, saleAud, profitAud, profitPercent, basis };
}

function buildRecord() {
  const markets = selectedMarkets();
  const phrase = buildPhrase();
  const buyCost = calculateBuyCost(false);
  const priceCheck = calculatePriceCheck(false);
  const profitCheck = calculateProfitLoss(false);

  return {
    product: phrase,
    condition: value("condition"),
    url: value("listingUrl"),
    buyPrice: value("buyPrice"),
    buyCurrency: value("buyCurrency"),
    buyAudSummary: buyCost.summary,
    price: value("price"),
    soldPrices: value("soldPrices"),
    averageSold: priceCheck.average,
    priceCheck,
    profitCheck,
    notes: value("notes"),
    markets: markets.map(code => marketConfig[code]?.label).filter(Boolean),
    currency: selectedCurrency().code,
    date: new Date().toLocaleString()
  };
}

async function analyzeProduct() {
  await updateExchangeRates();
  buildLinks();
}

function buildLinks() {
  currentRecord = buildRecord();
  const q = encodeURIComponent(currentRecord.product);
  const market = marketConfig[selectedMarket()];

  $("summary").innerHTML = `
    <strong>${escapeHtml(currentRecord.product)}</strong><br>
    Condition: ${escapeHtml(currentRecord.condition || "Any")}<br>
    Country: ${escapeHtml(currentRecord.markets.join(", ") || "Australia")}<br>
    Seller ask: ${escapeHtml(currentRecord.buyPrice ? formatMoney(Number(currentRecord.buyPrice), currentRecord.buyCurrency || "AUD") : "Not set")}<br>
    Seller ask in AUD: ${escapeHtml(currentRecord.buyAudSummary || "Not calculated")}<br>
    Average eBay sold: ${escapeHtml(currentRecord.averageSold ? formatMoney(currentRecord.averageSold, currentRecord.currency) : "No comps yet")}<br>
    Target selling price: ${escapeHtml(parsePriceText(currentRecord.price, selectedCurrency().code) ? formatMoney(parsePriceText(currentRecord.price, selectedCurrency().code).amount, selectedCurrency().code) : "Not set")}<br>
    ${currentRecord.priceCheck?.summary ? `<br><strong>Price check:</strong> ${escapeHtml(currentRecord.priceCheck.summary)}` : ""}
    ${currentRecord.profitCheck?.summary ? `<br><strong>Profit check:</strong> ${escapeHtml(currentRecord.profitCheck.summary)}` : ""}
  `;

  let html = "";

  html += `<div class="country-group"><h3>${escapeHtml(market.label)} / eBay-first links</h3><div class="link-grid">`;
  market.links.forEach(([label, builder]) => {
    const url = builder(q);
    html += `<a class="research-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span>Open ↗</span></a>`;
  });
  html += `</div></div>`;

  html += `<div class="country-group"><h3>Reviews</h3><div class="link-grid">
    <a class="research-link" href="https://www.google.com/search?q=${q}+review" target="_blank" rel="noopener noreferrer">Google Reviews Search<span>Open ↗</span></a>
    <a class="research-link" href="https://www.youtube.com/results?search_query=${q}+review" target="_blank" rel="noopener noreferrer">YouTube Reviews<span>Open ↗</span></a>
    <a class="research-link" href="https://www.google.com/search?q=${q}+reddit+review" target="_blank" rel="noopener noreferrer">Reddit Reviews<span>Open ↗</span></a>
    <a class="research-link" href="https://www.google.com/search?tbm=isch&q=${q}" target="_blank" rel="noopener noreferrer">Google Images<span>Open ↗</span></a>
  </div></div>`;

  $("links").innerHTML = html;
  setStatus("Analyzed");
}

function saveApiSettings() {
  localStorage.setItem("resaleScoutApiEndpoint", value("apiEndpoint"));
  localStorage.setItem("resaleScoutApiKey", value("apiKey"));
  setStatus("API settings saved");
}

function loadApiSettings() {
  $("apiEndpoint").value = localStorage.getItem("resaleScoutApiEndpoint") || "";
  $("apiKey").value = localStorage.getItem("resaleScoutApiKey") || "";
}

function saveRecord() {
  if (!currentRecord) currentRecord = buildRecord();
  records.unshift({ ...currentRecord });
  renderRecords();
  setStatus("Saved");
}

function renderRecords() {
  $("recordCount").textContent = records.length;
  if (!records.length) {
    $("records").innerHTML = `<tr><td colspan="12">No saved records yet.</td></tr>`;
    return;
  }

  $("records").innerHTML = records.map(record => `
    <tr>
      <td>${escapeHtml(record.product)}</td>
      <td>${escapeHtml(record.condition)}</td>
      <td>${escapeHtml(record.markets.join(", "))}</td>
      <td>${escapeHtml(record.buyPrice ? formatMoney(Number(record.buyPrice), record.buyCurrency || "AUD") : "")}</td>
      <td>${escapeHtml(record.buyAudSummary || "")}</td>
      <td>${escapeHtml(record.averageSold ? formatMoney(record.averageSold, record.currency) : "")}</td>
      <td>${escapeHtml(record.price)}</td>
      <td>${escapeHtml(record.priceCheck?.summary || "")}</td>
      <td>${escapeHtml(record.profitCheck?.summary || "")}</td>
      <td>${record.url ? `<a href="${escapeAttr(record.url)}" target="_blank" rel="noopener noreferrer">Open</a>` : "—"}</td>
      <td>${escapeHtml(record.notes)}</td>
      <td>${escapeHtml(record.date)}</td>
    </tr>
  `).join("");
}

function exportCsv() {
  if (!records.length) saveRecord();

  const headers = ["Product", "Condition", "Country", "Seller Ask", "Seller Ask AUD", "Avg eBay Sold", "Target Price", "Price Check", "Profit / Loss AUD", "URL", "Notes", "Date"];
  const rows = records.map(record => [
    record.product,
    record.condition,
    record.markets.join(" | "),
    record.buyPrice ? formatMoney(Number(record.buyPrice), record.buyCurrency || "AUD") : "",
    record.buyAudSummary || "",
    record.averageSold ? formatMoney(record.averageSold, record.currency) : "",
    record.price,
    record.priceCheck?.summary || "",
    record.profitCheck?.summary || "",
    record.url,
    record.notes,
    record.date
  ]);

  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "resale-scout-ebay-first-records.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported");
}

function clearForm() {
  ["productPhrase","brand","model","variant","colour","listingUrl","buyPrice","price","condition","soldPrices","notes"].forEach(id => $(id).value = "");
  $("buyCurrency").value = "SGD";
  currentRecord = null;
  $("summary").textContent = "Enter product details and click Analyze Product.";
  $("links").innerHTML = "";
  $("buyCostResult").className = "mini-result";
  $("buyCostResult").textContent = "Enter seller asking price to see AUD conversion.";
  $("priceCheckResult").className = "price-result";
  $("priceCheckResult").textContent = "Enter target price and sold comps to compare your price to the eBay market.";
  $("profitResult").className = "profit-result";
  $("profitResult").textContent = "Enter seller asking price and sold comps to calculate estimated profit/loss in AUD.";
  setStatus("Ready");
}

function resetMarket() {
  const au = document.querySelector('input[name="market"][value="au"]');
  if (au) au.checked = true;
  calculateBuyCost(false);
  calculatePriceCheck(false);
  calculateProfitLoss(false);
  setStatus("Australia selected");
}

$("analyzeBtn").onclick = analyzeProduct;
$("clearBtn").onclick = clearForm;
$("saveBtn").onclick = saveRecord;
$("exportBtn").onclick = exportCsv;
$("resetMarketBtn").onclick = resetMarket;
$("priceCheckBtn").onclick = () => { calculateBuyCost(true); calculatePriceCheck(true); calculateProfitLoss(true); };
$("rateBtn").onclick = updateExchangeRates;
$("fetchCompsBtn").onclick = fetchSoldComps;
$("saveApiBtn").onclick = saveApiSettings;

["buyPrice","buyCurrency","price","soldPrices"].forEach(id => {
  $(id).addEventListener("input", () => {
    calculateBuyCost(false);
    calculatePriceCheck(false);
    calculateProfitLoss(false);
  });
});

document.querySelectorAll('input[name="market"]').forEach(input => {
  input.addEventListener("change", () => {
    calculateBuyCost(false);
    calculatePriceCheck(false);
    calculateProfitLoss(false);
  });
});

loadApiSettings();

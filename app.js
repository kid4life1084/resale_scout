(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const records = [];
  let currentRecord = null;

  const markets = {
    au: {
      label: "Australia",
      cur: "AUD",
      sold: (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      links: [
        ["eBay AU Active", (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}`],
        ["eBay AU Sold", (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
        ["Amazon AU", (q) => `https://www.amazon.com.au/s?k=${q}`],
        ["AliExpress", (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}`]
      ]
    },
    sg: {
      label: "Singapore",
      cur: "SGD",
      sold: (q) => `https://www.ebay.com.sg/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      links: [
        ["eBay SG Active", (q) => `https://www.ebay.com.sg/sch/i.html?_nkw=${q}`],
        ["eBay SG Sold", (q) => `https://www.ebay.com.sg/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
        ["Carousell SG", (q) => `https://www.carousell.sg/search/${q}`],
        ["Amazon SG", (q) => `https://www.amazon.sg/s?k=${q}`]
      ]
    },
    jp: {
      label: "Japan",
      cur: "JPY",
      sold: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      links: [
        ["eBay US Active", (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`],
        ["eBay US Sold", (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
        ["Amazon JP", (q) => `https://www.amazon.co.jp/s?k=${q}`],
        ["Mercari JP", (q) => `https://jp.mercari.com/search?keyword=${q}`]
      ]
    },
    us: {
      label: "United States",
      cur: "USD",
      sold: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      links: [
        ["eBay US Active", (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`],
        ["eBay US Sold", (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
        ["Amazon US", (q) => `https://www.amazon.com/s?k=${q}`]
      ]
    },
    uk: {
      label: "United Kingdom",
      cur: "GBP",
      sold: (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
      links: [
        ["eBay UK Active", (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}`],
        ["eBay UK Sold", (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
        ["Amazon UK", (q) => `https://www.amazon.co.uk/s?k=${q}`]
      ]
    }
  };

  // Wise-like fallback estimates. Enter Wise override for exact rate.
  const fallbackRatesToAud = { AUD: 1, SGD: 1.09, JPY: 0.010, USD: 1.52, GBP: 2.00 };
  const colours = ["black", "white", "grey", "gray", "red", "blue", "green", "yellow", "purple", "pink", "orange", "silver", "gold"];
  const variants = ["bluetooth", "2.4ghz", "2.4g", "wired", "wireless", "deluxe", "limited", "standard"];

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
    const cleaned = [...new Set(parts.join(" ").split(/\s+/).filter(Boolean))].join(" ");
    return cleaned || "product";
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

  function parseSellerPrice(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    const upper = raw.toUpperCase();
    const fallbackCurrency = value("buyCurrency") || "SGD";

    const currency =
      upper.includes("SGD") || upper.includes("S$") ? "SGD" :
      upper.includes("AUD") ? "AUD" :
      upper.includes("USD") ? "USD" :
      upper.includes("JPY") || upper.includes("¥") ? "JPY" :
      upper.includes("GBP") || upper.includes("£") ? "GBP" :
      fallbackCurrency;

    const match = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    return { amount: Number(match[0]), currency, raw };
  }

  function calculateBuyCost(render = true) {
    const parsed = parseSellerPrice(value("buyPrice"));

    if (!parsed) {
      if (render) {
        $("buyCostResult").className = "mini-result";
        $("buyCostResult").textContent = "Enter seller asking price. It will convert instantly when you analyze the product.";
      }
      return { summary: "", aud: null, currency: "", amount: null };
    }

    const overrideRate = Number(value("wiseRate"));
    const useWiseOverride = value("rateMode") !== "default" && Number.isFinite(overrideRate) && overrideRate > 0;
    const rate = useWiseOverride ? overrideRate : (fallbackRatesToAud[parsed.currency] || 0);
    const aud = parsed.amount * rate;
    const source = useWiseOverride ? "Wise override rate" : "built-in estimate";
    const summary = `${formatMoney(parsed.amount, parsed.currency)} ≈ ${formatMoney(aud, "AUD")} (${source})`;

    if (render) {
      $("buyCostResult").className = "mini-result good";
      $("buyCostResult").innerHTML = `
        <strong>Seller asking price in AUD</strong><br>
        ${escapeHtml(summary)}<br>
        <small>${useWiseOverride ? "Using the Wise rate you entered." : "Using built-in estimate. For exact Wise accuracy, open Wise and enter its rate as override."}</small>
      `;
    }

    return { summary, aud, currency: parsed.currency, amount: parsed.amount, source };
  }

  function openUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openSoldSearch() {
    openUrl(selectedMarket().sold(encodeURIComponent(buildPhrase())));
  }

  function openGoogleImages() {
    openUrl(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(buildPhrase())}`);
  }

  function openEbayResearch() {
    openUrl("https://www.ebay.com/sh/research");
  }

  function openWiseConversion() {
    const parsed = parseSellerPrice(value("buyPrice"));
    const amount = parsed ? parsed.amount : 1;
    const from = parsed ? parsed.currency : (value("buyCurrency") || "SGD");
    openUrl(`https://wise.com/gb/currency-converter/${from.toLowerCase()}-to-aud-rate?amount=${encodeURIComponent(amount)}`);
  }

  function buildCurrentRecord() {
    const buy = calculateBuyCost(false);
    return {
      product: buildPhrase(),
      condition: value("condition"),
      country: selectedMarket().label,
      buy: value("buyPrice"),
      buyCurrency: buy.currency || value("buyCurrency"),
      buyAud: buy.summary,
      price: value("price"),
      ebayResearch: "Use eBay Product Research for official sell-through rate.",
      url: value("listingUrl"),
      notes: value("notes"),
      date: new Date().toLocaleString()
    };
  }

  function buildLinks(record) {
    const q = encodeURIComponent(record.product);
    const market = selectedMarket();

    let html = `<div class="country-group"><h3>${escapeHtml(market.label)} research links</h3><div class="link-grid">`;
    market.links.forEach(([label, builder]) => {
      const url = builder(q);
      html += `<a class="research-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span>Open ↗</span></a>`;
    });
    html += `</div></div>`;

    html += `<div class="country-group"><h3>eBay Research Tool</h3><div class="link-grid">
      <a class="research-link" href="https://www.ebay.com/sh/research" target="_blank" rel="noopener noreferrer">eBay Product Research<span>Open ↗</span></a>
      <a class="research-link" href="${escapeHtml(market.sold(q))}" target="_blank" rel="noopener noreferrer">eBay Sold Search<span>Open ↗</span></a>
    </div></div>`;

    html += `<div class="country-group"><h3>Review Search</h3><div class="link-grid">
      <a class="research-link" href="https://www.google.com/search?q=${q}+review" target="_blank" rel="noopener noreferrer">Google Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.youtube.com/results?search_query=${q}+review" target="_blank" rel="noopener noreferrer">YouTube Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.google.com/search?q=${q}+reddit+review" target="_blank" rel="noopener noreferrer">Reddit Reviews<span>Open ↗</span></a>
      <a class="research-link" href="https://www.google.com/search?q=${q}+problems+issues" target="_blank" rel="noopener noreferrer">Problems / Issues Search<span>Open ↗</span></a>
    </div></div>`;

    $("links").innerHTML = html;
  }

  function analyzeProduct() {
    try {
      setStatus("Analyzing...");
      calculateBuyCost(true);
      currentRecord = buildCurrentRecord();
      buildLinks(currentRecord);

      $("summary").innerHTML = `
        <strong>${escapeHtml(currentRecord.product)}</strong><br>
        Country: ${escapeHtml(currentRecord.country)}<br>
        Seller ask in AUD: ${escapeHtml(currentRecord.buyAud || "Not calculated")}<br>
        Target price: ${escapeHtml(currentRecord.price || "Not set")} ${escapeHtml(selectedCurrency())}<br><br>
        <strong>eBay sell-through:</strong> Open eBay Product Research and search this product phrase to use eBay’s official sell-through rate.<br><br>
        <small>Tip: eBay Product Research may require you to be logged into your seller account.</small>
      `;

      $("sellThroughResult").innerHTML = `Use <strong>eBay Product Research</strong> for the official sell-through rate. Product phrase: <strong>${escapeHtml(currentRecord.product)}</strong>`;
      setStatus("Analyzed");
    } catch (error) {
      showError(error);
      setStatus("Error");
    }
  }

  function saveRecord() {
    try {
      if (!currentRecord) currentRecord = buildCurrentRecord();
      records.unshift({ ...currentRecord });
      renderRecords();
      setStatus("Saved");
    } catch (error) {
      showError(error);
    }
  }

  function renderRecords() {
    $("recordCount").textContent = records.length;

    if (!records.length) {
      $("records").innerHTML = `<tr><td colspan="10">No saved records yet.</td></tr>`;
      return;
    }

    $("records").innerHTML = records.map((record) => `
      <tr>
        <td>${escapeHtml(record.product)}</td>
        <td>${escapeHtml(record.condition)}</td>
        <td>${escapeHtml(record.country)}</td>
        <td>${escapeHtml(record.buy)}</td>
        <td>${escapeHtml(record.buyAud)}</td>
        <td>${escapeHtml(record.price)}</td>
        <td>${escapeHtml(record.ebayResearch)}</td>
        <td>${record.url ? `<a href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer">Open</a>` : "—"}</td>
        <td>${escapeHtml(record.notes)}</td>
        <td>${escapeHtml(record.date)}</td>
      </tr>
    `).join("");
  }

  function exportCsv() {
    try {
      if (!records.length) saveRecord();

      const headers = ["Product","Condition","Country","Seller Ask","Seller Ask AUD","Target Price","eBay Research","URL","Notes","Date"];
      const rows = records.map((r) => [r.product, r.condition, r.country, r.buy, r.buyAud, r.price, r.ebayResearch, r.url, r.notes, r.date]);
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\n");

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
    ["productPhrase","brand","model","variant","colour","condition","listingUrl","buyPrice","wiseRate","price","notes"].forEach((id) => {
      const element = $(id);
      if (element) element.value = "";
    });

    $("buyCurrency").value = "SGD";
    $("rateMode").value = "wise";
    currentRecord = null;

    $("summary").textContent = "Enter product details and click Analyze Product.";
    $("links").innerHTML = "";
    $("buyCostResult").className = "mini-result";
    $("buyCostResult").textContent = "Enter seller asking price. It will convert instantly when you analyze the product.";
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

  function sendToSheet() {
    const url = value("sheetWebhookUrl") || localStorage.getItem("resaleScoutSheetWebhook");
    if (!url) {
      $("sheetStatus").className = "mini-result warning";
      $("sheetStatus").textContent = "Paste your Google Sheets Web App URL first.";
      return;
    }

    if (!currentRecord) currentRecord = buildCurrentRecord();

    $("sheetStatus").className = "mini-result";
    $("sheetStatus").textContent = "Sending to Google Sheets...";

    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(currentRecord)
    })
      .then(() => {
        $("sheetStatus").className = "mini-result good";
        $("sheetStatus").textContent = "Sent to Google Sheets. Check your sheet for the new row.";
      })
      .catch((error) => {
        showError(error);
        $("sheetStatus").className = "mini-result bad";
        $("sheetStatus").textContent = "Could not send to Google Sheets: " + error.message;
      });
  }

  function bind(id, handler) {
    const element = $(id);
    if (!element) {
      showError(`Missing element: #${id}`);
      return;
    }
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
    bind("openResearchBtn", openEbayResearch);
    bind("openWiseBtn", openWiseConversion);
    bind("saveWebhookBtn", saveWebhook);
    bind("sendSheetBtn", sendToSheet);

    loadWebhook();
    setStatus("Ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
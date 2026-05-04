function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  const headers = ["Date","Product","Condition","Country","Seller Ask","Seller Ask AUD","Target Price","eBay Research","Listing URL","Notes"];

  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  sheet.appendRow([
    data.date || new Date(),
    data.product || "",
    data.condition || "",
    data.country || "",
    data.buy || "",
    data.buyAud || "",
    data.price || "",
    data.ebayResearch || "",
    data.url || "",
    data.notes || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
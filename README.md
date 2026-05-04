# Resale Scout - Analyze Instant Fix

Files are at ZIP root:
- index.html
- styles.css
- app.js
- google-apps-script.js
- README.md

Important fix:
- Removed the fragile async exchange-rate fetch from the Analyze Product path.
- Analyze Product now runs instantly using:
  - Wise override rate if entered
  - built-in estimate if no Wise override is entered
- Added on-screen error reporting.
- Added cache-busting query strings to CSS/JS references.

Wise usage:
If Wise shows `1 SGD = 1.09 AUD`, enter `1.09` in Wise rate override.

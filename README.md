# Resale Scout - Frankfurter Live FX

Files are at ZIP root:
- index.html
- styles.css
- app.js
- google-apps-script.js
- README.md

Changes:
- Currency conversion now uses the free Frankfurter live exchange-rate API.
- No API key required.
- Seller asking price asks for number only.
- Seller asking price currency is selected separately.
- The app converts seller currency into the selected research country currency.
- AUD reference is also shown.
- Manual rate override is still available if the live API fails or you want to match Wise/Google exactly.
- Amazon US links include currency=USD and language=en_US, though Amazon may still override display currency based on account/location/browser settings.

Live endpoint used:
https://api.frankfurter.dev/v1/latest?amount=1&from=SGD&to=USD

Fallback endpoint used:
https://api.frankfurter.app/latest?amount=1&from=SGD&to=USD


## Compact mobile update

- Reduced button size and padding substantially for iPhone.
- Reduced card spacing and vertical gaps.
- Removed most guide/description text from the UI.
- Kept key labels and core actions only.
- Layout is more compact to minimise scrolling.

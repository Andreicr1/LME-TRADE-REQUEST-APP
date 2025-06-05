# LME Trade Request Generator

This repository contains a small web application that helps build standardized text for London Metal Exchange (LME) trade requests. It is a single page built with HTML and Tailwind CSS.
Tailwind is bundled locally as `tailwind.min.css`, so the interface works without a network connection after the first visit.

## Running the app

Because the page registers a service worker, it needs to be served over HTTP. You can use any simple static server. Examples:

```bash
# Using Python
python -m http.server 8000
# or using Node
npx http-server -p 8000
```

If you have installed the dependencies you can also run:

```bash
npm start
```

This uses the bundled http-server to serve the site on port 8000.

After the server starts, open `http://localhost:8000/index.html` in a modern browser.
Make sure to visit the full path to `index.html` (not just `/`) because the service worker only caches that file.

### Input validation

Enter quantities as finite positive numbers. Values of zero or negative amounts
will trigger an error message.

When selecting the price type for Leg 1 you can choose **AVG Inter** to specify an averaging period. Pick a start and end date in the Leg 1 section and the request text will reflect that range.

If one leg uses **Fix** pricing while the other uses **AVG**, a checkbox labeled
"Use AVG PPT Date" appears next to the fixing date field on the fixed leg. When
selected, this option fills that field with the averaging leg's second business
day (its PPT date). Leg&nbsp;2's checkbox is visible when Leg&nbsp;1 is set to
**AVG** and Leg&nbsp;2 is **Fix**. Likewise, Leg&nbsp;1's checkbox appears when
Leg&nbsp;1 is **Fix** and Leg&nbsp;2 is **AVG**.

## Building

No build step is required. The repository only contains static files (`index.html`, `main.js`, `manifest.json` and `service-worker.js`). If you modify the code you simply refresh the browser to see the changes.

## Service worker

`service-worker.js` caches the essential files (`index.html`, `main.js`, `calendar-utils.js`, `solarlunar.min.js`, `tailwind.min.css` and the service worker itself) when the app is installed. This lets the app continue working offline after the first visit.

The worker uses a `CACHE_VERSION` constant to build a cache name (`lme-cache-v<version>`). Increment this value during a release so clients fetch the updated files. The activation step deletes any caches that don't match this name. During installation it also verifies that all core files were cached successfully.

After increasing `CACHE_VERSION`, refresh the site so the new worker can take control and clear the previous cache.

## Holiday data

Holiday dates are stored in `holidays.json`. When the page loads it fetches the
latest data from the [GOV.UK Bank Holidays API](https://www.gov.uk/bank-holidays.json) and merges the result with the local file so the app keeps working offline.

Run the following command whenever you want to refresh `holidays.json`:

```bash
node scripts/update-holidays.js
```

## Prerequisites

- A modern browser that supports service workers.
- Any local HTTP server (Python 3, Node.js, etc.) if you want to run it locally.

## Running tests

Install dependencies once and run the test suite with npm:

```bash
npm install
npm test
```


## License

This project is licensed under the [MIT License](LICENSE).

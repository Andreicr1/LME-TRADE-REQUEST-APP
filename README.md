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

When the **AVGInter** price type is chosen for Leg 1, start and end date inputs become available and their values will be inserted into the generated text. Selecting **Fix** or **Spot** reveals a fixing date field instead.

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

### Linting and formatting

Use the following npm scripts to check code style and automatically format files:

```bash
npm run lint
npm run format
```

ESLint and Prettier are configured to ignore minified assets such as `tailwind.min.css` and `solarlunar.min.js`.

## License

This project is licensed under the [MIT License](LICENSE).

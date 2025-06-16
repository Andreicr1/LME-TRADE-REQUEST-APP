// Update this version when releasing a new build so clients refresh cached files
const CACHE_VERSION = 9;
const CACHE_NAME = `lme-cache-v${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  'index.html',
  'main.js',
  'calendar-utils.js',
  'holidays.json',
  'solarlunar.min.js',
  'tailwind.min.css',
  'custom-styles.css',
  'manifest.json',
  'service-worker.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(FILES_TO_CACHE);
      // Ensure all required files were cached successfully
      const results = await Promise.all(FILES_TO_CACHE.map(f => cache.match(f)));
      if (results.some(r => !r)) {
        throw new Error('Failed to cache required file');
      }
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

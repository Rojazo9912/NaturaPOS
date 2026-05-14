// Natural OS — Service Worker v1.0
// Caching estrategy: Cache First para assets estáticos, Network First para API

const CACHE_NAME = 'natural-os-v1'
const STATIC_ASSETS = [
  '/',
  '/pos',
  '/dashboard',
  '/cash-register',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: pre-cache static assets ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache error:', err)
      })
    })
  )
  self.skipWaiting()
})

// ── Activate: limpiar caches viejos ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estrategia de caché ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls → Network First (sin cache)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })))
    return
  }

  // Static assets → Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback para navegación
        if (request.mode === 'navigate') {
          return caches.match('/') || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
        }
      })
    })
  )
})

// ── Push notifications (para alertas de riesgo) ───────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Natural OS', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'default',
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard')
  )
})

// Natural OS — Service Worker v1.2 (PRO)
// Caching strategy: Cache First for static, Stale-While-Revalidate for JS/CSS, Network First for navigation

const CACHE_NAME = 'natural-os-enterprise-v1.2'
const STATIC_ASSETS = [
  '/',
  '/pos',
  '/dashboard',
  '/cash-register',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: pre-cache critical paths ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  )
  self.skipWaiting()
})

// ── Activate: cleanup old caches ───────────────────────
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

// ── Fetch: Intelligence Strategy ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. API calls & Socket.io → Skip cache
  if (url.pathname.startsWith('/api/') || url.hostname.includes('socket.io')) {
    event.respondWith(fetch(request).catch(() => {
      return new Response(JSON.stringify({ error: 'offline', offline: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }))
    return
  }

  // 2. Navigation (HTML Pages) → Network First, fallback to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      }).catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        
        const posFallback = await caches.match('/pos');
        if (posFallback) return posFallback;

        return new Response(`
          <html>
            <body style="background:#000; color:#22c55e; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
              <div>
                <h1 style="font-size:64px; margin:0;">🌿</h1>
                <h2>Natura POS</h2>
                <p style="color:#666">No hay conexión y esta página no está en caché.</p>
                <button onclick="location.reload()" style="background:#22c55e; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer;">Reintentar</button>
              </div>
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      })
    )
    return
  }

  // 3. Static Assets (Next.js chunks, images, fonts) → Cache First, then update
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return networkResponse
      }).catch(() => null)

      return cached || fetchPromise || new Response(null, { status: 404 })
    })
  )
})

// ── Notifications ─────────────────────────────────────
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

// ── Background Sync (Offline Orders) ───────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders())
  }
})

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('naturalos-offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function syncPendingOrders() {
  try {
    const db = await openOfflineDB()
    const tx = db.transaction('pending-orders', 'readonly')
    const store = tx.objectStore('pending-orders')
    const requests = await new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
    })
    if (!requests || requests.length === 0) return
    for (const record of requests) {
      try {
        const url = record.apiUrl ? `${record.apiUrl}/api/v1/orders` : '/api/v1/orders'
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${record.token}`
          },
          body: JSON.stringify(record.data)
        })
        if (res.ok) {
          const delTx = db.transaction('pending-orders', 'readwrite')
          delTx.objectStore('pending-orders').delete(record.id)
        }
      } catch (err) {
        console.error('[SW] Sync order failed', err)
        throw err 
      }
    }
  } catch (err) {
    console.error('[SW] DB Error syncing orders:', err)
  }
}


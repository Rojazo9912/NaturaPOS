// Natural OS — Service Worker v1.1
// Caching estrategy: Cache First para assets estáticos, Network First para API

const CACHE_NAME = 'natural-os-v1.1'
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

  // HTML / Navegación → Network First (para obtener siempre la versión más reciente)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      }).catch(() => {
        return caches.match(request).then(cached => {
           return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
        })
      })
    )
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
          // Eliminamos de IndexedDB tras sincronización exitosa
          const delTx = db.transaction('pending-orders', 'readwrite')
          delTx.objectStore('pending-orders').delete(record.id)
        } else {
          console.warn('[SW] Sync order non-ok response:', await res.text())
        }
      } catch (err) {
        console.error('[SW] Sync order failed, will retry later', err)
        throw err // Dispara reintento automático del Background Sync
      }
    }
  } catch (err) {
    console.error('[SW] DB Error syncing orders:', err)
  }
}


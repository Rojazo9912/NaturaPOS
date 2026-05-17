export const DB_NAME = 'naturalos-offline'
export const STORE_NAME = 'pending-orders'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this environment'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function savePendingOrder(orderData: any, token: string, apiUrl: string) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add({ data: orderData, token, apiUrl, timestamp: Date.now() })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getPendingOrdersCount(): Promise<number> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return 0
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })
  } catch (err) {
    console.error('Error getting pending orders count:', err)
    return 0
  }
}

export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register('sync-orders')
      console.log('Background Sync registered for sync-orders')
    } catch (err) {
      console.error('Error registering background sync:', err)
    }
  }
}

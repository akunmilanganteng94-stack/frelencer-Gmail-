/**
 * Realtime sync helper across components and browser tabs/windows
 */
type SyncEventType = 'storan' | 'withdrawal' | 'all';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('azgmail_sync_channel');
  }
} catch {
  broadcastChannel = null;
}

export function notifyDataChange(type: SyncEventType = 'all') {
  if (typeof window !== 'undefined') {
    try {
      const payload = { type, timestamp: Date.now() };
      if (broadcastChannel) {
        broadcastChannel.postMessage(payload);
      }
      window.dispatchEvent(new CustomEvent('azgmail_sync_event', { detail: payload }));
      localStorage.setItem('azgmail_last_sync_timestamp', JSON.stringify(payload));
    } catch (e) {
      console.warn('Sync dispatch notice:', e);
    }
  }
}

export function subscribeDataChange(callback: (type: SyncEventType) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    try {
      const detail = (e as CustomEvent)?.detail;
      callback(detail?.type || 'all');
    } catch {}
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'azgmail_last_sync_timestamp' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed?.type || 'all');
      } catch {}
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    try {
      callback(e.data?.type || 'all');
    } catch {}
  };

  window.addEventListener('azgmail_sync_event', handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('azgmail_sync_event', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

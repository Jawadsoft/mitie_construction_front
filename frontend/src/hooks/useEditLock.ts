import { useEffect, useRef, useState } from 'react';

const CHANNEL = 'erp-edit-locks';

type LockMsg =
  | { type: 'claim'; key: string; tabId: string }
  | { type: 'release'; key: string; tabId: string }
  | { type: 'ping'; key: string; tabId: string }
  | { type: 'pong'; key: string; tabId: string };

function tabId() {
  try {
    let id = sessionStorage.getItem('erp.tabId');
    if (!id) {
      id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('erp.tabId', id);
    }
    return id;
  } catch {
    return `tab-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Client-only edit lock via BroadcastChannel.
 * When another tab holds the lock, `conflict` is true.
 */
export function useEditLock(entityType: string, entityId: string | null | undefined, active: boolean) {
  const key = entityId ? `${entityType}:${entityId}` : '';
  const myTab = useRef(tabId());
  const [conflict, setConflict] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!active || !key || typeof BroadcastChannel === 'undefined') {
      setConflict(false);
      return;
    }

    const ch = new BroadcastChannel(CHANNEL);
    channelRef.current = ch;
    let heldElsewhere = false;

    const onMsg = (ev: MessageEvent<LockMsg>) => {
      const msg = ev.data;
      if (!msg || msg.key !== key || msg.tabId === myTab.current) return;
      if (msg.type === 'claim' || msg.type === 'ping' || msg.type === 'pong') {
        heldElsewhere = true;
        setConflict(true);
      }
      if (msg.type === 'release') {
        heldElsewhere = false;
        setConflict(false);
      }
      if (msg.type === 'ping') {
        ch.postMessage({ type: 'pong', key, tabId: myTab.current } satisfies LockMsg);
      }
    };

    ch.addEventListener('message', onMsg);
    ch.postMessage({ type: 'ping', key, tabId: myTab.current } satisfies LockMsg);
    ch.postMessage({ type: 'claim', key, tabId: myTab.current } satisfies LockMsg);

    const onUnload = () => {
      ch.postMessage({ type: 'release', key, tabId: myTab.current } satisfies LockMsg);
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      ch.postMessage({ type: 'release', key, tabId: myTab.current } satisfies LockMsg);
      ch.removeEventListener('message', onMsg);
      ch.close();
      channelRef.current = null;
      if (!heldElsewhere) setConflict(false);
    };
  }, [active, key]);

  return { conflict };
}

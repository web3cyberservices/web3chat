
/**
 * @fileOverview Децентрализованный сетевой слой Waku (v2.0 2026 Edition).
 * Оптимизирован для работы через WSS в защищенных средах.
 */

import type { LightNode } from '@waku/sdk';

let nodeInstance: LightNode | null = null;
let initPromise: Promise<LightNode> | null = null;

const PRODUCTION_NODES = [
  '/dns4/node-01.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAmPLeTwoVYdgZ86idWAtCB88JQM6no8Y2zH7tgJaSShwLS',
  '/dns4/node-01.ac-cn-hongkong-c.waku.org/tcp/443/wss/p2p/16Uiu2HAm6H7D6a8Yt8G1A7k9mD9qE2xZ7L7R8n5j8f9k7G5P2W3',
  '/dns4/node-02.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAm87Z93n6L4vVWhm1jVAbY8YmAn8p7LQq7r4N3AytR4Xv7'
];

export async function initWaku(): Promise<LightNode> {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { createLightNode, Protocols } = await import('@waku/sdk');

      const node = await createLightNode({ 
        bootstrapPeers: PRODUCTION_NODES,
      });

      await node.start();
      
      // Асинхронное ожидание пиров без блокировки инициализации
      node.waitForRemotePeer([Protocols.LightPush, Protocols.Filter, Protocols.Store], 15000)
        .catch(() => console.warn('Waku: Partial protocol connectivity. Retrying in background...'));

      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('Waku 2026 Engine Failure:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function createContentTopic(id: string) {
  return `/reguscan/1/user-${id}/proto`;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  const node = await initWaku();
  const { createEncoder, Protocols } = await import('@waku/sdk');
  
  const contentTopic = createContentTopic(targetId);
  const encoder = createEncoder({ contentTopic });

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const peers = await node.libp2p.getPeers();
      if (peers.length > 0) {
        const result = await node.lightPush.send(encoder, {
          payload: new TextEncoder().encode(encryptedPayload),
          timestamp: new Date()
        });

        if (!result.errors || result.errors.length === 0) return true;
      }
    } catch (e) {
      console.warn(`Retry ${attempt + 1}: Pathfinding to P2P nodes...`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  return false;
}

export async function subscribeToP2P(targetId: string, onMessage: (payload: string) => void) {
  const node = await initWaku();
  const { createDecoder, Protocols } = await import('@waku/sdk');
  
  const contentTopic = createContentTopic(targetId);
  const decoder = createDecoder(contentTopic);

  try {
    const { unsubscribe } = await node.filter.subscribe([decoder], (wakuMessage) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    node.waitForRemotePeer([Protocols.Store], 5000).then(() => {
      node.store.queryWithOrderedCallback([decoder], (msg) => {
        if (msg?.payload) {
          onMessage(new TextDecoder().decode(msg.payload));
        }
        return true;
      }).catch(() => {});
    }).catch(() => {});

    return unsubscribe;
  } catch (e) {
    console.error('P2P Subscription Failed:', e);
    return () => {};
  }
}

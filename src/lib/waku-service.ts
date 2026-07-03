/**
 * @fileOverview Децентрализованный сетевой слой Waku (июнь 2026).
 * Исправлены ошибки типизации и стабильности соединения.
 */

import type { LightNode } from '@waku/sdk';

let nodeInstance: LightNode | null = null;
let initPromise: Promise<LightNode> | null = null;

// Стабильные узлы Waku (июнь 2026)
const BOOTSTRAP_NODES = [
  '/dns4/node-01.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAmPLeTwoVYdgZ86idWAtCB88JQM6no8Y2zH7tgJaSShwLS',
  '/dns4/node-01.ac-cn-hongkong-c.waku.org/tcp/443/wss/p2p/16Uiu2HAmS6NfUtFv4iP9GZc6YyW972p7GjXyK2L4Gz3L'
];

export async function initWaku(): Promise<LightNode> {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { createLightNode, Protocols } = await import('@waku/sdk');

      const node = await createLightNode({ 
        bootstrapPeers: BOOTSTRAP_NODES,
        defaultBootstrap: true
      });

      await node.start();
      
      // Блокирующее ожидание пиров
      const typedNode = node as any;
      if (typeof typedNode.waitForRemotePeer === 'function') {
        try {
          await typedNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
          console.log('Waku: Connected and Ready');
        } catch (e) {
          console.warn('Waku: Initial peer search timed out, continuing...');
        }
      }

      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('Waku initialization error:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function createContentTopic(id: string) {
  // Унифицированный топик для 1-to-1 и Групп
  return `/web3chat/2/u-${id.slice(0, 12)}/proto`;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const { createEncoder } = await import('@waku/sdk');
    
    const contentTopic = createContentTopic(targetId);
    const encoder = createEncoder({ contentTopic });

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
    });

    const res = result as any;
    return !res?.errors || (Array.isArray(res.errors) && res.errors.length === 0);
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(ids: string[], onMessage: (payload: string, topicId: string) => void) {
  try {
    const node = await initWaku();
    const { createDecoder } = await import('@waku/sdk');
    
    const decoders = ids.map(id => createDecoder(createContentTopic(id)));

    // Подписка на несколько топиков одновременно
    const subscription = await node.filter.subscribe(decoders, (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        // Извлекаем ID из топика для понимания, куда пришло сообщение
        const topic = wakuMessage.contentTopic;
        const topicId = ids.find(id => topic.includes(id.slice(0, 12))) || ids[0];
        onMessage(text, topicId);
      }
    });

    return () => {
      const sub = subscription as any;
      if (typeof sub === 'function') sub();
      else if (sub?.unsubscribe) sub.unsubscribe();
    };
  } catch (e) {
    console.error('P2P Subscription Error:', e);
    return () => {};
  }
}
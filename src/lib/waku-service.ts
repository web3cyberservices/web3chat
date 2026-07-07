
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview Сервис P2P коммуникации через сеть Waku.
 * Стандарт июля 2026. Использует основную децентрализованную сеть.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/2/u-${safeId}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing Light Node on Production Mesh (Port 443)...');
      // Подключение к боевой сети Waku через защищенные WebSocket-соединения
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      
      console.log('[Waku] Searching for peers...');
      try {
        // Приведение к any для обхода строгой типизации методов ожидания в SDK 2026 года
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to global P2P mesh!');
      } catch (peerError) {
        console.warn('[Waku] Mesh discovery timeout. Node will continue background synchronization.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('[Waku] Critical initialization failure:', error);
      throw error;
    }
  })();

  return initPromise;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    
    // Приведение к any для обхода обязательного routingInfo в некоторых версиях SDK
    const encoder = createEncoder({ contentTopic: topic, ephemeral: true } as any);

    console.log(`[Waku] Broadcasting secure packet to topic: ${topic}`);
    
    // Явная передача contentTopic в объекте сообщения для гарантированной маршрутизации
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
      contentTopic: topic
    } as any);

    if ((result as any)?.errors?.length) {
      console.error('[Waku] Delivery rejected by network:', (result as any).errors);
      return false;
    }
    
    console.log('[Waku] Message accepted by P2P network.');
    return true;
  } catch (e) {
    console.error('[Waku] Transmission error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    
    // Передаем пустой объект конфигурации вторым аргументом для соответствия сигнатуре SDK
    const decoder = createDecoder(topic, {} as any);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        console.log('[Waku] Incoming packet decoded.');
        onMessage(decoded);
      }
    };

    const trySubscribe = async (): Promise<any> => {
      try {
        const sub = await node.filter.subscribe([decoder], callback);
        console.log(`[Waku] Filter established for topic: ${topic}`);
        return sub;
      } catch (e: any) {
        console.warn('[Waku] Mesh filtering not ready. Retrying in 5s...');
        return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
      }
    };

    return await trySubscribe();
  } catch (e) {
    console.error('[Waku] Subscription fatal error:', e);
    return null;
  }
}

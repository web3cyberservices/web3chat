
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Создает уникальный топик контента для пользователя.
 */
export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

/**
 * Инициализирует узел Waku и подключает его к основной сети.
 */
export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node on Production Network...');
      // Подключение к основной сети Waku
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Searching for peers...');
      
      try {
        // Ожидание подключения к пирам с поддержкой необходимых протоколов
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to mesh!');
      } catch (peerError) {
        console.warn('[Waku] Initial peer wait timeout. Running in background discovery mode.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('[Waku] Init failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Отправляет зашифрованное сообщение через P2P сеть.
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    
    // Используем ephemeral сообщения для прямой доставки без хранения в истории
    const encoder = createEncoder({ contentTopic: topic, ephemeral: true } as any);

    console.log(`[Waku] Broadcasting message to topic: ${topic}`);
    
    // Явно передаем contentTopic в объект сообщения
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
      contentTopic: topic
    } as any);

    if ((result as any)?.errors?.length) {
      console.error('[Waku] Message rejected by network peers:', (result as any).errors);
      return false;
    }
    
    console.log('[Waku] Message successfully delivered to network!');
    return true;
  } catch (e) {
    console.error('[Waku] P2P Send Error:', e);
    return false;
  }
}

/**
 * Подписывается на входящие сообщения для текущего пользователя.
 */
export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    // Добавляем пустой объект настроек для совместимости с типами SDK
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
        console.log(`[Waku] Successfully subscribed to incoming topic: ${topic}`);
        return sub;
      } catch (e: any) {
        console.warn('[Waku] Filter service not ready. Retrying subscription in 5s...');
        return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
      }
    };

    return await trySubscribe();
  } catch (e) {
    console.error('[Waku] Subscription initialization failed:', e);
    return null;
  }
}

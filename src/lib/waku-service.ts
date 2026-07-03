import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node...');
      // In July 2026, we connect to the main Waku network via port 443 (defaultBootstrap)
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Waiting for network...');
      
      try {
        // Casting to any to bypass TS check for waitForRemotePeer which is often internal
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to mesh!');
      } catch (peerError) {
        console.warn('[Waku] Initial peer wait timeout. Running in background.');
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

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    
    // Ephemeral messages are better for direct chats (no history needed)
    const encoder = createEncoder({ contentTopic: topic, ephemeral: true });

    console.log(`[Waku] Sending message to: ${topic}`);
    // Explicitly pass contentTopic inside the message object as well to satisfy protocol requirements
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
      contentTopic: topic
    } as any);

    if ((result as any)?.errors?.length) {
      console.error('[Waku] Send rejected:', (result as any).errors);
      return false;
    }
    
    console.log('[Waku] Message delivered to network!');
    return true;
  } catch (e) {
    console.error('[Waku] Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    const decoder = createDecoder(topic);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        onMessage(new TextDecoder().decode(wakuMessage.payload));
      }
    };

    const trySubscribe = async (): Promise<any> => {
      try {
        const sub = await node.filter.subscribe([decoder], callback);
        console.log(`[Waku] Successfully subscribed to ${topic}!`);
        return sub;
      } catch (e: any) {
        console.warn('[Waku] Network not ready yet. Retrying subscription in 5s...');
        return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
      }
    };

    return await trySubscribe();
  } catch (e) {
    console.error('[Waku] Subscription Failed:', e);
    return null;
  }
}

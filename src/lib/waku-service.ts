
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
      console.log('[Waku] Starting Light Node on Production Network...');
      // Connecting to the main Waku network using default bootstrap nodes
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Searching for peers...');
      
      try {
        // Casting to any to avoid TypeScript errors during build in strict environments
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

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    
    // Using ephemeral messages for direct P2P (no history storage required)
    const encoder = createEncoder({ contentTopic: topic, ephemeral: true });

    console.log(`[Waku] Broadcasting message to topic: ${topic}`);
    
    // Explicitly pass contentTopic in the message object as required by some Waku node configurations
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

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    const decoder = createDecoder(topic);

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

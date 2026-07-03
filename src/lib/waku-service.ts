import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

const APP_NAME = 'web3chat';

export function createContentTopic(id: string) {
  return `/${APP_NAME}/1/u-${(id || 'default').slice(0, 10)}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node...');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Waiting for remote peers...');
      
      // Support for various SDK versions with any cast
      const newNode = node as any;
      if (newNode.waitForRemotePeer) {
        await newNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
      } else if (newNode.waitForConnectedPeer) {
        await newNode.waitForConnectedPeer();
      }
      
      console.log('[Waku] P2P Network is ACTIVE.');
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
    console.log(`[Waku] Attempting to send to topic: ${topic}`);
    
    // Explicitly cast to avoid routingInfo errors in strict builds
    const encoder = (createEncoder as any)({ contentTopic: topic, ephemeral: true });

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    const res = result as any;
    if (res?.errors && res.errors.length > 0) {
      console.error('[Waku] Send rejected by peer:', res.errors);
      return false;
    }
    
    console.log('[Waku] Message broadcasted successfully!');
    return true;
  } catch (e) {
    console.error('[Waku] Send Exception:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    // Explicitly cast to avoid argument count errors
    const decoder = (createDecoder as any)(topic);
    console.log(`[Waku] Subscribing to topic: ${topic}`);

    const subscription = await node.filter.subscribe([decoder], (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        console.log('[Waku] New payload received from network!');
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    return subscription;
  } catch (e) {
    console.error('[Waku] Subscription Failed:', e);
    return null;
  }
}
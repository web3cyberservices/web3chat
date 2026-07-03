import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

const APP_NAME = 'web3chat';

export function createContentTopic(id: string) {
  if (!id) id = 'default';
  return `/${APP_NAME}/1/u-${id.slice(0, 10)}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node...');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Searching for peers...');
      
      // Support for various SDK versions with any cast
      const newNode = node as any;
      if (newNode.waitForRemotePeer) {
        await newNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
      } else if (newNode.waitForConnectedPeer) {
        await newNode.waitForConnectedPeer();
      }
      
      console.log('[Waku] Peers found! P2P Network is ACTIVE.');
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
    const contentTopic = createContentTopic(targetId);
    
    // Create encoder with ephemeral flag as we don't use Store protocol
    const encoder = createEncoder({ contentTopic, ephemeral: true } as any);

    // Explicitly pass contentTopic inside the message object to fix routing errors in some Waku versions
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
      contentTopic: contentTopic
    } as any);

    const res = result as any;
    return !res?.errors || res.errors.length === 0;
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    // Compatibility wrapper for createDecoder
    const decoder = (createDecoder as any)(topic, {} as any);

    const subscription = await node.filter.subscribe([decoder], (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    return (() => {
      if (typeof subscription === 'function') {
        (subscription as any)();
      } else if ((subscription as any)?.unsubscribe) {
        (subscription as any).unsubscribe();
      }
    });
  } catch (e) {
    console.error('P2P Subscription Failed:', e);
    return () => {};
  }
}
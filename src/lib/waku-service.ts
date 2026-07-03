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
      
      // Use any to bypass TS checks for waitForRemotePeer in different SDK versions
      await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter]);
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
    
    // Strict encoder creation with any cast to avoid routingInfo errors
    const encoder = createEncoder({ contentTopic, ephemeral: true } as any);

    // Sending payload
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    const res = result as any;
    return !res?.errors || res.errors.length === 0;
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myIds: string[], onMessage: (payload: string, topicId: string) => void) {
  try {
    const node = await initWaku();
    // Using any cast to support different SDK signatures for createDecoder
    const decoders = myIds.map(id => (createDecoder as any)(createContentTopic(id)));

    const subscription = await node.filter.subscribe(decoders, (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        const topic = wakuMessage.contentTopic;
        const matchedId = myIds.find(id => createContentTopic(id) === topic) || myIds[0];
        onMessage(text, matchedId);
      }
    });

    return () => {
      if (typeof subscription === 'function') {
        (subscription as any)();
      } else if ((subscription as any)?.unsubscribe) {
        (subscription as any).unsubscribe();
      }
    };
  } catch (e) {
    console.error('P2P Subscription Failed:', e);
    return () => {};
  }
}
/**
 * @fileOverview Decentralized P2P transport powered by Waku SDK.
 * Enables internet-wide communication using a global mesh of nodes.
 */

import { 
  createLightNode, 
  Protocols, 
  createEncoder, 
  createDecoder,
  type LightNode
} from '@waku/sdk';

const APP_NAME = 'web3-chat-v1';

let node: LightNode | null = null;
let nodePromise: Promise<LightNode> | null = null;

/**
 * Initializes a Waku Light Node using default bootstrap peers.
 */
export async function initWaku(): Promise<LightNode> {
  if (node) return node;
  if (nodePromise) return nodePromise;

  nodePromise = (async () => {
    try {
      const newNode = await createLightNode({ 
        defaultBootstrap: true 
      });

      await newNode.start();
      
      // Wait for connections to peers that support message routing.
      // Use defensive checks for various Waku SDK API versions.
      const nodeAsAny = newNode as any;
      if (typeof nodeAsAny.waitForRemotePeer === 'function') {
        await nodeAsAny.waitForRemotePeer([Protocols.LightPush, Protocols.Filter]);
      } else if (typeof nodeAsAny.waitForConnectedPeer === 'function') {
        await nodeAsAny.waitForConnectedPeer([Protocols.LightPush, Protocols.Filter]);
      } else {
        console.warn('Waku: No standard peer wait method found. Proceeding with best effort.');
      }
      
      node = newNode;
      return newNode;
    } catch (error) {
      console.error('Waku initialization failed:', error);
      nodePromise = null;
      throw error;
    }
  })();

  return nodePromise;
}

/**
 * Sends an encrypted message to a target ID (User or Group).
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const waku = await initWaku();
    const contentTopic = `/${APP_NAME}/1/message-${targetId}/proto`;
    const encoder = createEncoder({ contentTopic });

    const payload = new TextEncoder().encode(encryptedPayload);
    
    const result = await waku.lightPush.send(encoder, { payload });
    
    if (result.errors && result.errors.length > 0) {
      console.error('Waku send errors:', result.errors);
      return false;
    }

    return true;
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

/**
 * Subscribes to messages for a list of IDs.
 */
export async function subscribeToP2P(
  myIds: string[], 
  onMessage: (payload: string, topicId: string) => void
) {
  try {
    const waku = await initWaku();
    
    const decoders = myIds.map(id => 
      createDecoder(`/${APP_NAME}/1/message-${id}/proto`)
    );

    const unsubscribe = await waku.filter.subscribe(
      decoders,
      (wakuMessage) => {
        if (!wakuMessage.payload) return;
        
        try {
          const payload = new TextDecoder().decode(wakuMessage.payload);
          // Extract the target ID from the topic path
          const topicParts = wakuMessage.contentTopic.split('message-');
          if (topicParts.length > 1) {
            const topicId = topicParts[1].split('/')[0];
            onMessage(payload, topicId);
          }
        } catch (e) {
          console.error('Error decoding Waku message:', e);
        }
      }
    );

    return unsubscribe;
  } catch (e) {
    console.error('Subscription error:', e);
    return () => {};
  }
}
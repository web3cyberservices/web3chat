/**
 * Утилиты для аппаратного шифрования, работы с Seed-фразами и оптимизированного Proof-of-Work.
 * Оптимизировано для работы с бинарными данными в браузере.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

const WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident",
  "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
  "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford",
  "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol",
  "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amaze"
];

export function generateMnemonic(): string[] {
  const words: string[] = [];
  const randomValues = new Uint32Array(12);
  window.crypto.getRandomValues(randomValues);
  for (let i = 0; i < 12; i++) {
    const randomIndex = randomValues[i] % WORDLIST.length;
    words.push(WORDLIST[randomIndex]);
  }
  return words;
}

export async function mnemonicToId(mnemonic: string[]): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is unavailable. Use HTTPS.');
  }

  const text = mnemonic.join(' ');
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex.slice(0, 40);
}

export async function performPoW(payload: string): Promise<{ nonce: number; hash: string }> {
  const target = '000'; // Умеренная сложность
  const encoder = new TextEncoder();
  let nonce = 0;

  while (true) {
    const data = encoder.encode(payload + nonce);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex.startsWith(target)) {
      return { nonce, hash: hashHex };
    }
    nonce++;
    if (nonce % 500 === 0) await new Promise(r => setTimeout(r, 0));
  }
}

async function getEncryptionKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password.padEnd(32, '0').slice(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('web3-chat-salt-v3'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Надежная конвертация бинарных данных в Base64
function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptMessage(text: string, secret: string): Promise<string> {
  try {
    const key = await getEncryptionKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      enc.encode(text)
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return bufferToBase64(result);
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

export async function decryptMessage(encryptedBase64: string, secret: string): Promise<string> {
  try {
    const key = await getEncryptionKey(secret);
    const bytes = base64ToBuffer(encryptedBase64);
    
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return '[Error: Decryption failed]';
  }
}

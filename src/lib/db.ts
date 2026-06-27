import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'web3-chat-secure-v1';
const DB_VERSION = 3;

export interface UserCredential {
  type: 'identity';
  id: string;
  createdAt: number;
}

export interface EncryptedMessage {
  id: number;
  chatId: string;
  payload: string; // Зашифрованный JSON
  sender: string;
  senderId?: string;
  time: string;
}

export interface ChatSession {
  id: string; // Vortex ID собеседника или Group ID
  name: string;
  type: 'private' | 'group';
  members?: string[]; // Для групп
  lastMsg?: string;
  time?: string;
  avatar?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('user_credentials')) {
          db.createObjectStore('user_credentials', { keyPath: 'type' });
        }
        if (!db.objectStoreNames.contains('encrypted_messages')) {
          const store = db.createObjectStore('encrypted_messages', { keyPath: 'id' });
          store.createIndex('chatId', 'chatId');
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveIdentity(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.put('user_credentials', {
    type: 'identity',
    id,
    createdAt: Date.now()
  });
}

export async function getIdentity(): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  const cred = await db.get('user_credentials', 'identity');
  return cred ? cred.id : null;
}

export async function saveLocalMessage(msg: EncryptedMessage) {
  const db = await getDB();
  if (!db) return;
  await db.put('encrypted_messages', msg);
}

export async function deleteLocalMessage(id: number) {
  const db = await getDB();
  if (!db) return;
  await db.delete('encrypted_messages', id);
}

export async function getLocalMessages(chatId: string): Promise<EncryptedMessage[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('encrypted_messages', 'chatId', chatId);
}

export async function saveChat(chat: ChatSession) {
  const db = await getDB();
  if (!db) return;
  await db.put('chats', chat);
}

export async function getChats(): Promise<ChatSession[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('chats');
}

export async function getChat(id: string): Promise<ChatSession | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get('chats', id);
}

export async function clearAllData() {
  const db = await getDB();
  if (!db) return;
  await db.clear('user_credentials');
  await db.clear('encrypted_messages');
  await db.clear('chats');
}

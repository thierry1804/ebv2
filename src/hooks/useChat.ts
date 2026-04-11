import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CHAT_CONNECT_TIMEOUT_MS = 25_000;
const TYPING_TIMEOUT_MS = 2_000;
/** Intervalle de polling de secours quand le Realtime est potentiellement mort */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Nombre max de tentatives d'envoi avant erreur */
const MAX_SEND_RETRIES = 2;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`${label} — délai dépassé (${ms / 1000}s). Vérifiez le réseau et Supabase.`));
    }, ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        window.clearTimeout(t);
        reject(e);
      });
  });
}

/** Insert avec retry : tente l'insert, et en cas d'échec réseau, réessaie une fois */
async function resilientInsert(
  table: string,
  row: Record<string, unknown>,
  retries = MAX_SEND_RETRIES
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { error } = await supabase.from(table).insert(row);
    if (!error) return;
    // Erreur réseau / timeout → réessayer
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    throw new Error(error.message || 'Échec de l\'envoi du message');
  }
}

// ─── Types ───────────────────────────────────────────────────────────

export interface ChatConversation {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  customer_name: string;
  customer_email: string | null;
  status: 'open' | 'closed';
  unread_admin: number;
  unread_customer: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_role: 'customer' | 'admin' | 'system';
  content: string;
  created_at: string;
}

// ─── Constantes de validation ────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;
const MIN_SEND_INTERVAL_MS = 1000; // 1 message par seconde max côté client

// ─── Session locale (visiteur non authentifié) ───────────────────────

function getSessionToken(): string {
  const KEY = 'chat_session_token';
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}

function getMyConversationIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem('chat_conversation_ids') || '[]');
  } catch {
    return [];
  }
}

function saveConversationId(id: string) {
  const ids = getMyConversationIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem('chat_conversation_ids', JSON.stringify(ids));
  }
}

/** Nettoie le texte : trim, supprime les balises HTML, limite la longueur */
function sanitizeText(text: string, maxLength: number): string {
  return text
    .replace(/<[^>]*>/g, '') // supprime les balises HTML
    .trim()
    .slice(0, maxLength);
}

// ─── Hook : conversation côté client (page produit) ─────────────────

export function useChatClient(productId: string | null) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sessionToken = useRef(getSessionToken()).current;

  // Chercher une conversation existante pour ce produit (via RPC sécurisée)
  const findExisting = useCallback(async () => {
    if (!productId) return null;
    if (!isSupabaseConfigured) return null;

    const { data } = await supabase.rpc('get_my_chat_conversation', {
      p_session_token: sessionToken,
      p_product_id: productId,
    });

    return data && data.length > 0 ? (data[0] as ChatConversation) : null;
  }, [productId, sessionToken]);

  // Créer une nouvelle conversation
  const startConversation = useCallback(
    async (product: { id: string; name: string; image: string | null }, customerName: string, customerEmail?: string) => {
      if (!isSupabaseConfigured) {
        throw new Error(
          'Le chat est indisponible : variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes ou invalides.'
        );
      }

      setIsLoading(true);
      try {
        const run = async (): Promise<ChatConversation> => {
          const safeName = sanitizeText(customerName, MAX_NAME_LENGTH);
          const safeEmail = customerEmail ? sanitizeText(customerEmail, 254) : null;
          if (!safeName) throw new Error('Veuillez saisir un nom valide.');

          // RPC SECURITY DEFINER : crée la conversation OU retourne celle existante,
          // valide les données et insère le message système en une seule transaction.
          const { data, error } = await supabase.rpc('create_chat_conversation', {
            p_session_token: sessionToken,
            p_product_id: product.id,
            p_product_name: sanitizeText(product.name, 200),
            p_product_image: product.image,
            p_customer_name: safeName,
            p_customer_email: safeEmail,
          });

          if (error) throw new Error(error.message || 'Impossible de démarrer la discussion.');
          if (!data) throw new Error('Réponse inattendue du serveur.');

          const conv = (Array.isArray(data) ? data[0] : data) as ChatConversation;
          setConversation(conv);
          saveConversationId(conv.id);
          return conv;
        };

        return await withTimeout(run(), CHAT_CONNECT_TIMEOUT_MS, 'Connexion au chat');
      } finally {
        setIsLoading(false);
      }
    },
    [findExisting]
  );

  // Charger les messages d'une conversation (via RPC sécurisée)
  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase.rpc('get_my_chat_messages', {
      p_session_token: sessionToken,
      p_conversation_id: conversationId,
    });

    if (data) setMessages(data as ChatMessage[]);
  }, [sessionToken]);

  // Throttle côté client
  const lastSendRef = useRef(0);

  // Envoyer un message (avec validation + retry + fallback reload)
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation) return;

      // Validation
      const safeContent = sanitizeText(content, MAX_MESSAGE_LENGTH);
      if (!safeContent) throw new Error('Le message est vide.');

      // Throttle client-side
      const now = Date.now();
      if (now - lastSendRef.current < MIN_SEND_INTERVAL_MS) {
        throw new Error('Veuillez patienter avant d\'envoyer un autre message.');
      }
      lastSendRef.current = now;

      // RPC SECURITY DEFINER : valide le session_token + le contenu, applique rate limit
      let lastErr: Error | null = null;
      for (let attempt = 0; attempt <= MAX_SEND_RETRIES; attempt++) {
        const { error } = await supabase.rpc('send_chat_message_customer', {
          p_session_token: sessionToken,
          p_conversation_id: conversation.id,
          p_content: safeContent,
        });
        if (!error) {
          lastErr = null;
          break;
        }
        lastErr = new Error(error.message || 'Échec de l\'envoi du message');
        if (attempt < MAX_SEND_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      if (lastErr) throw lastErr;

      // Recharger via RPC au cas où le Realtime est mort
      loadMessages(conversation.id);
    },
    [conversation, loadMessages, sessionToken]
  );

  // Réinitialiser le compteur de non-lus côté client (via RPC sécurisée)
  const markRead = useCallback(async () => {
    if (!conversation) return;
    await supabase.rpc('mark_chat_read_customer', {
      p_session_token: sessionToken,
      p_conversation_id: conversation.id,
    });
  }, [conversation, sessionToken]);

  // Realtime : écouter les nouveaux messages
  useEffect(() => {
    if (!conversation) return;

    loadMessages(conversation.id);

    const channel = supabase
      .channel(`chat-messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, loadMessages]);

  // Au montage, essayer de retrouver une conversation existante
  useEffect(() => {
    if (!productId || !isSupabaseConfigured) return;
    findExisting().then((existing) => {
      if (existing) {
        setConversation(existing);
      }
    });
  }, [productId, findExisting]);

  // Heartbeat : polling de secours pour rattraper les messages si le Realtime est mort
  useEffect(() => {
    if (!conversation || !isOpen) return;
    const interval = setInterval(() => {
      loadMessages(conversation.id);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversation, isOpen, loadMessages]);

  return {
    conversation,
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    startConversation,
    sendMessage,
    markRead,
  };
}

// ─── Hook : conversations côté admin ─────────────────────────────────

export function useChatAdmin() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  // Attendre que la session auth soit active
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (!cancelled) setSessionReady(true);
        return;
      }
      // Pas encore de session → écouter le changement d'auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (s && !cancelled) {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });
      return () => { subscription.unsubscribe(); };
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) setConversations(data as ChatConversation[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    loadConversations();

    // Écouter les changements sur les conversations (nouveau message, nouvelle conversation)
    const channel = supabase
      .channel('admin-chat-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionReady, loadConversations]);

  return { conversations, isLoading, reload: loadConversations };
}

// ─── Hook : messages admin pour une conversation ─────────────────────

export function useChatAdminMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as ChatMessage[]);
    setIsLoading(false);
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;
      await resilientInsert('chat_messages', {
        conversation_id: conversationId,
        sender_role: 'admin',
        content,
      });
      // Recharger via REST au cas où le Realtime est mort
      loadMessages();
    },
    [conversationId, loadMessages]
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await supabase
      .from('chat_conversations')
      .update({ unread_admin: 0 })
      .eq('id', conversationId);
  }, [conversationId]);

  const closeConversation = useCallback(async () => {
    if (!conversationId) return;
    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);
  }, [conversationId]);

  const reopenConversation = useCallback(async () => {
    if (!conversationId) return;
    await supabase
      .from('chat_conversations')
      .update({ status: 'open' })
      .eq('id', conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    loadMessages();

    const channel = supabase
      .channel(`admin-chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  // Heartbeat : polling de secours
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(() => {
      loadMessages();
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId, loadMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    markRead,
    closeConversation,
    reopenConversation,
  };
}

// ─── Hook : indicateur "en train d'écrire" (Broadcast) ──────────────

export function useChatTyping(conversationId: string | null, myRole: 'customer' | 'admin') {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat-typing-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.role !== myRole) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_TIMEOUT_MS + 500);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.role !== myRole) {
          setIsOtherTyping(false);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, myRole]);

  /** Appeler à chaque frappe dans l'input (throttled automatiquement) */
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_TIMEOUT_MS) return;
    lastSentRef.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { role: myRole },
    });
  }, [myRole]);

  /** Appeler quand le message est envoyé ou que l'input est vidé */
  const sendStopTyping = useCallback(() => {
    lastSentRef.current = 0;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { role: myRole },
    });
  }, [myRole]);

  return { isOtherTyping, sendTyping, sendStopTyping };
}

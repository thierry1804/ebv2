import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  XCircle,
  RotateCcw,
  ExternalLink,
  Clock,
  User,
  Mail,
  Check,
  CheckCheck,
  Bell,
  BellOff,
  BellRing,
} from 'lucide-react';
import { useChatAdmin, useChatAdminMessages, useChatTyping, ChatConversation } from '../../hooks/useChat';
import { usePushNotifications, PushStatus } from '../../hooks/usePushNotifications';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { normalizeImageApiUrl } from '../../lib/imageApi';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function AdminChat() {
  const { conversations, isLoading } = useChatAdmin();
  const { adminUser } = useAdminAuth();
  const pushNotifications = usePushNotifications(adminUser?.email ?? null);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.customer_name.toLowerCase().includes(q) ||
        c.product_name.toLowerCase().includes(q) ||
        (c.customer_email && c.customer_email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Quand une conversation est sélectionnée, mettre à jour l'objet depuis la liste fraîche
  useEffect(() => {
    if (selected) {
      const fresh = conversations.find((c) => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [conversations]);

  return (
    <div className="flex h-[calc(100vh-130px)] min-h-0 gap-4">
      {/* Liste des conversations */}
      <div
        className={cn(
          'flex w-full flex-col rounded-xl border border-gray-200 bg-white lg:w-96 lg:shrink-0',
          selected ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* En-tête liste */}
        <div className="shrink-0 border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-text-dark flex items-center gap-2">
              <MessageCircle size={20} className="text-secondary" />
              Discussions
            </h2>
            <div className="flex items-center gap-2">
              <PushToggleButton push={pushNotifications} />
              <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-1.5">
            {(['open', 'closed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-secondary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {f === 'open' ? 'Ouvertes' : f === 'closed' ? 'Fermées' : 'Toutes'}
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-gray-400">
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-400">
              <MessageCircle size={32} />
              <p className="text-sm">Aucune discussion</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                  selected?.id === conv.id && 'bg-secondary/5'
                )}
              >
                {conv.product_image ? (
                  <img
                    src={normalizeImageApiUrl(conv.product_image)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <MessageCircle size={16} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {conv.customer_name}
                    </p>
                    {conv.unread_admin > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {conv.unread_admin}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">{conv.product_name}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {new Date(conv.updated_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {conv.status === 'closed' && (
                      <span className="ml-1.5 text-orange-500">fermée</span>
                    )}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Zone de conversation */}
      {selected ? (
        <ConversationPanel
          conversation={selected}
          onBack={() => setSelected(null)}
        />
      ) : (
        <div className="hidden flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white lg:flex">
          <div className="text-center text-gray-400">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sélectionnez une discussion</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panneau de conversation ────────────────────────────────────────

function ConversationPanel({
  conversation,
  onBack,
}: {
  conversation: ChatConversation;
  onBack: () => void;
}) {
  const { messages, isLoading, sendMessage, markRead, closeConversation, reopenConversation } =
    useChatAdminMessages(conversation.id);
  const { isOtherTyping, sendTyping, sendStopTyping } = useChatTyping(conversation.id, 'admin');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    markRead();
    inputRef.current?.focus();
  }, [conversation.id, markRead]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    sendStopTyping();
    try {
      await sendMessage(text);
    } catch {
      setInputValue(text);
      toast.error('Message non envoyé. Vérifiez votre connexion et réessayez.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = async () => {
    await closeConversation();
    toast.success('Discussion fermée');
  };

  const handleReopen = async () => {
    await reopenConversation();
    toast.success('Discussion rouverte');
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* En-tête conversation */}
      <div className="shrink-0 border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
          >
            <ArrowLeft size={20} />
          </button>

          {conversation.product_image && (
            <img
              src={normalizeImageApiUrl(conversation.product_image)}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <User size={14} className="shrink-0 text-gray-400" />
              <p className="truncate text-sm font-semibold text-gray-900">
                {conversation.customer_name}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="truncate">{conversation.product_name}</span>
              {conversation.customer_email && (
                <span className="flex items-center gap-1">
                  <Mail size={10} />
                  {conversation.customer_email}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`/produit/${conversation.product_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-secondary"
              title="Voir le produit"
            >
              <ExternalLink size={16} />
            </a>
            {conversation.status === 'open' ? (
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Fermer la discussion"
              >
                <XCircle size={16} />
              </button>
            ) : (
              <button
                onClick={handleReopen}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                title="Rouvrir la discussion"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-gray-400">
            Chargement...
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <AdminMessageBubble
                key={msg.id}
                message={msg}
                isLast={msg.sender_role === 'admin' && i === messages.length - 1}
                isRead={
                  msg.sender_role === 'admin' &&
                  i === messages.length - 1 &&
                  conversation.unread_customer === 0
                }
              />
            ))}
            {isOtherTyping && <AdminTypingIndicator name={conversation.customer_name} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Saisie */}
      {conversation.status === 'open' ? (
        <div className="shrink-0 border-t bg-white p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.trim()) sendTyping();
                else sendStopTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Répondre..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-white transition-colors hover:bg-secondary/90 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t bg-orange-50 p-3 text-center text-sm text-orange-600">
          Cette discussion est fermée.{' '}
          <button onClick={handleReopen} className="font-semibold underline hover:no-underline">
            Rouvrir
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bulle message admin ────────────────────────────────────────────

function AdminMessageBubble({
  message,
  isLast,
  isRead,
}: {
  message: { sender_role: string; content: string; created_at: string };
  isLast?: boolean;
  isRead?: boolean;
}) {
  const isAdmin = message.sender_role === 'admin';
  const isSystem = message.sender_role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          <Clock size={10} />
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2',
          isAdmin
            ? 'rounded-br-md bg-secondary text-white'
            : 'rounded-bl-md bg-white text-gray-800 shadow-sm border border-gray-100'
        )}
      >
        {!isAdmin && (
          <p className="mb-0.5 text-[10px] font-semibold text-primary">Client</p>
        )}
        {isAdmin && (
          <p className="mb-0.5 text-[10px] font-semibold text-white/70">Vous</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isAdmin ? 'justify-end text-white/60' : 'text-gray-400'
          )}
        >
          <span>{time}</span>
          {isAdmin && isLast && (
            isRead ? (
              <CheckCheck size={12} className="text-blue-300" />
            ) : (
              <Check size={12} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Indicateur "en train d'écrire" ─────────────────────────────────

function AdminTypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 shadow-sm border border-gray-100">
        <p className="mb-0.5 text-[10px] font-semibold text-primary">{name}</p>
        <div className="flex items-center gap-1 py-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Bouton notifications push ──────────────────────────────────────

function PushToggleButton({ push }: { push: { status: PushStatus; subscribe: () => Promise<void>; unsubscribe: () => Promise<void> } }) {
  const [busy, setBusy] = useState(false);

  if (push.status === 'loading') return null;

  if (push.status === 'unsupported') {
    return (
      <span title="Notifications push non supportées par ce navigateur" className="text-gray-300">
        <BellOff size={18} />
      </span>
    );
  }

  if (push.status === 'denied') {
    return (
      <span
        title="Notifications bloquées. Autorisez-les dans les paramètres du navigateur."
        className="cursor-help text-red-400"
      >
        <BellOff size={18} />
      </span>
    );
  }

  const isSubscribed = push.status === 'subscribed';

  const handleClick = async () => {
    setBusy(true);
    try {
      if (isSubscribed) {
        await push.unsubscribe();
        toast.success('Notifications désactivées');
      } else {
        await push.subscribe();
        toast.success('Notifications activées ! Vous recevrez une alerte à chaque nouveau message.');
      }
    } catch {
      toast.error('Impossible de modifier les notifications');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={isSubscribed ? 'Désactiver les notifications push' : 'Activer les notifications push'}
      className={cn(
        'rounded-lg p-1.5 transition-colors',
        isSubscribed
          ? 'text-secondary hover:bg-secondary/10'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
        busy && 'opacity-50'
      )}
    >
      {isSubscribed ? <BellRing size={18} /> : <Bell size={18} />}
    </button>
  );
}

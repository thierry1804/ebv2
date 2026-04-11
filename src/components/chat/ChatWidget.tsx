import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Minimize2, Check, CheckCheck } from 'lucide-react';
import { useChatClient, useChatTyping, ChatMessage } from '../../hooks/useChat';
import { normalizeImageApiUrl } from '../../lib/imageApi';
import { cn } from '../../utils/cn';

interface ChatWidgetProps {
  productId: string;
  productName: string;
  productImage: string | null;
}

export function ChatWidget({ productId, productName, productImage }: ChatWidgetProps) {
  const {
    conversation,
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    startConversation,
    sendMessage,
    markRead,
  } = useChatClient(productId);

  const { isOtherTyping, sendTyping, sendStopTyping } = useChatTyping(
    conversation?.id ?? null,
    'customer'
  );

  const MAX_MSG = 5000;
  const MAX_NAME = 100;

  const [inputValue, setInputValue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showForm, setShowForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer comme lu quand le widget est ouvert
  useEffect(() => {
    if (isOpen && conversation) {
      markRead();
    }
  }, [isOpen, conversation, markRead]);

  // Si une conversation existe déjà, passer directement au chat
  useEffect(() => {
    if (conversation) {
      setShowForm(false);
    }
  }, [conversation]);

  const handleStartChat = async () => {
    if (!customerName.trim()) return;
    try {
      await startConversation(
        {
          id: productId,
          name: productName,
          image: productImage ? normalizeImageApiUrl(productImage) : null,
        },
        customerName.trim(),
        customerEmail.trim() || undefined
      );
      setShowForm(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Impossible de démarrer la discussion.';
      toast.error(msg);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    sendStopTyping();
    try {
      await sendMessage(text);
    } catch {
      // Restaurer le message dans l'input pour que l'utilisateur puisse réessayer
      setInputValue(text);
      toast.error('Message non envoyé. Vérifiez votre connexion et réessayez.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showForm) {
        handleStartChat();
      } else {
        handleSend();
      }
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
          }}
          aria-label="Ouvrir le chat"
        >
          <MessageCircle size={26} />
          {conversation && conversation.unread_customer > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {conversation.unread_customer}
            </span>
          )}
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex h-[min(500px,70dvh)] w-full max-w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0 sm:h-[500px] sm:w-[360px]">
          {/* En-tête */}
          <div className="flex shrink-0 items-center gap-3 bg-secondary px-4 py-3 text-white">
            {productImage && (
              <img
                src={normalizeImageApiUrl(productImage)}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{productName}</p>
              <p className="text-xs text-white/70">Discussion en direct</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 transition-colors hover:bg-white/20"
              aria-label="Réduire le chat"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Formulaire d'identification OU messages */}
          {showForm ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <MessageCircle size={40} className="text-secondary/30" />
              <p className="text-center text-sm text-gray-600">
                Une question sur ce produit ?<br />
                Discutez avec nous en direct !
              </p>
              <input
                type="text"
                placeholder="Votre nom *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value.slice(0, MAX_NAME))}
                onKeyDown={handleKeyDown}
                maxLength={MAX_NAME}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                autoFocus
              />
              <input
                type="email"
                placeholder="Votre email (optionnel)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <button
                onClick={handleStartChat}
                disabled={!customerName.trim() || isLoading}
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
              >
                {isLoading ? 'Connexion...' : 'Démarrer la discussion'}
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Contexte produit */}
                {productImage && (
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-gray-50 p-3 text-center">
                      <img
                        src={normalizeImageApiUrl(productImage)}
                        alt={productName}
                        className="mx-auto mb-2 h-20 w-20 rounded-lg object-cover"
                      />
                      <p className="text-xs font-medium text-gray-700">{productName}</p>
                      <a
                        href={`/produit/${productId}`}
                        className="text-xs text-secondary hover:underline"
                      >
                        Voir le produit
                      </a>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLast={msg.sender_role === 'customer' && i === messages.length - 1}
                    isRead={
                      msg.sender_role === 'customer' &&
                      i === messages.length - 1 &&
                      conversation!.unread_admin === 0
                    }
                  />
                ))}
                {isOtherTyping && <TypingIndicator label="ByValsue" />}
                <div ref={messagesEndRef} />
              </div>

              {/* Saisie */}
              <div className="shrink-0 border-t border-gray-100 p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value.slice(0, MAX_MSG));
                      if (e.target.value.trim()) sendTyping();
                      else sendStopTyping();
                    }}
                    onKeyDown={handleKeyDown}
                    maxLength={MAX_MSG}
                    placeholder="Votre message..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-white transition-colors hover:bg-secondary/90 disabled:opacity-40"
                    aria-label="Envoyer"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── Bulle de message ────────────────────────────────────────────────

function MessageBubble({
  message,
  isLast,
  isRead,
}: {
  message: ChatMessage;
  isLast?: boolean;
  isRead?: boolean;
}) {
  const isCustomer = message.sender_role === 'customer';
  const isSystem = message.sender_role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
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
    <div className={cn('flex', isCustomer ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2',
          isCustomer
            ? 'rounded-br-md bg-secondary text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-800'
        )}
      >
        {!isCustomer && (
          <p className="mb-0.5 text-[10px] font-semibold text-secondary">ByValsue</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isCustomer ? 'justify-end text-white/60' : 'text-gray-400'
          )}
        >
          <span>{time}</span>
          {isCustomer && isLast && (
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

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2">
        <p className="mb-0.5 text-[10px] font-semibold text-secondary">{label}</p>
        <div className="flex items-center gap-1 py-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

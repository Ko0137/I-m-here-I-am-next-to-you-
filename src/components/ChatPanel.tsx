import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage, User } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: User | null;
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUser,
  onSendMessage,
  isOpen,
  onClose
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        twa.HapticFeedback.impactOccurred('light');
      }
    } catch (e) {}

    onSendMessage(text);
    setText('');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 md:w-96 bg-stone-950/95 border-l border-stone-800/80 backdrop-blur-2xl flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-stone-100">Чат комнаты</h3>
            <p className="text-[10px] text-stone-400">Общайтесь во время просмотра</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400/40" />
            <p className="text-xs font-medium">Чат пока пуст</p>
            <p className="text-[11px] text-stone-500">Напишите первое сообщение или оставьте реакцию на фильм!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === currentUser?.id;
            const isSystem = m.userId === 'system';

            if (isSystem) {
              return (
                <div key={m.id} className="text-center my-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-stone-900 text-stone-400 text-[10px] font-medium border border-stone-800">
                    {m.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] text-stone-400 font-semibold mb-1 ml-1">
                    {m.userName}
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    isMe
                      ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10'
                      : 'bg-stone-900 text-stone-200 border border-stone-800 rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed break-words">{m.text}</p>
                </div>
                <span className="text-[9px] text-stone-500 mt-1 mx-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-stone-800/80 bg-stone-950 flex items-center space-x-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите сообщение..."
          className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/80 transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

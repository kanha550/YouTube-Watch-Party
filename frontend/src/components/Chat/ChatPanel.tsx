import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import type { ChatMessage, Participant } from '../../types';
import { RoleBadge } from '../common/RoleBadge';

interface ChatPanelProps {
  messages: ChatMessage[];
  self: Participant | null;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  self,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInputText('');
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3>Party Chat</h3>
        </div>
      </div>

      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <Sparkles className="w-6 h-6 text-slate-500 mb-2" />
            <p>Welcome to the watch party!</p>
            <span>Say hi or react to the video below.</span>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="system-chat-message">
                  <span>{msg.text}</span>
                </div>
              );
            }

            const isSelf = msg.userId === self?.id;

            return (
              <div key={msg.id} className={`chat-bubble-wrap ${isSelf ? 'self-wrap' : ''}`}>
                <div className="chat-bubble-header">
                  <span className="chat-sender-name">{msg.username}</span>
                  <RoleBadge role={msg.role} size="sm" />
                </div>
                <div className={`chat-bubble ${isSelf ? 'self-bubble' : ''}`}>
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis */}
      <div className="quick-emojis-row">
        {['🍿', '🔥', '😂', '👏', '❤️', '😱'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            className="emoji-btn"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          placeholder="Send a message..."
          value={inputText}
          maxLength={500}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" disabled={!inputText.trim()} className="send-btn" aria-label="Send message">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};


import React from 'react';
import { Bot, User as UserIcon, Copy } from 'lucide-react';
import { ChatMessage as Message } from '../../../types'; // Use the Message type from types.ts

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    // Add toast notification for copy success if desired
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-xl shadow ${
          isUser 
            ? 'bg-teal-500 text-white rounded-br-none' 
            : 'bg-slate-700 text-slate-200 rounded-bl-none'
        }`}
      >
        <div className="flex items-start mb-1">
          {isUser ? (
            <UserIcon className="h-5 w-5 text-teal-100 mr-2 flex-shrink-0" />
          ) : (
            <Bot className="h-5 w-5 text-teal-400 mr-2 flex-shrink-0" />
          )}
          <span className="font-semibold text-sm">{isUser ? 'You' : 'AI Assistant'}</span>
        </div>
        {/* Basic markdown-like formatting for newlines */}
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <div className="text-xs mt-2 flex justify-between items-center">
          <span className={isUser ? "text-teal-200" : "text-slate-400"}>
            {message.timestamp.toLocaleTimeString()}
          </span>
          {!isUser && (
            <button 
              onClick={handleCopy} 
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-teal-400 p-1 -m-1"
              title="Copy response"
            >
              <Copy size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

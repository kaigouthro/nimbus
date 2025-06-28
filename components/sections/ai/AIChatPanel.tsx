
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Copy } from 'lucide-react';
import { sendMessageToGemini, convertChatHistoryToGeminiHistory } from '../../../services/GeminiService';
import { ChatMessage as Message } from '../../../types';
import Button from '../../common/Button';
import Input from '../../common/Input';
import ChatMessage from './ChatMessage'; // Renamed for clarity
import Spinner from '../../common/Spinner';

const AIChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    // Initial greeting message from AI
    setMessages([
      { 
        id: 'initial-ai-greeting', 
        sender: 'ai', 
        text: "Hello! I'm NimbusEasyStack AI, your OpenStack assistant. How can I help you today? You can ask me about OpenStack concepts, how to manage resources, or for troubleshooting tips.", 
        timestamp: new Date() 
      }
    ]);
  }, []);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const geminiHistory = convertChatHistoryToGeminiHistory(messages.slice(-10)); // Send last 10 messages for context
      const aiResponseText = await sendMessageToGemini(input, geminiHistory);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Sorry, I encountered an error trying to respond. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] bg-slate-800 rounded-lg shadow-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700 flex items-center">
        <Bot className="h-6 w-6 text-teal-400 mr-3" />
        <h2 className="text-xl font-semibold text-slate-100">AI Cloud Assistant</h2>
      </div>

      <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-center py-2">
            <Spinner text="AI is thinking..." size="sm" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-2">
          <Input
            id="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask about OpenStack or type a command..."
            className="flex-grow"
            disabled={isLoading}
          />
          <Button onClick={handleSend} isLoading={isLoading} disabled={isLoading || input.trim() === ''} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Send size={18} />
            <span className="ml-2 hidden sm:inline">Send</span>
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Example: "What is a floating IP?" or "How do I launch an instance?"
        </p>
      </div>
    </div>
  );
};

export default AIChatPanel;

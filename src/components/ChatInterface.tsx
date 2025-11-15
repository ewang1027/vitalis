import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types/wardops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInterfaceProps {
  initialMessages: ChatMessage[];
}

const quickPrompts = [
  "What equipment is missing in Room 101?",
  "Which rentals can we return right now?",
  "What are the highest priority tasks this shift?",
];

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: "I'm processing your request. In a production environment, I would analyze real-time ward data and provide specific recommendations.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 800);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Intro Block */}
        {messages.length === 0 && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-light))' }}>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'hsl(var(--accent-green))' }}>
                <Sparkles className="h-4 w-4" style={{ color: 'hsl(var(--text-white))' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-dark))' }}>
                  I monitor your ward's equipment and room readiness. Ask me what matters right now.
                </p>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-gray))' }}>Try asking:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-2.5 py-1 text-[11px] rounded-full transition-smooth border"
                        style={{
                          backgroundColor: 'hsl(var(--bg-tertiary))',
                          color: 'hsl(var(--text-gray))',
                          borderColor: 'hsl(var(--border-light))'
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2.5 ${
                message.role === 'user'
                  ? 'border border-white/20'
                  : 'border border-border-light'
              }`}
              style={{
                backgroundColor: message.role === 'user'
                  ? 'hsl(var(--bg-user-msg))'
                  : 'hsl(var(--bg-ai-msg))'
              }}
            >
              <div className="text-xs whitespace-pre-wrap" style={{ color: message.role === 'user' ? 'hsl(var(--text-white))' : 'hsl(var(--text-dark))' }}>
                {message.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-3">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border-2" style={{
          backgroundColor: 'hsl(var(--bg-tertiary))',
          borderColor: 'hsl(var(--accent-green))'
        }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-1 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
            style={{
              color: 'hsl(var(--text-dark))'
            }}
          />
          <Button
            onClick={() => handleSend()}
            className="h-7 w-7 p-0 rounded-full flex-shrink-0"
            style={{
              backgroundColor: 'hsl(var(--accent-green))',
              color: 'hsl(var(--text-white))'
            }}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

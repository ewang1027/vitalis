import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/types/wardops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { sendChatMessage, createSystemPrompt } from '@/lib/openrouter';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  initialMessages: any[];
  userId?: string;
  roomId?: string | null;
  contextData?: {
    rooms?: any[];
    equipment?: any[];
    tasks?: any[];
    patients?: any[];
  };
}

const quickPrompts = [
  "What equipment is missing in Room 101?",
  "Which rentals can we return right now?",
  "What are the highest priority tasks this shift?",
];

export function ChatInterface({ initialMessages, userId, roomId, contextData }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update messages when initialMessages changes
  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  // Save message to Supabase
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId || null,
          room_id: roomId || null,
          role,
          content,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message to database');
      return null;
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    setIsLoading(true);
    setInput('');

    try {
      // Save user message to database
      const userMessageData = await saveMessage('user', messageText);

      // Add user message to UI immediately
      const userMessage = {
        id: userMessageData?.id || `temp-${Date.now()}`,
        role: 'user',
        content: messageText,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Prepare message history for OpenRouter
      const messageHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Add system prompt with context
      const systemPrompt = createSystemPrompt(contextData);
      const apiMessages = [systemPrompt, ...messageHistory, { role: 'user' as const, content: messageText }];

      // Get AI response from OpenRouter
      const aiResponse = await sendChatMessage(apiMessages);

      // Save AI response to database
      const aiMessageData = await saveMessage('assistant', aiResponse);

      // Add AI message to UI
      const aiMessage = {
        id: aiMessageData?.id || `temp-ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to get AI response');

      // Add error message to UI
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Quick Prompts - Always Visible */}
      <div className="flex-shrink-0 p-3 pb-0">
        <div className="rounded-lg p-2.5 border" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-light))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'hsl(var(--accent-green))' }} />
            <p className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-gray))' }}>Quick prompts:</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 text-[11px] rounded-full transition-all border hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'hsl(var(--bg-white))',
                  color: 'hsl(var(--text-dark))',
                  borderColor: 'hsl(var(--border-light))'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Intro Message - Only when no messages */}
        {messages.length === 0 && (
          <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-light))' }}>
            <p className="text-xs text-center" style={{ color: 'hsl(var(--text-gray))' }}>
              👋 I monitor your ward's equipment and room readiness. Ask me what matters right now!
            </p>
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

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-2.5 border border-border-light" style={{ backgroundColor: 'hsl(var(--bg-ai-msg))' }}>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'hsl(var(--accent-green))' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-gray))' }}>Vitalis is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
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
            disabled={isLoading || !input.trim()}
            className="h-7 w-7 p-0 rounded-full flex-shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: 'hsl(var(--accent-green))',
              color: 'hsl(var(--text-white))'
            }}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

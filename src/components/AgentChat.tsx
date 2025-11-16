import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { runAgent, type AgentMessage, type StreamUpdate } from '@/services/agentOrchestrator';
import { useAgentVisualization } from '@/hooks/useAgentVisualization';
import { cn } from '@/lib/utils';

/**
 * Agent-powered chat component with streaming and visualization support
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
  }>;
  visualizationTriggered?: boolean;
}

interface ProgressUpdate {
  type: 'progress' | 'tool_call' | 'tool_result';
  content: string;
  timestamp: Date;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: "👋 Hello! I'm your AI hospital assistant. I can help you with:\n\n• Getting information about rooms, patients, and equipment\n• Checking in new patients\n• Creating tasks (food delivery, cleaning, transfers, etc.)\n• Managing patient care and assignments\n\nJust ask me anything, like:\n- \"What's happening in room 102?\"\n- \"Check in a new patient\"\n- \"Send bedsheets to room 101\"\n- \"Show me the hospital overview\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AgentMessage[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { triggerVisualization } = useAgentVisualization();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentProgress]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setCurrentProgress([]);

    try {
      const response = await runAgent(
        userMessage.content,
        conversationHistory,
        (update: StreamUpdate) => {
          // Handle progress updates
          if (update.type === 'progress' || update.type === 'tool_call' || update.type === 'tool_result') {
            setCurrentProgress((prev) => [
              ...prev,
              {
                type: update.type,
                content: update.content,
                timestamp: new Date(),
              },
            ]);
          }
        }
      );

      // Clear progress
      setCurrentProgress([]);

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        toolCalls: response.toolResults?.map((tr) => ({
          name: tr.toolName,
          args: tr.toolArgs,
          result: tr.result,
        })),
        visualizationTriggered: response.requiresVisualization,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation history
      setConversationHistory(response.conversationHistory);

      // Trigger visualization if needed
      if (response.requiresVisualization && response.visualizationData) {
        await triggerVisualization({
          taskType: response.visualizationData.taskType,
          sourceRoomId: response.visualizationData.sourceRoomId,
          targetRoomId: response.visualizationData.targetRoomId,
          taskId: response.visualizationData.taskId,
        });
      }
    } catch (error: any) {
      console.error('Agent error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-semibold text-white">AI Hospital Assistant</h3>
          <Badge variant="outline" className="ml-auto">
            Powered by Claude
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-slate-800 text-white'
                )}
              >
                {/* Message content */}
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                {/* Tool calls indicator */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">Actions performed:</div>
                    {message.toolCalls.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs text-slate-300 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="font-mono">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Visualization indicator */}
                {message.visualizationTriggered && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Visualization triggered on 3D map</span>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-1 text-[10px] opacity-50">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Progress updates */}
          {isProcessing && currentProgress.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-slate-800/50 border border-slate-700">
                <div className="space-y-1">
                  {currentProgress.map((progress, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                      {progress.type === 'progress' && (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                      )}
                      {progress.type === 'tool_call' && (
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500" />
                      )}
                      {progress.type === 'tool_result' && (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      )}
                      <span>{progress.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isProcessing && currentProgress.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything... (e.g., 'What's in room 102?' or 'Check in a patient')"
            className="min-h-[60px] max-h-[120px] resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className="h-[60px] w-[60px] bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput("What's the hospital status?")}
            disabled={isProcessing}
            className="text-xs"
          >
            Hospital Overview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Check in a new patient')}
            disabled={isProcessing}
            className="text-xs"
          >
            Check In Patient
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Send bedsheets to room 101')}
            disabled={isProcessing}
            className="text-xs"
          >
            Request Bedsheets
          </Button>
        </div>
      </div>
    </div>
  );
}

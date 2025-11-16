import { useState, useCallback } from 'react';
import { runAgent, type AgentMessage, type StreamUpdate } from '@/services/agentOrchestrator';
import { useAgentVisualization } from './useAgentVisualization';

/**
 * Hook for integrating agent workflow into existing components
 * Provides simplified interface for running the multimodal agentic workflow
 */

export interface AgentProgressUpdate {
  type: 'progress' | 'tool_call' | 'tool_result' | 'message' | 'complete';
  content: string;
  data?: any;
}

export interface AgentWorkflowResult {
  success: boolean;
  message: string;
  error?: string;
  toolsExecuted?: string[];
  visualizationTriggered?: boolean;
}

export function useAgentWorkflow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AgentMessage[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<AgentProgressUpdate[]>([]);
  const { triggerVisualization } = useAgentVisualization();

  /**
   * Process a user message through the agent workflow
   */
  const processMessage = useCallback(
    async (
      userMessage: string,
      onProgress?: (update: AgentProgressUpdate) => void
    ): Promise<AgentWorkflowResult> => {
      setIsProcessing(true);
      setProgressUpdates([]);

      try {
        const result = await runAgent(
          userMessage,
          conversationHistory,
          (update: StreamUpdate) => {
            const progressUpdate: AgentProgressUpdate = {
              type: update.type,
              content: update.content,
              data: update.data,
            };

            setProgressUpdates((prev) => [...prev, progressUpdate]);
            onProgress?.(progressUpdate);
          }
        );

        // Update conversation history
        setConversationHistory(result.conversationHistory);

        // Trigger visualization if needed
        if (result.requiresVisualization && result.visualizationData) {
          await triggerVisualization({
            taskType: result.visualizationData.taskType,
            sourceRoomId: result.visualizationData.sourceRoomId,
            targetRoomId: result.visualizationData.targetRoomId,
            taskId: result.visualizationData.taskId,
          });
        }

        return {
          success: true,
          message: result.message,
          toolsExecuted: result.toolResults?.map((tr) => tr.toolName) || [],
          visualizationTriggered: result.requiresVisualization,
        };
      } catch (error: any) {
        console.error('Agent workflow error:', error);
        return {
          success: false,
          message: 'Failed to process request',
          error: error.message,
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [conversationHistory, triggerVisualization]
  );

  /**
   * Reset conversation history
   */
  const resetConversation = useCallback(() => {
    setConversationHistory([]);
    setProgressUpdates([]);
  }, []);

  /**
   * Clear progress updates
   */
  const clearProgress = useCallback(() => {
    setProgressUpdates([]);
  }, []);

  return {
    processMessage,
    resetConversation,
    clearProgress,
    isProcessing,
    progressUpdates,
    conversationHistory,
  };
}

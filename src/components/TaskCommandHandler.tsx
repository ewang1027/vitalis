import { useState } from 'react';
import { parseTaskCommand, getExampleCommands } from '../services/taskCommandParser';
import { useTaskSubscription } from '../hooks/useTaskSubscription';
import { TASK_CONFIGS } from '../types/visualTasks';

interface TaskCommandHandlerProps {
  availableRoomIds: string[];
  onTaskCreated?: (taskId: string) => void;
  onError?: (error: string) => void;
}

export function TaskCommandHandler({ availableRoomIds, onTaskCreated, onError }: TaskCommandHandlerProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const { createTask } = useTaskSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!command.trim()) return;

    setIsProcessing(true);

    try {
      // Parse the command using AI/regex
      const parsed = await parseTaskCommand(command, availableRoomIds);

      if (!parsed) {
        throw new Error('Could not understand command. Please try again or check the examples.');
      }

      // Create the task
      const taskConfig = TASK_CONFIGS[parsed.type];
      const task = await createTask({
        type: parsed.type,
        title: `${taskConfig.icon} ${parsed.type.replace('_', ' ')}`,
        description: parsed.description,
        targetRoomId: parsed.targetRoomId,
        sourceRoomId: parsed.sourceRoomId,
        status: 'pending',
        priority: parsed.priority,
        estimatedDuration: taskConfig.defaultDuration,
      });

      // Clear input and notify success
      setCommand('');
      onTaskCreated?.(task.id);
    } catch (error) {
      console.error('Error creating task:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsProcessing(false);
    }
  };

  const examples = getExampleCommands();

  return (
    <div style={{
      padding: '16px',
      background: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      borderRadius: '0 0 8px 8px'
    }}>
      <form onSubmit={handleSubmit} style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a task command (e.g., 'send food to room 101')..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />
          <button
            type="submit"
            disabled={isProcessing || !command.trim()}
            style={{
              padding: '10px 20px',
              background: isProcessing || !command.trim() ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isProcessing || !command.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isProcessing ? '⏳ Creating...' : '✨ Create Task'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setShowExamples(!showExamples)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '4px 0',
            textDecoration: 'underline',
          }}
        >
          {showExamples ? 'Hide Examples' : 'Show Examples'}
        </button>
      </div>

      {showExamples && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'white',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
            Example Commands:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#6b7280' }}>
            {examples.map((example, i) => (
              <li
                key={i}
                onClick={() => setCommand(example)}
                style={{
                  marginBottom: '4px',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                {example}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function TaskCommandInput({ availableRoomIds, onTaskCreated, onError }: TaskCommandHandlerProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { createTask } = useTaskSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!command.trim()) return;

    setIsProcessing(true);

    try {
      const parsed = await parseTaskCommand(command, availableRoomIds);

      if (!parsed) {
        throw new Error('Could not understand command. Try: "send food to room 101"');
      }

      const taskConfig = TASK_CONFIGS[parsed.type];
      const task = await createTask({
        type: parsed.type,
        title: `${taskConfig.icon} ${parsed.type.replace('_', ' ')}`,
        description: parsed.description,
        targetRoomId: parsed.targetRoomId,
        sourceRoomId: parsed.sourceRoomId,
        status: 'pending',
        priority: parsed.priority,
        estimatedDuration: taskConfig.defaultDuration,
      });

      setCommand('');
      onTaskCreated?.(task.id);
    } catch (error) {
      console.error('Error creating task:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Quick task: 'food to room 101'..."
        disabled={isProcessing}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '12px',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={isProcessing || !command.trim()}
        style={{
          padding: '8px 16px',
          background: isProcessing || !command.trim() ? '#d1d5db' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: isProcessing || !command.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {isProcessing ? '...' : '➕'}
      </button>
    </form>
  );
}

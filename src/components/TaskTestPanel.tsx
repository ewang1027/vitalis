import { useState } from 'react';
import { useTaskSubscription } from '../hooks/useTaskSubscription';
import { VisualTaskType, TASK_CONFIGS } from '../types/visualTasks';

interface TaskTestPanelProps {
  availableRoomIds: string[];
}

export function TaskTestPanel({ availableRoomIds }: TaskTestPanelProps) {
  const { activeTasks, createTask, updateTaskStatus, isConnected } = useTaskSubscription();
  const [selectedType, setSelectedType] = useState<VisualTaskType>('food_delivery');
  const [selectedRoom, setSelectedRoom] = useState<string>(availableRoomIds[0] || '');
  const [sourceRoom, setSourceRoom] = useState<string>(availableRoomIds[1] || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const handleCreateTask = async () => {
    if (!selectedRoom) {
      alert('Please select a target room');
      return;
    }

    const taskConfig = TASK_CONFIGS[selectedType];

    try {
      await createTask({
        type: selectedType,
        title: `${taskConfig.icon} ${selectedType.replace(/_/g, ' ')}`,
        description: `Test task for ${selectedRoom}`,
        targetRoomId: selectedRoom,
        sourceRoomId: taskConfig.requiresSourceRoom ? sourceRoom : undefined,
        status: 'pending',
        priority,
        estimatedDuration: taskConfig.defaultDuration,
      });

      console.log('Task created successfully!');
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task: ' + (error as Error).message);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'in_progress');
      console.log('Task started:', taskId);
    } catch (error) {
      console.error('Failed to start task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'completed');
      console.log('Task completed:', taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const taskTypes = Object.keys(TASK_CONFIGS) as VisualTaskType[];

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      width: '320px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(8px)',
      borderRadius: '10px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '2px solid #e5e7eb',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
    }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Task Test Panel
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
            }}></div>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
          Active Tasks: {activeTasks.length}
        </div>
      </div>

      {/* Create Task Form */}
      <div style={{
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>
          Create Test Task
        </h4>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
            Task Type:
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as VisualTaskType)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '11px',
              background: 'white',
            }}
          >
            {taskTypes.map((type) => (
              <option key={type} value={type}>
                {TASK_CONFIGS[type].icon} {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
            Target Room:
          </label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '11px',
              background: 'white',
            }}
          >
            {availableRoomIds.map((roomId) => (
              <option key={roomId} value={roomId}>
                {roomId}
              </option>
            ))}
          </select>
        </div>

        {TASK_CONFIGS[selectedType].requiresSourceRoom && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Source Room:
            </label>
            <select
              value={sourceRoom}
              onChange={(e) => setSourceRoom(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '11px',
                background: 'white',
              }}
            >
              {availableRoomIds.map((roomId) => (
                <option key={roomId} value={roomId}>
                  {roomId}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
            Priority:
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '11px',
              background: 'white',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <button
          onClick={handleCreateTask}
          style={{
            width: '100%',
            padding: '8px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Create Task
        </button>
      </div>

      {/* Active Tasks List */}
      <div>
        <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>
          Active Tasks
        </h4>

        {activeTasks.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
            No active tasks
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: '10px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>
                      → {task.targetRoomId}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px 8px',
                    background: TASK_CONFIGS[task.type].color + '20',
                    color: TASK_CONFIGS[task.type].color,
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: '600',
                  }}>
                    {task.status}
                  </div>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <div style={{
                    height: '4px',
                    background: '#e5e7eb',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      background: TASK_CONFIGS[task.type].color,
                      width: `${task.progress}%`,
                      transition: 'width 0.3s',
                    }}></div>
                  </div>
                  <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                    {Math.round(task.progress)}%
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Start
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

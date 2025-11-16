import { useState, useEffect } from 'react';
import { useTaskSubscription } from '../hooks/useTaskSubscription';
import { supabase } from '../lib/supabase';
import { TASK_CONFIGS } from '../types/visualTasks';

export function TaskDebugPanel() {
  const { activeTasks, isConnected, createTask } = useTaskSubscription();
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([]);
  const [allTasks, setAllTasks] = useState<Record<string, unknown>[]>([]);
  const [testResult, setTestResult] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch rooms to see actual room IDs
    const fetchRooms = async () => {
      const { data, error } = await supabase.from('rooms').select('*');
      if (data) setRooms(data);
      if (error) console.error('Error fetching rooms:', error);
    };

    // Fetch all tasks to see what's in the database
    const fetchAllTasks = async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      if (data) setAllTasks(data);
      if (error) console.error('Error fetching tasks:', error);
    };

    fetchRooms();
    fetchAllTasks();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchRooms();
      fetchAllTasks();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTestTaskCreation = async () => {
    try {
      // Get first room ID
      if (rooms.length === 0) {
        setTestResult('Error: No rooms found in database');
        return;
      }

      const firstRoom = rooms[0];
      setTestResult(`Creating test task for room: ${firstRoom.id} (${firstRoom.room_name || firstRoom.room_number})`);

      const result = await createTask({
        type: 'food_delivery',
        title: '🍽️ Test Food Delivery',
        description: 'Debug test task',
        targetRoomId: firstRoom.id,
        status: 'pending',
        priority: 'medium',
        estimatedDuration: 30,
      });

      setTestResult(`Success! Task created with ID: ${result.id}. Check the 3D map for visualization.`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult(`Error: ${errorMessage}`);
      console.error('Test task creation error:', error);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        🐛 Debug Panel
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        background: 'white',
        border: '2px solid #ef4444',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 9999,
        overflow: 'auto',
        fontSize: '11px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
          🐛 Task Visualization Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Connection Status */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Real-time Connection:</div>
        <div style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
          {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </div>

      {/* Active Tasks */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Active Tasks (from subscription):</div>
        <div style={{ color: '#1f2937' }}>
          {activeTasks.length === 0 ? (
            <span style={{ color: '#6b7280' }}>No active tasks</span>
          ) : (
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {activeTasks.map((task) => (
                <li key={task.id} style={{ marginBottom: '4px' }}>
                  {task.title} → {task.targetRoomId} ({task.status}, {task.progress.toFixed(0)}%)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Database Tasks */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          All Tasks in Database ({allTasks.length}):
        </div>
        <div style={{ maxHeight: '120px', overflow: 'auto', fontSize: '10px' }}>
          {allTasks.length === 0 ? (
            <span style={{ color: '#6b7280' }}>No tasks in database</span>
          ) : (
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {allTasks.map((task) => (
                <li key={task.id} style={{ marginBottom: '2px' }}>
                  {task.title} - Room: {task.room_id || 'NULL'} - Status: {task.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Available Rooms */}
      <div style={{ marginBottom: '12px', padding: '8px', background: '#f3f4f6', borderRadius: '6px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          Available Rooms ({rooms.length}):
        </div>
        <div style={{ maxHeight: '100px', overflow: 'auto', fontSize: '10px' }}>
          {rooms.length === 0 ? (
            <span style={{ color: '#ef4444' }}>⚠️ No rooms found!</span>
          ) : (
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {rooms.slice(0, 10).map((room) => (
                <li key={room.id}>
                  ID: {room.id} - Name: {room.room_name || room.room_number || 'N/A'}
                </li>
              ))}
              {rooms.length > 10 && <li>... and {rooms.length - 10} more</li>}
            </ul>
          )}
        </div>
      </div>

      {/* Test Task Creation */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={handleTestTaskCreation}
          style={{
            width: '100%',
            padding: '10px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          🧪 Create Test Task
        </button>
        {testResult && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: testResult.includes('Error') ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${testResult.includes('Error') ? '#fecaca' : '#bbf7d0'}`,
              borderRadius: '6px',
              fontSize: '10px',
              color: testResult.includes('Error') ? '#991b1b' : '#166534',
            }}
          >
            {testResult}
          </div>
        )}
      </div>

      {/* Diagnostic Info */}
      <div style={{ padding: '8px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#92400e' }}>
          💡 Troubleshooting:
        </div>
        <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#78350f', fontSize: '10px' }}>
          <li>Check if subscription is connected (green)</li>
          <li>Verify rooms exist in database</li>
          <li>Click "Create Test Task" to test pipeline</li>
          <li>Check browser console for errors</li>
          <li>Ensure task room_id matches actual room ID</li>
        </ul>
      </div>
    </div>
  );
}

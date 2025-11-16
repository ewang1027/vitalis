import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WardMap } from './WardMap';
import { RoomDetails } from './RoomDetails';
import { TaskQueue } from './TaskQueue';
import { NotificationPanel } from './NotificationPanel';
import { PatientVitalsDashboard } from './PatientVitalsDashboard';
import { PatientStatusBar } from './PatientStatusBar';
import { Asset, RoomReadiness, Task } from '@/types/wardops';
import { Notification } from '@/types/notifications';
import { Button } from './ui/button';

interface RightSidebarProps {
  activeTab: string | null;
  assets: Asset[];
  roomReadiness: RoomReadiness[];
  tasks: Task[];
  notifications: Notification[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onAssetSelect: (assetId: string) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDismiss: (taskId: string) => void;
  onNotificationRead: (id: string) => void;
  onNotificationDismiss: (id: string) => void;
  onNotificationAction?: (actionId: string, notification: Notification) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function RightSidebar({
  activeTab,
  assets,
  roomReadiness,
  tasks,
  notifications,
  selectedRoomId,
  onRoomSelect,
  onAssetSelect,
  onTaskComplete,
  onTaskDismiss,
  onNotificationRead,
  onNotificationDismiss,
  onNotificationAction,
  isCollapsed = false,
  onCollapsedChange,
}: RightSidebarProps) {
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);

  // Sync with parent's collapsed state if controlled
  useEffect(() => {
    setIsManuallyCollapsed(isCollapsed);
  }, [isCollapsed]);

  const handleCollapse = (collapsed: boolean) => {
    setIsManuallyCollapsed(collapsed);
    onCollapsedChange?.(collapsed);
  };

  const selectedRoomReadiness = roomReadiness.find(
    r => r.roomId === selectedRoomId
  ) || null;

  // Show collapsed state when manually collapsed
  if (isManuallyCollapsed) {
    // For dashboard tab, show patient status bar
    if (activeTab === 'dashboard') {
      return <PatientStatusBar onExpand={() => handleCollapse(false)} />;
    }

    // For other tabs, show simple expand button
    return (
      <div className="w-12 h-full border-l border-border bg-bg-secondary flex items-center justify-center p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCollapse(false)}
          className="text-text-tertiary hover:text-text-primary h-8 w-8 p-0"
          title="Expand sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full border-l border-border bg-bg-secondary flex flex-col min-w-0">
      {/* Collapse Button */}
      <div className="border-b border-border p-3 flex items-center justify-between min-w-0">
        <h3 className="text-sm font-bold text-text-primary truncate min-w-0">
          {activeTab === 'ask' ? 'Ward Overview' : activeTab === 'dashboard' ? 'Patient Dashboard' : 'Details'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCollapse(true)}
          className="text-text-tertiary hover:text-text-primary flex-shrink-0"
          title="Collapse sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {activeTab === 'ask' && (
          <div className="flex flex-col h-full min-w-0">
            {/* Ward Map */}
            <div className="flex-shrink-0 min-w-0">
              <WardMap
                assets={assets}
                roomReadiness={roomReadiness}
                onRoomSelect={onRoomSelect}
                onAssetSelect={onAssetSelect}
                selectedRoomId={selectedRoomId}
              />
            </div>

            {/* Collapsible Sections */}
            <div className="p-4 space-y-4 min-w-0">
              {/* Notifications Panel */}
              <NotificationPanel
                notifications={notifications}
                onNotificationRead={onNotificationRead}
                onNotificationDismiss={onNotificationDismiss}
                onNotificationAction={onNotificationAction}
              />

              {/* Room Details */}
              {selectedRoomReadiness && (
                <RoomDetails 
                  roomReadiness={selectedRoomReadiness}
                  tasks={tasks}
                />
              )}

              {/* Task Queue */}
              <TaskQueue 
                tasks={tasks}
                onTaskComplete={onTaskComplete}
                onTaskDismiss={onTaskDismiss}
              />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <PatientVitalsDashboard />
        )}

        {activeTab === 'inventory' && (
          <div className="p-6 min-w-0">
            <div className="glass-panel rounded-lg p-6 min-w-0">
              <p className="text-sm text-text-secondary break-words">Inventory details will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="p-6 min-w-0">
            <div className="min-w-0">
              <WardMap
                assets={assets}
                roomReadiness={roomReadiness}
                onRoomSelect={onRoomSelect}
                onAssetSelect={onAssetSelect}
                selectedRoomId={selectedRoomId}
              />
            </div>
            <div className="mt-4 min-w-0">
              {selectedRoomReadiness && (
                <RoomDetails
                  roomReadiness={selectedRoomReadiness}
                  tasks={tasks}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="p-6 min-w-0">
            <TaskQueue
              tasks={tasks.filter(t => t.action === 'clean_asset' || t.action === 'repair_asset')}
              onTaskComplete={onTaskComplete}
              onTaskDismiss={onTaskDismiss}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6 min-w-0">
            <div className="glass-panel rounded-lg p-6 min-w-0">
              <p className="text-sm text-text-secondary break-words">Report data will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

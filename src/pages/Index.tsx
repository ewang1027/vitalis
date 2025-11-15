import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { Hospital3DMap } from '@/components/Hospital3DMap';
import { NotificationBell } from '@/components/NotificationBell';
import { RoomDetailView } from '@/components/RoomDetailView';
import {
  useCurrentUser,
  useEquipment,
  useTasks,
  useNotifications,
  useChatMessages,
  useRoomDetails,
  useRooms,
  usePatients,
} from '@/hooks/useSupabaseData';
import { Task } from '@/types/wardops';
import { Notification } from '@/types/notifications';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isMiddlePanelCollapsed, setIsMiddlePanelCollapsed] = useState(false);
  const [roomDetailViewId, setRoomDetailViewId] = useState<string | null>(null);

  // Fetch data from Supabase
  const { user: supabaseUser } = useCurrentUser();
  const { equipment } = useEquipment();
  const { tasks, setTasks } = useTasks();
  const { notifications, setNotifications } = useNotifications(supabaseUser?.id);
  const { messages: chatHistory } = useChatMessages();
  const { rooms } = useRooms();
  const { roomDetails } = useRoomDetails(roomDetailViewId || '');
  const { patients } = usePatients();

  // Transform Supabase user to match User type
  const user = supabaseUser ? {
    id: supabaseUser.id,
    name: supabaseUser.name,
    role: supabaseUser.role,
    avatarUrl: supabaseUser.avatar_url || undefined,
    isOnline: supabaseUser.is_online
  } : undefined;

  const handleTaskComplete = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.taskId === taskId ? { ...t, status: 'done' as const } : t
    ));
    toast.success('Task marked as complete');
  };

  const handleTaskDismiss = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.taskId === taskId ? { ...t, status: 'dismissed' as const } : t
    ));
  };

  const handleNotificationRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, status: 'read' as const } : n
    ));
  };

  const handleNotificationDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success('Notification dismissed');
  };

  const handleNotificationAction = (actionId: string, notification: Notification) => {
    if (notification.relatedRoomId) {
      setSelectedRoomId(notification.relatedRoomId);
    }
    toast.info(`Action triggered: ${actionId}`);
    handleNotificationRead(notification.id);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleEnterRoom = (roomId: string) => {
    setRoomDetailViewId(roomId);
  };

  const handleExitRoomView = () => {
    setRoomDetailViewId(null);
  };

  const handleCloseRoomPopup = () => {
    setSelectedRoomId(null);
  };

  // Auto-expand middle panel when tab changes
  useEffect(() => {
    if (activeTab) {
      setIsMiddlePanelCollapsed(false);
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'hsl(var(--bg-map))' }}>
      {/* Left Sidebar - Always Visible */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMiddlePanelCollapsed={isMiddlePanelCollapsed}
        onExpandMiddlePanel={() => setIsMiddlePanelCollapsed(false)}
      />

      {/* Main Content Area - Map always visible, middle panel conditional */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Right Panel - Map View (Always Visible) - First in DOM for correct resize behavior */}
        <ResizablePanel
          defaultSize={activeTab ? (isMiddlePanelCollapsed ? 100 : 70) : 100}
          minSize={50}
          className="order-2"
        >
          <div className="h-full border-l relative" style={{ borderColor: 'hsl(var(--border-light))', backgroundColor: 'hsl(var(--bg-map))' }}>
            {/* Conditionally render Hospital Map or Room Detail View */}
            {roomDetailViewId && roomDetails ? (
              <RoomDetailView
                room={roomDetails}
                onExit={handleExitRoomView}
              />
            ) : (
              <Hospital3DMap
                rooms={rooms}
                equipment={equipment}
                onRoomSelect={handleRoomSelect}
                selectedRoomId={selectedRoomId}
                onEnterRoom={handleEnterRoom}
                onCloseRoomPopup={handleCloseRoomPopup}
              />
            )}

            {/* Notification Bell - Only show when not in room detail view */}
            {!roomDetailViewId && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 100 }}>
                <NotificationBell
                  notifications={notifications}
                  onNotificationRead={handleNotificationRead}
                  onNotificationDismiss={handleNotificationDismiss}
                />
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Middle Panel - Only visible when a tab is selected AND not collapsed */}
        {activeTab && !isMiddlePanelCollapsed && (
          <>
            {/* Draggable Resize Handle */}
            <ResizableHandle className="w-1 cursor-col-resize order-1" style={{ backgroundColor: 'hsl(var(--border-medium))' }} />

            <ResizablePanel defaultSize={30} minSize={15} maxSize={50} collapsible={true} className="order-0">
              <div className="h-full flex flex-col" style={{ backgroundColor: 'hsl(var(--bg-middle))' }}>
                {/* Header with collapse button */}
                <div className="border-b p-3 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'hsl(var(--border-light))' }}>
                  <h3 className="text-sm font-semibold truncate min-w-0" style={{ color: 'hsl(var(--text-dark))' }}>
                    {activeTab === 'ask'
                      ? selectedRoomId
                        ? `Ask Vitalis (${selectedRoomId.replace('room-', 'Room ')})`
                        : 'Ask Vitalis'
                      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMiddlePanelCollapsed(true)}
                    className="flex-shrink-0 h-7 w-7 p-0"
                    style={{ color: 'hsl(var(--text-gray))' }}
                    title="Collapse panel"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {activeTab === 'ask' ? (
                    <ChatInterface
                      initialMessages={chatHistory}
                      userId={supabaseUser?.id}
                      roomId={selectedRoomId}
                      contextData={{
                        rooms,
                        equipment,
                        tasks,
                        patients
                      }}
                    />
                  ) : (
                    <div className="p-6 flex-1">
                      <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(var(--bg-tertiary))' }}>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--text-dark))' }}>
                          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h2>
                        <p className="text-sm" style={{ color: 'hsl(var(--text-gray))' }}>
                          Coming soon - this feature is under development
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;

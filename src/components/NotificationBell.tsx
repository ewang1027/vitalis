import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Notification } from '@/types/notifications';

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationRead?: (id: string) => void;
  onNotificationDismiss?: (id: string) => void;
}

export function NotificationBell({
  notifications,
  onNotificationRead,
  onNotificationDismiss
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#10b981';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Bell size={20} color="#374151" />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Popup */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '48px',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: 0
            }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '11px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '13px'
              }}>
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (notification.status === 'unread' && onNotificationRead) {
                      onNotificationRead(notification.id);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: notification.status === 'unread' ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.status === 'unread' ? '#dcfce7' : '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.status === 'unread' ? '#f0fdf4' : 'white';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    {/* Icon */}
                    <div style={{ fontSize: '16px', marginTop: '2px' }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {notification.title}
                        </span>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: getPriorityColor(notification.priority)
                          }}
                        />
                      </div>
                      <p style={{
                        fontSize: '11px',
                        color: '#6b7280',
                        margin: '0 0 4px 0',
                        lineHeight: '1.4'
                      }}>
                        {notification.message}
                      </p>
                      <span style={{
                        fontSize: '10px',
                        color: '#9ca3af'
                      }}>
                        {new Date(notification.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Dismiss button */}
                    {onNotificationDismiss && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotificationDismiss(notification.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#9ca3af';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}
    </div>
  );
}

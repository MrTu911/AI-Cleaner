
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import {
  Bell,
  X,
  Check,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  FileText,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }[];
  metadata?: {
    userId?: string;
    fileId?: string;
    processId?: string;
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only 50 most recent

    // Show toast for important notifications
    if (notification.type === 'error' || notification.type === 'success') {
      if (notification.type === 'error') {
        toast.error(notification.message);
      } else {
        toast.success(notification.message);
      }
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Demo notifications on mount
  useEffect(() => {
    const demoNotifications = [
      {
        type: 'success' as const,
        title: 'File tải lên thành công',
        message: 'File "sales_data.csv" đã được tải lên và xử lý thành công',
        metadata: { fileId: 'file123' },
      },
      {
        type: 'info' as const,
        title: 'Hệ thống bảo trì',
        message: 'Hệ thống sẽ bảo trì từ 2:00 - 4:00 sáng ngày mai',
        metadata: { system: true },
      },
      {
        type: 'warning' as const,
        title: 'Dung lượng storage sắp đầy',
        message: 'Dung lượng lưu trữ đã sử dụng 85%. Vui lòng xóa files không cần thiết.',
        metadata: { usage: 85 },
      },
    ];

    // Add demo notifications after a delay
    setTimeout(() => {
      demoNotifications.forEach(notif => addNotification(notif));
    }, 2000);
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationBadgeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'system':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setDetailDialogOpen(true);
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Thông báo</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-3 w-3 mr-1" />
                  Đánh dấu tất cả
                </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start space-x-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(notification.timestamp), 'HH:mm - dd/MM', { locale: vi })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.read && (
                          <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                            <Check className="h-3 w-3 mr-2" />
                            Đánh dấu đã đọc
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => removeNotification(notification.id)}
                          className="text-red-600"
                        >
                          <X className="h-3 w-3 mr-2" />
                          Xóa thông báo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {notifications.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="h-3 w-3 mr-1" />
                  Xóa tất cả
                </Button>
                <p className="text-xs text-gray-500 flex items-center">
                  {notifications.length > 10 && `+${notifications.length - 10} thông báo khác`}
                </p>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notification Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(selectedNotification.type)}
                  <DialogTitle className="text-base">
                    {selectedNotification.title}
                  </DialogTitle>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getNotificationBadgeColor(selectedNotification.type)}>
                    {selectedNotification.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(selectedNotification.timestamp), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="mt-4">
                <p className="text-gray-700">{selectedNotification.message}</p>
                
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Chi tiết:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedNotification.actions && selectedNotification.actions.length > 0 && (
                  <div className="mt-4 flex space-x-2">
                    {selectedNotification.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || 'default'}
                        size="sm"
                        onClick={() => {
                          action.action();
                          setDetailDialogOpen(false);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for easy notification creation
export function useNotify() {
  const { addNotification } = useNotifications();

  return {
    success: (title: string, message: string, metadata?: any) =>
      addNotification({ type: 'success', title, message, metadata }),
    error: (title: string, message: string, metadata?: any) =>
      addNotification({ type: 'error', title, message, metadata }),
    warning: (title: string, message: string, metadata?: any) =>
      addNotification({ type: 'warning', title, message, metadata }),
    info: (title: string, message: string, metadata?: any) =>
      addNotification({ type: 'info', title, message, metadata }),
    system: (title: string, message: string, metadata?: any) =>
      addNotification({ type: 'system', title, message, metadata }),
  };
}

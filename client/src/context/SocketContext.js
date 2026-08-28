import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const connectSocket = async () => {
      // Dynamic import to avoid build-time issues with CRA
      try {
        const { io } = await import('socket.io-client');
        const socket = io('/', {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          console.log('[SOCKET] Connected');
        });

        socket.on('newMatchingRequest', (data) => {
          console.log('[SOCKET] New matching request:', data);
          addNotification({
            type: 'newRequest',
            title: data.urgency === 'yes' ? 'URGENT: Blood Request' : 'New Blood Request',
            message: data.message || `Blood request for ${data.patientName}`,
            data,
            timestamp: new Date().toISOString(),
          });
        });

        socket.on('requestAccepted', (data) => {
          console.log('[SOCKET] Request accepted:', data);
          addNotification({
            type: 'accepted',
            title: 'Request Accepted',
            message: data.message || `A donor accepted the request`,
            data,
            timestamp: new Date().toISOString(),
          });
        });

        socket.on('lowStockAlert', (data) => {
          console.log('[SOCKET] Low stock alert:', data);
          addNotification({
            type: 'alert',
            title: 'Low Stock Alert',
            message: `${data.groups?.length || 0} blood group(s) running low`,
            data,
            timestamp: new Date().toISOString(),
          });
        });

        socket.on('disconnect', () => {
          console.log('[SOCKET] Disconnected');
        });

        socketRef.current = socket;
      } catch (err) {
        console.log('[SOCKET] Connection failed:', err.message);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, addNotification]);

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, clearNotifications, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
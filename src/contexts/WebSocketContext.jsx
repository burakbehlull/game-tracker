import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../services/api';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ token, children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState({
    presence: null,
    friendRequest: null,
    friendResolved: null,
    friendRemoved: null,
    conversationUpdated: null,
    messageNew: null,
    messageRead: null,
    notificationNew: null
  });

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const socket = io(WS_URL, {
      transports: ['polling', 'websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket Connected');
      setConnected(true);
      // Backend expects identifying or joining? 
      // If we have a common event for this, we could trigger it here.
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket Connection Error:', err);
      setConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket Disconnected:', reason);
      setConnected(false);
    });

    // Debug all events
    const originalOn = socket.on;
    socket.on = function(event, callback) {
      return originalOn.call(this, event, (payload) => {
        console.log(`[SocketEvent] ${event}:`, payload);
        callback(payload);
      });
    };
    socket.on('presence:update', (payload) => setEvents((prev) => ({ ...prev, presence: payload })));
    socket.on('friend:request:new', (payload) => setEvents((prev) => ({ ...prev, friendRequest: payload })));
    socket.on('friend:request:resolved', (payload) => setEvents((prev) => ({ ...prev, friendResolved: payload })));
    socket.on('friend:removed', (payload) => setEvents((prev) => ({ ...prev, friendRemoved: payload })));
    socket.on('conversation:updated', (payload) => setEvents((prev) => ({ ...prev, conversationUpdated: payload })));
    socket.on('message:new', (payload) => setEvents((prev) => ({ ...prev, messageNew: payload })));
    socket.on('message:read', (payload) => setEvents((prev) => ({ ...prev, messageRead: payload })));
    socket.on('notification:new', (payload) => setEvents((prev) => ({ ...prev, notificationNew: payload })));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      events
    }),
    [connected, events]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

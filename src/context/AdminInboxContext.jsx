import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { chatApi } from '../api';
import { getToken } from '../api/client';
import { getSocketUrl } from '../lib/apiConfig';
import { useAuth } from './AuthContext';

const AdminInboxContext = createContext({
  conversationCount: 0,
  refreshInboxCount: () => {},
});

export function AdminInboxProvider({ children }) {
  const { user } = useAuth();
  const [conversationCount, setConversationCount] = useState(0);

  const refreshInboxCount = useCallback(async () => {
    if (user?.role !== 'admin') {
      setConversationCount(0);
      return;
    }
    try {
      const res = await chatApi.getInboxStats();
      setConversationCount(res.data?.conversationCount ?? 0);
    } catch {
      /* ignore polling errors */
    }
  }, [user?.role]);

  useEffect(() => {
    refreshInboxCount();
    if (user?.role !== 'admin') return undefined;
    const interval = setInterval(refreshInboxCount, 30000);
    return () => clearInterval(interval);
  }, [refreshInboxCount, user?.role]);

  useEffect(() => {
    const token = getToken();
    if (!token || user?.role !== 'admin') return undefined;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
    });

    const onCount = ({ count }) => {
      setConversationCount(typeof count === 'number' ? count : 0);
    };

    socket.on('admin_inbox_count', onCount);
    socket.on('new_message_notification', refreshInboxCount);

    return () => {
      socket.off('admin_inbox_count', onCount);
      socket.off('new_message_notification', refreshInboxCount);
      socket.disconnect();
    };
  }, [user?.role, refreshInboxCount]);

  return (
    <AdminInboxContext.Provider value={{ conversationCount, refreshInboxCount }}>
      {children}
    </AdminInboxContext.Provider>
  );
}

export function useAdminInbox() {
  return useContext(AdminInboxContext);
}

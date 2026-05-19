import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import PageHeader from '../components/PageHeader';
import { chatApi } from '../api';
import { getToken } from '../api/client';
import { getSocketUrl } from '../lib/apiConfig';
import { useAuth } from '../context/AuthContext';

const senderIdOf = (msg) => {
  const s = msg?.senderId;
  if (!s) return '';
  return (s._id || s).toString();
};

export default function Chat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('customer') || '');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [socketStatus, setSocketStatus] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  const roomIdRef = useRef(roomId);
  const userIdRef = useRef(user?._id);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    userIdRef.current = user?._id;
  }, [user?._id]);

  const appendMessage = useCallback((msg) => {
    if (!msg) return;
    setMessages((prev) => {
      const id = msg._id?.toString();
      if (id && !String(id).startsWith('temp-')) {
        if (prev.some((m) => m._id?.toString() === id)) return prev;
        const withoutTemps = prev.filter(
          (m) => !String(m._id).startsWith('temp-') || m.message !== msg.message
        );
        return [...withoutTemps, msg];
      }
      return [...prev, msg];
    });
  }, []);

  const joinCurrentRoom = useCallback(() => {
    const socket = socketRef.current;
    const receiverId = selectedIdRef.current;
    if (socket?.connected && receiverId) {
      socket.emit('join_room', { receiverId: String(receiverId) });
    }
  }, []);

  const loadHistory = useCallback(async (partnerId, { quiet = false } = {}) => {
    if (!partnerId) return;
    if (!quiet) {
      setHistoryLoading(true);
      setHistoryError('');
    }
    try {
      const res = await chatApi.getHistory(partnerId);
      const nextRoom = res.data?.roomId || null;
      const nextMessages = res.data?.messages || [];
      setRoomId(nextRoom);
      roomIdRef.current = nextRoom;
      setMessages(nextMessages);
    } catch (err) {
      if (!quiet) {
        setHistoryError(err.message || 'Could not load messages');
        setMessages([]);
      }
    } finally {
      if (!quiet) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    chatApi
      .getPartners()
      .then((res) => {
        const list = res.data || [];
        setCustomers(list);
        if (!selectedIdRef.current && list.length) {
          setSelectedId(String(list[0]._id));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || !user) return undefined;

    const socketUrl = getSocketUrl();
    setSocketStatus('connecting');

    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
      timeout: 30000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketStatus('connected');
      joinCurrentRoom();
      if (selectedIdRef.current) {
        loadHistory(selectedIdRef.current, { quiet: true });
      }
    };

    const onDisconnect = () => {
      setSocketStatus('disconnected');
    };

    const onConnectError = () => {
      setSocketStatus('error');
    };

    const onReceive = (msg) => {
      const activeRoom = roomIdRef.current;
      if (msg.roomId && activeRoom && msg.roomId !== activeRoom) return;
      appendMessage(msg);
    };

    const onNotification = ({ roomId: notifRoom, senderId }) => {
      const activePartner = selectedIdRef.current;
      const activeRoom = roomIdRef.current;
      const fromPartner = senderId && activePartner && senderId === activePartner.toString();
      const sameRoom = notifRoom && activeRoom && notifRoom === activeRoom;
      if (fromPartner || sameRoom) {
        if (activePartner) loadHistory(activePartner, { quiet: true });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceive);
    socket.on('new_message_notification', onNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceive);
      socket.off('new_message_notification', onNotification);
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus('idle');
    };
  }, [user, appendMessage, joinCurrentRoom, loadHistory]);

  useEffect(() => {
    if (!selectedId || !user) {
      if (!selectedId) {
        setMessages([]);
        setRoomId(null);
        roomIdRef.current = null;
        setHistoryError('');
      }
      return;
    }

    loadHistory(selectedId).then(() => joinCurrentRoom());
  }, [selectedId, user, loadHistory, joinCurrentRoom]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const interval = setInterval(() => {
      loadHistory(selectedId, { quiet: true });
    }, 12000);
    return () => clearInterval(interval);
  }, [selectedId, loadHistory]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && selectedIdRef.current) {
        loadHistory(selectedIdRef.current, { quiet: true });
        joinCurrentRoom();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadHistory, joinCurrentRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !selectedId || !user) return;

    const tempId = `temp-${Date.now()}`;
    appendMessage({
      _id: tempId,
      message: trimmed,
      senderId: { _id: user._id, name: user.name },
      createdAt: new Date().toISOString(),
      roomId: roomIdRef.current,
    });
    setText('');

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('send_message', { receiverId: String(selectedId), message: trimmed });
      return;
    }

    try {
      const res = await chatApi.sendMessage(selectedId, trimmed);
      if (res.data) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m._id !== tempId);
          const id = res.data._id?.toString();
          if (id && withoutTemp.some((m) => m._id?.toString() === id)) return withoutTemp;
          return [...withoutTemp, res.data];
        });
        if (res.data.roomId) {
          setRoomId(res.data.roomId);
          roomIdRef.current = res.data.roomId;
        }
      } else {
        await loadHistory(selectedId, { quiet: true });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setHistoryError(err.message || 'Could not send message');
    }
  };

  const selected = customers.find((c) => String(c._id) === String(selectedId));
  const myId = user?._id?.toString();

  const socketLabel =
    socketStatus === 'connected'
      ? 'Live'
      : socketStatus === 'connecting'
        ? 'Connecting…'
        : socketStatus === 'error'
          ? 'Offline (using API)'
          : socketStatus === 'disconnected'
            ? 'Reconnecting…'
            : '';

  return (
    <>
      <PageHeader title="Messages" subtitle="Chat with customers in real time" />

      <section className="chat-layout">
        <aside className="chat-list">
          <h3>Customers</h3>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <ul>
              {customers.map((c) => (
                <li key={c._id}>
                  <button
                    type="button"
                    className={`chat-list__item${String(selectedId) === String(c._id) ? ' chat-list__item--active' : ''}`}
                    onClick={() => setSelectedId(String(c._id))}
                  >
                    <strong>{c.name}</strong>
                    <small>{c.email}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="chat-panel">
          {selected ? (
            <>
              <header className="chat-panel__head">
                <div>
                  <strong>{selected.name}</strong>
                  <span>{selected.email}</span>
                </div>
                {socketLabel ? (
                  <span
                    className={`chat-socket-status chat-socket-status--${socketStatus}`}
                    title={
                      socketStatus === 'error'
                        ? `Could not reach ${getSocketUrl()} — messages still load via API`
                        : undefined
                    }
                  >
                    {socketLabel}
                  </span>
                ) : null}
              </header>
              <section className="chat-messages">
                {historyLoading ? <p className="muted">Loading messages…</p> : null}
                {historyError ? (
                  <p className="chat-error" role="alert">
                    {historyError}
                  </p>
                ) : null}
                {!historyLoading && !historyError && messages.length === 0 ? (
                  <p className="muted">No messages yet. Say hello.</p>
                ) : null}
                {messages.map((m) => {
                  const mine = senderIdOf(m) === myId;
                  return (
                    <article
                      key={m._id}
                      className={`chat-bubble${mine ? ' chat-bubble--mine' : ''}`}
                    >
                      <p>{m.message}</p>
                      <time>{new Date(m.createdAt).toLocaleTimeString()}</time>
                    </article>
                  );
                })}
                <span ref={bottomRef} />
              </section>
              <form className="chat-compose" onSubmit={send}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  autoComplete="off"
                />
                <button type="submit" className="btn btn--primary">
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="muted panel__empty">Select a customer to start chatting.</p>
          )}
        </section>
      </section>
    </>
  );
}

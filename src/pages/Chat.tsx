import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import socket from '../socket';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
  _id: string;
  username: string;
  isOnline: boolean;
}

interface Message {
  senderId?: string;
  sender?: { _id: string; username: string };
  receiver?: { _id: string; username: string };
  message: string;
  createdAt?: string;
  room?: string;
}

const Chat = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRoom, setActiveRoom] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  }, [token]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    socket.emit('userOnline', user._id);
    fetchUsers();

    socket.on('privateMessage', (data: Message) => {
      if (data.senderId === selectedUser?._id || data.senderId === user._id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    socket.on('groupMessage', (data: Message) => {
      if (data.room === activeRoom) {
        setMessages((prev) => [...prev, data]);
      }
    });

    socket.on('userStatusChanged', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isOnline } : u)));
    });

    return () => {
      socket.off('privateMessage');
      socket.off('groupMessage');
      socket.off('userStatusChanged');
    };
  }, [user, selectedUser, activeRoom, navigate, fetchUsers]);

  const fetchPrivateMessages = async (receiverId: string) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/messages/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchGroupMessages = async (room: string) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/messages/group/${room}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const selectUser = (u: User) => {
    setSelectedUser(u);
    setIsGroup(false);
    setActiveRoom('');
    fetchPrivateMessages(u._id);
    setSidebarOpen(false);
  };

  const joinGroup = (room: string) => {
    setIsGroup(true);
    setActiveRoom(room);
    setSelectedUser(null);
    socket.emit('joinRoom', room);
    fetchGroupMessages(room);
    setSidebarOpen(false);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    if (isGroup) {
      socket.emit('groupMessage', { senderId: user?._id, room: activeRoom, message: newMessage });
    } else {
      socket.emit('privateMessage', {
        senderId: user?._id,
        receiverId: selectedUser?._id,
        message: newMessage
      });
    }

    setNewMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const groups = ['general', 'random', 'tech'];
  const onlineUsers = users.filter((u) => u.isOnline);
  const currentTitle = isGroup ? `# ${activeRoom}` : selectedUser?.username;
  const currentSubtitle = isGroup
    ? `${users.length} members in workspace`
    : selectedUser?.isOnline
      ? 'Online now'
      : 'Offline';

  return (
    <div className="flex h-screen overflow-hidden bg-[#313338] text-[#dbdee1]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-3 bg-[#1e1f22] py-3 md:flex">
        <button className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#5865f2] text-lg font-black text-white transition-all hover:rounded-xl">
          C
          <span className="absolute -left-3 h-10 w-1 rounded-r-full bg-white" />
        </button>
        <div className="h-px w-8 bg-[#35363c]" />
        {groups.map((room) => (
          <button
            key={`rail-${room}`}
            onClick={() => joinGroup(room)}
            title={room}
            className={`grid h-12 w-12 place-items-center rounded-3xl text-lg font-bold uppercase transition-all hover:rounded-xl hover:bg-[#5865f2] hover:text-white ${
              activeRoom === room ? 'rounded-xl bg-[#5865f2] text-white' : 'bg-[#313338] text-[#b5bac1]'
            }`}
          >
            {room[0]}
          </button>
        ))}
      </aside>

      <div
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-black/20 bg-[#2b2d31] transition-transform duration-300 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-black/30 px-4 shadow-sm">
          <h1 className="truncate text-sm font-semibold text-white">ChatApp Workspace</h1>
          <button
            onClick={handleLogout}
            className="rounded px-2 py-1 text-xs font-semibold text-[#b5bac1] transition hover:bg-[#404249] hover:text-white"
          >
            Logout
          </button>
        </div>

        <div className="p-3">
          <div className="rounded-lg bg-[#1e1f22] p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#5865f2] text-base font-bold text-white">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.username}</p>
                <p className="text-xs text-[#23a559]">Online</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-2">
          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-[#949ba4]">
            Text Channels
          </p>
          {groups.map((room) => (
            <button
              key={room}
              onClick={() => joinGroup(room)}
              className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[15px] font-medium transition ${
                activeRoom === room
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span className="text-xl leading-none text-[#80848e]">#</span>
              <span className="capitalize">{room}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pt-5">
          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-[#949ba4]">
            Direct Messages
          </p>
          {users.map((u) => (
            <button
              key={u._id}
              onClick={() => selectUser(u)}
              className={`mb-0.5 flex w-full items-center gap-3 rounded px-2 py-2 text-left transition ${
                selectedUser?._id === u._id
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <div className="relative">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#5865f2] text-sm font-bold text-white">
                  {u.username[0].toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#2b2d31] ${
                    u.isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'
                  }`}
                />
              </div>
              <span className="truncate text-sm font-medium">{u.username}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-black/20 bg-[#232428] p-3">
          <div className="flex items-center justify-between text-xs text-[#949ba4]">
            <span>{onlineUsers.length} online</span>
            <span>{users.length} members</span>
          </div>
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-3 border-b border-black/30 bg-[#313338] px-4 shadow-sm">
          <button
            className="rounded p-1 text-[#b5bac1] transition hover:bg-[#404249] hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {selectedUser || isGroup ? (
            <>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#404249] text-base font-bold text-[#b5bac1]">
                {isGroup ? '#' : selectedUser?.username?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{currentTitle}</p>
                <p className="text-xs text-[#949ba4]">{currentSubtitle}</p>
              </div>
            </>
          ) : (
            <p className="font-medium text-[#949ba4]">Select a channel or direct message</p>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
              {messages.length === 0 && (selectedUser || isGroup) && (
                <div className="flex h-full flex-col justify-end pb-6 text-[#949ba4]">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#41434a] text-3xl font-bold text-white">
                    {isGroup ? '#' : selectedUser?.username?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {isGroup ? `Welcome to #${activeRoom}` : `This is the start of your chat with ${selectedUser?.username}.`}
                  </p>
                  <p className="mt-1 text-sm">Send a message to begin the conversation.</p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?._id || msg.sender?._id === user?._id;
                const senderName = isMe ? user?.username : msg.sender?.username || 'User';

                return (
                  <div key={index} className="group flex gap-4 rounded px-1 py-1.5 hover:bg-[#2e3035]">
                    <div
                      className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
                        isMe ? 'bg-[#5865f2]' : 'bg-[#3ba55d]'
                      }`}
                    >
                      {senderName?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className={`text-sm font-semibold ${isMe ? 'text-[#c9cdfb]' : 'text-white'}`}>
                          {senderName}
                        </p>
                        {msg.createdAt && (
                          <p className="text-[11px] text-[#80848e]">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <p className="break-words text-[15px] leading-6 text-[#dbdee1]">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {(selectedUser || isGroup) && (
              <div className="px-4 pb-6 pt-2">
                <div className="flex items-center gap-3 rounded-lg bg-[#383a40] px-4 py-3">
                  <input
                    type="text"
                    placeholder={`Message ${isGroup ? `#${activeRoom}` : selectedUser?.username}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-[#dbdee1] placeholder-[#949ba4] outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#5865f2] text-white transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="hidden w-60 shrink-0 border-l border-black/20 bg-[#2b2d31] px-3 py-5 xl:block">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-[#949ba4]">
              Online - {onlineUsers.length}
            </p>
            <div className="space-y-1">
              {onlineUsers.map((u) => (
                <button
                  key={`member-${u._id}`}
                  onClick={() => selectUser(u)}
                  className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-[#949ba4] transition hover:bg-[#35373c] hover:text-[#dbdee1]"
                >
                  <div className="relative">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#5865f2] text-sm font-bold text-white">
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#2b2d31] bg-[#23a559]" />
                  </div>
                  <span className="truncate text-sm font-medium">{u.username}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Chat;

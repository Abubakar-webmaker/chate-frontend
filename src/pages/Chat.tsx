import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!user) { navigate('/'); return; }
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
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isOnline } : u));
    });

    return () => {
      socket.off('privateMessage');
      socket.off('groupMessage');
      socket.off('userStatusChanged');
    };
  }, [user, selectedUser, activeRoom]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchPrivateMessages = async (receiverId: string) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/messages/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchGroupMessages = async (room: string) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/messages/group/${room}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) { console.log(err); }
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
      socket.emit('privateMessage', { senderId: user?._id, receiverId: selectedUser?._id, message: newMessage });
    }
    setNewMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => { logout(); navigate('/'); };

  const groups = ['general', 'random', 'tech'];

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-gradient-to-b from-indigo-900 to-purple-900
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{user?.username}</p>
                <p className="text-green-400 text-xs">● Online</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-red-400 transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="px-3 pt-4">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-2">
            Groups
          </p>
          {groups.map((room) => (
            <button
              key={room}
              onClick={() => joinGroup(room)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
                activeRoom === room
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">#</span>
              <span className="font-medium capitalize">{room}</span>
            </button>
          ))}
        </div>

        {/* Users */}
        <div className="px-3 pt-4 flex-1 overflow-y-auto">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-2">
            Direct Messages
          </p>
          {users.map((u) => (
            <button
              key={u._id}
              onClick={() => selectUser(u)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
                selectedUser?._id === u._id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="relative">
                <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {u.username[0].toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-indigo-900 ${
                  u.isOnline ? 'bg-green-400' : 'bg-gray-400'
                }`} />
              </div>
              <span className="font-medium text-sm">{u.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {(selectedUser || isGroup) ? (
            <>
              <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                {isGroup ? '#' : selectedUser?.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {isGroup ? `# ${activeRoom}` : selectedUser?.username}
                </p>
                <p className="text-xs text-gray-400">
                  {isGroup ? 'Group Chat' : selectedUser?.isOnline ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-400 font-medium">Choose someone</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (selectedUser || isGroup) && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="font-medium">Conversation shuru karo!</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.senderId === user?._id || msg.sender?._id === user?._id;
            return (
              <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <p className="text-xs text-purple-500 font-semibold mb-1 px-1">
                      {msg.sender?.username || 'User'}
                    </p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {(selectedUser || isGroup) && (
          <div className="bg-white border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2">
              <input
                type="text"
                placeholder="Message likho..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
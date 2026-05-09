import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        username,
        email,
        password
      });
      setSuccess('Registration successful. Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#1e1f22] px-4 py-8 text-[#dbdee1]">
      <div className="w-full max-w-md rounded-lg bg-[#313338] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#5865f2] text-2xl font-black text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-2 text-sm text-[#b5bac1]">Join the workspace and start chatting.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[#da373c]/50 bg-[#da373c]/15 px-4 py-3 text-sm text-[#ffb4b6]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-[#23a559]/50 bg-[#23a559]/15 px-4 py-3 text-sm text-[#9ee8b2]">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              Username
            </label>
            <input
              type="text"
              placeholder="cooluser123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-md border border-[#1e1f22] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6d6f78] focus:border-[#5865f2]"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              Email
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-[#1e1f22] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6d6f78] focus:border-[#5865f2]"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#b5bac1]">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-[#1e1f22] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6d6f78] focus:border-[#5865f2]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#5865f2] py-3 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#b5bac1]">
          Already have an account?{' '}
          <Link to="/" className="font-semibold text-[#949cf7] hover:text-white">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

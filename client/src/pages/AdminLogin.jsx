import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        addToast(data.message || 'Login failed', 'error');
        return;
      }
      login(data.token, data.admin);
      addToast('Welcome back, ' + data.admin.name + '!', 'success');
      navigate('/admin/dashboard');
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 border-2 rounded-lg text-sm outline-none transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-600 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-8 py-8 text-center text-white">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fas fa-shield-alt" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm opacity-80 mt-1">LifeLine Blood Bank Management</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errors.form}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="admin-email">Admin Email</label>
            <input id="admin-email" type="email" className={inputCls('email')} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@lifeline.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="admin-pw">Password</label>
            <input id="admin-pw" type="password" className={inputCls('password')} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 disabled:opacity-60 transition-all">
            {loading ? 'Logging in...' : 'Login to Admin Panel'}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">Back to Donor Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
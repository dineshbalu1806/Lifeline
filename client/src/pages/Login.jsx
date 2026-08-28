import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [loginType, setLoginType] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const identifier = loginType === 'email' ? email : phone;
    if (!identifier) errs.identifier = 'This field is required';
    if (loginType === 'email' && identifier && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      errs.identifier = 'Enter a valid email address';
    }
    if (loginType === 'phone' && identifier && identifier.replace(/\D/g, '').length < 10) {
      errs.identifier = 'Enter a valid phone number (10+ digits)';
    }
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = loginType === 'email' ? { email, password } : { phone, password };
      const res = await api.post('/auth/login', payload);
      login(res.data.token, res.data.donor);
      addToast('Logged in successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setErrors({ form: msg });
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 border-2 rounded-lg text-sm outline-none transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-brand-500'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 px-8 py-10 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl mx-auto mb-4">
            🩸
          </div>
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-sm opacity-80 mt-1">Access your donor account</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {errors.form}
            </div>
          )}

          <div className="flex gap-4 pb-4 border-b border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input type="radio" name="loginType" checked={loginType === 'email'} onChange={() => setLoginType('email')} className="w-4 h-4 accent-brand-500" />
              Email
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input type="radio" name="loginType" checked={loginType === 'phone'} onChange={() => setLoginType('phone')} className="w-4 h-4 accent-brand-500" />
              Phone
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-identifier">
              {loginType === 'email' ? 'Email Address' : 'Phone Number'}
            </label>
            <input
              id="login-identifier"
              type={loginType === 'email' ? 'email' : 'tel'}
              className={inputClass('identifier')}
              placeholder={loginType === 'email' ? 'your.email@example.com' : '+1 234 567 8900'}
              value={loginType === 'email' ? email : phone}
              onChange={(e) => loginType === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
              aria-invalid={!!errors.identifier}
              aria-describedby={errors.identifier ? 'identifier-error' : undefined}
            />
            {errors.identifier && <p id="identifier-error" className="text-red-500 text-xs mt-1">{errors.identifier}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className={inputClass('password')}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-brand-700 text-white rounded-lg font-semibold text-base hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-500 font-semibold hover:text-brand-700">Register as a Donor</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
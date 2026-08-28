import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginType, setLoginType] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const identifier = loginType === 'email' ? email : phone;
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (loginType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError('Please enter a valid email address');
      return;
    }
    if (loginType === 'phone' && identifier.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email: loginType === 'email' ? identifier : identifier, password });
      login(res.data.token, res.data.donor);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    container: {
      background: '#fff',
      borderRadius: 15,
      boxShadow: '0 10px 50px rgba(0,0,0,0.2)',
      maxWidth: 460,
      width: '100%',
      overflow: 'hidden',
    },
    header: {
      background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
      color: '#fff',
      padding: '40px 30px',
      textAlign: 'center',
    },
    formContainer: { padding: '40px 30px' },
    toggleGroup: {
      display: 'flex',
      gap: 20,
      marginBottom: 24,
      paddingBottom: 24,
      borderBottom: '2px solid #e0e0e0',
    },
    toggleLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
      fontWeight: 500,
      flex: 1,
      userSelect: 'none',
    },
    formGroup: { marginBottom: 20 },
    label: { display: 'block', marginBottom: 8, color: '#333', fontWeight: 600, fontSize: 14 },
    input: {
      width: '100%',
      padding: 12,
      border: '2px solid #e0e0e0',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    errorBox: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '10px 14px',
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 14,
      border: '1px solid #f5c6cb',
    },
    btn: {
      width: '100%',
      padding: 14,
      background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    signupLink: {
      textAlign: 'center',
      marginTop: 20,
      color: '#666',
      fontSize: 14,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={{ fontSize: 30, marginBottom: 8 }}>🩸 Login</h1>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Access your donor account</p>
        </div>

        <div style={styles.formContainer}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={{
            background: '#e3f2fd',
            borderLeft: '4px solid #2196f3',
            padding: '12px 15px',
            borderRadius: 5,
            fontSize: 13,
            color: '#1565c0',
            marginBottom: 20,
          }}>
            ℹ️ Log in with your email and password to access your donor account.
          </div>

          <form onSubmit={handleSubmit}>
            {/* Login Type Toggle */}
            <div style={styles.toggleGroup}>
              <label style={styles.toggleLabel}>
                <input
                  type="radio"
                  name="loginType"
                  checked={loginType === 'email'}
                  onChange={() => setLoginType('email')}
                  style={{ width: 18, height: 18 }}
                />
                Email
              </label>
              <label style={styles.toggleLabel}>
                <input
                  type="radio"
                  name="loginType"
                  checked={loginType === 'phone'}
                  onChange={() => setLoginType('phone')}
                  style={{ width: 18, height: 18 }}
                />
                Phone
              </label>
            </div>

            {loginType === 'email' ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#e53935'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  required
                />
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  style={styles.input}
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#e53935'}
                  onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                  required
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#e53935'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                required
              />
            </div>

            <button
              type="submit"
              style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
              onMouseEnter={e => !loading && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.target.style.transform = 'translateY(0)')}
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>
          </form>

          <div style={styles.signupLink}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#e53935', fontWeight: 600 }}>
              Register as a Donor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

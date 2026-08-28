import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ transparent = false }) => {
  const { isAuthenticated, logout, donor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 8%',
    background: transparent ? 'transparent' : '#fff',
    boxShadow: transparent ? 'none' : '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const logoStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#d32f2f',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const linksStyle = {
    listStyle: 'none',
    display: 'flex',
    gap: 30,
    margin: 0,
    padding: 0,
  };

  const linkStyle = {
    textDecoration: 'none',
    color: '#333',
    fontWeight: 500,
    transition: 'color 0.2s',
    fontSize: '0.95rem',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>
        <i className="fas fa-hand-holding-medical" style={{ color: '#d32f2f' }} />
        LifeLine
      </Link>

      <ul style={linksStyle}>
        <li><Link to="/" style={linkStyle}>Home</Link></li>
        <li><Link to="/request-blood" style={linkStyle}>Request Blood</Link></li>
        {isAuthenticated && (
          <li><Link to="/dashboard" style={linkStyle}>Dashboard</Link></li>
        )}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              Hello, {donor?.personalInfo?.fullName?.split(' ')[0]}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 20px',
                border: '2px solid #d32f2f',
                background: 'transparent',
                color: '#d32f2f',
                borderRadius: 25,
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                fontSize: '0.9rem',
              }}
              onMouseEnter={e => {
                e.target.style.background = '#d32f2f';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#d32f2f';
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">
            <button
              style={{
                padding: '8px 24px',
                border: '2px solid #d32f2f',
                background: 'transparent',
                color: '#d32f2f',
                borderRadius: 25,
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                fontSize: '0.9rem',
              }}
              onMouseEnter={e => {
                e.target.style.background = '#d32f2f';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#d32f2f';
              }}
            >
              Login
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

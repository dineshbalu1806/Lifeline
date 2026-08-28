import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Navbar = ({ transparent = false }) => {
  const { isAuthenticated, logout, donor } = useAuth();
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [showNotif, setShowNotif] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`${transparent ? 'bg-transparent' : 'bg-white shadow-sm'} sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-brand-600 font-bold text-lg shrink-0">
            <i className="fas fa-hand-holding-medical text-brand-500" />
            LifeLine
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-700 hover:text-brand-500 font-medium text-sm transition-colors">
              Home
            </Link>
            <Link to="/request-blood" className="text-gray-700 hover:text-brand-500 font-medium text-sm transition-colors">
              Request Blood
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="text-gray-700 hover:text-brand-500 font-medium text-sm transition-colors">
                Dashboard
              </Link>
            )}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}
                  className="relative p-2 text-gray-500 hover:text-brand-500 transition-colors"
                  aria-label="Notifications"
                >
                  <i className="fas fa-bell text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotif && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-sm text-gray-800">Notifications</span>
                      {notifications.length > 0 && (
                        <button onClick={markAllRead} className="text-xs text-brand-500 hover:text-brand-700 font-medium">Mark all read</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-8">No new notifications</p>
                    ) : (
                      notifications.slice(0, 20).map((n, i) => (
                        <div
                          key={i}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                            n.type === 'newRequest' ? 'bg-red-50' : ''
                          }`}
                          onClick={() => {
                            if (n.type === 'newRequest' || n.type === 'accepted') navigate('/dashboard');
                            setShowNotif(false);
                          }}
                        >
                          <p className={`text-xs font-semibold ${n.type === 'newRequest' ? 'text-brand-600' : 'text-gray-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Hi, {donor?.personalInfo?.fullName?.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 border-2 border-brand-500 text-brand-500 rounded-full text-sm font-semibold hover:bg-brand-500 hover:text-white transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button className="px-5 py-1.5 border-2 border-brand-500 text-brand-500 rounded-full text-sm font-semibold hover:bg-brand-500 hover:text-white transition-all">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'} text-xl`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <Link to="/" className="block text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/request-blood" className="block text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>Request Blood</Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="block text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          )}
          <hr className="border-gray-100" />
          {isAuthenticated ? (
            <>
              <p className="text-sm text-gray-500">Signed in as <strong>{donor?.personalInfo?.fullName}</strong></p>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-2 border-2 border-brand-500 text-brand-500 rounded-lg text-sm font-semibold">
                Login
              </button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
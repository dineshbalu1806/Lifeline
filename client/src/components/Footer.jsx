import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <i className="fas fa-hand-holding-medical text-brand-500" />
            LifeLine
          </div>
          <p className="text-sm leading-relaxed">
            Connecting blood donors with those in need. Every drop counts.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/request-blood" className="hover:text-white transition-colors">Request Blood</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Register as Donor</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Donor Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li><i className="fas fa-envelope w-5" /> support@lifeline.com</li>
            <li><i className="fas fa-phone w-5" /> +1 (555) 000-0000</li>
            <li><i className="fas fa-map-marker-alt w-5" /> Blood Bank Headquarters</li>
          </ul>
        </div>
      </div>
    </div>
    <div className="border-t border-gray-800 py-4 text-center text-xs">
      <p>&copy; {new Date().getFullYear()} LifeLine Blood Bank Management System. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
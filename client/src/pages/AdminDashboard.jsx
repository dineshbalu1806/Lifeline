import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../components/Toast';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PIE_COLORS = ['#d32f2f','#c62828','#e53935','#ef5350','#ff8a80','#b71c1c','#880e4f','#7f0000'];
const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: 'chart-bar' },
  { key: 'analytics', label: 'Analytics', icon: 'chart-line' },
  { key: 'inventory', label: 'Inventory', icon: 'warehouse' },
  { key: 'donors', label: 'Donors', icon: 'users' },
  { key: 'requests', label: 'Requests', icon: 'clipboard-list' },
];

const AdminDashboard = () => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsTotal, setDonorsTotal] = useState(0);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [donorSearch, setDonorSearch] = useState('');
  const [donorBloodFilter, setDonorBloodFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [stockForm, setStockForm] = useState({ bloodGroup: '', units: '', storageLocation: '', collectionDate: '', notes: '' });

  const api = async (path, options = {}) => {
    const token = localStorage.getItem('adminToken');
    const baseOpts = { headers: { 'Content-Type': 'application/json' }, ...options };
    if (token) baseOpts.headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/admin${path}`, baseOpts);
    return res.json();
  };

  const fetchStats = useCallback(async () => {
    try { const d = await api('/stats'); if (d.success) setStats(d.stats); } catch {}
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try { const d = await api('/analytics'); if (d.success) setAnalytics(d.data); } catch {}
  }, []);

  const fetchDonors = useCallback(async (search, bloodGroup) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (bloodGroup) params.set('bloodGroup', bloodGroup);
      const d = await api(`/donors?${params}`);
      if (d.success) { setDonors(d.donors); setDonorsTotal(d.total); }
    } catch {}
  }, []);

  const fetchRequests = useCallback(async () => {
    try { const d = await api('/requests'); if (d.success) setRequests(d.requests); } catch {}
  }, []);

  const fetchInventory = useCallback(async () => {
    try { const d = await api('/inventory'); if (d.success) setInventory(d.items); } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchAnalytics(), fetchDonors(), fetchRequests(), fetchInventory()]);
    setLoading(false);
  }, [fetchStats, fetchAnalytics, fetchDonors, fetchRequests, fetchInventory]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const handleUpdateRequestStatus = async (id, status) => {
    const d = await api(`/requests/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (d.success) { addToast(`Request marked as ${status}`, 'success'); fetchRequests(); fetchStats(); }
    else addToast(d.message, 'error');
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Delete this request permanently?')) return;
    const d = await api(`/requests/${id}`, { method: 'DELETE' });
    if (d.success) { addToast('Request deleted', 'success'); fetchRequests(); fetchStats(); }
  };

  const handleToggleEligibility = async (id, current) => {
    const d = await api(`/donors/${id}`, { method: 'PUT', body: JSON.stringify({ eligibleToDonate: !current }) });
    if (d.success) { addToast(`Donor ${current ? 'marked ineligible' : 'marked eligible'}`, 'success'); fetchDonors(donorSearch, donorBloodFilter); fetchStats(); }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!stockForm.bloodGroup || !stockForm.units || !stockForm.storageLocation || !stockForm.collectionDate) {
      addToast('Please fill all required fields', 'error'); return;
    }
    const d = await api('/inventory', { method: 'POST', body: JSON.stringify(stockForm) });
    if (d.success) {
      addToast(`${stockForm.units} units of ${stockForm.bloodGroup} added`, 'success');
      setStockForm({ bloodGroup: '', units: '', storageLocation: '', collectionDate: '', notes: '' });
      setShowAddForm(false); fetchInventory(); fetchStats();
    } else addToast(d.message, 'error');
  };

  const handleDeleteInventory = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    const d = await api(`/inventory/${id}`, { method: 'DELETE' });
    if (d.success) { addToast('Item removed', 'success'); fetchInventory(); fetchStats(); }
  };

  const handleCheckExpiry = async () => {
    const d = await api('/inventory/check-expiry', { method: 'POST' });
    if (d.success) { addToast(`${d.expired} item(s) marked expired`, 'success'); fetchInventory(); fetchStats(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 max-w-6xl mx-auto space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><CardSkeleton /><CardSkeleton /></div>
        <TableSkeleton />
      </div>
    );
  }

  const maxStock = stats ? Math.max(...Object.values(stats.stockByGroup || {}), 1) : 1;

  const inputCls = 'w-full px-3 py-2.5 border-2 rounded-lg text-sm outline-none border-gray-200 focus:border-blue-500';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-blue-800 text-white px-4 sm:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg"><i className="fas fa-hand-holding-medical" /> LifeLine</Link>
          <span className="text-white/60 text-xs hidden sm:inline">Admin Panel</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/80"><i className="fas fa-user-shield" /> {admin?.name}</span>
          <button onClick={handleLogout} className="px-3 py-1.5 border border-white/40 text-white rounded-lg text-xs hover:bg-white/10 transition-colors">Logout</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto px-4 sm:px-8">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 sm:px-6 py-3 text-sm font-medium border-b-3 transition-all shrink-0 ${
              tab === t.key ? 'text-blue-700 border-blue-700' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}>
            <i className={`fas fa-${t.icon} mr-1.5`} />{t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Donors', value: stats.totalDonors, icon: 'users', color: 'blue' },
                { label: 'Total Stock', value: stats.totalStock, icon: 'tint', color: 'red' },
                { label: 'Pending Requests', value: stats.pendingRequests, icon: 'clock', color: 'orange' },
                { label: 'Total Donations', value: stats.totalDonations, icon: 'heartbeat', color: 'green' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-${s.color}-100 text-${s.color}-600 flex items-center justify-center`}>
                      <i className={`fas fa-${s.icon}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-5">
                <i className="fas fa-chart-bar text-blue-600" /> Blood Stock by Group
              </h3>
              <div className="space-y-2.5">
                {BLOOD_GROUPS.map((bg) => {
                  const units = stats.stockByGroup[bg] || 0;
                  const pct = maxStock > 0 ? (units / maxStock) * 100 : 0;
                  const isLow = units > 0 && units < 5;
                  return (
                    <div key={bg} className="flex items-center gap-3">
                      <div className={`w-12 text-right text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>{bg}</div>
                      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                        <div className={`h-full rounded flex items-center px-2 transition-all duration-500 ${isLow ? 'bg-red-400' : 'bg-brand-500'}`}
                          style={{ width: `${Math.max(pct, units > 0 ? 3 : 0)}%` }}>
                          {units > 0 && <span className="text-white text-[11px] font-bold">{units}u</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleCheckExpiry} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors">
                <i className="fas fa-sync mr-1" /> Check & Mark Expired
              </button>
            </div>

            {/* Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <i className="fas fa-exclamation-triangle text-orange-500" /> Low Stock Alerts
                  {stats.lowStockAlerts.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.lowStockAlerts.length}</span>}
                </h3>
                {stats.lowStockAlerts.length === 0 ? <p className="text-gray-400 text-sm">All groups have adequate stock.</p> : (
                  <div className="space-y-2">
                    {stats.lowStockAlerts.map(a => (
                      <div key={a.bloodGroup} className="flex justify-between items-center px-4 py-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                        <span className="font-semibold text-sm">{a.bloodGroup}</span>
                        <span className="text-orange-600 font-semibold text-sm">{a.units} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <i className="fas fa-clock text-red-500" /> Expiring Soon
                  {stats.expiringSoon.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.expiringSoon.length}</span>}
                </h3>
                {stats.expiringSoon.length === 0 ? <p className="text-gray-400 text-sm">No items expiring within 7 days.</p> : (
                  <div className="space-y-2">
                    {stats.expiringSoon.map(item => (
                      <div key={item._id} className="flex justify-between items-center px-4 py-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                        <div className="text-sm"><span className="font-semibold">{item.bloodGroup}</span> <span className="text-gray-500">{item.units}u</span></div>
                        <span className="text-red-600 font-semibold text-xs">Exp {new Date(item.expiryDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                <i className="fas fa-clipboard-list text-blue-600" /> Pending Requests
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.pendingRequests}</span>
              </h3>
              {requests.filter(r => r.status === 'OPEN').length === 0 ? <EmptyState icon="📋" title="No pending requests" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-500 uppercase tracking-wider border-b-2 border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold">Patient</th><th className="text-left py-3 px-3 font-semibold">Blood</th>
                      <th className="text-left py-3 px-3 font-semibold">Units</th><th className="text-left py-3 px-3 font-semibold">Hospital</th>
                      <th className="text-left py-3 px-3 font-semibold">City</th><th className="text-left py-3 px-3 font-semibold">Urgency</th>
                      <th className="text-left py-3 px-3 font-semibold">Actions</th>
                    </tr></thead>
                    <tbody>
                      {requests.filter(r => r.status === 'OPEN').slice(0, 10).map(r => (
                        <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium">{r.patientName}</td>
                          <td className="py-3 px-3 font-bold">{r.bloodType}</td>
                          <td className="py-3 px-3">{r.unitsAccepted}/{r.unitsNeeded}</td>
                          <td className="py-3 px-3">{r.hospitalName}</td>
                          <td className="py-3 px-3">{r.city}</td>
                          <td className="py-3 px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.urgency==='yes'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{r.urgency==='yes'?'URGENT':'Normal'}</span></td>
                          <td className="py-3 px-3"><div className="flex gap-1">
                            <button onClick={() => handleUpdateRequestStatus(r._id, 'CONFIRMED')} className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-semibold hover:bg-green-200">Confirm</button>
                            <button onClick={() => handleDeleteRequest(r._id)} className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200">Delete</button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Donations (30d)', value: analytics.donations30d || 0, icon: 'heartbeat', color: 'red' },
                { label: 'Requests (30d)', value: analytics.requests30d || 0, icon: 'clipboard-list', color: 'blue' },
                { label: 'Fulfillment Rate', value: analytics.fulfillmentRate ? `${analytics.fulfillmentRate}%` : '0%', icon: 'check-circle', color: 'green' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {analytics.donationsOverTime && analytics.donationsOverTime.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm"><i className="fas fa-chart-line text-blue-600 mr-2" />Donations Over Time</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.donationsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#d32f2f" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {analytics.stockByGroup && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 text-sm"><i className="fas fa-chart-pie text-brand-500 mr-2" />Blood Group Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={Object.entries(analytics.stockByGroup).map(([k,v],i) => ({ name: k, value: v, fill: PIE_COLORS[i] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}) => `${name}: ${value}`}>
                        {Object.keys(analytics.stockByGroup).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 text-sm"><i className="fas fa-building text-green-600 mr-2" />Top Donating Cities</h3>
                  {analytics.topCities && analytics.topCities.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.topCities.map((c,i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                          <span><span className="font-bold text-gray-400 mr-2">{i+1}.</span>{c._id || 'Unknown'}</span>
                          <span className="font-semibold">{c.count} donations</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No data yet.</p>}
                </div>
              </div>
            )}

            {analytics.requestsOverTime && analytics.requestsOverTime.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm"><i className="fas fa-chart-bar text-blue-600 mr-2" />Requests Over Time</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.requestsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1565c0" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ═══ INVENTORY ═══ */}
        {tab === 'inventory' && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="font-bold text-lg text-gray-800"><i className="fas fa-warehouse mr-2" />Blood Inventory</h2>
              <div className="flex gap-2">
                <button onClick={handleCheckExpiry} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600"><i className="fas fa-sync mr-1" />Check Expiry</button>
                <button onClick={() => setShowAddForm(!showAddForm)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${showAddForm ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} mr-1`} />{showAddForm ? 'Cancel' : 'Add Stock'}
                </button>
              </div>
            </div>
            {showAddForm && (
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-dashed border-blue-300">
                <h3 className="font-bold text-gray-800 mb-4 text-sm"><i className="fas fa-plus-circle text-blue-600 mr-2" />Add Blood Stock</h3>
                <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Blood Group *</label>
                    <select className={inputCls} value={stockForm.bloodGroup} onChange={e => setStockForm({...stockForm, bloodGroup: e.target.value})} required><option value="">Select</option>{BLOOD_GROUPS.map(bg=><option key={bg} value={bg}>{bg}</option>)}</select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Units *</label>
                    <input type="number" min="1" className={inputCls} value={stockForm.units} onChange={e => setStockForm({...stockForm, units: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location *</label>
                    <input className={inputCls} value={stockForm.storageLocation} onChange={e => setStockForm({...stockForm, storageLocation: e.target.value})} placeholder="Main Fridge A" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Collection Date *</label>
                    <input type="date" className={inputCls} value={stockForm.collectionDate} onChange={e => setStockForm({...stockForm, collectionDate: e.target.value})} required />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                    <textarea className={`${inputCls} resize-y min-h-[60px]`} value={stockForm.notes} onChange={e => setStockForm({...stockForm, notes: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4"><button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><i className="fas fa-save mr-1" />Add to Inventory</button></div>
                </form>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              {inventory.length === 0 ? <EmptyState icon="📦" title="No inventory items" /> : (
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 uppercase tracking-wider border-b-2 border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold">Blood</th><th className="text-left py-3 px-4 font-semibold">Units</th>
                    <th className="text-left py-3 px-4 font-semibold">Location</th><th className="text-left py-3 px-4 font-semibold">Collected</th>
                    <th className="text-left py-3 px-4 font-semibold">Expires</th><th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {inventory.map(item => {
                      const isExpired = new Date(item.expiryDate) < new Date() && item.status === 'available';
                      const isExpiringSoon = !isExpired && new Date(item.expiryDate) < new Date(Date.now()+7*24*60*60*1000) && item.status === 'available';
                      return (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 font-bold">{item.bloodGroup}</td>
                          <td className="py-3 px-4">{item.units}</td>
                          <td className="py-3 px-4">{item.storageLocation}</td>
                          <td className="py-3 px-4">{new Date(item.collectionDate).toLocaleDateString()}</td>
                          <td className={`py-3 px-4 ${isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-orange-600 font-semibold' : ''}`}>
                            {new Date(item.expiryDate).toLocaleDateString()}{isExpired ? ' (Expired)' : isExpiringSoon ? ' (Soon)' : ''}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status==='available'?'bg-green-100 text-green-700':item.status==='expired'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'available' && <button onClick={() => handleDeleteInventory(item._id)} className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200">Remove</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ═══ DONORS ═══ */}
        {tab === 'donors' && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="font-bold text-lg text-gray-800"><i className="fas fa-users mr-2" />Donor Management</h2>
              <div className="flex gap-2 flex-wrap">
                <input placeholder="Search..." className="w-48 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  value={donorSearch} onChange={e => setDonorSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && fetchDonors(donorSearch, donorBloodFilter)} />
                <select className={`${inputCls} w-24 text-xs`} value={donorBloodFilter} onChange={e => { setDonorBloodFilter(e.target.value); fetchDonors(donorSearch, e.target.value); }}>
                  <option value="">All</option>{BLOOD_GROUPS.map(bg=><option key={bg} value={bg}>{bg}</option>)}
                </select>
                <button onClick={() => fetchDonors(donorSearch, donorBloodFilter)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"><i className="fas fa-search mr-1" />Search</button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              {donors.length === 0 ? <EmptyState icon="👥" title="No donors found" /> : (
                <>
              <p className="px-6 pt-4 text-xs text-gray-400">{donorsTotal} donor(s) found</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 uppercase tracking-wider border-b-2 border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold">Name</th><th className="text-left py-3 px-4 font-semibold">Blood</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th><th className="text-left py-3 px-4 font-semibold">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold">City</th><th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {donors.map(d => (
                      <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{d.personalInfo.fullName}</td>
                        <td className="py-3 px-4 font-bold">{d.personalInfo.bloodGroup || '-'}</td>
                        <td className="py-3 px-4">{d.personalInfo.email}</td>
                        <td className="py-3 px-4">{d.personalInfo.phone || '-'}</td>
                        <td className="py-3 px-4">{d.personalInfo.city || '-'}</td>
                        <td className="py-3 px-4"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.eligibleToDonate !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.eligibleToDonate !== false ? 'Eligible' : 'Ineligible'}</span></td>
                        <td className="py-3 px-4">
                          <button onClick={() => handleToggleEligibility(d._id, d.eligibleToDonate !== false)}
                            className={`px-2.5 py-1 rounded text-[10px] font-semibold ${d.eligibleToDonate !== false ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                            {d.eligibleToDonate !== false ? 'Ineligible' : 'Eligible'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </>
        )}

        {/* ═══ REQUESTS ═══ */}
        {tab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <h2 className="font-bold text-lg text-gray-800 p-6 pb-0"><i className="fas fa-clipboard-list mr-2" />All Blood Requests</h2>
            {requests.length === 0 ? <EmptyState icon="📋" title="No requests" /> : (
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 uppercase tracking-wider border-b-2 border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold">Patient</th><th className="text-left py-3 px-4 font-semibold">Blood</th>
                  <th className="text-left py-3 px-4 font-semibold">Units</th><th className="text-left py-3 px-4 font-semibold">Requester</th>
                  <th className="text-left py-3 px-4 font-semibold">Hospital</th><th className="text-left py-3 px-4 font-semibold">City</th>
                  <th className="text-left py-3 px-4 font-semibold">Urgency</th><th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr></thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{r.patientName}</td>
                      <td className="py-3 px-4 font-bold">{r.bloodType}</td>
                      <td className="py-3 px-4">{r.unitsAccepted}/{r.unitsNeeded}</td>
                      <td className="py-3 px-4">{r.requesterName}</td>
                      <td className="py-3 px-4">{r.hospitalName}</td>
                      <td className="py-3 px-4">{r.city}</td>
                      <td className="py-3 px-4"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.urgency==='yes'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{r.urgency==='yes'?'URGENT':'Normal'}</span></td>
                      <td className="py-3 px-4"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status==='OPEN'?'bg-blue-100 text-blue-700':r.status==='CONFIRMED'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {r.status === 'OPEN' && <button onClick={()=>handleUpdateRequestStatus(r._id,'CONFIRMED')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-semibold hover:bg-green-200">Confirm</button>}
                          {(r.status === 'OPEN' || r.status === 'CONFIRMED') && <button onClick={()=>handleUpdateRequestStatus(r._id,'CANCELLED')} className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-[10px] font-semibold hover:bg-orange-200">Cancel</button>}
                          <button onClick={()=>handleDeleteRequest(r._id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-semibold">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
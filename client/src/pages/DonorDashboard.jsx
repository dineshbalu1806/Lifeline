import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { jsPDF } from 'jspdf';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonorDashboard = () => {
  const { donor, updateDonor } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editSection, setEditSection] = useState(null);
  const [formData, setFormData] = useState({});

  const [acceptModal, setAcceptModal] = useState(null);
  const [unitsToAccept, setUnitsToAccept] = useState(1);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, nearbyRes] = await Promise.all([
        api.get('/donors/profile'),
        api.get('/requests/nearby'),
      ]);
      setProfile(profileRes.data.donor);
      setDonations(profileRes.data.donations || []);
      setNearbyRequests(nearbyRes.data.requests || []);
    } catch {
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const downloadCertificate = async (donationId) => {
    try {
      const res = await api.get(`/donations/${donationId}/certificate`);
      const cert = res.data.certificate;
      const doc = new jsPDF('landscape', 'mm', 'a4');

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Border
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(4);
      doc.rect(10, 10, pageW - 20, pageH - 20);
      doc.setLineWidth(1.5);
      doc.rect(14, 14, pageW - 28, pageH - 28);
      doc.rect(18, 18, pageW - 36, pageH - 36);

      // Header
      doc.setFontSize(36);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('LifeLine', pageW / 2, 45, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Blood Donation Certificate', pageW / 2, 56, { align: 'center' });

      // Decorative line
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.line(60, 62, pageW - 60, 62);

      // Certificate body
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Certificate No: ${cert.certNumber}`, 35, 85);
      doc.text(`Date of Donation: ${cert.date}`, 35, 95);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38);
      doc.text(`This certifies that`, pageW / 2, 115, { align: 'center' });
      doc.setFontSize(26);
      doc.text(cert.donorName, pageW / 2, 130, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(`has voluntarily donated ${cert.units}ml of ${cert.bloodGroup} blood`, pageW / 2, 148, { align: 'center' });
      doc.text(`at ${cert.center} on ${cert.date}.`, pageW / 2, 160, { align: 'center' });

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text(`Patient: ${cert.patient === 'N/A' ? 'General Donation' : cert.patient}`, pageW / 2, pageH - 30, { align: 'center' });
      doc.text('LifeLine Blood Bank — Saving Lives Together', pageW / 2, pageH - 20, { align: 'center' });

      doc.save(`LIFELINE-CERT-${cert.certNumber.slice(-8)}.pdf`);
      addToast('Certificate downloaded successfully', 'success');
    } catch {
      addToast('Failed to download certificate', 'error');
    }
  };

  const startEdit = (section, data) => {
    setEditSection(section);
    setFormData({ ...data });
  };

  const cancelEdit = () => {
    setEditSection(null);
    setFormData({});
  };

  const saveEdit = async () => {
    try {
      let endpoint = '';
      if (editSection === 'personal') endpoint = '/donors/profile/personal';
      else if (editSection === 'address') endpoint = '/donors/profile/address';
      else if (editSection === 'medical') endpoint = '/donors/profile/medical';

      let payload = { ...formData };

      if (editSection === 'address') {
        try {
          if (navigator.geolocation) {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
            });
            payload.coordinates = [pos.coords.longitude, pos.coords.latitude];
          }
        } catch { /* ignore */ }
      }

      const res = await api.put(endpoint, payload);
      setProfile(res.data.donor);
      updateDonor(res.data.donor);
      addToast('Profile updated successfully', 'success');
      cancelEdit();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    }
  };

  const handleAccept = async (requestId) => {
    if (!unitsToAccept || unitsToAccept < 1) {
      addToast('Please enter valid units', 'error');
      return;
    }
    try {
      await api.post(`/requests/${requestId}/accept`, { unitsToAccept });
      addToast('You have accepted this request! Please visit the hospital.', 'success');
      setAcceptModal(null);
      setUnitsToAccept(1);
      fetchAll();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept request', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState icon="⚠️" title="Could not load profile" actionLabel="Retry" action={fetchAll} />
      </div>
    );
  }

  const p = profile.personalInfo || {};
  const m = profile.medicalInfo || {};

  const inputCls = `w-full px-3 py-2 border-2 rounded-lg text-sm outline-none transition-colors border-gray-200 focus:border-brand-500`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-brand-600 text-white px-4 sm:px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg"><i className="fas fa-hand-holding-medical" /> LifeLine</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/request-blood" className="text-white/90 hover:text-white">Request Blood</Link>
          <span className="opacity-80">{p.fullName}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold text-gray-800">{p.fullName}</h2>
              <p className="text-sm text-gray-500">{p.email}{p.phone ? ` | ${p.phone}` : ''}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="inline-block bg-red-50 text-brand-600 px-3 py-0.5 rounded-full text-xs font-bold">{p.bloodGroup || 'Not set'}</span>
                {p.city && <span className="inline-block bg-green-50 text-green-700 px-3 py-0.5 rounded-full text-xs">{p.city}</span>}
                <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-medium ${profile.eligibleToDonate !== false ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                  {profile.eligibleToDonate !== false ? 'Eligible' : 'Ineligible'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby Open Requests */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
            <i className="fas fa-bell text-brand-500" /> Nearby Open Requests
            {nearbyRequests.length > 0 && (
              <span className="ml-1 bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full">{nearbyRequests.length}</span>
            )}
          </h3>
          {nearbyRequests.length === 0 ? (
            <EmptyState icon="🔔" title="No matching requests" description="No open matching requests in your area right now." />
          ) : (
            <div className="space-y-3">
              {nearbyRequests.map((req) => {
                const remaining = req.unitsNeeded - req.unitsAccepted;
                return (
                  <div key={req._id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">{req.patientName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${req.urgency === 'yes' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {req.urgency === 'yes' ? 'URGENT' : 'Normal'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Needs {req.bloodType} | {remaining} unit{remaining !== 1 ? 's' : ''} remaining | {req.hospitalName}, {req.city}
                      </p>
                    </div>
                    <button
                      onClick={() => setAcceptModal(req)}
                      className="px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors shrink-0"
                    >
                      Accept Request
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile Sections */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          {/* Personal Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-600 text-sm">Personal Information</h4>
              {editSection !== 'personal' && (
                <button onClick={() => startEdit('personal', { fullName: p.fullName || '', bloodGroup: p.bloodGroup || '', phone: p.phone || '', email: p.email || '', dob: p.dob || '', gender: p.gender || '' })}
                  className="text-xs text-brand-500 font-semibold border border-brand-500 px-3 py-1 rounded hover:bg-brand-50">Edit</button>
              )}
            </div>
            {editSection === 'personal' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label><input className={inputCls} value={formData.fullName || ''} onChange={e => setFormData({ ...formData, fullName: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Blood Group</label>
                    <select className={inputCls} value={formData.bloodGroup || ''} onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label><input className={inputCls} value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label><input className={inputCls} type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">DOB</label><input className={inputCls} type="date" value={formData.dob || ''} onChange={e => setFormData({ ...formData, dob: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                    <select className={inputCls} value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-700">Save</button>
                  <button onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                <div><strong>Name:</strong> {p.fullName || '-'}</div>
                <div><strong>Blood:</strong> {p.bloodGroup || '-'}</div>
                <div><strong>Phone:</strong> {p.phone || '-'}</div>
                <div><strong>Email:</strong> {p.email || '-'}</div>
                <div><strong>DOB:</strong> {p.dob || '-'}</div>
                <div><strong>Gender:</strong> {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '-'}</div>
              </div>
            )}
          </div>

          {/* Address Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-600 text-sm">Address</h4>
              {editSection !== 'address' && (
                <button onClick={() => startEdit('address', { address: p.address || '', city: p.city || '', district: p.district || '', ward: p.ward || '' })}
                  className="text-xs text-brand-500 font-semibold border border-brand-500 px-3 py-1.5 rounded hover:bg-brand-50">Edit</button>
              )}
            </div>
            {editSection === 'address' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Address</label><textarea className={`${inputCls} resize-y min-h-[60px]`} value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">City</label><input className={inputCls} value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">District</label><input className={inputCls} value={formData.district || ''} onChange={e => setFormData({ ...formData, district: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Ward</label><input className={inputCls} value={formData.ward || ''} onChange={e => setFormData({ ...formData, ward: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-700">Save</button>
                  <button onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                <div className="md:col-span-2"><span>Address:</span> {p.address || '-'}</div>
                <div><span>City:</span> {p.city || '-'}</div>
                <div><span>District:</span> {p.district || '-'}</div>
                <div><span>Ward:</span> {p.ward || '-'}</div>
              </div>
            )}
          </div>

          {/* Medical Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-600 text-sm">Medical Information</h4>
              {editSection !== 'medical' && (
                <button onClick={() => startEdit('medical', { weight: m.weight || '', height: m.height || '', conditions: m.conditions || [], onMedication: m.onMedication || false, medications: m.medications || '', habits: m.habits || [], recentDonation: m.recentDonation || false, additionalInfo: m.additionalInfo || '' })}
                  className="text-xs text-brand-500 font-semibold border border-brand-500 px-3 py-1.5 rounded hover:bg-brand-50">Edit</button>
              )}
            </div>
            {editSection === 'medical' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Weight (kg)</label><input className={inputCls} value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Height (cm)</label><input className={inputCls} value={formData.height || ''} onChange={e => setFormData({ ...formData, height: e.target.value })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Conditions</label><input className={inputCls} placeholder="Comma-separated" value={(formData.conditions || []).join(', ')} onChange={e => setFormData({ ...formData, conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">On Medication?</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={formData.onMedication || false} onChange={e => setFormData({ ...formData, onMedication: e.target.checked })} /> Yes</label></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Medications</label><input className={inputCls} value={formData.medications || ''} onChange={e => setFormData({ ...formData, medications: e.target.value })} disabled={!formData.onMedication} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Habits</label><input className={inputCls} placeholder="Comma-separated" value={(formData.habits || []).join(', ')} onChange={e => setFormData({ ...formData, habits: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Recent Donation?</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={formData.recentDonation || false} onChange={e => setFormData({ ...formData, recentDonation: e.target.checked })} /> Yes</label></div>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Additional Info</label><textarea className={`${inputCls} resize-y min-h-[60px]`} value={formData.additionalInfo || ''} onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })} /></div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-700">Save</button>
                  <button onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                <div><span>Weight:</span> {m.weight ? `${m.weight} kg` : '-'}</div>
                <div><span>Height:</span> {m.height ? `${m.height} cm` : '-'}</div>
                <div><span>Conditions:</span> {m.conditions && m.conditions.length ? m.conditions.join(', ') : 'None'}</div>
                <div><span>Medication:</span> {m.onMedication ? 'Yes' : 'No'}</div>
                <div><span>Medications:</span> {m.medications || 'N/A'}</div>
                <div><span>Habits:</span> {m.habits && m.habits.length ? m.habits.join(', ') : 'None'}</div>
                <div><span>Recent Donation:</span> {m.recentDonation ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Donation History */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
            <i className="fas fa-history text-brand-500" /> Donation History
          </h3>
          {donations.length === 0 ? (
            <EmptyState icon="📋" title="No donations yet" description="Start by accepting a request or recording a manual donation." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-3 font-semibold">Date</th>
                    <th className="text-left py-3 px-3 font-semibold">Patient</th>
                    <th className="text-left py-3 px-3 font-semibold">Center</th>
                    <th className="text-left py-3 px-3 font-semibold">Units</th>
                    <th className="text-left py-3 px-3 font-semibold">Type</th>
                    <th className="text-left py-3 px-3 font-semibold">Status</th>
                    <th className="text-left py-3 px-3 font-semibold">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3">{d.patientName || '-'}</td>
                      <td className="py-3 px-3">{d.center || '-'}</td>
                      <td className="py-3 px-3">{d.units || 450}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.type === 'request_accepted' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>
                          {d.type === 'request_accepted' ? 'Via Request' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-green-600 font-medium">{d.status}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => downloadCertificate(d._id)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Accept Modal */}
      {acceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setAcceptModal(null); setUnitsToAccept(1); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animation-scaleIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Accept Blood Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              You are accepting to donate for <strong>{acceptModal.patientName}</strong> ({acceptModal.bloodType}) at {acceptModal.hospitalName}.
            </p>
            <div className="bg-red-50 p-4 rounded-xl mb-4 text-sm space-y-1">
              <p><strong>Remaining units:</strong> {acceptModal.unitsNeeded - acceptModal.unitsAccepted}</p>
              <p><strong>Urgency:</strong> {acceptModal.urgency === 'yes' ? 'URGENT' : 'Normal'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Units to donate</label>
              <input type="number" min="1" max={acceptModal.unitsNeeded - acceptModal.unitsAccepted}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500"
                value={unitsToAccept} onChange={e => setUnitsToAccept(Number(e.target.value))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAccept(acceptModal._id)}
                className="flex-1 py-3 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 transition-colors">Confirm & Accept</button>
              <button onClick={() => { setAcceptModal(null); setUnitsToAccept(1); }}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
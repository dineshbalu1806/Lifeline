import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ---- shared inline styles (matches app's red/white theme) ----
const pageStyle = { background: '#f7f7f7', minHeight: '100vh' };
const containerStyle = { maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px' };
const cardStyle = { background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', marginBottom: 24 };
const sectionTitle = { fontSize: '1.15rem', fontWeight: 700, color: '#333', marginBottom: 16 };
const btnPrimary = { background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' };
const btnOutline = { background: 'transparent', color: '#d32f2f', border: '1.5px solid #d32f2f', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#444', marginBottom: 5 };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' };

const StatCard = ({ label, value, color }) => (
  <div style={{ ...cardStyle, textAlign: 'center', flex: '1 1 150px', marginBottom: 0 }}>
    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: color || '#d32f2f' }}>{value}</div>
    <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 4 }}>{label}</div>
  </div>
);

const Field = ({ label, name, value, onChange, type = 'text', options, textarea }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {options ? (
      <select name={name} value={value} onChange={onChange} style={inputStyle}>
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : textarea ? (
      <textarea name={name} value={value} onChange={onChange} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
    ) : (
      <input type={type} name={name} value={value} onChange={onChange} style={inputStyle} />
    )}
  </div>
);

const DonorDashboard = () => {
  const { updateDonor } = useAuth();
  const [donor, setDonor] = useState(null);
  const [donations, setDonations] = useState([]);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  // Modal state
  const [acceptModal, setAcceptModal] = useState(null); // request object
  const [unitsToAccept, setUnitsToAccept] = useState(1);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  const [editModal, setEditModal] = useState(null); // 'personal' | 'address' | 'medical' | null
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [donationModal, setDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({ date: '', center: '', patientName: '', patientPhone: '', units: 450 });
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationError, setDonationError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [profileRes, requestsRes] = await Promise.all([
        api.get('/donors/profile'),
        api.get('/requests/nearby'),
      ]);
      setDonor(profileRes.data.donor);
      setDonations(profileRes.data.donations || []);
      setNearbyRequests(requestsRes.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Accept request ----
  const openAcceptModal = (request) => {
    setAcceptModal(request);
    setUnitsToAccept(Math.max(1, request.unitsNeeded - request.unitsAccepted));
    setAcceptError('');
  };

  const handleAccept = async () => {
    if (!acceptModal) return;
    if (!unitsToAccept || unitsToAccept < 1) {
      setAcceptError('Enter a valid number of units.');
      return;
    }
    const remaining = acceptModal.unitsNeeded - acceptModal.unitsAccepted;
    if (unitsToAccept > remaining) {
      setAcceptError(`Cannot accept more than ${remaining} remaining units.`);
      return;
    }
    setAcceptSubmitting(true);
    setAcceptError('');
    try {
      await api.post(`/requests/${acceptModal._id}/accept`, { unitsToAccept: Number(unitsToAccept) });
      setAcceptModal(null);
      setBanner('Thank you! Your donation has been recorded and the requester notified.');
      await fetchData();
    } catch (err) {
      setAcceptError(err.response?.data?.message || 'Failed to accept request.');
    } finally {
      setAcceptSubmitting(false);
    }
  };

  // ---- Edit profile ----
  const openEditModal = (section) => {
    if (!donor) return;
    setEditError('');
    if (section === 'personal') {
      setEditForm({
        fullName: donor.personalInfo.fullName || '',
        bloodGroup: donor.personalInfo.bloodGroup || '',
        phone: donor.personalInfo.phone || '',
        email: donor.personalInfo.email || '',
        dob: donor.personalInfo.dob || '',
        gender: donor.personalInfo.gender || '',
      });
    } else if (section === 'address') {
      setEditForm({
        city: donor.personalInfo.city || '',
        district: donor.personalInfo.district || '',
        ward: donor.personalInfo.ward || '',
        address: donor.personalInfo.address || '',
      });
    } else if (section === 'medical') {
      setEditForm({
        weight: donor.medicalInfo.weight || '',
        height: donor.medicalInfo.height || '',
        onMedication: !!donor.medicalInfo.onMedication,
        medications: donor.medicalInfo.medications || '',
        recentDonation: !!donor.medicalInfo.recentDonation,
        additionalInfo: donor.medicalInfo.additionalInfo || '',
      });
    }
    setEditModal(section);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await api.put(`/donors/profile/${editModal}`, editForm);
      setDonor(res.data.donor);
      updateDonor(res.data.donor);
      setEditModal(null);
      setBanner('Profile updated successfully.');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- Manual donation ----
  const handleDonationChange = (e) => {
    const { name, value } = e.target;
    setDonationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDonation = async () => {
    if (!donationForm.date) {
      setDonationError('Please select a donation date.');
      return;
    }
    setDonationSubmitting(true);
    setDonationError('');
    try {
      await api.post('/donations', { ...donationForm, units: Number(donationForm.units) || 450 });
      setDonationModal(false);
      setDonationForm({ date: '', center: '', patientName: '', patientPhone: '', units: 450 });
      setBanner('Donation added to your history.');
      await fetchData();
    } catch (err) {
      setDonationError(err.response?.data?.message || 'Failed to add donation.');
    } finally {
      setDonationSubmitting(false);
    }
  };

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(''), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <Navbar />
        <div style={{ ...containerStyle, textAlign: 'center', paddingTop: 80, color: '#888' }}>Loading your dashboard...</div>
      </div>
    );
  }

  if (error && !donor) {
    return (
      <div style={pageStyle}>
        <Navbar />
        <div style={{ ...containerStyle, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: '#d32f2f' }}>{error}</p>
          <button style={btnPrimary} onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  const totalUnitsDonated = donations.reduce((sum, d) => sum + (d.units || 0), 0);

  return (
    <div style={pageStyle}>
      <Navbar />
      <div style={containerStyle}>
        {banner && (
          <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px 18px', borderRadius: 8, marginBottom: 20, fontSize: '0.9rem' }}>
            {banner}
          </div>
        )}

        <h1 style={{ color: '#d32f2f', marginBottom: 6 }}>
          Welcome back, {donor.personalInfo.fullName.split(' ')[0]}
        </h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Here's your donor overview and nearby requests.</p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatCard label="Blood Group" value={donor.personalInfo.bloodGroup} />
          <StatCard label="Total Donations" value={donations.length} />
          <StatCard label="Units Donated" value={totalUnitsDonated} color="#2e7d32" />
          <StatCard label="Nearby Requests" value={nearbyRequests.length} color="#e65100" />
          <StatCard
            label="Eligible to Donate"
            value={donor.eligibleToDonate ? 'Yes' : 'No'}
            color={donor.eligibleToDonate ? '#2e7d32' : '#d32f2f'}
          />
        </div>

        {/* Nearby requests */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={sectionTitle}>Nearby Blood Requests</div>
          </div>
          {nearbyRequests.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No matching open requests in your area right now.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888', borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '8px 10px' }}>Patient</th>
                    <th style={{ padding: '8px 10px' }}>Blood Type</th>
                    <th style={{ padding: '8px 10px' }}>Units Left</th>
                    <th style={{ padding: '8px 10px' }}>Hospital</th>
                    <th style={{ padding: '8px 10px' }}>Location</th>
                    <th style={{ padding: '8px 10px' }}>Urgency</th>
                    <th style={{ padding: '8px 10px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {nearbyRequests.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px' }}>{r.patientName}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#d32f2f' }}>{r.bloodType}</td>
                      <td style={{ padding: '10px' }}>{r.unitsNeeded - r.unitsAccepted}</td>
                      <td style={{ padding: '10px' }}>{r.hospitalName}</td>
                      <td style={{ padding: '10px' }}>{r.city}{r.district ? `, ${r.district}` : ''}</td>
                      <td style={{ padding: '10px' }}>
                        {r.urgency === 'yes' ? (
                          <span style={{ color: '#e65100', fontWeight: 600 }}>🚨 Urgent</span>
                        ) : (
                          <span style={{ color: '#888' }}>⏰ Planned</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button style={btnPrimary} onClick={() => openAcceptModal(r)}>Accept</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Profile cards */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ ...cardStyle, flex: '1 1 280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={sectionTitle}>Personal Info</div>
              <button style={btnOutline} onClick={() => openEditModal('personal')}>Edit</button>
            </div>
            <InfoRow label="Full Name" value={donor.personalInfo.fullName} />
            <InfoRow label="Blood Group" value={donor.personalInfo.bloodGroup} />
            <InfoRow label="Phone" value={donor.personalInfo.phone} />
            <InfoRow label="Email" value={donor.personalInfo.email} />
            <InfoRow label="Date of Birth" value={donor.personalInfo.dob || '—'} />
            <InfoRow label="Gender" value={donor.personalInfo.gender || '—'} />
          </div>

          <div style={{ ...cardStyle, flex: '1 1 280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={sectionTitle}>Address</div>
              <button style={btnOutline} onClick={() => openEditModal('address')}>Edit</button>
            </div>
            <InfoRow label="City" value={donor.personalInfo.city || '—'} />
            <InfoRow label="District" value={donor.personalInfo.district || '—'} />
            <InfoRow label="Ward" value={donor.personalInfo.ward || '—'} />
            <InfoRow label="Address" value={donor.personalInfo.address || '—'} />
          </div>

          <div style={{ ...cardStyle, flex: '1 1 280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={sectionTitle}>Medical Info</div>
              <button style={btnOutline} onClick={() => openEditModal('medical')}>Edit</button>
            </div>
            <InfoRow label="Weight" value={donor.medicalInfo.weight || '—'} />
            <InfoRow label="Height" value={donor.medicalInfo.height || '—'} />
            <InfoRow label="On Medication" value={donor.medicalInfo.onMedication ? 'Yes' : 'No'} />
            <InfoRow label="Recent Donation" value={donor.medicalInfo.recentDonation ? 'Yes' : 'No'} />
          </div>
        </div>

        {/* Donation history */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={sectionTitle}>Donation History</div>
            <button style={btnPrimary} onClick={() => setDonationModal(true)}>+ Add Donation</button>
          </div>
          {donations.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No donations recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888', borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Center / Hospital</th>
                    <th style={{ padding: '8px 10px' }}>Patient</th>
                    <th style={{ padding: '8px 10px' }}>Units (ml)</th>
                    <th style={{ padding: '8px 10px' }}>Type</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px' }}>{new Date(d.date).toLocaleDateString()}</td>
                      <td style={{ padding: '10px' }}>{d.center || '—'}</td>
                      <td style={{ padding: '10px' }}>{d.patientName || '—'}</td>
                      <td style={{ padding: '10px' }}>{d.units}</td>
                      <td style={{ padding: '10px', textTransform: 'capitalize' }}>{d.type.replace('_', ' ')}</td>
                      <td style={{ padding: '10px', color: '#2e7d32' }}>{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- Accept Request Modal ---- */}
      {acceptModal && (
        <div style={modalOverlay} onClick={() => setAcceptModal(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Accept Blood Request</h3>
            <InfoRow label="Patient" value={acceptModal.patientName} />
            <InfoRow label="Blood Type" value={acceptModal.bloodType} />
            <InfoRow label="Hospital" value={acceptModal.hospitalName} />
            <InfoRow label="Location" value={`${acceptModal.city}${acceptModal.district ? ', ' + acceptModal.district : ''}`} />
            <InfoRow label="Units Remaining" value={acceptModal.unitsNeeded - acceptModal.unitsAccepted} />

            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Units you can donate</label>
              <input
                type="number"
                min={1}
                max={acceptModal.unitsNeeded - acceptModal.unitsAccepted}
                value={unitsToAccept}
                onChange={(e) => setUnitsToAccept(e.target.value)}
                style={inputStyle}
              />
            </div>

            {acceptError && <div style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: 10 }}>{acceptError}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={btnOutline} onClick={() => setAcceptModal(null)}>Cancel</button>
              <button style={btnPrimary} disabled={acceptSubmitting} onClick={handleAccept}>
                {acceptSubmitting ? 'Confirming...' : 'Confirm Donation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit Profile Modals ---- */}
      {editModal && (
        <div style={modalOverlay} onClick={() => setEditModal(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#d32f2f', textTransform: 'capitalize' }}>Edit {editModal} Info</h3>

            {editModal === 'personal' && (
              <>
                <Field label="Full Name" name="fullName" value={editForm.fullName} onChange={handleEditChange} />
                <Field label="Blood Group" name="bloodGroup" value={editForm.bloodGroup} onChange={handleEditChange} options={BLOOD_TYPES} />
                <Field label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} />
                <Field label="Email" name="email" value={editForm.email} onChange={handleEditChange} type="email" />
                <Field label="Date of Birth" name="dob" value={editForm.dob} onChange={handleEditChange} type="date" />
                <Field label="Gender" name="gender" value={editForm.gender} onChange={handleEditChange} options={['male', 'female', 'other']} />
              </>
            )}

            {editModal === 'address' && (
              <>
                <Field label="City" name="city" value={editForm.city} onChange={handleEditChange} />
                <Field label="District" name="district" value={editForm.district} onChange={handleEditChange} />
                <Field label="Ward" name="ward" value={editForm.ward} onChange={handleEditChange} />
                <Field label="Address" name="address" value={editForm.address} onChange={handleEditChange} textarea />
              </>
            )}

            {editModal === 'medical' && (
              <>
                <Field label="Weight (kg)" name="weight" value={editForm.weight} onChange={handleEditChange} />
                <Field label="Height (cm)" name="height" value={editForm.height} onChange={handleEditChange} />
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="onMedication" checked={!!editForm.onMedication} onChange={handleEditChange} id="onMedication" />
                  <label htmlFor="onMedication" style={{ fontSize: '0.85rem' }}>Currently on medication</label>
                </div>
                <Field label="Medications" name="medications" value={editForm.medications} onChange={handleEditChange} textarea />
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="recentDonation" checked={!!editForm.recentDonation} onChange={handleEditChange} id="recentDonation" />
                  <label htmlFor="recentDonation" style={{ fontSize: '0.85rem' }}>Donated recently</label>
                </div>
                <Field label="Additional Info" name="additionalInfo" value={editForm.additionalInfo} onChange={handleEditChange} textarea />
              </>
            )}

            {editError && <div style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: 6 }}>{editError}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button style={btnOutline} onClick={() => setEditModal(null)}>Cancel</button>
              <button style={btnPrimary} disabled={editSubmitting} onClick={handleEditSave}>
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Add Manual Donation Modal ---- */}
      {donationModal && (
        <div style={modalOverlay} onClick={() => setDonationModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Add Donation Record</h3>
            <Field label="Donation Date" name="date" value={donationForm.date} onChange={handleDonationChange} type="date" />
            <Field label="Center / Hospital" name="center" value={donationForm.center} onChange={handleDonationChange} />
            <Field label="Patient Name (if applicable)" name="patientName" value={donationForm.patientName} onChange={handleDonationChange} />
            <Field label="Patient Phone" name="patientPhone" value={donationForm.patientPhone} onChange={handleDonationChange} />
            <Field label="Units (ml)" name="units" value={donationForm.units} onChange={handleDonationChange} type="number" />

            {donationError && <div style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: 6 }}>{donationError}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button style={btnOutline} onClick={() => setDonationModal(false)}>Cancel</button>
              <button style={btnPrimary} disabled={donationSubmitting} onClick={handleAddDonation}>
                {donationSubmitting ? 'Saving...' : 'Add Donation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: '0.88rem' }}>
    <span style={{ color: '#888' }}>{label}</span>
    <span style={{ fontWeight: 600, color: '#333' }}>{value}</span>
  </div>
);

export default DonorDashboard;

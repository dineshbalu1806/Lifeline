import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Any'];

const initialForm = {
  requesterName: '',
  requesterPhone: '',
  requesterEmail: '',
  relationship: '',
  patientName: '',
  patientAge: '',
  bloodType: '',
  unitsNeeded: '',
  reason: '',
  medicalInfo: '',
  hospitalName: '',
  hospitalAddress: '',
  hospitalPhone: '',
  doctorName: '',
  city: '',
  district: '',
  ward: '',
  urgency: 'no',
  bloodNeededBy: 'week',
};

const RequestBlood = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [notifiedDonors, setNotifiedDonors] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.requesterName.trim()) newErrors.requesterName = 'Required';
    if (!formData.requesterPhone.trim()) newErrors.requesterPhone = 'Required';
    if (!formData.patientName.trim()) newErrors.patientName = 'Required';
    if (!formData.bloodType) newErrors.bloodType = 'Required';
    if (!formData.unitsNeeded || Number(formData.unitsNeeded) < 1) newErrors.unitsNeeded = 'Enter at least 1 unit';
    if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.district.trim()) newErrors.district = 'Required';
    if (!formData.ward.trim()) newErrors.ward = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        patientAge: formData.patientAge ? Number(formData.patientAge) : undefined,
        unitsNeeded: Number(formData.unitsNeeded),
      };
      const res = await api.post('/requests', payload);
      const request = res.data.request;
      setRequestId(request._id);
      setNotifiedDonors(request.notifiedDonors || []);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- styles (matches app's inline-style red/white theme) ----
  const pageStyle = { background: '#f7f7f7', minHeight: '100vh' };
  const containerStyle = { maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' };
  const cardStyle = { background: '#fff', borderRadius: 12, padding: '32px 36px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' };
  const titleStyle = { color: '#d32f2f', fontSize: '1.8rem', marginBottom: 6 };
  const subStyle = { color: '#666', marginBottom: 28 };
  const sectionTitle = { fontSize: '1.05rem', fontWeight: 700, color: '#333', margin: '28px 0 14px', borderBottom: '2px solid #f0d5d5', paddingBottom: 8 };
  const row = { display: 'flex', gap: 16, flexWrap: 'wrap' };
  const fieldWrap = { flex: '1 1 220px', marginBottom: 18 };
  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#444', marginBottom: 6 };
  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1.5px solid ${hasError ? '#d32f2f' : '#ddd'}`,
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  });
  const errorText = { color: '#d32f2f', fontSize: '0.78rem', marginTop: 4 };
  const submitBtn = {
    width: '100%',
    padding: '14px',
    background: submitting ? '#e57373' : '#d32f2f',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 700,
    cursor: submitting ? 'not-allowed' : 'pointer',
    marginTop: 10,
  };

  const Field = ({ name, label, type = 'text', options, textarea, required }) => (
    <div style={fieldWrap}>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      {options ? (
        <select name={name} value={formData[name]} onChange={handleChange} style={inputStyle(errors[name])}>
          <option value="">Select...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea name={name} value={formData[name]} onChange={handleChange} rows={3} style={{ ...inputStyle(errors[name]), resize: 'vertical' }} />
      ) : (
        <input type={type} name={name} value={formData[name]} onChange={handleChange} style={inputStyle(errors[name])} />
      )}
      {errors[name] && <div style={errorText}>{errors[name]}</div>}
    </div>
  );

  if (success) {
    return (
      <div style={pageStyle}>
        <Navbar />
        <div style={containerStyle}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>✅</div>
            <h1 style={{ color: '#2e7d32', marginBottom: 8 }}>Request Submitted!</h1>
            <p style={{ color: '#666', marginBottom: 20 }}>
              Your blood request has been created and nearby matching donors have been notified.
            </p>
            <div style={{ background: '#f7f7f7', borderRadius: 8, padding: '14px 20px', display: 'inline-block', marginBottom: 24 }}>
              <span style={{ fontSize: '0.85rem', color: '#888' }}>Request ID</span>
              <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700 }}>{requestId}</div>
            </div>

            <h3 style={{ textAlign: 'left', fontSize: '1.05rem', margin: '10px 0 12px' }}>
              Notified Donors ({notifiedDonors.length})
            </h3>
            {notifiedDonors.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'left' }}>
                No matching donors were found in your city yet. We'll keep this request open.
              </p>
            ) : (
              <div style={{ textAlign: 'left', maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                {notifiedDonors.map((d, i) => (
                  <div
                    key={d.donorId || i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderBottom: i < notifiedDonors.length - 1 ? '1px solid #f0f0f0' : 'none',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span>{d.donorName}</span>
                    <span style={{ color: '#888' }}>{d.donorPhone}</span>
                  </div>
                ))}
              </div>
            )}

            {formData.urgency === 'yes' && (
              <div style={{ background: '#fff3e0', color: '#e65100', padding: '12px 16px', borderRadius: 8, marginTop: 20, fontSize: '0.9rem' }}>
                🚨 This was marked as an urgent request — donors have been alerted accordingly.
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              style={{ ...submitBtn, marginTop: 28, background: '#d32f2f' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Navbar />
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Request Blood</h1>
          <p style={subStyle}>Fill in the details below. We'll notify compatible donors near you immediately.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={sectionTitle}>Requester Details</div>
            <div style={row}>
              <Field name="requesterName" label="Your Full Name" required />
              <Field name="requesterPhone" label="Phone Number" required />
              <Field name="requesterEmail" label="Email" type="email" />
              <Field name="relationship" label="Relationship to Patient" />
            </div>

            <div style={sectionTitle}>Patient Details</div>
            <div style={row}>
              <Field name="patientName" label="Patient Name" required />
              <Field name="patientAge" label="Patient Age" type="number" />
              <Field
                name="bloodType"
                label="Blood Type Needed"
                required
                options={BLOOD_TYPES.map((b) => ({ value: b, label: b }))}
              />
              <Field name="unitsNeeded" label="Units Needed" type="number" required />
            </div>
            <div style={row}>
              <Field name="reason" label="Reason / Diagnosis" />
              <Field name="medicalInfo" label="Additional Medical Info" textarea />
            </div>

            <div style={sectionTitle}>Hospital Details</div>
            <div style={row}>
              <Field name="hospitalName" label="Hospital Name" required />
              <Field name="hospitalPhone" label="Hospital Phone" />
              <Field name="doctorName" label="Doctor's Name" />
              <Field name="hospitalAddress" label="Hospital Address" />
            </div>

            <div style={sectionTitle}>Location</div>
            <p style={{ fontSize: '0.82rem', color: '#888', marginTop: -8, marginBottom: 14 }}>
              City, district, and ward are used to match you with nearby donors — please be precise.
            </p>
            <div style={row}>
              <Field name="city" label="City" required />
              <Field name="district" label="District" required />
              <Field name="ward" label="Ward" required />
            </div>

            <div style={sectionTitle}>Urgency</div>
            <div style={row}>
              <Field
                name="urgency"
                label="Is this urgent?"
                options={[
                  { value: 'no', label: 'No, it can be planned' },
                  { value: 'yes', label: 'Yes, urgent' },
                ]}
              />
              <Field
                name="bloodNeededBy"
                label="Blood Needed By"
                options={[
                  { value: 'immediate', label: 'Immediately' },
                  { value: '24hours', label: 'Within 24 hours' },
                  { value: '2days', label: 'Within 2 days' },
                  { value: 'week', label: 'Within a week' },
                ]}
              />
            </div>

            {submitError && (
              <div style={{ background: '#ffebee', color: '#d32f2f', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
                {submitError}
              </div>
            )}

            <button type="submit" disabled={submitting} style={submitBtn}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestBlood;

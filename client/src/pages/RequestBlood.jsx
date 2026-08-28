import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Any'];

const RequestBlood = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    requesterName: '', requesterPhone: '', requesterEmail: '', relationship: '',
    patientName: '', patientAge: '', bloodType: '', unitsNeeded: 1,
    reason: '', medicalInfo: '',
    hospitalName: '', city: '', district: '', ward: '',
    hospitalAddress: '', hospitalPhone: '', doctorName: '',
    urgency: 'no', bloodNeededBy: 'week',
  });

  const update = (field, value) => setForm({ ...form, [field]: value });

  const validateStep = () => {
    const errs = {};
    if (step === 1) {
      if (!form.requesterName) errs.requesterName = 'Required';
      if (!form.requesterPhone || form.requesterPhone.replace(/\D/g, '').length < 10) errs.requesterPhone = 'Valid phone required';
      if (!form.bloodType) errs.bloodType = 'Required';
      if (!form.unitsNeeded || form.unitsNeeded < 1) errs.unitsNeeded = 'Min 1 unit';
    }
    if (step === 2) {
      if (!form.patientName) errs.patientName = 'Required';
      if (!form.hospitalName) errs.hospitalName = 'Required';
      if (!form.city) errs.city = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);

    let coordinates = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
        });
        coordinates = [pos.coords.longitude, pos.coords.latitude];
      }
    } catch { /* ignore */ }

    try {
      const payload = {
        ...form,
        patientAge: form.patientAge ? Number(form.patientAge) : undefined,
        unitsNeeded: Number(form.unitsNeeded),
      };
      if (coordinates) payload.coordinates = coordinates;

      const res = await api.post('/requests', payload);
      setResult(res.data.request);
      setStep(4);
      addToast('Blood request submitted successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit. Please try again.';
      setErrors({ form: msg });
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const notifiedCount = result.notifiedDonors ? result.notifiedDonors.length : 0;
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-brand-600 text-white px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <i className="fas fa-hand-holding-medical" /> LifeLine
          </Link>
        </header>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-5">
              &#10003;
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Request Submitted!</h2>
            <p className="text-gray-500 mb-6">Request for <strong>{result.patientName}</strong> created.</p>
            <div className="bg-red-50 rounded-xl p-5 text-left mb-6 space-y-2">
              <h4 className="font-semibold text-gray-800">Request Summary</h4>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-gray-500">Blood Type:</span><span className="font-semibold">{result.bloodType}</span>
                <span className="text-gray-500">Units:</span><span className="font-semibold">{result.unitsNeeded}</span>
                <span className="text-gray-500">Hospital:</span><span className="font-semibold">{result.hospitalName}</span>
                <span className="text-gray-500">City:</span><span className="font-semibold">{result.city}</span>
                <span className="text-gray-500">Status:</span><span className="font-semibold text-green-600">{result.status}</span>
              </div>
            </div>
            <div className={`rounded-xl p-4 mb-6 text-sm ${notifiedCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
              {notifiedCount > 0
                ? `${notifiedCount} donor${notifiedCount !== 1 ? 's have' : ' has'} been notified.`
                : 'No matching donors found nearby. Check back later.'}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('/')} className="px-8 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors">
                Back to Home
              </button>
              <button onClick={() => { setResult(null); setStep(1); setForm({ requesterName: '', requesterPhone: '', requesterEmail: '', relationship: '', patientName: '', patientAge: '', bloodType: '', unitsNeeded: 1, reason: '', medicalInfo: '', hospitalName: '', city: '', district: '', ward: '', hospitalAddress: '', hospitalPhone: '', doctorName: '', urgency: 'no', bloodNeededBy: 'week' }); }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = (field) =>
    `w-full px-3 py-2.5 border-2 rounded-lg text-sm outline-none transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-brand-500'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-600 text-white px-4 sm:px-8 py-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <i className="fas fa-hand-holding-medical" /> LifeLine
        </Link>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step >= s ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{s}</div>
                {s < 3 && <div className={`w-12 h-1 rounded transition-all ${step > s ? 'bg-brand-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
            {step === 1 && 'Requester & Blood Details'}
            {step === 2 && 'Patient & Hospital Information'}
            {step === 3 && 'Additional Details & Submit'}
          </h2>
          <p className="text-sm text-center text-gray-400 mb-6">
            {step === 1 && 'Tell us about yourself and what blood type is needed'}
            {step === 2 && 'Provide the patient and hospital information'}
            {step === 3 && 'Any extra details and final review'}
          </p>

          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">{errors.form}</div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-name">Your Name *</label>
                  <input id="rq-name" className={inputCls('requesterName')} value={form.requesterName} onChange={e => update('requesterName', e.target.value)} placeholder="Your full name" />
                  {errors.requesterName && <p className="text-red-500 text-xs mt-1">{errors.requesterName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-phone">Your Phone *</label>
                  <input id="rq-phone" className={inputCls('requesterPhone')} value={form.requesterPhone} onChange={e => update('requesterPhone', e.target.value)} placeholder="Phone number" />
                  {errors.requesterPhone && <p className="text-red-500 text-xs mt-1">{errors.requesterPhone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-email">Email</label>
                  <input id="rq-email" type="email" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.requesterEmail} onChange={e => update('requesterEmail', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-rel">Relationship</label>
                  <select id="rq-rel" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.relationship} onChange={e => update('relationship', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Self">Self</option><option value="Family">Family</option>
                    <option value="Friend">Friend</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-blood">Blood Type *</label>
                  <select id="rq-blood" className={inputCls('bloodType')} value={form.bloodType} onChange={e => update('bloodType', e.target.value)}>
                    <option value="">Select</option>
                    {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                  {errors.bloodType && <p className="text-red-500 text-xs mt-1">{errors.bloodType}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-units">Units Needed *</label>
                  <input id="rq-units" type="number" min="1" className={inputCls('unitsNeeded')} value={form.unitsNeeded} onChange={e => update('unitsNeeded', e.target.value)} />
                  {errors.unitsNeeded && <p className="text-red-500 text-xs mt-1">{errors.unitsNeeded}</p>}
                </div>
              </div>
              <div className="pt-2">
                <button onClick={() => { if (validateStep()) { setErrors({}); setStep(2); } }} className="px-8 py-3 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700">Next</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 text-sm">Patient Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-patient">Patient Name *</label>
                  <input id="rq-patient" className={inputCls('patientName')} value={form.patientName} onChange={e => update('patientName', e.target.value)} placeholder="Patient's full name" />
                  {errors.patientName && <p className="text-red-500 text-xs mt-1">{errors.patientName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-age">Age</label>
                  <input id="rq-age" type="number" min="0" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.patientAge} onChange={e => update('patientAge', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-reason">Reason</label>
                  <input id="rq-reason" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="e.g. Surgery" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-medinfo">Medical Notes</label>
                  <textarea id="rq-medinfo" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500 resize-y min-h-[60px]" value={form.medicalInfo} onChange={e => update('medicalInfo', e.target.value)} />
                </div>
              </div>

              <h4 className="font-semibold text-gray-700 text-sm pt-2">Hospital & Location</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-hospital">Hospital *</label>
                  <input id="rq-hospital" className={inputCls('hospitalName')} value={form.hospitalName} onChange={e => update('hospitalName', e.target.value)} placeholder="Hospital name" />
                  {errors.hospitalName && <p className="text-red-500 text-xs mt-1">{errors.hospitalName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-city">City *</label>
                  <input id="rq-city" className={inputCls('city')} value={form.city} onChange={e => update('city', e.target.value)} placeholder="City" />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-dist">District</label>
                  <input id="rq-dist" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.district} onChange={e => update('district', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-ward">Ward</label>
                  <input id="rq-ward" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.ward} onChange={e => update('ward', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-addr">Address</label>
                  <textarea id="rq-addr" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500 resize-y min-h-[60px]" value={form.hospitalAddress} onChange={e => update('hospitalAddress', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-hphone">Hospital Phone</label>
                  <input id="rq-hphone" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.hospitalPhone} onChange={e => update('hospitalPhone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-doctor">Doctor</label>
                  <input id="rq-doctor" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.doctorName} onChange={e => update('doctorName', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600">Back</button>
                <button onClick={() => { if (validateStep()) { setErrors({}); setStep(3); } }} className="px-6 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700">Next</button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 text-sm">Urgency & Timing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-urgent">Urgent?</label>
                  <select id="rq-urgent" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.urgency} onChange={e => update('urgency', e.target.value)}>
                    <option value="no">No</option>
                    <option value="yes">Yes, urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="rq-by">Needed By</label>
                  <select id="rq-by" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500" value={form.bloodNeededBy} onChange={e => update('bloodNeededBy', e.target.value)}>
                    <option value="immediate">Immediately</option>
                    <option value="24hours">Within 24h</option>
                    <option value="2days">Within 2 days</option>
                    <option value="week">Within a week</option>
                  </select>
                </div>
              </div>

              <h4 className="font-semibold text-gray-700 text-sm pt-2">Review</h4>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-sm space-y-1.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-gray-500">Requester:</span><span className="font-medium">{form.requesterName}</span>
                  <span className="text-gray-500">Blood Type:</span><span className="font-medium">{form.bloodType}</span>
                  <span className="text-gray-500">Units:</span><span className="font-medium">{form.unitsNeeded}</span>
                  <span className="text-gray-500">Patient:</span><span className="font-medium">{form.patientName}</span>
                  <span className="text-gray-500">Hospital:</span><span className="font-medium">{form.hospitalName}</span>
                  <span className="text-gray-500">City:</span><span className="font-medium">{form.city}</span>
                  <span className="text-gray-500">Urgent:</span><span className="font-medium">{form.urgency === 'yes' ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600">Back</button>
                <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestBlood;
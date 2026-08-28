import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";

const STEPS = ["Personal Info", "Medical Info", "Documents", "Verification", "Password"];

const initialForm = {
  name: "", bloodGroup: "", phone: "", email: "",
  address: "", city: "", district: "", ward: "", dob: "", gender: "",
  weight: "", height: "",
  conditions: [], onMedication: false, medications: "", habits: [],
  recentDonation: "", additionalInfo: "",
  password: "", confirmPassword: ""
};

const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const conditions = ["diabetes","hypertension","heartDisease","hivAids","hepatitis"];
const habits = ["smoking","alcohol","drugs"];

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [govId, setGovId] = useState(null);
  const [medCert, setMedCert] = useState(null);

  const upd = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const toggleArray = (field, val) => setForm(prev => {
    const arr = prev[field];
    return { ...prev, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.name || form.name.length < 3) errs.name = "Min 3 characters";
      if (!form.bloodGroup) errs.bloodGroup = "Required";
      if (!form.phone || form.phone.replace(/\D/g, '').length < 10) errs.phone = "Valid phone number (10+ digits)";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Valid email required";
      if (!form.address || form.address.length < 5) errs.address = "Min 5 characters";
      if (!form.city) errs.city = "Required";
      if (!form.district) errs.district = "Required";
      if (!form.ward) errs.ward = "Required";
      if (!form.dob) errs.dob = "Required";
      if (!form.gender) errs.gender = "Required";
    }
    if (s === 2) {
      if (!form.weight || parseFloat(form.weight) < 50) errs.weight = "Must be at least 50 kg";
      if (!form.height || parseFloat(form.height) <= 0) errs.height = "Required";
      if (!form.recentDonation) errs.recentDonation = "Please answer";
    }
    if (s === 3) {
      if (!govId) errs.govId = "Please upload";
      if (!medCert) errs.medCert = "Please upload";
    }
    if (s === 5) {
      if (!form.password || form.password.length < 8) errs.password = "Min 8 characters";
      else {
        if (!/[A-Z]/.test(form.password)) errs.password = "Must contain uppercase letter";
        else if (!/[0-9]/.test(form.password)) errs.password = "Must contain a number";
      }
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step === 3) {
      setStep(4);
      setVerifying(true);
      setTimeout(() => { setVerifying(false); setVerified(true); }, 4000);
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => { setErrors({}); setStep(s => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;
    setLoading(true);

    let location = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
        });
        location = { coordinates: [pos.coords.longitude, pos.coords.latitude] };
      }
    } catch { /* ignore */ }

    try {
      const payload = {
        personalInfo: {
          fullName: form.name, bloodGroup: form.bloodGroup,
          phone: form.phone, email: form.email,
          address: form.address, city: form.city,
          district: form.district, ward: form.ward,
          dob: form.dob, gender: form.gender
        },
        medicalInfo: {
          weight: form.weight, height: form.height,
          conditions: form.conditions, onMedication: form.onMedication,
          medications: form.medications, habits: form.habits,
          recentDonation: form.recentDonation === "yes",
          additionalInfo: form.additionalInfo
        },
        password: form.password,
      };
      if (location) payload.location = location;

      const res = await api.post("/auth/register", payload);
      login(res.data.token, res.data.donor);
      addToast("Registration successful! Welcome to LifeLine.", "success");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setErrors({ form: msg });
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p)) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    const labels = ["Very Weak","Weak","Fair","Good","Strong"];
    const colors = ["text-red-700","text-orange-600","text-yellow-600","text-green-600","text-green-700"];
    return p ? { label: labels[s-1] || "Very Weak", color: colors[s-1] || "text-red-700" } : null;
  };

  const inputCls = (field) =>
    `w-full px-3 py-2.5 border-2 rounded-lg text-sm outline-none transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-brand-500'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-800 py-6 px-4">
      <Navbar />
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden mt-6">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 px-8 py-8 text-center text-white">
          <h1 className="text-2xl font-bold">Donor Registration</h1>
          <p className="text-sm opacity-80 mt-1">Join us in saving lives through blood donation</p>
        </div>

        {/* Progress */}
        <div className="flex px-6 py-5 bg-gray-50 border-b border-gray-100">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={num} className="flex-1 text-center">
                <div className={`w-9 h-9 rounded-full inline-flex items-center justify-center font-bold text-xs mx-auto mb-1 ${
                  done ? 'bg-green-500 text-white' : active ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {done ? '\u2713' : num}
                </div>
                <div className={`text-[11px] ${done ? 'text-green-600' : active ? 'text-brand-600 font-semibold' : 'text-gray-400'}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 sm:px-8 py-8">
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">{errors.form}</div>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-gray-800 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-name">Full Name *</label>
                  <input id="r-name" className={inputCls('name')} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Enter your full name" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-blood">Blood Group *</label>
                  <select id="r-blood" className={inputCls('bloodGroup')} value={form.bloodGroup} onChange={e => upd('bloodGroup', e.target.value)}>
                    <option value="">Select</option>
                    {bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-phone">Phone *</label>
                  <input id="r-phone" className={inputCls('phone')} value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+1 234 567 8900" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-email">Email *</label>
                  <input id="r-email" type="email" className={inputCls('email')} value={form.email} onChange={e => upd('email', e.target.value)} placeholder="you@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-address">Address *</label>
                <textarea id="r-address" className={inputCls('address')} rows="2" value={form.address} onChange={e => upd('address', e.target.value)} placeholder="Complete address" />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-city">City *</label>
                  <input id="r-city" className={inputCls('city')} value={form.city} onChange={e => upd('city', e.target.value)} placeholder="e.g. New York" />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-district">District *</label>
                  <input id="r-district" className={inputCls('district')} value={form.district} onChange={e => upd('district', e.target.value)} placeholder="e.g. Manhattan" />
                  {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-ward">Ward *</label>
                  <input id="r-ward" className={inputCls('ward')} value={form.ward} onChange={e => upd('ward', e.target.value)} placeholder="e.g. Ward A" />
                  {errors.ward && <p className="text-red-500 text-xs mt-1">{errors.ward}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-dob">Date of Birth *</label>
                  <input id="r-dob" className={inputCls('dob')} value={form.dob} onChange={e => upd('dob', e.target.value)} placeholder="DD/MM/YYYY" />
                  {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender *</label>
                  <div className="flex gap-4 pt-1">
                    {["male","female","other"].map(g => (
                      <label key={g} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" name="gender" value={g} checked={form.gender===g} onChange={() => upd('gender', g)} className="accent-brand-500" />
                        {g.charAt(0).toUpperCase()+g.slice(1)}
                      </label>
                    ))}
                  </div>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>
              </div>
              <div className="pt-4">
                <button className="w-full sm:w-auto px-8 py-3 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 transition-colors" onClick={handleNext}>
                  Next: Medical Information
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Medical Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-gray-800 mb-2">Medical Information</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm px-4 py-3 rounded">
                Please provide accurate medical information to ensure safe blood donation.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-weight">Weight (kg) *</label>
                  <input id="r-weight" className={inputCls('weight')} value={form.weight} onChange={e => upd('weight', e.target.value)} placeholder="Min. 50 kg" />
                  {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-height">Height (cm) *</label>
                  <input id="r-height" className={inputCls('height')} value={form.height} onChange={e => upd('height', e.target.value)} placeholder="Height in cm" />
                  {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Medical Conditions</label>
                <div className="flex flex-wrap gap-4">
                  {conditions.map(cond => (
                    <label key={cond} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.conditions.includes(cond)} onChange={() => toggleArray("conditions", cond)} className="accent-brand-500" />
                      {cond.charAt(0).toUpperCase()+cond.slice(1).replace(/([A-Z])/g," $1")}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.conditions.length===0} onChange={() => upd("conditions",[])} className="accent-brand-500" />
                    <strong>None</strong>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Currently taking medications?</label>
                <div className="flex gap-4">
                  {["yes","no"].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="medication" value={v} checked={form.onMedication===(v==="yes")} onChange={() => upd("onMedication",v==="yes")} className="accent-brand-500" />
                      {v.charAt(0).toUpperCase()+v.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              {form.onMedication && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-meds">Specify medications</label>
                  <textarea id="r-meds" className={inputCls('medications')} rows="2" value={form.medications} onChange={e => upd("medications",e.target.value)} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Lifestyle Habits</label>
                <div className="flex flex-wrap gap-4">
                  {habits.map(h => (
                    <label key={h} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.habits.includes(h)} onChange={() => toggleArray("habits",h)} className="accent-brand-500" />
                      {h.charAt(0).toUpperCase()+h.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Donated blood in last 3 months? *</label>
                <div className="flex gap-4">
                  {["yes","no"].map(v => (
                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="recentDonation" value={v} checked={form.recentDonation===v} onChange={() => upd("recentDonation",v)} className="accent-brand-500" />
                      {v.charAt(0).toUpperCase()+v.slice(1)}
                    </label>
                  ))}
                </div>
                {errors.recentDonation && <p className="text-red-500 text-xs mt-1">{errors.recentDonation}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600" onClick={handleBack}>Back</button>
                <button className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700" onClick={handleNext}>Next: Upload Documents</button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg text-gray-800 mb-2">Document Upload</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm px-4 py-3 rounded">
                Upload Government ID and Medical Certificate. Files are simulated and not stored.
              </div>
              {[
                { id: "govId", label: "Government-issued ID *", state: govId, setter: setGovId },
                { id: "medCert", label: "Medical Certificate *", state: medCert, setter: setMedCert },
              ].map(doc => (
                <div key={doc.id}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{doc.label}</label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      doc.state ? 'border-green-400 bg-green-50' : errors[doc.id] ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-brand-400'
                    }`}
                    onClick={() => document.getElementById(doc.id).click()}
                  >
                    <input id={doc.id} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files[0] && doc.setter(e.target.files[0])} />
                    {doc.state ? (
                      <p className="text-green-600 text-sm font-medium">{doc.state.name} uploaded</p>
                    ) : (
                      <>
                        <p className="text-gray-500 text-sm">Click to upload or drag and drop</p>
                        <p className="text-gray-400 text-xs mt-1">PDF, JPG, PNG (Max 5MB)</p>
                      </>
                    )}
                  </div>
                  {errors[doc.id] && <p className="text-red-500 text-xs mt-1">{errors[doc.id]}</p>}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600" onClick={handleBack}>Back</button>
                <button className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700" onClick={handleNext}>Verify Documents</button>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg text-gray-800 mb-2">Document Verification</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-5">
                <h3 className="font-semibold text-blue-700 mb-3">Automated Verification in Progress</h3>
                {verifying && (
                  <div className="space-y-3">
                    {["Verifying Government ID...","Verifying Medical Certificate...","Cross-checking information..."].map((msg,i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-blue-600">{msg}</span>
                      </div>
                    ))}
                  </div>
                )}
                {verified && (
                  <div className="space-y-3">
                    {["Government ID verified","Medical Certificate verified","Information validated"].map((msg,i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-green-700">
                        <span className="text-green-500 font-bold">&#10003;</span> {msg}
                      </div>
                    ))}
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mt-3">
                      <h4 className="font-semibold text-green-700">All Checks Passed!</h4>
                      <p className="text-sm text-green-600">Your documents have been verified. Proceed to set your password.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600" onClick={handleBack}>Back</button>
                {verified && <button className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700" onClick={() => setStep(5)}>Set Password</button>}
              </div>
            </div>
          )}

          {/* Step 5: Password */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-bold text-lg text-gray-800">Create Your Account</h2>
              <div className="bg-green-50 border-l-4 border-green-400 text-green-700 text-sm px-4 py-3 rounded">
                Verification Successful! Please create a password to complete your registration.
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-pw">Create Password *</label>
                <input id="r-pw" type="password" className={inputCls('password')} value={form.password} onChange={e => upd("password",e.target.value)} placeholder="Min 8 chars, uppercase + number" />
                {form.password && (() => {
                  const s = pwStrength(form.password);
                  return s ? <p className={`text-xs font-semibold mt-1 ${s.color}`}>Strength: {s.label}</p> : null;
                })()}
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="r-cpw">Confirm Password *</label>
                <input id="r-cpw" type="password" className={inputCls('confirmPassword')} value={form.confirmPassword} onChange={e => upd("confirmPassword",e.target.value)} placeholder="Re-enter password" />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600" onClick={handleBack}>Back</button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-700 disabled:opacity-60">
                  {loading ? "Creating Account..." : "Complete Registration"}
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 pt-2">
                Already have an account? <Link to="/login" className="text-brand-500 font-semibold">Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const STEPS = ["Personal Info", "Medical Info", "Documents", "Verification", "Password"];

const initialForm = {
  fullName: "", bloodGroup: "", phone: "", email: "",
  address: "", city: "", district: "", ward: "", dob: "", gender: "",
  weight: "", height: "",
  conditions: [], onMedication: false, medications: "", habits: [],
  recentDonation: "", additionalInfo: "",
  password: "", confirmPassword: ""
};

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
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

  const validate = (s) => {
    if (s === 1) {
      if (!form.fullName || form.fullName.length < 3) return "Full name is required (min 3 chars)";
      if (!form.bloodGroup) return "Please select blood group";
      if (!form.phone || form.phone.length < 10) return "Valid phone number is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Valid email is required";
      if (!form.address || form.address.length < 5) return "Address is required";
      if (!form.city) return "City is required";
      if (!form.district) return "District is required";
      if (!form.ward) return "Ward is required";
      if (!form.dob) return "Date of birth is required";
      if (!form.gender) return "Please select gender";
    }
    if (s === 2) {
      if (!form.weight || parseFloat(form.weight) < 50) return "Weight must be at least 50 kg";
      if (!form.height || parseFloat(form.height) <= 0) return "Height is required";
      if (!form.recentDonation) return "Please answer the recent donation question";
    }
    if (s === 3) {
      if (!govId || !medCert) return "Please upload Government ID and Medical Certificate";
    }
    if (s === 5) {
      if (!form.password || form.password.length < 8) return "Password must be at least 8 characters";
      if (form.password !== form.confirmPassword) return "Passwords do not match";
      if (!/[A-Z]/.test(form.password)) return "Password must contain at least one uppercase letter";
      if (!/[0-9]/.test(form.password)) return "Password must contain at least one number";
    }
    return null;
  };

  const handleNext = () => {
    setError("");
    const err = validate(step);
    if (err) { setError(err); return; }
    if (step === 3) {
      setStep(4);
      setVerifying(true);
      setTimeout(() => { setVerifying(false); setVerified(true); }, 4000);
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(""); setStep(s => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const err = validate(5);
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        personalInfo: {
          fullName: form.fullName, bloodGroup: form.bloodGroup,
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
        password: form.password
      });
      login(res.data.token, res.data.donor);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
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
    const colors = ["#c62828","#ef6c00","#fbc02d","#7cb342","#2e7d32"];
    return p ? { label: labels[s-1] || "Very Weak", color: colors[s-1] || "#c62828" } : null;
  };

  const c = {
    page: { minHeight:"100vh", background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)", paddingTop:20, paddingBottom:40 },
    box: { maxWidth:800, margin:"20px auto", background:"#fff", borderRadius:15, overflow:"hidden", boxShadow:"0 10px 50px rgba(0,0,0,0.2)" },
    header: { background:"linear-gradient(135deg,#e53935 0%,#c62828 100%)", color:"#fff", padding:"30px", textAlign:"center" },
    progress: { display:"flex", padding:"20px 30px", background:"#f5f5f5", justifyContent:"space-between" },
    stepWrap: { flex:1, textAlign:"center" },
    stepCircle: (active, done) => ({
      width:40, height:40, borderRadius:"50%",
      background: done ? "#4caf50" : active ? "#e53935" : "#ddd",
      color: (active||done) ? "#fff" : "#666",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontWeight:"bold", marginBottom:6, fontSize:14
    }),
    stepLabel: (active, done) => ({ fontSize:12, color: done?"#4caf50": active?"#e53935":"#999", fontWeight: active||done?"600":"400" }),
    body: { padding:"30px 40px" },
    formRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 },
    fg: { marginBottom:20 },
    label: { display:"block", marginBottom:8, color:"#333", fontWeight:600, fontSize:14 },
    req: { color:"#e53935" },
    input: { width:"100%", padding:12, border:"2px solid #e0e0e0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" },
    select: { width:"100%", padding:12, border:"2px solid #e0e0e0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", background:"#fff" },
    textarea: { width:"100%", padding:12, border:"2px solid #e0e0e0", borderRadius:8, fontSize:14, outline:"none", resize:"vertical", minHeight:80, boxSizing:"border-box" },
    radioGroup: { display:"flex", gap:20, marginTop:8 },
    radioItem: { display:"flex", alignItems:"center", gap:8, cursor:"pointer" },
    checkGroup: { display:"flex", flexDirection:"column", gap:10, marginTop:8 },
    checkItem: { display:"flex", alignItems:"center", gap:10, cursor:"pointer" },
    errorBox: { background:"#f8d7da", color:"#721c24", padding:"12px 16px", borderRadius:8, marginBottom:20, border:"1px solid #f5c6cb", fontSize:14 },
    infoBox: { background:"#fff3cd", borderLeft:"4px solid #ffc107", padding:"14px 16px", borderRadius:5, fontSize:13, color:"#856404", marginBottom:20 },
    btns: { display:"flex", justifyContent:"space-between", gap:15, marginTop:30 },
    btnPrimary: { padding:"12px 30px", background:"#e53935", color:"#fff", border:"none", borderRadius:8, fontSize:16, fontWeight:600, cursor:"pointer", flex:1 },
    btnSecondary: { padding:"12px 30px", background:"#757575", color:"#fff", border:"none", borderRadius:8, fontSize:16, fontWeight:600, cursor:"pointer" },
    uploadArea: { border:"2px dashed #e0e0e0", borderRadius:8, padding:30, textAlign:"center", cursor:"pointer", marginTop:8 },
    successPanel: { textAlign:"center", padding:"40px 20px" },
  };

  const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
  const conditions = ["diabetes","hypertension","heartDisease","hivAids","hepatitis"];
  const habits = ["smoking","alcohol","drugs"];

  return (
    <div style={c.page}>
      <Navbar />
      <div style={c.box}>
        <div style={c.header}>
          <h1 style={{fontSize:28, marginBottom:8}}>?? Donor Registration</h1>
          <p style={{opacity:0.9, fontSize:14}}>Join us in saving lives through blood donation</p>
        </div>

        {/* Progress */}
        <div style={c.progress}>
          {STEPS.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={num} style={c.stepWrap}>
                <div style={c.stepCircle(active, done)}>{done ? "?" : num}</div>
                <div style={c.stepLabel(active, done)}>{label}</div>
              </div>
            );
          })}
        </div>

        <div style={c.body}>
          {error && <div style={c.errorBox}>{error}</div>}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div>
              <h2 style={{marginBottom:24, color:"#333"}}>Personal Information</h2>
              <div style={c.formRow}>
                <div style={c.fg}>
                  <label style={c.label}>Full Name <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.fullName} onChange={e=>upd("fullName",e.target.value)} placeholder="Enter your full name" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
                <div style={c.fg}>
                  <label style={c.label}>Blood Group <span style={c.req}>*</span></label>
                  <select style={c.select} value={form.bloodGroup} onChange={e=>upd("bloodGroup",e.target.value)} onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"}>
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div style={c.formRow}>
                <div style={c.fg}>
                  <label style={c.label}>Phone Number <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.phone} onChange={e=>upd("phone",e.target.value)} placeholder="+1 234 567 8900" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
                <div style={c.fg}>
                  <label style={c.label}>Email Address <span style={c.req}>*</span></label>
                  <input style={c.input} type="email" value={form.email} onChange={e=>upd("email",e.target.value)} placeholder="you@example.com" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
              </div>
              <div style={c.fg}>
                <label style={c.label}>Address <span style={c.req}>*</span></label>
                <textarea style={c.textarea} value={form.address} onChange={e=>upd("address",e.target.value)} placeholder="Enter your complete address" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
              </div>
              <div style={c.formRow}>
                <div style={c.fg}>
                  <label style={c.label}>City <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.city} onChange={e=>upd("city",e.target.value)} placeholder="e.g. New York" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
                <div style={c.fg}>
                  <label style={c.label}>District <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.district} onChange={e=>upd("district",e.target.value)} placeholder="e.g. Manhattan" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
              </div>
              <div style={c.formRow}>
                <div style={c.fg}>
                  <label style={c.label}>Ward <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.ward} onChange={e=>upd("ward",e.target.value)} placeholder="e.g. Ward A" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
                <div style={c.fg}>
                  <label style={c.label}>Date of Birth <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.dob} onChange={e=>upd("dob",e.target.value)} placeholder="DD/MM/YYYY" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
              </div>
              <div style={c.fg}>
                <label style={c.label}>Gender <span style={c.req}>*</span></label>
                <div style={c.radioGroup}>
                  {["male","female","other"].map(g=>(
                    <label key={g} style={c.radioItem}>
                      <input type="radio" name="gender" value={g} checked={form.gender===g} onChange={()=>upd("gender",g)} style={{width:18,height:18}} />
                      {g.charAt(0).toUpperCase()+g.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={c.btns}>
                <button type="button" style={c.btnPrimary} onClick={handleNext}>Next: Medical Information ?</button>
              </div>
            </div>
          )}

          {/* Step 2: Medical Info */}
          {step === 2 && (
            <div>
              <h2 style={{marginBottom:24, color:"#333"}}>Medical Information</h2>
              <div style={c.infoBox}>?? Please provide accurate medical information. This helps ensure safe blood donation.</div>
              <div style={c.formRow}>
                <div style={c.fg}>
                  <label style={c.label}>Weight (kg) <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.weight} onChange={e=>upd("weight",e.target.value)} placeholder="Min. 50 kg" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
                <div style={c.fg}>
                  <label style={c.label}>Height (cm) <span style={c.req}>*</span></label>
                  <input style={c.input} value={form.height} onChange={e=>upd("height",e.target.value)} placeholder="Height in cm" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
              </div>
              <div style={c.fg}>
                <label style={c.label}>Medical Conditions</label>
                <div style={c.checkGroup}>
                  {conditions.map(cond=>(
                    <label key={cond} style={c.checkItem}>
                      <input type="checkbox" checked={form.conditions.includes(cond)} onChange={()=>toggleArray("conditions",cond)} style={{width:18,height:18}} />
                      {cond.charAt(0).toUpperCase()+cond.slice(1).replace(/([A-Z])/g," $1")}
                    </label>
                  ))}
                  <label style={c.checkItem}>
                    <input type="checkbox" checked={form.conditions.length===0} onChange={()=>upd("conditions",[])} style={{width:18,height:18}} />
                    <strong>None of the above</strong>
                  </label>
                </div>
              </div>
              <div style={c.fg}>
                <label style={c.label}>Currently taking medications?</label>
                <div style={c.radioGroup}>
                  {["yes","no"].map(v=>(
                    <label key={v} style={c.radioItem}>
                      <input type="radio" name="medication" value={v} checked={form.onMedication===(v==="yes")} onChange={()=>upd("onMedication",v==="yes")} style={{width:18,height:18}} />
                      {v.charAt(0).toUpperCase()+v.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              {form.onMedication && (
                <div style={c.fg}>
                  <label style={c.label}>Please specify medications</label>
                  <textarea style={c.textarea} value={form.medications} onChange={e=>upd("medications",e.target.value)} placeholder="List all medications" onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"} />
                </div>
              )}
              <div style={c.fg}>
                <label style={c.label}>Lifestyle Habits</label>
                <div style={c.checkGroup}>
                  {habits.map(h=>(
                    <label key={h} style={c.checkItem}>
                      <input type="checkbox" checked={form.habits.includes(h)} onChange={()=>toggleArray("habits",h)} style={{width:18,height:18}} />
                      {h.charAt(0).toUpperCase()+h.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={c.fg}>
                <label style={c.label}>Donated blood in last 3 months? <span style={c.req}>*</span></label>
                <div style={c.radioGroup}>
                  {["yes","no"].map(v=>(
                    <label key={v} style={c.radioItem}>
                      <input type="radio" name="recentDonation" value={v} checked={form.recentDonation===v} onChange={()=>upd("recentDonation",v)} style={{width:18,height:18}} />
                      {v.charAt(0).toUpperCase()+v.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={c.btns}>
                <button type="button" style={c.btnSecondary} onClick={handleBack}>? Back</button>
                <button type="button" style={c.btnPrimary} onClick={handleNext}>Next: Upload Documents ?</button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div>
              <h2 style={{marginBottom:24, color:"#333"}}>Document Upload</h2>
              <div style={c.infoBox}>?? Upload Government ID and Medical Certificate. Files are simulated and not stored.</div>
              {[
                {id:"govId", label:"Government-issued ID", req:true, state:govId, setter:setGovId},
                {id:"medCert", label:"Medical Certificate", req:true, state:medCert, setter:setMedCert},
              ].map(doc=>(
                <div key={doc.id} style={c.fg}>
                  <label style={c.label}>{doc.label} {doc.req && <span style={c.req}>*</span>}</label>
                  <div
                    style={{...c.uploadArea, borderColor: doc.state ? "#4caf50" : "#e0e0e0", background: doc.state ? "#f0fff4" : "#fff"}}
                    onClick={()=>document.getElementById(doc.id).click()}
                  >
                    <input id={doc.id} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>e.target.files[0] && doc.setter(e.target.files[0])} />
                    {doc.state ? (
                      <p style={{color:"#4caf50"}}>? {doc.state.name} uploaded</p>
                    ) : (
                      <>
                        <p>?? Click to upload or drag and drop</p>
                        <p style={{fontSize:12, color:"#666", marginTop:5}}>PDF, JPG, PNG (Max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div style={c.btns}>
                <button type="button" style={c.btnSecondary} onClick={handleBack}>? Back</button>
                <button type="button" style={c.btnPrimary} onClick={handleNext}>Verify Documents ?</button>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {step === 4 && (
            <div>
              <h2 style={{marginBottom:24, color:"#333"}}>Document Verification</h2>
              <div style={{background:"#e3f2fd", borderLeft:"4px solid #2196f3", padding:20, borderRadius:5, marginBottom:20}}>
                <h3 style={{color:"#1976d2", marginBottom:12}}>Automated Verification in Progress</h3>
                {verifying && (
                  <div style={{display:"flex", flexDirection:"column", gap:14}}>
                    {["Verifying Government ID...","Verifying Medical Certificate...","Cross-checking information..."].map((msg,i)=>(
                      <div key={i} style={{display:"flex", alignItems:"center", gap:12}}>
                        <div style={{width:20,height:20,border:"3px solid #f3f3f3",borderTop:"3px solid #e53935",borderRadius:"50%",animation:"spin 1s linear infinite"}} />
                        <span style={{color:"#1565c0"}}>{msg}</span>
                      </div>
                    ))}
                  </div>
                )}
                {verified && (
                  <div>
                    {["? Government ID verified","? Medical Certificate verified","? Information validated"].map((msg,i)=>(
                      <div key={i} style={{display:"flex", alignItems:"center", gap:12, marginBottom:8}}>
                        <span style={{color:"#4caf50", fontSize:20}}>?</span>
                        <span style={{color:"#155724"}}>{msg}</span>
                      </div>
                    ))}
                    <div style={{background:"#d4edda", borderLeft:"4px solid #4caf50", padding:16, borderRadius:5, marginTop:16}}>
                      <h3 style={{color:"#155724", marginBottom:8}}>All Checks Passed!</h3>
                      <p style={{color:"#155724"}}>Your documents have been verified. Proceed to set your password.</p>
                    </div>
                  </div>
                )}
              </div>
              <div style={c.btns}>
                <button type="button" style={c.btnSecondary} onClick={handleBack}>? Back</button>
                {verified && <button type="button" style={c.btnPrimary} onClick={()=>setStep(5)}>Set Password ?</button>}
              </div>
            </div>
          )}

          {/* Step 5: Password */}
          {step === 5 && (
            <form onSubmit={handleSubmit}>
              <h2 style={{marginBottom:24, color:"#333"}}>Create Your Account</h2>
              <div style={{background:"#d4edda", borderLeft:"4px solid #4caf50", padding:14, borderRadius:5, marginBottom:24, fontSize:13, color:"#155724"}}>
                ? Verification Successful! Please create a password to complete your registration.
              </div>
              <div style={c.fg}>
                <label style={c.label}>Create Password <span style={c.req}>*</span></label>
                <input
                  type="password" style={c.input}
                  value={form.password} onChange={e=>upd("password",e.target.value)}
                  placeholder="Enter a strong password (min 8 chars)"
                  onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"}
                />
                {form.password && (() => {
                  const s = pwStrength(form.password);
                  return s ? <div style={{marginTop:6, fontSize:13, color:s.color, fontWeight:600}}>Strength: {s.label}</div> : null;
                })()}
              </div>
              <div style={c.fg}>
                <label style={c.label}>Confirm Password <span style={c.req}>*</span></label>
                <input
                  type="password" style={c.input}
                  value={form.confirmPassword} onChange={e=>upd("confirmPassword",e.target.value)}
                  placeholder="Re-enter your password"
                  onFocus={e=>e.target.style.borderColor="#e53935"} onBlur={e=>e.target.style.borderColor="#e0e0e0"}
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <div style={{color:"#c62828", fontSize:13, marginTop:4}}>Passwords do not match</div>
                )}
              </div>
              <div style={c.btns}>
                <button type="button" style={c.btnSecondary} onClick={handleBack}>? Back</button>
                <button type="submit" style={{...c.btnPrimary, opacity:loading?0.7:1}} disabled={loading}>
                  {loading ? "Creating Account..." : "Complete Registration"}
                </button>
              </div>
              <div style={{textAlign:"center", marginTop:16, color:"#666", fontSize:14}}>
                Already have an account? <Link to="/login" style={{color:"#e53935", fontWeight:600}}>Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
};

export default Register;

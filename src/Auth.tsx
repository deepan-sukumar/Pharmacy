import React, { useState, useEffect } from 'react';
import {
  Stethoscope, ArrowLeft, ShieldCheck, Lock, Mail, CheckCircle2, ChevronRight,
  Boxes, Activity, Clock3, AlertTriangle, BrainCircuit, Sparkles, User, Phone,
  Building2, MapPin, Globe, Eye, EyeOff, Check, X, Loader2, Bell, FileText,
  Languages, CheckCircle
} from 'lucide-react';
import type { Role } from './data';
import { ThemeToggle } from './components/ThemeContext';
import { api } from './services/api';

export default function Auth({
  mode = 'signin',
  onLogin,
  onSwitch,
  onBack,
}: {
  mode: 'signin' | 'signup';
  onLogin: (role: Role, user?: any) => void;
  onSwitch: () => void;
  onBack: () => void;
}) {
  // Signin form state
  const [loginEmail, setLoginEmail] = useState('pharmacist@demo.com');
  const [loginPassword, setLoginPassword] = useState('demo123');
  const [remember, setRemember] = useState(true);

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Professional Information
  const [regNumber, setRegNumber] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyType, setPharmacyType] = useState('Independent Pharmacy');

  // Workspace Information
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Karnataka');
  const [country] = useState('India');

  // Preferences
  const [preferredLang, setPreferredLang] = useState('English');
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Form submission & validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 3D Parallax state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Password requirements calculation
  const pwdLengthValid = password.length >= 8;
  const pwdUpperValid = /[A-Z]/.test(password);
  const pwdLowerValid = /[a-z]/.test(password);
  const pwdNumberValid = /[0-9]/.test(password);
  const pwdSpecialValid = /[^A-Za-z0-9]/.test(password);
  const isPasswordSecure =
    pwdLengthValid && pwdUpperValid && pwdLowerValid && pwdNumberValid && pwdSpecialValid;

  // Validation logic
  const validateSignup = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    
    if (!email.trim()) {
      errs.email = 'Professional email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid professional email.';
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!mobile.trim()) {
      errs.mobile = 'Mobile number is required.';
    } else if (cleanMobile.length < 10) {
      errs.mobile = 'Please enter a valid 10-digit mobile number.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (!isPasswordSecure) {
      errs.password = 'Password must satisfy all security requirements.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!regNumber.trim()) {
      errs.regNumber = 'Pharmacist registration number is required.';
    }

    if (!pharmacyName.trim()) {
      errs.pharmacyName = 'Pharmacy / Store name is required.';
    }

    if (!city.trim()) {
      errs.city = 'City is required.';
    }

    if (!stateName.trim()) {
      errs.stateName = 'State is required.';
    }

    if (!agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let userData = { fullName: 'Demo Pharmacist', pharmacyId: 'DEMO_PHARMACY', role: 'Pharmacist' };
    try {
      const res = await api.loginUser({ email: loginEmail, password: loginPassword });
      if (res?.user) userData = res.user;
    } catch {
      // Allow demo bypass without error
    } finally {
      setIsSubmitting(false);
      onLogin('Pharmacist', userData);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateSignup()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await api.registerUser({
        fullName,
        email,
        mobile,
        password,
        regNumber,
        pharmacyName,
        pharmacyType,
        city,
        stateName,
        country,
        preferredLang,
        enableAlerts,
      });

      setIsSubmitting(false);
      setSuccessMessage('Pharmacy workspace created and saved to Firestore! Launching portal...');
      setTimeout(() => {
        onLogin('Pharmacist', res?.user || { fullName, pharmacyId: 'DEMO_PHARMACY', role: 'Pharmacist' });
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrors({ form: err.message || 'Failed to create account. Please try again.' });
    }
  };

  const handleDemoAccess = () => {
    onLogin('Pharmacist', {
      fullName: 'Demo Pharmacist',
      pharmacyId: 'DEMO_PHARMACY',
      role: 'Pharmacist',
      pharmacyName: 'Apollo MedPlus Central'
    });
  };

  const tiltX = mousePos.y * -6;
  const tiltY = mousePos.x * 6;

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi NCR', 'Puducherry'
  ];

  return (
    <div
      className={mode === 'signup' ? 'auth-container-signup' : 'auth-container-grid'}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: mode === 'signup' ? 'flex' : undefined,
        justifyContent: mode === 'signup' ? 'center' : undefined,
        padding: mode === 'signup' ? '24px 16px 60px' : undefined,
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          MODE A: SIGN UP (CREATE PHARMACIST ACCOUNT & WORKSPACE)
      ────────────────────────────────────────────────────────────── */}
      {mode === 'signup' ? (
        <div
          style={{
            width: '100%',
            maxWidth: 820,
            background: 'var(--surface)',
            borderRadius: 20,
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            padding: 'clamp(20px, 4vw, 36px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            zIndex: 10,
          }}
        >
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
            <ThemeToggle size="sm" />
          </div>

          {/* Header Section */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px var(--primary-glow)',
                }}
              >
                <Stethoscope size={20} color="white" />
              </div>
              <div>
                <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.4px', color: 'var(--text)' }}>
                  PHARMA<span style={{ color: 'var(--primary)' }}>FLOW</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', fontWeight: 600 }}>
                  Audit & Expiry Portal
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 99,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              <Sparkles size={13} /> PHARMACIST PORTAL
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px' }}>
              Create Your Pharmacy Account
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
              Set up your pharmacy workspace for medication inventory, batch tracking, dispensing audit and expiry monitoring.
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                backgroundColor: 'var(--success-light)',
                border: '1.5px solid var(--success-border)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              <CheckCircle size={18} /> {successMessage}
            </div>
          )}

          {/* Error Banner */}
          {errors.form && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid var(--danger)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={18} /> {errors.form}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* 1. ACCOUNT INFORMATION */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 14,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <User size={16} color="var(--primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Account Information
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="label">
                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Dr. Anita Rao"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                  />
                  {errors.fullName && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.fullName}</p>}
                </div>

                <div>
                  <label className="label">
                    Professional Email <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="pharmacist@example.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                  />
                  {errors.email && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.email}</p>}
                </div>
              </div>

              <div>
                <label className="label">
                  Mobile Number <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      borderRadius: 10,
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--input-border)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-2)',
                    }}
                  >
                    +91
                  </span>
                  <input
                    className="input"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={e => {
                      setMobile(e.target.value);
                      if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }));
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
                {errors.mobile && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.mobile}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="label">
                    Password <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                      }}
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-3)',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.password}</p>}
                </div>

                <div>
                  <label className="label">
                    Confirm Password <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-3)',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Requirements Live Checklist */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <p style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Password Requirements:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                  {[
                    { label: 'At least 8 characters', met: pwdLengthValid },
                    { label: 'Contains uppercase letter (A-Z)', met: pwdUpperValid },
                    { label: 'Contains lowercase letter (a-z)', met: pwdLowerValid },
                    { label: 'Contains number (0-9)', met: pwdNumberValid },
                    { label: 'Contains special character (!@#$)', met: pwdSpecialValid },
                  ].map((req, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: req.met ? 'var(--success)' : 'var(--text-3)',
                        fontWeight: req.met ? 600 : 400,
                      }}
                    >
                      {req.met ? (
                        <Check size={14} color="var(--success)" strokeWidth={2.5} />
                      ) : (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-muted)', display: 'inline-block', margin: '0 4px' }} />
                      )}
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. PROFESSIONAL INFORMATION */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 14,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Professional Information
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="label">
                    Pharmacist Registration Number <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="PHARM-KA-2024-8842"
                    value={regNumber}
                    onChange={e => {
                      setRegNumber(e.target.value);
                      if (errors.regNumber) setErrors(prev => ({ ...prev, regNumber: '' }));
                    }}
                  />
                  {errors.regNumber && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.regNumber}</p>}
                </div>

                <div>
                  <label className="label">
                    Pharmacy / Store Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="WellCare Pharmacy"
                    value={pharmacyName}
                    onChange={e => {
                      setPharmacyName(e.target.value);
                      if (errors.pharmacyName) setErrors(prev => ({ ...prev, pharmacyName: '' }));
                    }}
                  />
                  {errors.pharmacyName && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.pharmacyName}</p>}
                </div>

                <div>
                  <label className="label">Pharmacy Type</label>
                  <select
                    className="input"
                    value={pharmacyType}
                    onChange={e => setPharmacyType(e.target.value)}
                  >
                    <option>Independent Pharmacy</option>
                    <option>Hospital Pharmacy</option>
                    <option>Clinic Pharmacy</option>
                    <option>Retail Pharmacy</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. PHARMACY WORKSPACE INFORMATION */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 14,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <Building2 size={16} color="var(--primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Pharmacy Workspace
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div>
                  <label className="label">
                    City <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Bengaluru"
                    value={city}
                    onChange={e => {
                      setCity(e.target.value);
                      if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                    }}
                  />
                  {errors.city && <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{errors.city}</p>}
                </div>

                <div>
                  <label className="label">
                    State <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="input"
                    value={stateName}
                    onChange={e => {
                      setStateName(e.target.value);
                      if (errors.stateName) setErrors(prev => ({ ...prev, stateName: '' }));
                    }}
                  >
                    {indianStates.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Country</label>
                  <input
                    className="input"
                    value={country}
                    readOnly
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-3)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. PREFERENCES */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 14,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <Languages size={16} color="var(--primary)" />
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Preferences
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="label">Preferred System Language</label>
                  <select
                    className="input"
                    value={preferredLang}
                    onChange={e => setPreferredLang(e.target.value)}
                  >
                    <option>English</option>
                    <option>Tamil (தமிழ்)</option>
                    <option>Telugu (తెలుగు)</option>
                    <option>Kannada (ಕನ್ನಡ)</option>
                    <option>Hindi (हिन्दी)</option>
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    Syncs with multilingual patient notification advisories.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                  <input
                    type="checkbox"
                    id="enableAlerts"
                    checked={enableAlerts}
                    onChange={e => setEnableAlerts(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="enableAlerts" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
                    Enable pharmacy operational alerts (low stock, near expiry, urgent recalls)
                  </label>
                </div>
              </div>
            </div>

            {/* 5. TERMS & PRIVACY */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => {
                    setAgreeTerms(e.target.checked);
                    if (errors.agreeTerms) setErrors(prev => ({ ...prev, agreeTerms: '' }));
                  }}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', marginTop: 2, cursor: 'pointer' }}
                />
                <span>
                  I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>. I certify that I am a licensed healthcare professional authorized to manage pharmaceutical dispensing records.
                </span>
              </label>
              {errors.agreeTerms && (
                <p style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4, marginLeft: 28 }}>
                  {errors.agreeTerms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-teal"
              style={{
                width: '100%',
                justifyContent: 'center',
                height: 48,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating Account & Workspace...
                </>
              ) : (
                <>
                  Create Pharmacist Account <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access & Sign In */}
          <div
            style={{
              paddingTop: 18,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitch}
                style={{
                  color: 'var(--primary)',
                  fontWeight: 800,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>

            <div style={{ width: '100%', textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Or Explore Without Registering
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: 13,
                  height: 42,
                  borderRadius: 11,
                  fontWeight: 700,
                }}
                onClick={handleDemoAccess}
              >
                Launch Pharmacist Demo Workspace
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MODE B: SIGN IN (COMPACT DUAL-PANEL SHOWCASE LOGIN)
        ────────────────────────────────────────────────────────────── */
        <>
          {/* LEFT SIDE: Pharmacist Login Form */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 'clamp(24px, 5vw, 48px)',
              borderRight: '1px solid var(--border)',
              background: 'var(--surface)',
              zIndex: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <button
                  onClick={onBack}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  <ArrowLeft size={16} /> Back to Home
                </button>
                <ThemeToggle size="sm" />
              </div>

              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px var(--primary-glow)',
                  }}
                >
                  <Stethoscope size={20} color="white" />
                </div>
                <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.4px', color: 'var(--text)' }}>
                  PHARMA<span style={{ color: 'var(--primary)' }}>FLOW</span>
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                <Sparkles size={13} /> Pharmacist Portal
              </div>

              <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                Welcome to PharmaFlow
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 6, marginBottom: 28, lineHeight: 1.5 }}>
                Secure access to your pharmacy medication and dispensing operations.
              </p>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label
                    className="label"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--text-3)',
                      letterSpacing: '0.05em',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    Work Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: 12 }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 40, height: 42, fontSize: 13.5 }}
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="label"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--text-3)',
                      letterSpacing: '0.05em',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: 12 }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 40, height: 42, fontSize: 13.5 }}
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      color: 'var(--text-3)',
                      fontWeight: 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
                    />{' '}
                    Remember me
                  </label>
                  <a
                    href="#"
                    onClick={e => e.preventDefault()}
                    style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="btn btn-teal"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    height: 44,
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 6,
                  }}
                >
                  Sign In as Pharmacist <ChevronRight size={16} />
                </button>
              </form>

              {/* Quick Demo Access Button */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  One-Click Instant Access
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 13, height: 40, borderRadius: 11, fontWeight: 700 }}
                  onClick={handleDemoAccess}
                >
                  Launch Pharmacist Demo Workspace
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              Don't have an account?{' '}
              <button
                onClick={onSwitch}
                style={{ color: 'var(--primary)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Create account
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Bright Premium Interactive Product Showcase */}
          <div
            className="auth-showcase-panel"
            style={{
              background: 'var(--bg-alt)',
              padding: '48px 56px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Header Text */}
            <div style={{ position: 'relative', zIndex: 10, maxWidth: 620 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  background: 'var(--primary-light)',
                  padding: '5px 12px',
                  borderRadius: 99,
                  display: 'inline-block',
                  marginBottom: 14,
                }}
              >
                PHARMACY INTELLIGENCE PLATFORM
              </span>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: 'var(--text)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                  marginBottom: 10,
                }}
              >
                Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 540 }}>
                Complete traceability, intelligent expiry monitoring, and secure dispensing audit — all in one platform.
              </p>
            </div>

            {/* Center Floating Interactive Mini-Dashboard Showcase */}
            <div
              style={{
                position: 'relative',
                margin: '32px 0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Floating Glass Metric Badges Around Dashboard */}
              {[
                {
                  title: '12 Near Expiry',
                  sub: 'Action Required',
                  icon: Clock3,
                  color: '#D97706',
                  bg: 'var(--warning-light)',
                  pos: { top: '-18px', left: '10px' },
                  move: 14,
                },
                {
                  title: '7 Low Stock',
                  sub: 'Reorder Alert',
                  icon: AlertTriangle,
                  color: '#EA580C',
                  bg: 'var(--orange-light)',
                  pos: { bottom: '-18px', left: '20px' },
                  move: -18,
                },
                {
                  title: 'Audit Protected',
                  sub: '100% Traceability',
                  icon: ShieldCheck,
                  color: '#16A34A',
                  bg: 'var(--success-light)',
                  pos: { top: '-18px', right: '10px' },
                  move: -14,
                },
                {
                  title: 'AI Risk Detected',
                  sub: 'VD102 Overstock',
                  icon: BrainCircuit,
                  color: '#0D9488',
                  bg: 'var(--primary-light)',
                  pos: { bottom: '-18px', right: '20px' },
                  move: 20,
                },
              ].map((b, i) => {
                const Icon = b.icon;
                const offsetX = mousePos.x * b.move;
                const offsetY = mousePos.y * b.move;
                return (
                  <div
                    key={i}
                    className="hidden-mobile card"
                    style={{
                      position: 'absolute',
                      ...b.pos,
                      transform: `translate3d(${offsetX}px, ${offsetY}px, 0px)`,
                      transition: 'transform 0.1s ease-out',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      zIndex: 20,
                      cursor: 'default',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: b.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} color={b.color} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.1 }}>
                        {b.title}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{b.sub}</p>
                    </div>
                  </div>
                );
              })}

              {/* Main 3D Mini Interactive Dashboard Card */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 580,
                  background: 'var(--surface)',
                  borderRadius: 20,
                  border: '1.5px solid var(--border)',
                  padding: 24,
                  boxShadow: 'var(--shadow-md)',
                  transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                  transition: 'transform 0.15s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Header Mini Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                      PharmaFlow Pharmacist Control Center
                    </span>
                  </div>
                  <span className="chip badge-teal" style={{ fontSize: 11 }}>
                    LIVE SYSTEM
                  </span>
                </div>

                {/* Grid of Mini Widgets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Active Stock</span>
                      <Boxes size={15} color="var(--primary)" />
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>18,420</p>
                    <p style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>128 Medicines tracked</p>
                  </div>

                  <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Dispensed Today</span>
                      <Activity size={15} color="#2563EB" />
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>42 Records</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>100% FEFO Compliant</p>
                  </div>
                </div>

                {/* AI Insight Box inside Mini Dashboard */}
                <div
                  style={{
                    background: '#0F172A',
                    color: 'white',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid #1E293B',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BrainCircuit size={16} color="white" />
                  </div>
                  <p style={{ fontSize: 11.5, color: '#E2E8F0', lineHeight: 1.4 }}>
                    <strong style={{ color: '#5EEAD4' }}>AI Recommendation:</strong> Vitamin D3 60K (VD102) expires in 12 days. Prioritize dispensing.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights List */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              {[
                'FEFO Dispensing & Batch Management',
                'Real-Time Expiry & Low Stock Alerts',
                'Complete Dispensing Audit Trail',
                'AI Pharmacy Intelligence & Simulation',
                'Batch Recall & Supplier Return Protection',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                  <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0 }} /> {item}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

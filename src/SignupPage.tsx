import React, { useState } from 'react';
import { Eye, EyeOff, MapPin, Upload, CheckCircle, User, Mail, Lock, Building, Users, Sparkles, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import Toast from './Toast';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onAuthSuccess: (data: any) => void;
}

type UserRole = 'donor' | 'recipient' | 'ngo';

const SignupPage: React.FC<SignupPageProps> = ({ onNavigateToLogin, onAuthSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    role: 'donor' as UserRole,
    location: '',
    ngoId: '',
    certificate: null as File | null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear specific field error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      certificate: file
    }));
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      // Simulate reverse geocoding
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      setFormData(prev => ({
        ...prev,
        location: `GPS: ${mockAddress}`
      }));
    } catch (error) {
      setToast({
        show: true,
        message: 'Unable to get your location. Please enter manually.',
        type: 'error'
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.emailOrPhone.trim()) {
      newErrors.emailOrPhone = 'Email or phone is required';
    }
    
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (formData.role === 'ngo' && !formData.ngoId.trim()) {
      newErrors.ngoId = 'NGO accounts must provide a valid government ID.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('emailOrPhone', formData.emailOrPhone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('location', formData.location);
      
      if (formData.role === 'ngo') {
        formDataToSend.append('ngoId', formData.ngoId);
        if (formData.certificate) {
          formDataToSend.append('certificate', formData.certificate);
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();
      
      if (data.success) {
        setToast({
          show: true,
          message: data.message,
          type: 'success'
        });
        
        setTimeout(() => {
          onAuthSuccess(data);
        }, 1500);
      } else {
        if (data.errors && data.errors.length > 0) {
          setToast({
            show: true,
            message: data.errors[0].message,
            type: 'error'
          });
        } else {
          setToast({
            show: true,
            message: data.message,
            type: 'error'
          });
        }
      }
      
    } catch (error) {
      setToast({
        show: true,
        message: 'Network error. Please check your connection and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'donor':
        return <Building className="w-5 h-5" />;
      case 'recipient':
        return <User className="w-5 h-5" />;
      case 'ngo':
        return <Users className="w-5 h-5" />;
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'donor':
        return 'Share surplus food from restaurants, events, or homes';
      case 'recipient':
        return 'Find food assistance for individuals and families';
      case 'ngo':
        return 'Coordinate food distribution for communities';
    }
  };

  return (
    <div className="auth-container">
      <Toast 
        message={toast.message}
        isVisible={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        type={toast.type}
      />
      
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
        <div 
          className="absolute w-32 h-32 bg-primary-500 rounded-full animate-float"
          style={{ 
            top: '2.5rem', 
            right: '5rem',
            opacity: '0.1',
            filter: 'blur(3rem)'
          }} 
        />
        <div 
          className="absolute w-40 h-40 bg-secondary-500 rounded-full animate-float"
          style={{ 
            bottom: '8rem', 
            left: '4rem',
            opacity: '0.1',
            filter: 'blur(3rem)',
            animationDelay: '2s'
          }} 
        />
        <div 
          className="absolute w-24 h-24 rounded-full animate-pulse-soft"
          style={{ 
            top: '33%', 
            right: '33%',
            background: 'rgba(245, 158, 11, 0.1)',
            filter: 'blur(2rem)'
          }} 
        />
        
        {/* Floating Elements */}
        <Sparkles 
          className="absolute w-6 h-6 animate-bounce"
          style={{ 
            top: '25%', 
            left: '25%',
            color: 'rgba(255, 122, 0, 0.3)',
            animationDelay: '1s'
          }} 
        />
        <Sparkles 
          className="absolute w-4 h-4 animate-bounce"
          style={{ 
            bottom: '25%', 
            right: '25%',
            color: 'rgba(59, 178, 115, 0.3)',
            animationDelay: '2.5s'
          }} 
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8 animate-slide-down">
          <Logo size="lg" animated={true} />
          <p className="mt-4 text-neutral-600 font-medium">
            Join our community and make a difference today.
          </p>
        </div>
        
        {/* Signup Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Input */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <User className="w-4 h-4 text-primary-500" />
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field transition-all duration-300 ${
                    focusedField === 'name' ? 'scale-105' : ''
                  }`}
                  style={{
                    boxShadow: focusedField === 'name' ? 'var(--shadow-glow)' : undefined
                  }}
                  required
                />
                {focusedField === 'name' && (
                  <div 
                    className="absolute inset-0 rounded-2xl -z-10"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.2), rgba(59, 178, 115, 0.2))',
                      filter: 'blur(1.5rem)'
                    }}
                  />
                )}
              </div>
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>
            
            {/* Email/Phone Input */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-500" />
                Email or Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="emailOrPhone"
                  placeholder="Enter your email or phone number"
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('emailOrPhone')}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field transition-all duration-300 ${
                    focusedField === 'emailOrPhone' ? 'scale-105' : ''
                  }`}
                  style={{
                    boxShadow: focusedField === 'emailOrPhone' ? 'var(--shadow-glow)' : undefined
                  }}
                  required
                />
                {focusedField === 'emailOrPhone' && (
                  <div 
                    className="absolute inset-0 rounded-2xl -z-10"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.2), rgba(59, 178, 115, 0.2))',
                      filter: 'blur(1.5rem)'
                    }}
                  />
                )}
              </div>
              {errors.emailOrPhone && <p className="form-error">{errors.emailOrPhone}</p>}
            </div>
            
            {/* Password Input */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary-500" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Create a strong password (min 6 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`input-field transition-all duration-300 ${
                    focusedField === 'password' ? 'scale-105' : ''
                  }`}
                  style={{
                    paddingRight: '3rem',
                    boxShadow: focusedField === 'password' ? 'var(--shadow-glow)' : undefined
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 text-neutral-500 hover:text-primary-500 transition-colors duration-200 p-1 rounded-lg hover:bg-primary-50"
                  style={{ transform: 'translateY(-50%)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {focusedField === 'password' && (
                  <div 
                    className="absolute inset-0 rounded-2xl -z-10"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.2), rgba(59, 178, 115, 0.2))',
                      filter: 'blur(1.5rem)'
                    }}
                  />
                )}
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Choose Your Role</label>
              <div className="grid grid-cols-1 gap-3">
                {(['donor', 'recipient', 'ngo'] as UserRole[]).map((role) => (
                  <label
                    key={role}
                    className={`
                      relative flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300
                      ${formData.role === role 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-neutral-200 bg-white hover:border-primary-300'
                      }
                    `}
                    style={{
                      boxShadow: formData.role === role ? 'var(--shadow-glow)' : undefined,
                      backgroundColor: formData.role === role ? 'var(--primary-50)' : undefined
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={formData.role === role}
                      onChange={handleInputChange}
                      style={{ display: 'none' }}
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className={`
                          p-2 rounded-xl transition-colors duration-300
                          ${formData.role === role ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600'}
                        `}
                      >
                        {getRoleIcon(role)}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900" style={{ textTransform: 'capitalize' }}>
                          {role === 'ngo' ? 'NGO' : role}
                        </div>
                        <div className="text-sm text-neutral-600">
                          {getRoleDescription(role)}
                        </div>
                      </div>
                    </div>
                    {formData.role === role && (
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Location Input */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                Location
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="location"
                    placeholder="Enter your location"
                    value={formData.location}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedField('location')}
                    onBlur={() => setFocusedField(null)}
                    className={`input-field transition-all duration-300 ${
                      focusedField === 'location' ? 'scale-105' : ''
                    }`}
                    style={{
                      boxShadow: focusedField === 'location' ? 'var(--shadow-glow)' : undefined
                    }}
                    required
                  />
                  {focusedField === 'location' && (
                    <div 
                      className="absolute inset-0 rounded-2xl -z-10"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.2), rgba(59, 178, 115, 0.2))',
                        filter: 'blur(1.5rem)'
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="btn-secondary flex-shrink-0"
                  style={{ padding: 'var(--space-4)' }}
                  title="Use my GPS location"
                >
                  {isGettingLocation ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.location && <p className="form-error">{errors.location}</p>}
            </div>
            
            {/* NGO Special Section */}
            {formData.role === 'ngo' && (
              <div className="p-6 bg-secondary-50 border-2 border-secondary-200 rounded-2xl animate-slide-down" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="flex items-center gap-2 text-secondary-700 font-semibold mb-4">
                  <Users className="w-5 h-5" />
                  NGO Verification Required
                </div>
                
                <div className="form-group">
                  <label className="form-label">Government Registration ID *</label>
                  <input
                    type="text"
                    name="ngoId"
                    placeholder="Enter your NGO registration ID"
                    value={formData.ngoId}
                    onChange={handleInputChange}
                    className="input-field"
                    style={{
                      borderColor: 'var(--secondary-300)',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }}
                    required
                  />
                  {errors.ngoId && <p className="form-error">{errors.ngoId}</p>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Upload Registration Certificate (Optional)</label>
                  <label className="relative flex items-center justify-center w-full p-6 border-2 border-dashed border-secondary-300 rounded-2xl cursor-pointer hover:border-secondary-400 transition-all duration-300">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {formData.certificate ? (
                      <div className="flex items-center gap-3 text-secondary-700">
                        <CheckCircle className="w-6 h-6" />
                        <span className="font-medium">{formData.certificate.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-secondary-600">
                        <Upload className="w-6 h-6" />
                        <span>Choose file or drag and drop</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary w-full group ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
          
          {/* Divider */}
          <div className="divider">
            <span className="divider-text">Already have an account?</span>
          </div>
          
          {/* Login Link */}
          <button
            onClick={onNavigateToLogin}
            className="w-full btn-ghost group flex items-center justify-center gap-2"
          >
            Sign in instead
            <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-neutral-500">
          <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
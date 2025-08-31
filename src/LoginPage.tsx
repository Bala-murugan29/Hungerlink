import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import Logo from './Logo';

interface LoginPageProps {
  onNavigateToSignup: () => void;
  onAuthSuccess: (data: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignup, onAuthSuccess }) => {
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: formData.emailOrPhone,
          password: formData.password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onAuthSuccess(data);
      } else {
        setError(data.message);
        return;
      }
      
      // Success case - in real app, handle authentication
      console.log('Login successful');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
        <div 
          className="absolute w-32 h-32 bg-primary-500 rounded-full animate-float"
          style={{ 
            top: '5rem', 
            left: '2.5rem',
            opacity: '0.1',
            filter: 'blur(3rem)'
          }} 
        />
        <div 
          className="absolute w-40 h-40 bg-secondary-500 rounded-full animate-float"
          style={{ 
            bottom: '5rem', 
            right: '2.5rem',
            opacity: '0.1',
            filter: 'blur(3rem)',
            animationDelay: '1s'
          }} 
        />
        <div 
          className="absolute w-24 h-24 rounded-full animate-pulse-soft"
          style={{ 
            top: '50%', 
            left: '25%',
            background: 'rgba(245, 158, 11, 0.1)',
            filter: 'blur(2rem)'
          }} 
        />
        
        {/* Floating Sparkles */}
        <Sparkles 
          className="absolute w-6 h-6 animate-bounce"
          style={{ 
            top: '25%', 
            right: '25%',
            color: 'rgba(255, 122, 0, 0.3)',
            animationDelay: '0.5s'
          }} 
        />
        <Sparkles 
          className="absolute w-4 h-4 animate-bounce"
          style={{ 
            bottom: '33%', 
            left: '33%',
            color: 'rgba(59, 178, 115, 0.3)',
            animationDelay: '1.5s'
          }} 
        />
      </div>

      <div className="auth-wrapper">
        {/* Logo Section */}
        <div className="text-center mb-12 animate-slide-down">
          <Logo size="lg" animated={true} />
          <p className="mt-4 text-neutral-600 font-medium">
            Welcome back! Sign in to continue your journey.
          </p>
        </div>
        
        {/* Login Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
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
                  placeholder="Enter your password"
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
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {/* Login Button */}
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
          
          {/* Divider */}
          <div className="divider">
            <span className="divider-text">New to HungerLink?</span>
          </div>
          
          {/* Signup Link */}
          <button
            onClick={onNavigateToSignup}
            className="w-full btn-ghost group flex items-center justify-center gap-2"
          >
            Create an account
            <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-sm text-neutral-500">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
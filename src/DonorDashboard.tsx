import React, { useState, useEffect } from 'react';
import { Plus, Eye, Clock, MapPin, Camera, Upload, CheckCircle, ArrowLeft, Sparkles, Heart, TrendingUp, Users } from 'lucide-react';
import Logo from './Logo';
import Toast from './Toast';
import { FoodQualityResult } from './services/geminiService';
interface DonorDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Donation {
  _id: string;
  foodType: string;
  quantity: string;
  expiryTime: string;
  location: any;
  photo?: string;
  status: 'available' | 'claimed' | 'completed';
  aiQuality?: 'fresh' | 'check' | 'not-suitable';
  aiAnalysis?: FoodQualityResult;
  claimedBy?: string;
  createdAt: string;
}

// Removed unused Request interface

const DonorDashboard: React.FC<DonorDashboardProps> = ({ user, onLogout }) => {
  console.log('DonorDashboard mounted');
  const [currentView, setCurrentView] = useState<'dashboard' | 'donate' | 'requests'>('dashboard');
  const [donations, setDonations] = useState<Donation[]>([]);
  // Removed unused requests state
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Donation form state
  const [donationForm, setDonationForm] = useState({
    foodType: '',
    quantity: '',
    expiryTime: '',
    location: user?.location?.address || '',
    photo: null as File | null
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  useEffect(() => {
    console.log('useEffect running, calling loadDonations');
    loadDonations();
  }, []);

  const loadDonations = async () => {
    console.log('Calling loadDonations');
    try {
      const token = localStorage.getItem('hungerlink_token');
      const response = await fetch('http://localhost:5000/api/donations/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch donations');
      const data = await response.json();
      console.log('Fetched donations:', data.donations);
      setDonations(data.donations || []);
    } catch (error) {
      console.error('Error in loadDonations:', error);
      setDonations([]);
    }
  };

  // Removed unused loadRequests function

  const handleDonationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDonationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDonationForm(prev => ({
      ...prev,
      photo: file
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      setDonationForm(prev => ({
        ...prev,
        location: mockAddress
      }));
    } catch (error) {
      setToast({
        show: true,
        message: 'Unable to get location. Please enter manually.',
        type: 'error'
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsProcessingAI(true);
    try {
      // Prepare form data for photo upload
      const formData = new FormData();
  formData.append('foodType', donationForm.foodType);
  formData.append('quantity', donationForm.quantity);
  formData.append('expiryTime', donationForm.expiryTime);
  formData.append('location', JSON.stringify({ address: donationForm.location }));
      if (donationForm.photo) formData.append('photo', donationForm.photo);

      // Get token for authentication
      const token = localStorage.getItem('hungerlink_token');

      // Send POST request to backend
  const response = await fetch('http://localhost:5000/api/donations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post donation');
      }

  // Removed unused result variable
      setToast({
        show: true,
        message: '🎉 Donation posted successfully!',
        type: 'success'
      });

      // Reset form
      setDonationForm({
        foodType: '',
        quantity: '',
        expiryTime: '',
        location: user?.location?.address || '',
        photo: null
      });
      setCurrentView('dashboard');
      // Optionally reload donations
      loadDonations();
    } catch (error: any) {
      setToast({
        show: true,
        message: error.message || 'Failed to post donation. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  };

  // Removed unused handleAcceptRequest

  // Removed unused getStatusBadge

  if (currentView === 'donate') {
    return (
      <div className="min-h-screen bg-warm-gradient relative overflow-hidden">
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
          <Sparkles 
            className="absolute w-6 h-6 animate-bounce"
            style={{ 
              top: '25%', 
              right: '25%',
              color: 'rgba(255, 122, 0, 0.3)',
              animationDelay: '0.5s'
            }} 
          />
        </div>

        <div className="container section-padding relative z-10">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-slide-down">
              <button 
                onClick={() => setCurrentView('dashboard')} 
                className="back-button group"
              >
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="text-dark">Back</span>
              </button>
              <Logo size="sm" />
            </div>

            {/* Donate Form Card */}
            <div className="card p-8 animate-slide-up">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-mesh-gradient rounded-2xl mb-4 animate-bounce-gentle">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-gradient mb-2">
                  🥘 Donate Food
                </h2>
                <p className="dashboard-subtitle">
                  Share your surplus food with those who need it most
                </p>
              </div>
              
              <form onSubmit={handleDonationSubmit} className="auth-form">
                {/* Food Type */}
                <div className="form-group">
                  <label className="form-label">Food Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="foodType"
                      placeholder="e.g., Vegetable Biryani, Mixed Rice"
                      value={donationForm.foodType}
                      onChange={handleDonationInputChange}
                      onFocus={() => setFocusedField('foodType')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'foodType' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'foodType' ? 'var(--shadow-glow)' : undefined
                      }}
                      required
                    />
                    {focusedField === 'foodType' && (
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

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="quantity"
                      placeholder="e.g., 40 plates, 25 portions"
                      value={donationForm.quantity}
                      onChange={handleDonationInputChange}
                      onFocus={() => setFocusedField('quantity')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'quantity' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'quantity' ? 'var(--shadow-glow)' : undefined
                      }}
                      required
                    />
                    {focusedField === 'quantity' && (
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

                {/* Expiry Time */}
                <div className="form-group">
                  <label className="form-label">Expiry Time</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="expiryTime"
                      placeholder="e.g., Today 6:30 PM, Tomorrow 2:00 PM"
                      value={donationForm.expiryTime}
                      onChange={handleDonationInputChange}
                      onFocus={() => setFocusedField('expiryTime')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'expiryTime' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'expiryTime' ? 'var(--shadow-glow)' : undefined
                      }}
                      required
                    />
                    {focusedField === 'expiryTime' && (
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

                {/* Location */}
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
                        placeholder="Enter pickup location"
                        value={donationForm.location}
                        onChange={handleDonationInputChange}
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
                </div>

                {/* Photo Upload */}
                <div className="form-group">
                  <label className="form-label">Food Photo (Recommended for AI Analysis)</label>
                  <label className="relative flex items-center justify-center w-full p-8 border-2 border-dashed border-neutral-300 rounded-2xl cursor-pointer hover:border-primary-400 transition-all duration-300 group">
                    <input
                      type="file"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                      accept="image/*"
                    />
                    {donationForm.photo ? (
                      <div className="flex items-center gap-3 text-primary-700">
                        <CheckCircle className="w-6 h-6" />
                        <span className="font-medium card-title">{donationForm.photo.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-neutral-600 group-hover:text-primary-600 transition-colors duration-300">
                        <Upload className="w-8 h-8" />
                        <div className="text-center">
                          <p className="font-medium card-title">Upload a photo of your food</p>
                          <p className="text-sm card-subtitle">Helps AI analyze quality and recipients see what you're sharing</p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`btn-primary w-full group ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isProcessingAI ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                      🤖 Analyzing with Gemini...
                    </>
                  ) : isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                      Posting...
                    </>
                  ) : (
                    <>
                      Post Donation
                      <Heart className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'requests') {
    return (
      <div className="min-h-screen bg-warm-gradient relative overflow-hidden">
        <Toast 
          message={toast.message}
          isVisible={toast.show}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
          type={toast.type}
        />

        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
          <div 
            className="absolute w-32 h-32 bg-secondary-500 rounded-full animate-float"
            style={{ 
              top: '5rem', 
              right: '5rem',
              opacity: '0.1',
              filter: 'blur(3rem)'
            }} 
          />
          <div 
            className="absolute w-40 h-40 bg-primary-500 rounded-full animate-float"
            style={{ 
              bottom: '8rem', 
              left: '4rem',
              opacity: '0.1',
              filter: 'blur(3rem)',
              animationDelay: '2s'
            }} 
          />
          <Sparkles 
            className="absolute w-6 h-6 animate-bounce"
            style={{ 
              top: '33%', 
              left: '33%',
              color: 'rgba(59, 178, 115, 0.3)',
              animationDelay: '1s'
            }} 
          />
        </div>

        <div className="container section-padding relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-slide-down">
              <button 
                onClick={() => setCurrentView('dashboard')} 
                className="back-button group"
              >
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="text-dark">Back</span>
              </button>
              <Logo size="sm" />
            </div>

            {/* Requests Header */}
            <div className="text-center mb-12 animate-slide-up">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-mesh-gradient rounded-2xl mb-4 animate-bounce-gentle">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gradient mb-2">
                📋 Food Requests
              </h2>
              <p className="dashboard-subtitle">
                Help fulfill requests from those in need
              </p>
            </div>
            
            {/* Empty State */}
            <div className="grid-responsive">
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="card p-12 text-center animate-scale-in">
                  <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-semibold dashboard-title mb-2">No requests available</h3>
                  <p className="dashboard-subtitle">Check back later for new food requests from the community.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering DonorDashboard, donations:', donations);
  return (
    <div className="min-h-screen bg-warm-gradient relative overflow-hidden">
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

      <div className="container section-padding relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-12 animate-slide-down">
            <Logo size="md" animated={true} />
            <button onClick={onLogout} className="btn-ghost group">
              <span className="text-dark">Logout</span>
              <ArrowLeft className="w-4 h-4 rotate-180 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-16 animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-mesh-gradient rounded-3xl mb-6 animate-bounce-gentle">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-4">
              👋 Welcome, {user?.name}
            </h1>
            <p className="text-xl dashboard-subtitle max-w-2xl mx-auto">
              Ready to make a difference today? Share your surplus food with those who need it most.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="grid md:grid-cols-2 gap-6 mb-16 animate-scale-in">
            <button 
              onClick={() => setCurrentView('donate')}
              className="group relative overflow-hidden p-8 bg-mesh-gradient rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-1 text-white">🥘 Donate Food</h3>
                  <p className="text-white opacity-80">Share your surplus meals</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => setCurrentView('requests')}
              className="group relative overflow-hidden p-8 rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-600))' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-1 text-white">📋 View Requests</h3>
                  <p className="text-white opacity-80">Help fulfill community needs</p>
                </div>
              </div>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="stats-number">{donations.length}</h3>
              <p className="stats-label">Total Donations</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="stats-number">{donations.filter(d => d.status === 'completed').length}</h3>
              <p className="stats-label">People Helped</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                <Heart className="w-6 h-6 text-warning" />
              </div>
              <h3 className="stats-number">{donations.filter(d => d.status === 'available').length}</h3>
              <p className="stats-label">Active Donations</p>
            </div>
          </div>

          {/* Donations History */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold dashboard-title">Your Donations</h2>
              <div className="flex items-center gap-2 card-text">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Recent activity</span>
              </div>
            </div>
            
            <div className="grid-responsive">
              {donations.length === 0 ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="card p-12 text-center">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold dashboard-title mb-2">No donations yet</h3>
                    <p className="dashboard-subtitle mb-6">Start by posting your first donation to help those in need.</p>
                    <button 
                      onClick={() => setCurrentView('donate')}
                      className="btn-primary"
                    >
                      Post Your First Donation
                    </button>
                  </div>
                </div>
              ) : (
                donations.map(donation => (
                  <div key={donation._id} className="card p-8 flex gap-6 items-center">
                    {donation.photo ? (
                      <img
                        src={`http://localhost:5000${donation.photo}`}
                        alt="Food Donation"
                        className="w-32 h-32 object-cover rounded-2xl border"
                        style={{ flexShrink: 0 }}
                      />
                    ) : (
                      <div className="w-32 h-32 bg-neutral-100 rounded-2xl flex items-center justify-center">
                        <Camera className="w-12 h-12 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold dashboard-title mb-2">{donation.foodType}</h3>
                      <p className="dashboard-subtitle mb-2">Quantity: {donation.quantity}</p>
                      <p className="dashboard-subtitle mb-2">Expiry: {donation.expiryTime}</p>
                      <p className="dashboard-subtitle mb-2">Location: {typeof donation.location === 'object' && donation.location !== null && (donation.location as any).address ? (donation.location as any).address : donation.location}</p>
                      <span className="badge badge-info mr-2">{donation.status}</span>
                      {donation.aiQuality && <span className="badge badge-secondary">AI: {donation.aiQuality}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;
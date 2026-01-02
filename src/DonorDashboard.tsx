import React, { useState, useEffect } from 'react';
import { Plus, Eye, Clock, MapPin, Camera, Upload, CheckCircle, ArrowLeft, Sparkles, Heart, TrendingUp, Users } from 'lucide-react';
import Logo from './Logo';
import Toast from './Toast';
import { FoodQualityResult, geminiService } from './services/geminiService';
import { useTranslation } from 'react-i18next';
interface DonorDashboardProps {
  user: any;
  onLogout: () => void;
}

interface RequestItem {
  _id: string;
  foodNeeded: string;
  quantity: string;
  numericRequested?: number;
  fulfilledQuantity?: number;
  remainingQuantity?: number;
  location: { address: string } | string;
  requesterType?: 'ngo' | 'individual';
  status: 'open' | 'accepted' | 'fulfilled';
  createdAt: string;
}

interface Donation {
  _id: string;
  foodType: string;
  quantity: string;
  // expiryTime removed in favor of manufacturingDate
  manufacturingDate?: string;
  location: any;
  photo?: string;
  status: 'available' | 'claimed' | 'completed';
  aiQuality?: 'fresh' | 'check' | 'not-suitable';
  aiAnalysis?: FoodQualityResult;
  claimedBy?: string | any;
  claimantPhone?: string;
  createdAt: string;
}

// Removed unused Request interface

const DonorDashboard: React.FC<DonorDashboardProps> = ({ user, onLogout }) => {
  console.log('DonorDashboard mounted');
  const [currentView, setCurrentView] = useState<'dashboard' | 'donate' | 'requests'>('dashboard');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const API_BASE = ((import.meta as any).env?.VITE_API_URL || window.location.origin || '').replace(/\/+$/, '') || 'http://localhost:5000';

  // Donation form state
  const [donationForm, setDonationForm] = useState({
    foodType: '',
    quantity: '',
  manufacturingDate: '',
    location: user?.location?.address || '',
    photo: null as File | null,
    donorPhone: user?.phone || ''
  });
  const [targetRequest, setTargetRequest] = useState<RequestItem | null>(null);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  useEffect(() => {
    console.log('useEffect running, calling loadDonations');
    loadDonations();
  }, []);

  // When navigating to requests view, load them
  useEffect(() => {
    if (currentView === 'requests') {
      loadRequests();
    }
  }, [currentView]);

  const loadDonations = async () => {
    console.log('Calling loadDonations');
    try {
      const token = localStorage.getItem('hungerlink_token');
      const response = await fetch(`${API_BASE}/api/donations/my`, {
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

  // Map AI quality to a clear badge like in Recipient view
  const { t, i18n } = useTranslation();

  const getAiBadge = (quality?: 'fresh' | 'check' | 'not-suitable') => {
    if (!quality) return null;
    if (quality === 'fresh') return <span className="badge badge-success">✅ {t('quality.fresh')}</span>;
    if (quality === 'check') return <span className="badge badge-warning">⚠️ {t('quality.check')}</span>;
    if (quality === 'not-suitable') return <span className="badge badge-error">❌ {t('quality.notSuitable')}</span>;
    return null;
  };

  const loadRequests = async () => {
    try {
      setRequestsError(null);
      setRequestsLoading(true);
      const res = await fetch(`${API_BASE}/api/requests`);
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests((data.requests || []).filter((r: RequestItem) => r.status !== 'fulfilled'));
    } catch (e: any) {
      setRequestsError(e.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

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
        message: t('errors.locationFailed'),
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
      // Client-side validation if donating to a request
      const extractNumber = (s: string) => {
        const m = String(s || '').match(/\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
      };
      if (targetRequest) {
        const donateQty = extractNumber(donationForm.quantity);
        const remaining = targetRequest.remainingQuantity ?? Math.max(0, (targetRequest.numericRequested || extractNumber(targetRequest.quantity)) - (targetRequest.fulfilledQuantity || 0));
        if (donateQty > remaining) {
          throw new Error(t('donor.exceedsRemaining', { donateQty, remaining }));
        }
      }

      // AI analysis (non-blocking if it fails inside the service)
      let aiResult: FoodQualityResult | null = null;
      try {
        aiResult = await geminiService.analyzeFoodQuality(
          donationForm.foodType,
          donationForm.manufacturingDate,
          donationForm.photo || undefined,
          i18n.language
        );
      } catch {}

      // Prepare form data for photo upload
      const formData = new FormData();
  formData.append('foodType', donationForm.foodType);
  formData.append('quantity', donationForm.quantity);
  if (donationForm.manufacturingDate) formData.append('manufacturingDate', donationForm.manufacturingDate);
  if (donationForm.donorPhone) formData.append('donorPhone', donationForm.donorPhone);
  formData.append('location', JSON.stringify({ address: donationForm.location }));
      if (targetRequest) formData.append('request', targetRequest._id);
      if (donationForm.photo) formData.append('photo', donationForm.photo);
  if (aiResult?.quality) formData.append('aiQuality', aiResult.quality);
  if (aiResult) formData.append('aiAnalysis', JSON.stringify(aiResult));

      // Get token for authentication
      const token = localStorage.getItem('hungerlink_token');

      // Send POST request to backend
  const response = await fetch(`${API_BASE}/api/donations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('donor.postError'));
      }

  // Removed unused result variable
      setToast({
        show: true,
        message: t('donor.postSuccess'),
        type: 'success'
      });

      // Reset form
      setDonationForm({
        foodType: '',
        quantity: '',
  // expiryTime removed
  manufacturingDate: '',
  location: user?.location?.address || '',
  photo: null,
  donorPhone: user?.phone || ''
      });
  setTargetRequest(null);
      setCurrentView('dashboard');
      // Optionally reload donations
      loadDonations();
  // Refresh requests list so fulfilled requests disappear
  loadRequests();
    } catch (error: any) {
      setToast({
        show: true,
        message: error.message || t('donor.postError'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  };

  // Removed unused handleAcceptRequest

  // Removed unused getStatusBadge

  // t/i18n already initialized above
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
                <span className="text-dark">{t('common.back')}</span>
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
                  🥘 {t('donor.donateFood')}
                </h2>
                <p className="dashboard-subtitle">
                  {t('donor.subtitle')}
                </p>
                {targetRequest && (
                  <div className="mt-4 p-4 bg-secondary-50 border-2 border-secondary-200 rounded-2xl text-center">
                    <div className="font-semibold text-error text-xl">{t('donor.fulfilling')}: {targetRequest.foodNeeded}</div>
                    <div className="text-sm text-error">{t('donor.remaining')}: {targetRequest.remainingQuantity ?? Math.max(0, (targetRequest.numericRequested || 0) - (targetRequest.fulfilledQuantity || 0))}</div>
                    <button type="button" onClick={() => setTargetRequest(null)} className="btn-ghost mt-2 mx-auto">{t('common.clear')}</button>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleDonationSubmit} className="auth-form">
                {/* Food Type */}
                <div className="form-group">
                  <label className="form-label">{t('form.foodType')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="foodType"
                      placeholder={t('placeholder.foodType')}
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
                  <label className="form-label">{t('form.quantity')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="quantity"
                      placeholder={t('placeholder.quantity')}
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

                

                {/* Manufacturing Date & Time (MFD) */}
                <div className="form-group">
                  <label className="form-label">{t('form.mfd')}</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="manufacturingDate"
                      value={donationForm.manufacturingDate}
                      onChange={handleDonationInputChange}
                      onFocus={() => setFocusedField('manufacturingDate')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'manufacturingDate' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'manufacturingDate' ? 'var(--shadow-glow)' : undefined
                      }}
                      step={60}
                    />
                    {focusedField === 'manufacturingDate' && (
                      <div 
                        className="absolute inset-0 rounded-2xl -z-10"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.2), rgba(59, 178, 115, 0.2))',
                          filter: 'blur(1.5rem)',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    {t('common.location')}
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        name="location"
                        placeholder={t('placeholder.pickupLocation')}
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
                      title={t('auth.useMyLocation')}
                    >
                      {isGettingLocation ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                      ) : (
                        <MapPin className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Donor Contact Phone */}
                <div className="form-group">
                  <label className="form-label">{t('donor.donorPhoneLabel')}</label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="donorPhone"
                      placeholder={t('placeholder.phoneExample')}
                      value={donationForm.donorPhone}
                      onChange={handleDonationInputChange}
                      onFocus={() => setFocusedField('donorPhone')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'donorPhone' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'donorPhone' ? 'var(--shadow-glow)' : undefined
                      }}
                      required
                    />
                    {focusedField === 'donorPhone' && (
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

                {/* Photo Upload */}
                <div className="form-group">
                  <label className="form-label">{t('donation.photoRecommended')}</label>
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
                          <p className="font-medium card-title">{t('donation.uploadPhoto')}</p>
                          <p className="text-sm card-subtitle">{t('donation.uploadHint')}</p>
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
                      🤖 {t('ai.analyzing')}
                    </>
                  ) : isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
                      {t('donation.posting')}
                    </>
                  ) : (
                    <>
                      {t('donation.post')}
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
    // Load when entering this view
    if (!requestsLoading && requests.length === 0 && !requestsError) {
      // fire and forget
      loadRequests();
    }
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
                <span className="text-dark">{t('common.back')}</span>
              </button>
              <Logo size="sm" />
            </div>

            {/* Requests Header */}
            <div className="text-center mb-12 animate-slide-up">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-mesh-gradient rounded-2xl mb-4 animate-bounce-gentle">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gradient mb-2">
                📋 {t('donor.requestsTitle')}
              </h2>
              <p className="dashboard-subtitle">
                {t('donor.requestsSubtitle')}
              </p>
            </div>
            
            {/* Requests List */}
            <div className="grid-responsive">
              <div style={{ gridColumn: '1 / -1' }}>
                {requestsLoading ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <div className="w-8 h-8 border-2 border-neutral-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="dashboard-subtitle">{t('common.loading')}</p>
                  </div>
                ) : requestsError ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('donor.couldNotLoad')}</h3>
                    <p className="dashboard-subtitle">{requestsError}</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-12 h-12 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('donor.noRequests')}</h3>
                    <p className="dashboard-subtitle">{t('donor.noRequestsHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {requests.map((req) => (
                      <div key={req._id} className="card p-6 animate-scale-in">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold dashboard-title mb-2">{req.foodNeeded}</h3>
                            <p className="dashboard-subtitle mb-1">{t('donor.requested')}: {req.quantity}</p>
                            <p className="dashboard-subtitle mb-1">{t('donor.remaining')}: {req.remainingQuantity ?? Math.max(0, (req.numericRequested || 0) - (req.fulfilledQuantity || 0))}</p>
                            <p className="dashboard-subtitle">{t('common.location')}: {typeof req.location === 'string' ? req.location : req.location?.address}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="badge badge-info">{t(`status.${req.status}`)}</span>
                            <button
                              className="btn-secondary text-sm px-4 py-2"
                              onClick={() => {
                                setTargetRequest(req);
                                setDonationForm(prev => ({ ...prev, foodType: req.foodNeeded }));
                                setCurrentView('donate');
                              }}
                            >
                              {t('donor.donateToRequest')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <span className="text-dark">{t('common.logout')}</span>
              <ArrowLeft className="w-4 h-4 rotate-180 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-16 animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-mesh-gradient rounded-3xl mb-6 animate-bounce-gentle">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-4">
              👋 {t('common.welcome')}, {user?.name}
            </h1>
            <p className="text-xl dashboard-subtitle max-w-2xl mx-auto">
              {t('donor.hero')}
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
                  <h3 className="text-2xl font-bold mb-1 text-white">🥘 {t('donor.donateFood')}</h3>
                  <p className="text-white opacity-80">{t('donor.shareMeals')}</p>
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
                  <h3 className="text-2xl font-bold mb-1 text-white">📋 {t('donor.viewRequests')}</h3>
                  <p className="text-white opacity-80">{t('donor.fulfillNeeds')}</p>
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
              <p className="stats-label">{t('donor.totalDonations')}</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="stats-number">{donations.filter(d => d.status === 'completed').length}</h3>
              <p className="stats-label">{t('donor.peopleHelped')}</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                <Heart className="w-6 h-6 text-warning" />
              </div>
              <h3 className="stats-number">{donations.filter(d => d.status === 'available').length}</h3>
              <p className="stats-label">{t('donor.activeDonations')}</p>
            </div>
          </div>

          {/* Donations History */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold dashboard-title">{t('donor.yourDonations')}</h2>
              <div className="flex items-center gap-2 card-text">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{t('common.recentActivity')}</span>
              </div>
            </div>
            
            <div className="grid-responsive">
              {donations.length === 0 ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="card p-12 text-center">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('donor.noDonationsYet')}</h3>
                    <p className="dashboard-subtitle mb-6">{t('donor.noDonationsHint')}</p>
                    <button 
                      onClick={() => setCurrentView('donate')}
                      className="btn-primary"
                    >
                      {t('donor.postFirstDonation')}
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
                      <p className="dashboard-subtitle mb-2">{t('form.quantity')}: {donation.quantity}</p>
                      <p className="dashboard-subtitle mb-2">{t('form.manufactured')}: {donation.manufacturingDate || 'N/A'}</p>
                      {donation.status === 'claimed' && donation.claimedBy && (
                        <p className="dashboard-subtitle mb-2">{t('donor.claimedBy')}: {typeof donation.claimedBy === 'object' ? donation.claimedBy.name || donation.claimedBy.email : donation.claimedBy} {donation.claimantPhone ? `(${donation.claimantPhone})` : ''}</p>
                      )}
                      <p className="dashboard-subtitle mb-2">{t('common.location')}: {typeof donation.location === 'object' && donation.location !== null && (donation.location as any).address ? (donation.location as any).address : donation.location}</p>
                      <span className="badge badge-info mr-2">{t(`status.${donation.status}`)}</span>
                      {getAiBadge(donation.aiQuality)}
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
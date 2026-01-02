import React, { useState, useEffect } from 'react';
import { Plus, Eye, Clock, MapPin, ArrowLeft, Users, Heart, TrendingUp, Sparkles } from 'lucide-react';
import Logo from './Logo';
import Toast from './Toast';
import { formatDateTime } from './lib/format';
import { useTranslation } from 'react-i18next';
import AIInsights from './components/AIInsights';
import type { FoodQualityResult as ModelFoodQualityResult } from './services/geminiService';

interface RecipientDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Request {
  _id: string;
  foodNeeded: string;
  quantity: string;
  location: { address: string } | string;
  requesterType?: 'ngo' | 'individual';
  status: 'open' | 'accepted' | 'fulfilled';
  createdAt: string;
  numericRequested?: number;
  fulfilledQuantity?: number;
  remainingQuantity?: number;
}

interface Donation {
  _id: string;
  foodType: string;
  quantity: string;
  manufacturingDate?: string;
  location: { address: string; coordinates?: any } | string;
  photo?: string;
  status: 'available' | 'claimed' | 'completed';
  aiQuality?: 'fresh' | 'check' | 'not-suitable';
  aiAnalysis?: ModelFoodQualityResult;
  claimedBy?: string;
  createdAt: string;
  user?: any;
  request?: any | null;
}

const RecipientDashboard: React.FC<RecipientDashboardProps> = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  const [currentView, setCurrentView] = useState<'dashboard' | 'request' | 'donations'>('dashboard');
  const [requests, setRequests] = useState<Request[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [claimingDonationId, setClaimingDonationId] = useState<string | null>(null);
  const [claimPhoneByDonation, setClaimPhoneByDonation] = useState<Record<string, string>>({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const API_BASE = ((import.meta as any).env?.VITE_API_URL || window.location.origin || '').replace(/\/+$/, '') || 'http://localhost:5000';

  // Request form state
  const [requestForm, setRequestForm] = useState({
    foodNeeded: '',
    quantity: '',
  location: user?.location?.address || '',
  ngoId: user?.role === 'ngo' ? user?.ngoDetails?.registrationId || '' : '',
  requesterPhone: user?.phone || ''
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    loadRequests();
    loadDonations();
  }, []);

  // Refresh donations when navigating into the donations view
  useEffect(() => {
    if (currentView === 'donations') {
      loadDonations();
    }
  }, [currentView]);

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('hungerlink_token');
      const res = await fetch(`${API_BASE}/api/requests/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      setRequests([]);
    }
  };

  const loadDonations = async () => {
    try {
      setDonationsError(null);
      setDonationsLoading(true);
      const response = await fetch(`${API_BASE}/api/donations`);
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data?.donations || []);
        const filtered = list.filter((d: any) => (!d.request) && d.status === 'available');
        setDonations(filtered);
      } else {
        console.error('Failed to load donations');
        setDonationsError('Failed to load donations');
      }
    } catch (error) {
      console.error('Error loading donations:', error);
      setDonationsError('Error loading donations');
    } finally {
      setDonationsLoading(false);
    }
  };

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
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
      setRequestForm(prev => ({
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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('hungerlink_token');
      const payload = {
        foodNeeded: requestForm.foodNeeded,
        quantity: requestForm.quantity,
        location: { address: requestForm.location },
  requesterPhone: requestForm.requesterPhone,
        requesterType: user?.role === 'ngo' ? 'ngo' : 'individual',
      };
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t('recipient.postError'));
      }
      const { request: saved } = await res.json();
      setRequests(prev => [saved, ...prev]);

      setToast({
        show: true,
        message: t('recipient.postSuccess'),
        type: 'success'
      });

      // Reset form
      setRequestForm({
        foodNeeded: '',
        quantity: '',
  location: user?.location?.address || '',
  ngoId: user?.role === 'ngo' ? user?.ngoDetails?.registrationId || '' : '',
  requesterPhone: user?.phone || ''
      });

  setCurrentView('dashboard');

    } catch (error) {
      setToast({
        show: true,
        message: t('recipient.postError'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimDonation = async (donationId: string) => {
    // Optimistic UI: mark this donation as being claimed locally
    setClaimingDonationId(donationId);
    // also set a global loading flag so other UI can reflect action if needed
    setIsLoading(true);
    // update local donations array optimistically
    setDonations(prev => prev.map(d => d._id === donationId ? { ...d, status: 'claimed', claimedBy: user._id } : d));

    try {
      const token = localStorage.getItem('hungerlink_token');
      const phone = claimPhoneByDonation[donationId] || user?.phone || '';
      const response = await fetch(`${API_BASE}/api/donations/${donationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'claimed', claimedBy: user._id, claimantPhone: phone })
      });
  if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim donation');
      }

      setToast({
        show: true,
        message: t('recipient.claimSuccess'),
        type: 'success'
      });

      // Replace optimistic item with server response (if returns updated donation)
      try {
        const updated = await response.json();
        if (updated && updated._id) {
          setDonations(prev => prev.map(d => d._id === updated._id ? updated : d));
        }
      } catch (e) {
        // ignore parse errors and keep optimistic state
      }

    } catch (error: any) {
      // revert optimistic update on error
      setDonations(prev => prev.map(d => d._id === donationId ? { ...d, status: 'available', claimedBy: undefined } : d));
      setToast({
        show: true,
        message: error.message || t('recipient.claimError'),
        type: 'error'
      });
    } finally {
      setClaimingDonationId(null);
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, aiQuality?: string) => {
    if (aiQuality) {
      if (aiQuality === 'fresh') return <span className="badge badge-success">✅ {t('quality.fresh')}</span>;
      if (aiQuality === 'check') return <span className="badge badge-warning">⚠️ {t('quality.check')}</span>;
      if (aiQuality === 'not-suitable') return <span className="badge badge-error">❌ {t('quality.notSuitable')}</span>;
    }
    
  if (status === 'open') return <span className="badge badge-warning">{t('status.open')}</span>;
    if (status === 'accepted') return <span className="badge badge-success">{t('status.accepted')}</span>;
    if (status === 'fulfilled') return <span className="badge badge-success">{t('status.fulfilled')}</span>;
    if (status === 'available') return <span className="badge badge-info">{t('status.available')}</span>;
    if (status === 'claimed') return <span className="badge badge-success">{t('status.claimed')}</span>;
    
    return null;
  };

  if (currentView === 'request') {
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
              left: '2.5rem',
              opacity: '0.1',
              filter: 'blur(3rem)'
            }} 
          />
          <div 
            className="absolute w-40 h-40 bg-primary-500 rounded-full animate-float"
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
              color: 'rgba(59, 178, 115, 0.3)',
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

            {/* Request Form Card */}
            <div className="card p-8 animate-slide-up">
              <div className="text-center mb-8">
                <div 
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-bounce-gentle"
                  style={{ background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-600))' }}
                >
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-gradient mb-2">
                  🍽 {t('recipient.requestFood')}
                </h2>
                <p className="dashboard-subtitle">
                  {user?.role === 'ngo' ? t('recipient.subtitleNgo') : t('recipient.subtitleIndividual')}
                </p>
              </div>
              
              <form onSubmit={handleRequestSubmit} className="auth-form">
                {/* Food Needed */}
                <div className="form-group">
                  <label className="form-label">{t('form.foodNeeded')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="foodNeeded"
                      placeholder={t('placeholder.foodNeeded')}
                      value={requestForm.foodNeeded}
                      onChange={handleRequestInputChange}
                      onFocus={() => setFocusedField('foodNeeded')}
                      onBlur={() => setFocusedField(null)}
                      className={`input-field transition-all duration-300 ${
                        focusedField === 'foodNeeded' ? 'scale-105' : ''
                      }`}
                      style={{
                        boxShadow: focusedField === 'foodNeeded' ? 'var(--shadow-glow)' : undefined
                      }}
                      required
                    />
                    {focusedField === 'foodNeeded' && (
                      <div 
                        className="absolute inset-0 rounded-2xl -z-10"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 178, 115, 0.2), rgba(255, 122, 0, 0.2))',
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
                      value={requestForm.quantity}
                      onChange={handleRequestInputChange}
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
                          background: 'linear-gradient(135deg, rgba(59, 178, 115, 0.2), rgba(255, 122, 0, 0.2))',
                          filter: 'blur(1.5rem)'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-secondary-500" />
                    {t('common.location')}
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        name="location"
                        placeholder={t('placeholder.deliveryLocation')}
                        value={requestForm.location}
                        onChange={handleRequestInputChange}
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
                            background: 'linear-gradient(135deg, rgba(59, 178, 115, 0.2), rgba(255, 122, 0, 0.2))',
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

                {/* NGO ID (if NGO) */}
                {user?.role === 'ngo' && (
                  <div className="p-6 bg-secondary-50 border-2 border-secondary-200 rounded-2xl animate-slide-down">
                    <div className="flex items-center gap-2 text-secondary-700 font-semibold mb-4">
                      <Users className="w-5 h-5" />
                      <span className="text-dark">{t('recipient.ngoInfo')}</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('recipient.ngoRegId')}</label>
                      <input
                        type="text"
                        name="ngoId"
                        placeholder={t('placeholder.ngoRegId')}
                        value={requestForm.ngoId}
                        onChange={handleRequestInputChange}
                        className="input-field"
                        style={{
                          borderColor: 'var(--secondary-300)',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)'
                        }}
                        required
                      />
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
            {t('recipient.posting')}
                    </>
                  ) : (
                    <>
            {t('recipient.post')}
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

  if (currentView === 'donations') {
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
          <Sparkles 
            className="absolute w-6 h-6 animate-bounce"
            style={{ 
              top: '33%', 
              left: '33%',
              color: 'rgba(255, 122, 0, 0.3)',
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

            {/* Donations Header */}
            <div className="text-center mb-12 animate-slide-up">
              <div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-bounce-gentle"
                style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' }}
              >
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gradient mb-2">🥘 {t('recipient.availableDonations')}</h2>
              <p className="dashboard-subtitle">{t('recipient.availableSubtitle')}</p>
            </div>
            
            {/* Donations List */}
            <div className="grid-responsive">
              <div style={{ gridColumn: '1 / -1' }}>
                {donationsLoading ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <div className="w-8 h-8 border-2 border-neutral-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="dashboard-subtitle">{t('common.loading')}</p>
                  </div>
                ) : donationsError ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('recipient.couldNotLoadDonations')}</h3>
                    <p className="dashboard-subtitle">{donationsError}</p>
                  </div>
                ) : donations.length === 0 ? (
                  <div className="card p-12 text-center animate-scale-in">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('recipient.noDonations')}</h3>
                    <p className="dashboard-subtitle">{t('recipient.noDonationsHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {donations.map((donation) => (
                      <div key={donation._id} className="card p-6 animate-scale-in">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Photo */}
                          <div className="md:w-48 h-48 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0">
                            {donation.photo ? (
                              <img 
                                src={`${API_BASE}${donation.photo}`} 
                                alt={donation.foodType}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Heart className="w-12 h-12 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-semibold dashboard-title mb-2">{donation.foodType}</h3>
                                <p className="dashboard-subtitle mb-2">{t('form.quantity')}: {donation.quantity}</p>
                                <p className="dashboard-subtitle mb-2">{t('form.manufactured')}: {donation.manufacturingDate || 'N/A'}</p>
                                <p className="dashboard-subtitle">
                                  {t('common.location')}: {typeof donation.location === 'string' 
                                    ? donation.location 
                                    : donation.location?.address || t('common.noAddress')}
                                </p>

                                {/* AI Insights Section */}
                                <AIInsights analysis={donation.aiAnalysis} targetLang={i18n.language} />
                              </div>
                              <div className="flex flex-col gap-2">
                                {getStatusBadge(donation.status, donation.aiQuality)}
                                { (donation.status === 'available' || claimingDonationId === donation._id) && (
                                  <div>
                                    {donation.status === 'available' ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="tel"
                                          placeholder={t('recipient.phoneForPickup')}
                                          value={claimPhoneByDonation[donation._id] ?? user?.phone ?? ''}
                                          onChange={(e) => setClaimPhoneByDonation(prev => ({ ...prev, [donation._id]: e.target.value }))}
                                          className="input-field text-sm"
                                          style={{ width: '10rem' }}
                                        />
                                        <button
                                          onClick={() => handleClaimDonation(donation._id)}
                                          className="btn-secondary text-sm px-4 py-2"
                                          disabled={!!claimingDonationId}
                                        >
                                          {claimingDonationId === donation._id ? t('recipient.claiming') : t('recipient.claimFood')}
                                        </button>
                                      </div>
                                    ) : (
                                      claimingDonationId === donation._id ? (
                                        <button className="btn-secondary text-sm px-4 py-2 opacity-70 cursor-not-allowed" disabled>
                                          {t('recipient.claiming')}
                                        </button>
                                      ) : null
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
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
            left: '2.5rem',
            opacity: '0.1',
            filter: 'blur(3rem)'
          }} 
        />
        <div 
          className="absolute w-40 h-40 bg-primary-500 rounded-full animate-float"
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
            color: 'rgba(59, 178, 115, 0.3)',
            animationDelay: '0.5s'
          }} 
        />
        <Sparkles 
          className="absolute w-4 h-4 animate-bounce"
          style={{ 
            bottom: '33%', 
            left: '33%',
            color: 'rgba(255, 122, 0, 0.3)',
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
            <div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 animate-bounce-gentle"
              style={{ background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-600))' }}
            >
              {user?.role === 'ngo' ? <Users className="w-10 h-10 text-white" /> : <Heart className="w-10 h-10 text-white" />}
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-4">
              👋 {t('common.welcome')}, {user?.name}
            </h1>
            <p className="text-xl dashboard-subtitle max-w-2xl mx-auto">
              {user?.role === 'ngo' 
                ? t('recipient.heroNgo')
                : t('recipient.heroIndividual')
              }
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="grid md:grid-cols-2 gap-6 mb-16 animate-scale-in">
            <button 
              onClick={() => setCurrentView('request')}
              className="group relative overflow-hidden p-8 rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-600))' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-1 text-white">🍽 {t('recipient.requestFood')}</h3>
                  <p className="text-white opacity-80">{t('recipient.postYourNeeds')}</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => setCurrentView('donations')}
              className="group relative overflow-hidden p-8 bg-mesh-gradient rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <div className="relative flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-1 text-white">🥘 {t('recipient.viewDonations')}</h3>
                  <p className="text-white opacity-80">{t('recipient.browseAvailable')}</p>
                </div>
              </div>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="stats-number">{requests.length}</h3>
              <p className="stats-label">{t('recipient.totalRequests')}</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="stats-number">{requests.filter(r => r.status === 'fulfilled').length}</h3>
              <p className="stats-label">{t('recipient.mealsReceived')}</p>
            </div>
            
            <div className="stats-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                <Users className="w-6 h-6 text-warning" />
              </div>
              <h3 className="stats-number">{requests.filter(r => r.status === 'open').length}</h3>
              <p className="stats-label">{t('recipient.activeRequests')}</p>
            </div>
          </div>

          {/* Requests History */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold dashboard-title">{t('recipient.yourRequests')}</h2>
              <div className="flex items-center gap-2 card-text">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{t('common.recentActivity')}</span>
              </div>
            </div>
            
            <div className="grid-responsive">
              <div style={{ gridColumn: '1 / -1' }}>
                {requests.length === 0 ? (
                  <div className="card p-12 text-center">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Heart className="w-12 h-12 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold dashboard-title mb-2">{t('recipient.noRequestsYet')}</h3>
                    <p className="dashboard-subtitle mb-6">{t('recipient.noRequestsHint')}</p>
                    <button 
                      onClick={() => setCurrentView('request')}
                      className="btn-primary"
                    >
                      {t('recipient.postFirstRequest')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div key={req._id} className="card p-6 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold dashboard-title">{req.foodNeeded}</h3>
                          <p className="dashboard-subtitle">{t('form.quantity')}: {req.quantity} • {t('donor.remaining')}: {req.remainingQuantity ?? Math.max(0, (req.numericRequested || 0) - (req.fulfilledQuantity || 0))}</p>
                          <p className="dashboard-subtitle">{t('common.location')}: {typeof req.location === 'string' ? req.location : req.location?.address}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(req.status)}
                          <span className="text-xs text-neutral-500">{formatDateTime(req.createdAt)}</span>
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
    </div>
  );
};

export default RecipientDashboard;
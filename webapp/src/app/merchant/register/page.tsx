'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Store, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Navigation, 
  FileCheck, 
  Globe,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  registerMerchant, 
  isMockRegister, 
  isValidEthiopianPhone, 
  sanitizePhone, 
  ApiError,
  MerchantRegisterPayload 
} from '@/lib/api';
import { processStorefrontPhoto, ProcessedPhotoResult } from '@/lib/photoUtils';
import { setMerchantPassword } from '@/lib/merchantAuth';

const CATEGORIES = [
  'cafe',
  'restaurant',
  'bakery',
  'grocery',
  'tailor',
  'pharmacy',
  'salon',
  'electronics',
  'other'
] as const;

export default function MerchantRegisterPage() {
  const { t, language, setLanguage } = useLanguage();
  const [isMock] = useState<boolean>(() => isMockRegister());

  // Form State (strictly kept in-memory, never persisted to localStorage or logged)
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [tillNumber, setTillNumber] = useState('');
  const [category, setCategory] = useState<string>('cafe');

  // Location State (Default: Bole area Addis Ababa)
  const [lat, setLat] = useState('9.00540');
  const [lon, setLon] = useState('38.78400');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Photo State
  const [photoData, setPhotoData] = useState<ProcessedPhotoResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [assignedMerchantId, setAssignedMerchantId] = useState<string | null>(null);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Geolocation Handler (opt-in)
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        // Validate within Addis Ababa boundaries [8.80..9.15, 38.60..38.95]
        if (userLat < 8.80 || userLat > 9.15 || userLon < 38.60 || userLon > 38.95) {
          setLocationError(
            t('register.coordError') ||
            'Coordinates must be within Addis Ababa (lat 8.80..9.15, lon 38.60..38.95)'
          );
        } else {
          setLat(userLat.toFixed(5));
          setLon(userLon.toFixed(5));
          setLocationError(null);
        }
      },
      () => {
        setIsLocating(false);
        setLocationError('Unable to retrieve location. Please grant permission or enter manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Photo Upload Handler with client-side canvas resize
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessingPhoto(true);

    try {
      const processed = await processStorefrontPhoto(file);
      setPhotoData(processed);
      setPhotoError(null);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to process storefront photo');
      setPhotoData(null);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Validation before submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!shopName.trim() || shopName.trim().length < 2 || shopName.trim().length > 60) {
      errors.shopName = 'shopName must be between 2 and 60 characters';
    }

    if (!ownerName.trim() || ownerName.trim().length < 2 || ownerName.trim().length > 60) {
      errors.ownerName = 'ownerName must be between 2 and 60 characters';
    }

    if (!licenseNumber.trim() || licenseNumber.trim().length < 4 || licenseNumber.trim().length > 40) {
      errors.licenseNumber = 'licenseNumber must be between 4 and 40 characters';
    }

    const cleanTin = tinNumber.replace(/[\s-]/g, '');
    if (!cleanTin || !/^\d{5,20}$/.test(cleanTin)) {
      errors.tinNumber = 'Business TIN must be digits only, between 5 and 20 digits';
    }

    const cleanTill = tillNumber.replace(/[\s-]/g, '');
    if (cleanTill && !/^\d{5,6}$/.test(cleanTill)) {
      errors.tillNumber = 'Till number must be 5 or 6 digits';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Invalid email address format';
    }

    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    const cleanOwnerPhone = sanitizePhone(ownerPhone);
    if (!isValidEthiopianPhone(cleanOwnerPhone)) {
      errors.ownerPhone = 'Invalid ownerPhone number. Accepted: 07xxxxxxxx, 09xxxxxxxx, +251...';
    }

    const cleanMpesaPhone = sanitizePhone(mpesaPhone);
    if (!isValidEthiopianPhone(cleanMpesaPhone)) {
      errors.mpesaPhone = 'Invalid mpesaPhone number. Accepted: 07xxxxxxxx, 09xxxxxxxx, +251...';
    }

    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);
    if (isNaN(numLat) || isNaN(numLon) || numLat < 8.80 || numLat > 9.15 || numLon < 38.60 || numLon > 38.95) {
      errors.location = t('register.coordError') || 'Coordinates must be within Addis Ababa (lat 8.80..9.15, lon 38.60..38.95)';
    }

    if (!photoData || !photoData.dataUrl) {
      errors.photo = 'Storefront photo is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    const cleanTin = tinNumber.replace(/[\s-]/g, '');
    const cleanTill = tillNumber.replace(/[\s-]/g, '');

    const payload: MerchantRegisterPayload = {
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      licenseNumber: licenseNumber.trim(),
      tinNumber: cleanTin,
      email: email.trim(),
      ownerPhone: sanitizePhone(ownerPhone),
      mpesaPhone: sanitizePhone(mpesaPhone),
      category,
      lat: parseFloat(parseFloat(lat).toFixed(5)),
      lon: parseFloat(parseFloat(lon).toFixed(5)),
      photo: photoData!.dataUrl,
      ...(cleanTill ? { tillNumber: cleanTill } : {}),
    };

    try {
      const res = await registerMerchant(payload);
      setSubmitSuccess(true);
      setAssignedMerchantId(res.merchantId);
      await setMerchantPassword(email.trim(), password, shopName.trim());
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setSubmitError(err.message || 'Validation error');
        } else if (err.status === 409) {
          setSubmitError(
            err.message ||
            t('register.conflictMsg') ||
            'A shop with these details already exists. Contact support if this is yours.'
          );
        } else if (err.status === 429) {
          setSubmitError(
            err.message ||
            t('register.rateLimitMsg') ||
            'Too many attempts, try again in an hour'
          );
        } else {
          setSubmitError(err.message || 'Registration failed. Please retry.');
        }
      } else {
        setSubmitError('Connection error. Please verify your network and retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-green-700 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link 
              href="/dashboard" 
              className="text-xs sm:text-sm font-medium text-gray-600 hover:text-green-700 transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <span>{t('register.alreadyRegistered')}</span>
              <span className="font-bold text-green-700 underline underline-offset-2">
                {t('register.login')}
              </span>
            </Link>

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
              {(['en', 'am', 'om', 'ti'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`min-h-[32px] px-2 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                    language === lang 
                      ? 'bg-white text-green-700 shadow-xs font-bold' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Mock Mode Notice (default) */}
        {isMock && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{t('register.sampleMode') || 'Sample mode: nothing is sent'}</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full shrink-0">
              MOCK
            </span>
          </div>
        )}

        {/* SUCCESS CARD (201 Created) */}
        {submitSuccess ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-100 text-center animate-scale-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
              {t('register.successTitle') || 'Under review'}
            </h1>

            <p className="text-sm sm:text-base text-gray-700 font-medium mb-6 leading-relaxed max-w-md mx-auto">
              {t('register.successMsg') || 'Submitted. Your registration is under review before your shop goes live.'}
            </p>

            {assignedMerchantId && (
              <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono text-gray-600 mb-6">
                Merchant ID: <span className="font-bold text-gray-900">{assignedMerchantId}</span>
              </div>
            )}

            {/* Next Steps Guidance */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 sm:p-5 text-left mb-8 space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                {t('register.nextSteps') || 'What happens next?'}
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {t('register.step1Desc') || '1. Our team reviews your business information and tax details.'}
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {t('register.step2Desc') || '2. Once approved, log in to your Merchant Dashboard at /dashboard with your registered email and password.'}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="min-h-[50px] w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-base px-6 py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>{t('register.goToDashboard') || 'Go to Merchant Dashboard'}</span>
              <Store className="w-5 h-5" />
            </Link>

            {/* Already registered reciprocal link on success card */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                {t('register.alreadyRegistered')}{' '}
                <Link
                  href="/dashboard"
                  className="font-bold text-green-700 hover:text-green-800 underline underline-offset-2 transition-colors min-h-[44px] inline-flex items-center"
                >
                  {t('register.login')}
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-gray-100">
            {/* Header */}
            <div className="mb-8">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                <Store className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
                {t('register.title') || 'Register Your Shop'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                {t('register.subtitle') || 'Join Tirf Market to attract nearby customers and accept M-PESA cashless payments.'}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                {t('register.alreadyRegistered')}{' '}
                <Link
                  href="/dashboard"
                  className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2 transition-colors min-h-[44px] inline-flex items-center"
                >
                  {t('register.login')}
                </Link>
              </p>
            </div>

            {/* Error Notification */}
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-bold">Submission Error</p>
                  <p>{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Business Profile */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-green-600" />
                  <span>1. Business Details</span>
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('register.shopName') || 'Shop Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder={t('register.shopNamePlaceholder') || 'e.g. Bole Highland Cafe'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.shopName ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      if (fieldErrors.shopName) setFieldErrors(prev => ({ ...prev, shopName: '' }));
                    }}
                  />
                  {fieldErrors.shopName && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.shopName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('register.ownerName') || 'Owner / Representative Full Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder={t('register.ownerNamePlaceholder') || 'e.g. Abebe Kebede'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.ownerName ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (fieldErrors.ownerName) setFieldErrors(prev => ({ ...prev, ownerName: '' }));
                    }}
                  />
                  {fieldErrors.ownerName && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.ownerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 leading-snug">
                    {t('register.licenseNumber') || 'Business trade license number'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    maxLength={40}
                    placeholder={t('register.licensePlaceholder') || 'e.g. BL/AA/14/001/2016'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.licenseNumber ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={licenseNumber}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      if (fieldErrors.licenseNumber) setFieldErrors(prev => ({ ...prev, licenseNumber: '' }));
                    }}
                  />
                  {fieldErrors.licenseNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.licenseNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 leading-snug">
                    {t('register.tinNumber') || 'Business TIN (tax identification number)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder={t('register.tinPlaceholder') || 'e.g. 1234567890 (digits only, 5 to 20 characters)'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.tinNumber ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={tinNumber}
                    onChange={(e) => {
                      setTinNumber(e.target.value);
                      if (fieldErrors.tinNumber) setFieldErrors(prev => ({ ...prev, tinNumber: '' }));
                    }}
                  />
                  {fieldErrors.tinNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.tinNumber}</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">
                    {t('register.tinNote') || 'Used by our team to review your shop. Never shown publicly.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('register.category') || 'Business Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm cursor-pointer"
                  >
                    {CATEGORIES.map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {t(`cat.${catKey}`) || catKey}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 2: Contact & M-PESA Information */}
              <div className="space-y-4 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  <span>2. Contact & M-PESA Settlement</span>
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('register.email') || 'Business Email Address'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t('register.emailPlaceholder') || 'shop@example.com'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.email ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Used to sign in to your Merchant Dashboard with your password.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t('register.ownerPhone') || 'Owner Phone Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0911223344"
                      className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                        fieldErrors.ownerPhone ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                      }`}
                      value={ownerPhone}
                      onChange={(e) => {
                        setOwnerPhone(e.target.value);
                        if (fieldErrors.ownerPhone) setFieldErrors(prev => ({ ...prev, ownerPhone: '' }));
                      }}
                    />
                    {fieldErrors.ownerPhone && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.ownerPhone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t('register.mpesaPhone') || 'M-PESA Payout Phone'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0711223344"
                      className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                        fieldErrors.mpesaPhone ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                      }`}
                      value={mpesaPhone}
                      onChange={(e) => {
                        setMpesaPhone(e.target.value);
                        if (fieldErrors.mpesaPhone) setFieldErrors(prev => ({ ...prev, mpesaPhone: '' }));
                      }}
                    />
                    {fieldErrors.mpesaPhone && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.mpesaPhone}</p>
                    )}
                  </div>
                </div>

                {/* Optional Till Number (always shown now) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('register.tillNumber') || 'M-PESA Till Number (Optional)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t('register.tillPlaceholder') || 'e.g. 543210 (digits only, 5 to 6 digits)'}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                      fieldErrors.tillNumber ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                    }`}
                    value={tillNumber}
                    onChange={(e) => {
                      // Strict digits only
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      setTillNumber(digitsOnly);
                      if (fieldErrors.tillNumber) setFieldErrors(prev => ({ ...prev, tillNumber: '' }));
                    }}
                  />
                  {fieldErrors.tillNumber && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.tillNumber}</p>
                  )}
                </div>
              </div>

              {/* Section 3: Merchant Password & Security */}
              <div className="space-y-4 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-green-600" />
                  <span>3. Merchant Login Password</span>
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Set Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        className={`w-full min-h-[46px] pl-3.5 pr-10 py-2.5 bg-gray-50 border rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                          fieldErrors.password ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                        }`}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Repeat your password"
                      className={`w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm ${
                        fieldErrors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
                      }`}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  You will use this password to sign in directly to your Merchant Dashboard without needing email OTP codes.
                </p>
              </div>

              {/* Section 4: Coordinates in Addis Ababa */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 flex-wrap gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                    <span>4. {t('register.locationSection') || 'Shop Coordinates in Addis Ababa'}</span>
                  </h2>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="min-h-[44px] text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? t('register.locating') : (t('register.useLocation') || 'Use my current location')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t('register.latLabel') || 'Latitude (8.80 – 9.15)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      min="8.80"
                      max="9.15"
                      required
                      className="w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                      value={lat}
                      onChange={(e) => {
                        setLat(e.target.value);
                        setLocationError(null);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t('register.lonLabel') || 'Longitude (38.60 – 38.95)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      min="38.60"
                      max="38.95"
                      required
                      className="w-full min-h-[46px] px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                      value={lon}
                      onChange={(e) => {
                        setLon(e.target.value);
                        setLocationError(null);
                      }}
                    />
                  </div>
                </div>

                {locationError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">
                    {locationError}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Coordinates: <span className="font-mono text-gray-800">{parseFloat(lat || '0').toFixed(5)}, {parseFloat(lon || '0').toFixed(5)}</span></span>
                  <a
                    href={openStreetMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] text-green-700 hover:text-green-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>{t('register.checkOSM') || 'Check on OpenStreetMap'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Section 5: Storefront Photo */}
              <div className="space-y-3 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-green-600" />
                  <span>5. {t('register.photoSection') || 'Storefront Photo'} <span className="text-red-500">*</span></span>
                </h2>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('register.photoDesc') || 'Upload a clear photo of your shop entrance or signboard (JPEG, PNG or WebP, auto-resized under 1 MB).'}
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {photoData ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shrink-0">
                        <Image
                          src={photoData.dataUrl}
                          alt="Storefront Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Storefront Photo Ready</p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {(photoData.byteSize / 1024).toFixed(0)} KB (within 1 MB limit)
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {photoData.width} × {photoData.height} px
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[44px] text-xs bg-white hover:bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                    >
                      {t('register.photoChangeBtn') || 'Change Photo'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="w-full min-h-[90px] border-2 border-dashed border-gray-300 hover:border-green-600 bg-gray-50/60 hover:bg-green-50/20 rounded-2xl flex flex-col items-center justify-center p-4 transition-colors cursor-pointer text-center"
                  >
                    {isProcessingPhoto ? (
                      <div className="flex items-center gap-2 text-green-700 text-xs font-semibold">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Optimizing photo size...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                        <span className="text-xs font-bold text-gray-700">
                          {t('register.photoUploadBtn') || 'Select or Take Photo'}
                        </span>
                        <span className="text-[11px] text-gray-400 mt-0.5">
                          Camera supported on mobile devices (JPEG, PNG, WebP)
                        </span>
                      </>
                    )}
                  </button>
                )}

                {photoError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                    {photoError}
                  </p>
                )}
                {fieldErrors.photo && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.photo}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting || isProcessingPhoto}
                  className="w-full min-h-[50px] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-base py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('register.submitting') || 'Submitting application...'}</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-5 h-5" />
                      <span>{t('register.submit') || 'Submit Shop Registration'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          Tirf Market &bull; Local Deals &amp; M-PESA Cashless Checkout &bull; Addis Ababa
        </div>
      </footer>
    </div>
  );
}

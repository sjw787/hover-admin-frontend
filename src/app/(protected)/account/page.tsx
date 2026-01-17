'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatPhoneWithCountry, formatPhoneForDisplay, validateE164, COUNTRY_CODES } from '@/lib/phoneValidation';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Phone validation state
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneHelp, setPhoneHelp] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<string>('US');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string>('');

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone_number: '', // Stores E.164 format
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Load user profile data on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const userInfo = await api.getUserInfo();

        // Extract profile data from Cognito attributes
        const attributes = userInfo.attributes || {};
        const phoneNumber = attributes.phone_number || '';

        setProfileData({
          full_name: attributes.name || attributes.full_name || '',
          phone_number: phoneNumber,
        });

        // Set display phone number
        if (phoneNumber) {
          setDisplayPhoneNumber(formatPhoneForDisplay(phoneNumber, phoneCountry));
        }

        console.log('✅ Profile data loaded:', profileData);
      } catch (error) {
        console.error('❌ Failed to load profile:', error);
        // Don't show error message on load, just leave fields empty
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []); // Run once on mount

  const handlePhoneChange = (value: string) => {
    // Store E.164 format
    const e164Formatted = formatPhoneWithCountry(value, phoneCountry);
    setProfileData({ ...profileData, phone_number: e164Formatted });

    // Format for display
    const displayFormatted = formatPhoneForDisplay(e164Formatted, phoneCountry);
    setDisplayPhoneNumber(displayFormatted);

    if (!e164Formatted || e164Formatted.trim() === '') {
      setPhoneError(null);
      setPhoneHelp(null);
      return;
    }

    const validation = validateE164(e164Formatted);
    if (!validation.isValid) {
      setPhoneError(validation.error || null);
      setPhoneHelp(null);
    } else {
      setPhoneError(null);
      setPhoneHelp('✓ Valid');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Validate phone number before submission
    if (profileData.phone_number && profileData.phone_number.trim() !== '') {
      const validation = validateE164(profileData.phone_number);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid phone number format');
        setIsLoading(false);
        return;
      }
    }

    try {
      await api.updateProfile(profileData);
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMessage('New passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await api.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      setSuccessMessage('Password changed successfully!');
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-indigo-100 mt-2">Manage your profile and security settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Loading State */}
          {isLoadingProfile && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading profile...</p>
            </div>
          )}

          {/* Success/Error Messages */}
          {!isLoadingProfile && (
            <>
          {successMessage && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number (Optional)
                </label>
                <div className="flex gap-2">
                  {/* Country dropdown */}
                  <select
                    value={phoneCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setPhoneCountry(newCountry);
                      // Re-format phone with new country code
                      if (profileData.phone_number) {
                        const formatted = formatPhoneWithCountry(profileData.phone_number.replace(/^\+\d+/, ''), newCountry);
                        setProfileData({ ...profileData, phone_number: formatted });
                        setDisplayPhoneNumber(formatPhoneForDisplay(formatted, newCountry));
                      }
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  >
                    {Object.entries(COUNTRY_CODES).map(([code, country]) => (
                      <option key={code} value={code}>
                        {code} +{country.code}
                      </option>
                    ))}
                  </select>

                  {/* Phone input */}
                  <input
                    id="phone"
                    type="tel"
                    value={displayPhoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                      phoneError
                        ? 'border-red-500 dark:border-red-500'
                        : phoneHelp && phoneHelp.startsWith('✓')
                        ? 'border-green-500 dark:border-green-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder={phoneCountry === 'US' ? '(555) 123-4567' : 'Phone number'}
                  />
                </div>

                {/* Error message */}
                {phoneError && (
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{phoneError}</p>
                )}

                {/* Success message */}
                {!phoneError && phoneHelp && phoneHelp.startsWith('✓') && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">{phoneHelp}</p>
                )}

                {/* Help text */}
                {!phoneError && !phoneHelp && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your phone number and select your country. We&apos;ll format it automatically.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label htmlFor="old_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  id="old_password"
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}


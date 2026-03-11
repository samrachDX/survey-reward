import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Redeem() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    // Get token from URL query param or from navigation state
    const urlToken = searchParams.get('token');
    const stateUrl = location.state?.redemptionUrl;

    let resolvedToken = urlToken;
    if (!resolvedToken && stateUrl) {
      try {
        const url = new URL(stateUrl);
        resolvedToken = url.searchParams.get('token');
      } catch {}
    }

    if (resolvedToken) {
      setToken(resolvedToken);
      validateToken(resolvedToken);
    } else {
      setTokenError('No reward token found. Please complete the survey first.');
      setValidating(false);
    }
  }, []);

  const validateToken = async (t) => {
    try {
      const res = await axios.get(`${API_URL}/api/reward/validate?token=${t}`);
      setTokenValid(res.data.valid);
      if (!res.data.valid) setTokenError(res.data.error || 'Invalid token.');
    } catch (err) {
      setTokenError(err.response?.data?.error || 'Token validation failed.');
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    const phoneRegex = /^(0[1-9][0-9]{7,8})$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid Cambodian phone number (e.g. 012345678 or 0812345678)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/topup/redeem`, { token, phone });
      navigate('/result', { state: { success: res.data.success, message: res.data.message, phone, code: res.data.code } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Redemption failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your reward token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Reward Token</h2>
          <p className="text-red-600 mb-6">{tokenError}</p>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-medium">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-white">Claim Your Reward!</h1>
          <p className="text-green-100 text-sm mt-1">Enter your phone number to receive mobile credit</p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-green-700 text-sm font-medium">Survey completed! Your reward is ready.</span>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="012345678"
            maxLength={10}
            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl p-4 text-lg font-mono text-gray-800 focus:outline-none transition-colors"
          />
          <p className="text-gray-400 text-xs mt-2">
            Format: 012345678 or 0812345678 (Cambodian number)
          </p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !phone}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors shadow-md text-lg"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : '📲 Top Up My Phone'}
          </button>

          <p className="text-center text-gray-400 text-xs mt-4">
            ⚠️ Each reward token can only be used once. Make sure your phone number is correct.
          </p>
        </div>
      </div>
    </div>
  );
}

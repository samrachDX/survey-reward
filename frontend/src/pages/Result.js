import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, message, phone, code } = location.state || {};

  if (!location.state) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`px-8 py-10 text-center ${success
          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
          : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
          <div className="text-6xl mb-3">{success ? '✅' : '❌'}</div>
          <h1 className="text-2xl font-bold text-white">
            {success ? 'Top-Up Successful!' : 'Top-Up Failed'}
          </h1>
        </div>

        {/* Content */}
        <div className="px-8 py-8 text-center">
          <p className={`text-lg font-medium mb-4 ${success ? 'text-green-700' : 'text-red-700'}`}>
            {message}
          </p>

          {phone && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-500 text-sm">Phone number</p>
              <p className="text-gray-800 font-mono text-xl font-bold">{phone}</p>
            </div>
          )}

          {!success && code && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-red-600 text-sm font-medium">Error Code: {code}</p>
              <p className="text-red-500 text-xs mt-1">
                Please contact support if this issue persists.
              </p>
            </div>
          )}

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-green-700 text-sm">
                📱 Your mobile credit has been added. It may take a few seconds to appear in your balance.
              </p>
            </div>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full border border-gray-300 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

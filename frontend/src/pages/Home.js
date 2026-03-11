import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-center">
          <div className="text-5xl mb-3">📱</div>
          <h1 className="text-2xl font-bold text-white mb-2">Survey Reward</h1>
          <p className="text-blue-100 text-sm">Share your opinion, get free phone credit!</p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl mt-0.5">✅</span>
              <div>
                <p className="font-semibold text-gray-800">Answer a short survey</p>
                <p className="text-gray-500 text-sm">Takes only 2-3 minutes to complete</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl mt-0.5">🔗</span>
              <div>
                <p className="font-semibold text-gray-800">Receive your reward link</p>
                <p className="text-gray-500 text-sm">A unique one-time redemption URL</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl mt-0.5">💰</span>
              <div>
                <p className="font-semibold text-gray-800">Get mobile top-up instantly</p>
                <p className="text-gray-500 text-sm">Credit added directly to your phone</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/survey')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors duration-200 text-lg shadow-md hover:shadow-lg"
          >
            Start Survey →
          </button>
          <p className="text-center text-gray-400 text-xs mt-4">
            One reward per participant. Limited to eligible phone numbers.
          </p>
        </div>
      </div>
    </div>
  );
}

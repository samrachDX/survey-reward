import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Survey() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/survey/questions`);
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError('Failed to load survey questions. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [`q${questionId}`]: value }));
  };

  const handleCheckbox = (questionId, option, checked) => {
    setAnswers(prev => {
      const current = prev[`q${questionId}`] || [];
      if (checked) return { ...prev, [`q${questionId}`]: [...current, option] };
      return { ...prev, [`q${questionId}`]: current.filter(v => v !== option) };
    });
  };

  const validateStep = () => {
    const q = questions[currentStep];
    if (!q) return true;
    if (q.required) {
      const ans = answers[`q${q.id}`];
      if (!ans || (Array.isArray(ans) && ans.length === 0)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      setError('Please answer this question before continuing.');
      return;
    }
    setError('');
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      setError('Please answer this question before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/survey/submit`, { answers });
      if (res.data.success) {
        // Extract token from redemptionUrl and put it in the URL directly
        const redemptionUrl = res.data.redemptionUrl || '';
        let token = '';
        try {
          const urlObj = new URL(redemptionUrl);
          token = urlObj.searchParams.get('token');
        } catch {
          token = redemptionUrl.split('?token=')[1] || '';
        }
        if (token) {
          navigate(`/redeem?token=${token}`);
        } else {
          setError('Submission succeeded but no token received. Please contact support.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderInput = (q) => {
    const val = answers[`q${q.id}`];
    switch (q.type) {
      case 'radio':
        return (
          <div className="space-y-2">
            {q.options.map(opt => (
              <label key={opt} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input type="radio" name={`q${q.id}`} value={opt} checked={val === opt}
                  onChange={() => handleAnswer(q.id, opt)} className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {q.options.map(opt => (
              <label key={opt} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                <input type="checkbox" checked={(val || []).includes(opt)}
                  onChange={e => handleCheckbox(q.id, opt, e.target.checked)} className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <select value={val || ''} onChange={e => handleAnswer(q.id, e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Select an option --</option>
            {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'scale':
        return (
          <div className="flex gap-2 flex-wrap">
            {q.options.map(opt => (
              <button key={opt} onClick={() => handleAnswer(q.id, opt)}
                className={`w-12 h-12 rounded-full font-semibold border-2 transition-colors ${val === opt ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                {opt}
              </button>
            ))}
          </div>
        );
      case 'textarea':
        return (
          <textarea value={val || ''} onChange={e => handleAnswer(q.id, e.target.value)} rows={4}
            placeholder="Type your answer here..."
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        );
      default:
        return (
          <input type="text" value={val || ''} onChange={e => handleAnswer(q.id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey questions...</p>
        </div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={fetchQuestions} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLastStep = currentStep === questions.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white font-medium text-sm">Question {currentStep + 1} of {questions.length}</span>
            <span className="text-blue-200 text-sm">{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-blue-800 bg-opacity-50 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-8">
          {q && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {q.question}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </h2>
              <p className="text-gray-400 text-sm mb-5">
                {q.required ? 'This question is required' : 'Optional'}
              </p>
              {renderInput(q)}
            </>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {currentStep > 0 && (
              <button onClick={() => { setCurrentStep(p => p - 1); setError(''); }}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                ← Back
              </button>
            )}
            {isLastStep ? (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors shadow-md">
                {submitting ? 'Submitting...' : '🎉 Submit & Get Reward'}
              </button>
            ) : (
              <button onClick={handleNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md">
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

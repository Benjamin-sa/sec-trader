'use client';

import { useState } from 'react';
import { TrendingUp, Shield, Zap, BarChart3, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  mode: 'signin' | 'signup';
  email: string;
  password: string;
  name: string;
  error: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export function AuthView({
  mode,
  email,
  password,
  name,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit,
  onToggleMode,
}: AuthViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const isSignUp = mode === 'signup';

  const features = [
    {
      icon: TrendingUp,
      title: 'Real-time Insights',
      description: 'Track insider trades as they happen',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant analysis and notifications',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'AI-powered trading signals',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[600px]">
      {/* Left side - Branding & Features */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SEC Trader</h1>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            {isSignUp ? 'Start Your Trading Journey' : 'Welcome Back, Trader'}
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            {isSignUp 
              ? 'Join thousands of traders making smarter decisions with insider trading data.'
              : 'Access real-time insider trading intelligence and market insights.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 transform transition-all duration-300 hover:bg-white/20 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-blue-200 mb-2" />
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-blue-100 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right side - Auth Form */}
      <div className="lg:w-1/2 bg-white p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h3>
            <p className="text-gray-600">
              {isSignUp 
                ? 'Fill in your details to get started'
                : 'Enter your credentials to continue'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {isSignUp && (
              <div className="relative">
                <label 
                  className={`block text-sm font-medium mb-2 transition-colors ${
                    focusedField === 'name' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none bg-gray-50 focus:bg-white"
                  placeholder="John Doe"
                  required
                />
                <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
                  focusedField === 'name' ? 'w-full' : 'w-0'
                }`}></div>
              </div>
            )}

            <div className="relative">
              <label 
                className={`block text-sm font-medium mb-2 transition-colors ${
                  focusedField === 'email' ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none bg-gray-50 focus:bg-white"
                placeholder="you@example.com"
                required
              />
              <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
                focusedField === 'email' ? 'w-full' : 'w-0'
              }`}></div>
            </div>

            <div className="relative">
              <label 
                className={`block text-sm font-medium mb-2 transition-colors ${
                  focusedField === 'password' ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 outline-none bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
                focusedField === 'password' ? 'w-full' : 'w-0'
              }`}></div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </span>
              <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors group"
            >
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <span className="font-semibold text-blue-600 group-hover:underline">Sign in</span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="font-semibold text-blue-600 group-hover:underline">Sign up</span>
                </>
              )}
            </button>
          </div>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

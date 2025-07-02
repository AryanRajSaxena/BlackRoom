import React, { useState } from 'react';
import { Smartphone, Shield, TrendingUp, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { OTPVerification } from './OTPVerification';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'otp'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleOTPRequired = (phone: string, email: string) => {
    setPhoneNumber(phone);
    setUserEmail(email);
    setCurrentView('otp');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PredictBet</h1>
                <p className="text-gray-600">Event Prediction Platform</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Predict Events,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Win Big
                </span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Join thousands of users making predictions on real-world events. 
                From weather to crypto, sports to technology - bet smart, win bigger.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure & Safe</h3>
                <p className="text-sm text-gray-600">Bank-grade security with encrypted transactions</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Mobile First</h3>
                <p className="text-sm text-gray-600">Seamless UPI integration for instant payments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {currentView === 'login' && (
              <LoginForm 
                onSwitchToSignup={() => setCurrentView('signup')}
                onOTPRequired={handleOTPRequired}
                onAuthSuccess={onAuthSuccess}
              />
            )}
            
            {currentView === 'signup' && (
              <SignupForm 
                onSwitchToLogin={() => setCurrentView('login')}
                onOTPRequired={handleOTPRequired}
                onAuthSuccess={onAuthSuccess}
              />
            )}
            
            {currentView === 'otp' && (
              <OTPVerification 
                phoneNumber={phoneNumber}
                email={userEmail}
                onBack={() => setCurrentView('login')}
                onAuthSuccess={onAuthSuccess}
              />
            )}
          </div>

          {/* Mobile Branding */}
          <div className="lg:hidden mt-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PredictBet</h1>
                <p className="text-sm text-gray-600">Event Prediction Platform</p>
              </div>
            </div>
            <p className="text-gray-600">
              Predict events, win rewards. Join the future of prediction markets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
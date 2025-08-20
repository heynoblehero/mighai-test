import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export async function getServerSideProps() {
  // Check if there's a customized version of the signup page
  try {
    const reservedPagePath = path.join(process.cwd(), 'data', 'reserved-pages', 'customer-signup.json');
    
    if (fs.existsSync(reservedPagePath)) {
      const data = fs.readFileSync(reservedPagePath, 'utf8');
      const reservedPage = JSON.parse(data);
      
      if (reservedPage.html_code) {
        // Serve the customized HTML directly
        return {
          props: {
            useCustomPage: true,
            customHtml: reservedPage.html_code
          }
        };
      }
    }
  } catch (error) {
    console.error('Error checking for customized signup page:', error);
  }
  
  // Use default React component
  return {
    props: {
      useCustomPage: false
    }
  };
}

export default function SubscriberSignup({ useCustomPage, customHtml }) {
  // If we have a custom HTML version, render it directly
  if (useCustomPage && customHtml) {
    return (
      <div dangerouslySetInnerHTML={{ __html: customHtml }} />
    );
  }
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otpData, setOtpData] = useState({
    otp: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('signup'); // 'signup' or 'verify'
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // First send OTP
      const response = await fetch('/api/subscribe/send-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // OTP sent successfully, move to verification step
        setOtpData({ ...otpData, email: formData.email });
        setStep('verify');
        setError('');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe/verify-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          otp: otpData.otp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration and verification successful
        router.push('/subscribe/login?message=Account created successfully! Please sign in.');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscribe/resend-signup-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setError('New verification code sent!');
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (step === 'verify') {
      setOtpData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'verify' ? 'Verify Your Email' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'verify' 
              ? `We've sent a verification code to ${formData.email}` 
              : 'Join us to access exclusive subscriber content'
            }
          </p>
        </div>
        
        {step === 'signup' ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

            <div className="text-center">
              <Link href="/subscribe/login" className="text-indigo-600 hover:text-indigo-500">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleOTPSubmit}>
            {error && (
              <div className={`px-4 py-3 rounded border ${error.includes('sent!') ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}>
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                maxLength="6"
                pattern="[0-9]{6}"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter 6-digit code"
                value={otpData.otp}
                onChange={handleChange}
                autoFocus
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={resendOTP}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Didn't receive code? Resend
              </button>
              <br />
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                ← Back to signup
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnboardingModal({ isOpen, onClose, currentStep = 0, onStepComplete }) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isAnimating, setIsAnimating] = useState(false);
  const router = useRouter();

  const steps = [
    {
      id: 0,
      title: "Welcome to Your SaaS Platform! 👋",
      description: "Let's get your application set up in just a few minutes. We'll guide you through the essential configurations to get you up and running.",
      icon: "🚀",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
            <h4 className="font-semibold text-emerald-900 mb-2">What you'll accomplish:</h4>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                Configure your backend design for customer requests
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                Set up subscription plans and pricing
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                Create your first landing page
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                Launch your SaaS to the world
              </li>
            </ul>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🎯</div>
            <p className="text-slate-600">Ready to build something amazing?</p>
          </div>
        </div>
      ),
      actionText: "Let's Start!",
      skipEnabled: false
    },
    {
      id: 1,
      title: "Configure Your Backend Design ⚙️",
      description: "Set up the core functionality that will handle customer requests. This is the heart of your SaaS platform.",
      icon: "🔗",
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <div className="flex items-start">
              <div className="text-2xl mr-3">💡</div>
              <div>
                <h5 className="font-medium text-emerald-800 mb-1">Pro Tip</h5>
                <p className="text-sm text-emerald-700">
                  You can connect to any API endpoint - from AI services like OpenAI to custom backends. 
                  The template system lets you dynamically insert user data into requests.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h5 className="font-semibold text-slate-900 mb-2">📝 What you'll set:</h5>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• API endpoint URL</li>
                <li>• Request method & headers</li>
                <li>• Dynamic request template</li>
                <li>• Customer input fields</li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h5 className="font-semibold text-slate-900 mb-2">🎯 Popular Examples:</h5>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• AI text generation</li>
                <li>• Image processing</li>
                <li>• Data analysis</li>
                <li>• Custom calculations</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      actionText: "Configure Backend Design",
      actionLink: "/admin/backend-design",
      skipEnabled: true
    },
    {
      id: 2,
      title: "Create Your Subscription Plans 💳",
      description: "Define how customers will pay for your service. Set up different tiers with API limits and pricing.",
      icon: "💰",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-4 rounded-xl text-center">
              <div className="text-2xl mb-2">🆓</div>
              <h5 className="font-semibold text-emerald-800 mb-1">Free Tier</h5>
              <p className="text-xs text-emerald-600">Perfect for getting started</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300 p-4 rounded-xl text-center">
              <div className="text-2xl mb-2">⭐</div>
              <h5 className="font-semibold text-emerald-800 mb-1">Pro Plan</h5>
              <p className="text-xs text-emerald-600">For regular users</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-200 to-emerald-300 border border-emerald-400 p-4 rounded-xl text-center">
              <div className="text-2xl mb-2">💎</div>
              <h5 className="font-semibold text-emerald-800 mb-1">Enterprise</h5>
              <p className="text-xs text-emerald-600">Unlimited access</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <h5 className="font-medium text-emerald-800 mb-2">💡 Pricing Strategy Tips:</h5>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• Start with a generous free tier to attract users</li>
              <li>• Set clear usage limits (API calls, features)</li>
              <li>• Price competitively but value your service</li>
              <li>• You can always adjust prices later</li>
            </ul>
          </div>
        </div>
      ),
      actionText: "Set Up Plans",
      actionLink: "/admin/plans",
      skipEnabled: true
    },
    {
      id: 3,
      title: "Build Your Landing Page 📄",
      description: "Create a compelling homepage that showcases your SaaS and converts visitors into customers.",
      icon: "🎨",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
            <h5 className="font-semibold text-emerald-800 mb-3">🎨 Page Builder Features:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h6 className="font-medium text-emerald-700 mb-1">Design Elements:</h6>
                <ul className="text-emerald-600 space-y-1">
                  <li>• Hero sections</li>
                  <li>• Feature showcases</li>
                  <li>• Testimonials</li>
                  <li>• Pricing tables</li>
                </ul>
              </div>
              <div>
                <h6 className="font-medium text-emerald-700 mb-1">Advanced Features:</h6>
                <ul className="text-emerald-600 space-y-1">
                  <li>• A/B testing</li>
                  <li>• Analytics tracking</li>
                  <li>• SEO optimization</li>
                  <li>• Mobile responsive</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-slate-600 text-sm">
              No coding required! Use our visual editor to create beautiful pages.
            </p>
          </div>
        </div>
      ),
      actionText: "Create Page",
      actionLink: "/admin/pages",
      skipEnabled: true
    },
    {
      id: 4,
      title: "Test Your Setup 🧪",
      description: "Make sure everything is working perfectly before you launch. Test your API, payment flow, and user experience.",
      icon: "✅",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <h5 className="font-semibold text-emerald-800 mb-2">✅ Pre-Launch Checklist:</h5>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Backend design responds correctly</li>
                <li>• Payment processing works</li>
                <li>• Landing page looks great</li>
                <li>• User dashboard functions</li>
              </ul>
            </div>
            <div className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl">
              <h5 className="font-semibold text-emerald-800 mb-2">🔧 Quick Tests:</h5>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Submit a test API request</li>
                <li>• Try the signup flow</li>
                <li>• Check mobile responsiveness</li>
                <li>• Verify error handling</li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
            <div className="text-3xl mb-2">🚀</div>
            <h5 className="font-medium text-slate-800 mb-1">Ready to Launch?</h5>
            <p className="text-sm text-slate-600">
              Once testing is complete, you'll be ready to welcome your first customers!
            </p>
          </div>
        </div>
      ),
      actionText: "Run Tests",
      actionLink: "/admin",
      skipEnabled: true
    },
    {
      id: 5,
      title: "🎉 Congratulations! You're Launch Ready!",
      description: "Your SaaS platform is fully configured and ready to serve customers. Welcome to the world of software entrepreneurship!",
      icon: "🚀",
      content: (
        <div className="space-y-4">
          <div className="text-center animate-bounce-in">
            <div className="text-8xl mb-4">🎉</div>
            <h4 className="text-2xl font-bold text-emerald-600 mb-2">Mission Accomplished!</h4>
            <p className="text-slate-600 mb-6">Your SaaS is now live and ready for customers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <h5 className="font-semibold text-emerald-800 mb-2">📊 What's Next:</h5>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Monitor user analytics</li>
                <li>• Gather customer feedback</li>
                <li>• Optimize conversion rates</li>
                <li>• Scale your infrastructure</li>
              </ul>
            </div>
            <div className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl">
              <h5 className="font-semibold text-emerald-800 mb-2">🎯 Pro Tips:</h5>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Engage with early users</li>
                <li>• Iterate based on feedback</li>
                <li>• Build a community</li>
                <li>• Keep innovating!</li>
              </ul>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 border border-emerald-200 p-6 rounded-xl text-center">
            <h5 className="font-semibold text-slate-800 mb-2">🌟 You're now officially a SaaS founder!</h5>
            <p className="text-sm text-slate-600">
              We can't wait to see what amazing solutions you'll build for your customers.
            </p>
          </div>
        </div>
      ),
      actionText: "Go to Dashboard",
      actionLink: "/admin",
      skipEnabled: false
    }
  ];

  const currentStepData = steps[activeStep];

  const handleNext = async () => {
    setIsAnimating(true);
    
    // Mark current step as completed
    if (onStepComplete) {
      await onStepComplete(activeStep);
    }

    // Navigate to action link if provided
    if (currentStepData.actionLink) {
      router.push(currentStepData.actionLink);
      onClose();
      return;
    }

    setTimeout(() => {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        onClose();
      }
      setIsAnimating(false);
    }, 300);
  };

  const handleSkip = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{currentStepData.icon}</div>
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-emerald-100 opacity-90">{currentStepData.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-emerald-100">Step {activeStep + 1} of {steps.length}</span>
              <span className="text-sm text-emerald-100">{Math.round(((activeStep + 1) / steps.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-emerald-500/30 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index <= activeStep ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex items-center space-x-3">
              {activeStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  ← Previous
                </button>
              )}
              
              {currentStepData.skipEnabled && activeStep < steps.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Skip
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                {currentStepData.actionText} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
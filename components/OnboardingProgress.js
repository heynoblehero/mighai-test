import { useState, useEffect } from 'react';

export default function OnboardingProgress({ currentStep = 0, totalSteps = 6, completedSteps = [] }) {
  const [animatedStep, setAnimatedStep] = useState(0);
  
  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedStep(currentStep);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const steps = [
    { id: 0, title: 'Welcome', icon: '👋', description: 'Get started with your SaaS' },
    { id: 1, title: 'Basic Setup', icon: '⚙️', description: 'Configure your application' },
    { id: 2, title: 'Backend Configuration', icon: '🔗', description: 'Set up your backend design' },
    { id: 3, title: 'Plan Creation', icon: '💳', description: 'Create subscription plans' },
    { id: 4, title: 'First Page', icon: '📄', description: 'Build your landing page' },
    { id: 5, title: 'Launch Ready', icon: '🚀', description: 'You\'re ready to go!' }
  ];

  const progressPercentage = ((animatedStep / (totalSteps - 1)) * 100);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-600/50 p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-100">Setup Progress</h3>
          <div className="text-xl font-bold text-emerald-400">{Math.round(progressPercentage)}%</div>
        </div>
        <p className="text-sm text-slate-400 mb-3">Complete these steps to launch your SaaS</p>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>


      {/* Step Indicators */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isPending = step.id > currentStep && !isCompleted;

          return (
            <div
              key={step.id}
              className={`
                flex items-center p-3 rounded-lg transition-all duration-200
                ${isCurrent ? 'bg-emerald-900/30 border border-emerald-500' : ''}
                ${isCompleted ? 'bg-emerald-900/20 border border-emerald-600' : ''}
                ${isPending ? 'bg-slate-700/30 border border-slate-600 opacity-50' : ''}
              `}
            >
              {/* Step Icon */}
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200
                ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                ${isCurrent ? 'bg-emerald-500 text-white' : ''}
                ${isPending ? 'bg-slate-600 text-slate-300' : ''}
              `}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="ml-3 flex-1">
                <h4 className={`
                  text-sm font-medium
                  ${isCompleted ? 'text-emerald-300' : ''}
                  ${isCurrent ? 'text-emerald-300' : ''}
                  ${isPending ? 'text-slate-400' : ''}
                  ${!isCurrent && !isCompleted && !isPending ? 'text-slate-200' : ''}
                `}>
                  {step.title}
                </h4>
                <p className={`
                  text-xs
                  ${isCompleted ? 'text-emerald-400' : ''}
                  ${isCurrent ? 'text-emerald-400' : ''}
                  ${isPending ? 'text-slate-500' : ''}
                  ${!isCurrent && !isCompleted && !isPending ? 'text-slate-400' : ''}
                `}>
                  {step.description}
                </p>
              </div>

              {/* Status Indicator */}
              {isCompleted && (
                <div className="text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {isCurrent && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Message */}
      <div className="mt-4 pt-3 border-t border-slate-600">
        {progressPercentage < 100 ? (
          <div className="text-center">
            <p className="text-sm text-slate-300">
              {currentStep === 0 ? "Let's get your SaaS set up!" : `Continue with step ${currentStep + 1}`}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-2xl mb-1">🎉</div>
            <h4 className="font-semibold text-emerald-300 text-sm">Setup Complete!</h4>
          </div>
        )}
      </div>
    </div>
  );
}
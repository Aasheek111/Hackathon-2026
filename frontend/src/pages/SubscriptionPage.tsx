import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Shield, ArrowRight } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = () => {
    setLoading(true);
    setTimeout(() => {
      alert('Redirecting to eSewa payment gateway...');
      navigate('/dashboard');
    }, 1200);
  };

  const plans = [
    { id: 0, name: '1 Month Pass', price: '499', features: ['Full adaptive quiz access', 'All 4 learning modes', 'Standard parent analytics', 'Email support'] },
    { id: 1, name: '3 Month Pass', price: '1,299', badge: 'Most Popular', features: ['Advanced adaptive learning', 'Full AR 3D module games', 'Detailed progress breakdown', 'Priority support'] },
    { id: 2, name: '6 Month Pass', price: '2,299', badge: 'Best Value', features: ['Everything in 3 Month Pass', 'Early access features', '1-on-1 onboarding', 'Custom curricula', 'Save 23% overall'] }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Simple & Accessible Plans
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mt-3 mb-2">Choose Your Learning Plan</h1>
          <p className="text-slate-600 text-base max-w-lg mx-auto">Unlock the full potential of gentle adaptive learning for your child.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`cursor-pointer rounded-3xl p-8 flex flex-col justify-between relative transition-all bg-white border ${
                  isSelected 
                    ? 'border-2 border-emerald-500 shadow-md ring-2 ring-emerald-100 transform md:-translate-y-2' 
                    : 'border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold shadow-xs ${
                    plan.id === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}
                
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {plan.name}
                  </h3>
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">NPR {plan.price}</div>
                  
                  <ul className="space-y-3 mb-8 text-sm text-slate-600 font-medium">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm text-center">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-[#60BB46] hover:bg-[#52a33c] text-white font-bold py-4 px-6 rounded-2xl shadow-md border-b-4 border-[#438a30] active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-base"
          >
            <span>{loading ? 'Redirecting to eSewa...' : 'Pay securely with eSewa'}</span>
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
          <div className="mt-4 flex items-center justify-center text-xs font-medium text-slate-500">
            <Shield className="w-4 h-4 mr-1.5 text-emerald-600" /> Secured by eSewa sandbox payment gateway
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionPage;


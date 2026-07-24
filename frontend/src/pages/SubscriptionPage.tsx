import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Shield } from 'lucide-react';
import Button from '../components/ui/Button';

export const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(1); // default middle plan
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = () => {
    setLoading(true);
    // Simulate eSewa payment redirection
    setTimeout(() => {
      // In real implementation, this would submit a form to eSewa gateway
      alert('Redirecting to eSewa payment gateway...');
      navigate('/dashboard'); // Mocking success
    }, 1500);
  };

  const plans = [
    { id: 0, name: '1 Month', price: '499', features: ['Basic adaptive quiz', '3 Learning Modes', 'Standard analytics', 'Email support'] },
    { id: 1, name: '3 Months', price: '1,299', badge: 'Most Popular', features: ['Advanced adaptive learning', 'Full AR module access', 'Detailed parent analytics', 'Priority support', 'Engagement reports'] },
    { id: 2, name: '6 Months', price: '2,299', badge: 'Best Value', features: ['Everything in 3 Months', 'Early access features', '1-on-1 onboarding', 'Custom curricula'] }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-dark pt-24 pb-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Choose Your Learning Plan</h1>
          <p className="text-xl text-gray-400">Unlock the full potential of adaptive education for your child.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`cursor-pointer rounded-3xl p-8 flex flex-col relative transition-all duration-300 ${
                selectedPlan === plan.id 
                  ? 'glass-strong ring-2 ring-primary shadow-[0_0_30px_rgba(108,61,231,0.2)] transform md:-translate-y-4' 
                  : 'glass hover:bg-white/5'
              }`}
            >
              {plan.badge && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full text-sm font-bold ${
                  plan.id === 1 ? 'bg-accent text-dark' : 'bg-white/10 text-white border border-white/20'
                }`}>
                  {plan.badge}
                </div>
              )}
              
              <h3 className={`text-xl font-medium mb-2 ${selectedPlan === plan.id ? 'text-primary-light' : 'text-gray-400'}`}>
                {plan.name}
              </h3>
              <div className="text-4xl font-bold mb-6">NPR {plan.price}</div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start text-gray-300 text-sm">
                    <CheckCircle2 className={`w-5 h-5 mr-3 shrink-0 ${selectedPlan === plan.id ? 'text-primary' : 'text-gray-500'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              
              <div className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center ${
                selectedPlan === plan.id ? 'border-primary bg-primary/20' : 'border-gray-600'
              }`}>
                {selectedPlan === plan.id && <div className="w-3 h-3 rounded-full bg-primary" />}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-md mx-auto text-center glass p-8 rounded-3xl">
          <Button 
            size="lg" 
            className="w-full bg-[#60BB46] hover:bg-[#52a33c] text-white border-none shadow-[0_0_20px_rgba(96,187,70,0.3)] flex items-center justify-center gap-3"
            onClick={handlePayment}
            loading={loading}
          >
<<<<<<< Updated upstream
            Pay with eSewa
          </Button>
          <div className="mt-4 flex items-center justify-center text-sm text-gray-400">
            <Shield className="w-4 h-4 mr-2" /> Secured by eSewa payment gateway
          </div>
=======
            <span>
              {loading
                ? "Redirecting to eSewa..."
                : "Pay securely with eSewa (Testing)"}
            </span>
            {!loading && <ArrowRight className="w-5 h-5 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={handleTestActivate}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-2xl shadow-md border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-1 text-xs sm:text-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>⚡ Sandbox Quick Complete (Bypass Payment)</span>
          </button>
>>>>>>> Stashed changes
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionPage;

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Lock } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      const msgs: Record<string, string> = {
        payment_failed:
          "Your eSewa payment was not completed. Please try again.",
        invalid_data: "Invalid payment data received. Please try again.",
        subscription_not_found:
          "Could not find your subscription record. Please contact support.",
        verification_failed:
          "Payment verification failed. Please try again or contact support.",
      };
      setError(
        msgs[errorCode] ||
          "An error occurred with your payment. Please try again.",
      );
    }
  }, [searchParams]);

  const plans = [
    {
      id: 0,
      code: "MONTH_1",
      name: "1 Month Pass",
      price: "499",
      features: [
        "Full adaptive quiz access",
        "All 4 learning modes",
        "Standard parent analytics",
        "Email support",
      ],
    },
    {
      id: 1,
      code: "MONTH_3",
      name: "3 Month Pass",
      price: "1,299",
      badge: "Most Popular",
      features: [
        "Advanced adaptive learning",
        "Full AR 3D module games",
        "Detailed progress breakdown",
        "Priority support",
      ],
    },
    {
      id: 2,
      code: "MONTH_6",
      name: "6 Month Pass",
      price: "2,299",
      badge: "Best Value",
      features: [
        "Everything in 3 Month Pass",
        "Early access features",
        "1-on-1 onboarding",
        "Custom curricula",
        "Save 23% overall",
      ],
    },
  ];

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedObj = plans.find((p) => p.id === selectedPlan) || plans[1];
      const { data } = await api.post("/subscription/initiate", {
        plan: selectedObj.code,
      });

      if (data.esewaUrl && data.formData) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.esewaUrl;

        Object.keys(data.formData).forEach((key) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = data.formData[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error("Invalid response from payment gateway");
      }
    } catch (err: any) {
      console.error("eSewa Payment error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to connect to eSewa payment gateway.",
      );
      setLoading(false);
    }
  };

  const handleTestActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedObj = plans.find((p) => p.id === selectedPlan) || plans[1];
      await api.post("/subscription/test-activate", { plan: selectedObj.code });
      await refreshUser();
      navigate("/dashboard?payment=success");
    } catch (err: any) {
      setError("Instant sandbox test activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen overflow-hidden bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-16 pb-3"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>eSewa Payment Required to Access Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1">
            Choose Your eSewa Learning Plan
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto">
            Your single free trial session is complete! Subscribe using eSewa to
            unlock your full student dashboard.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-medium text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-4">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`cursor-pointer rounded-3xl p-4 sm:p-5 flex flex-col justify-between relative transition-all bg-white border ${
                  isSelected
                    ? "border-2 border-emerald-500 shadow-md ring-2 ring-emerald-100 md:-translate-y-1"
                    : "border-slate-200/80 shadow-xs hover:border-slate-300"
                }`}
              >
                {plan.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold shadow-xs whitespace-nowrap ${
                      plan.id === 1
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isSelected ? "text-emerald-700" : "text-slate-500"}`}
                  >
                    {plan.name}
                  </h3>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                    NPR {plan.price}
                  </div>

                  <ul className="space-y-1.5 mb-4 text-xs text-slate-600 font-medium">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`}
                        />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="max-w-md mx-auto bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-[#60BB46] hover:bg-[#52a33c] text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-[#438a30] active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
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
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionPage;

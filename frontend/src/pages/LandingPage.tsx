import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Brain, BookOpen, Headphones, Image as ImageIcon, Gamepad2, Eye, BarChart3, CheckCircle2, ChevronDown } from 'lucide-react';
import Button from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-24"
    >
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-dark to-dark -z-10" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
              Learn the Way <br className="hidden md:block" />
              <span className="gradient-text">Your Mind Works</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              An adaptive learning platform for autistic students that responds to real-time engagement and personalizes the educational journey.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto text-lg shadow-[0_0_30px_rgba(108,61,231,0.5)]">
                  Start Free Demo
                </Button>
              </Link>
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-lg gap-2">
                <Play className="w-5 h-5" /> Watch Demo
              </Button>
            </motion.div>
            
            <motion.div variants={fadeUp} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "500+ Students", desc: "Actively learning daily" },
                { title: "3 Learning Modes", desc: "Text, Audio, & Visual" },
                { title: "AR Powered", desc: "Immersive interaction" }
              ].map((stat, i) => (
                <div key={i} className="glass p-6 rounded-2xl animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                  <h3 className="text-2xl font-display font-bold text-white mb-1">{stat.title}</h3>
                  <p className="text-gray-400 text-sm">{stat.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-dark-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-display font-bold mb-6">
                Adaptive Education Built for <span className="text-primary">Every Mind</span>
              </motion.h2>
              <motion.div variants={fadeUp} className="space-y-4 text-gray-300 text-lg leading-relaxed">
                <p>
                  NeuroLearn bridges the gap in special education by utilizing real-time computer vision to monitor engagement. 
                  When a student loses focus, the platform seamlessly adapts its teaching methodology.
                </p>
                <p>
                  Whether shifting from dense text to engaging visuals, or from silence to a comforting voice, 
                  we ensure the learning environment constantly molds itself to the student, rather than forcing the student to adapt to it.
                </p>
              </motion.div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="glass-strong p-8 rounded-3xl border-primary/20 shadow-[0_0_50px_rgba(108,61,231,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                <Brain className="w-16 h-16 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-4">Platform Impact</h3>
                <ul className="space-y-4">
                  {[
                    "91% engagement improvement",
                    "3 dynamic learning modes",
                    "Real-time affective computing adaptation"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <span className="text-gray-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-400">Everything needed for a complete, adaptive learning experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: "Text Mode", desc: "Structured written content with clear typography designed for readability and focus." },
              { icon: Headphones, title: "Audio Mode", desc: "Calming text-to-speech narration that guides auditory learners through lessons." },
              { icon: ImageIcon, title: "Visual Mode", desc: "Rich image-based learning that replaces dense text with clear visual concepts." },
              { icon: Gamepad2, title: "AR Learning", desc: "Interactive augmented reality games to reward and reinforce learning objectives." },
              { icon: Eye, title: "Engagement Tracking", desc: "Privacy-first AI that subtly tracks attention to trigger adaptive mode switching." },
              { icon: BarChart3, title: "Learning Analytics", desc: "Deep personalized insights for parents and educators to track genuine progress." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300 group cursor-default"
              >
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-dark-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-20">Why NeuroLearn Works</h2>
          <div className="space-y-24">
            {[
              { title: "Personalized", desc: "Every mind is unique. Our platform builds a learning profile tailored specifically to how each student processes information best.", reverse: false },
              { title: "Engaging", desc: "By switching modes dynamically before frustration sets in, we maintain attention spans and turn challenges into triumphs.", reverse: true },
              { title: "Rewarding", desc: "Integrated AR modules provide necessary sensory breaks and joyful reinforcement, keeping students eager to return.", reverse: false }
            ].map((benefit, i) => (
              <div key={i} className={`flex flex-col ${benefit.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>
                <div className="flex-1">
                  <div className="glass aspect-square md:aspect-video rounded-3xl flex items-center justify-center p-12 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <span className="text-6xl font-display font-bold text-primary/30">0{i + 1}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <h3 className="text-3xl font-display font-bold">{benefit.title}</h3>
                  <p className="text-xl text-gray-400 leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-400">Invest in adaptive education today.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1 */}
            <div className="glass p-8 rounded-3xl flex flex-col">
              <h3 className="text-xl font-medium text-gray-400 mb-2">1 Month</h3>
              <div className="text-4xl font-bold mb-6">NPR 499</div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Basic adaptive quiz', '3 Learning Modes', 'Standard analytics', 'Email support', 'Cancel anytime'].map((f, i) => (
                  <li key={i} className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" />{f}</li>
                ))}
              </ul>
              <Button variant="ghost" className="w-full">Choose Plan</Button>
            </div>
            
            {/* Plan 2 */}
            <div className="glass-strong p-8 rounded-3xl flex flex-col relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(108,61,231,0.2)] border-primary/50">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-dark font-bold px-4 py-1 rounded-full text-sm">
                Most Popular
              </div>
              <h3 className="text-xl font-medium text-primary-dark mb-2">3 Months</h3>
              <div className="text-4xl font-bold mb-6">NPR 1,299</div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Advanced adaptive learning', 'Full AR module access', 'Detailed parent analytics', 'Priority support', 'Engagement reports'].map((f, i) => (
                  <li key={i} className="flex items-center text-gray-200"><CheckCircle2 className="w-5 h-5 text-primary mr-3" />{f}</li>
                ))}
              </ul>
              <Button variant="primary" className="w-full">Choose Plan</Button>
            </div>

            {/* Plan 3 */}
            <div className="glass p-8 rounded-3xl flex flex-col relative">
               <div className="absolute top-4 right-4 bg-white/10 text-white px-3 py-1 rounded-full text-xs border border-white/20">
                Best Value
              </div>
              <h3 className="text-xl font-medium text-gray-400 mb-2">6 Months</h3>
              <div className="text-4xl font-bold mb-6">NPR 2,299</div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Everything in 3 Months', 'Early access features', '1-on-1 onboarding', 'Custom curricula', 'Save 23%'].map((f, i) => (
                  <li key={i} className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" />{f}</li>
                ))}
              </ul>
              <Button variant="ghost" className="w-full">Choose Plan</Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-dark-card/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What is NeuroLearn?", a: "NeuroLearn is an AI-powered educational platform designed specifically for autistic children, adapting teaching styles in real-time based on their engagement levels." },
              { q: "How does the adaptive quiz work?", a: "Using device cameras, it subtly monitors facial cues and engagement. If a student loses focus on text, it automatically switches to audio or visual modes to re-engage them." },
              { q: "Is my camera data private?", a: "Absolutely. Video feeds are processed entirely locally on the device for engagement metrics. We never record, store, or transmit video data to our servers." },
              { q: "What is AR Learning?", a: "It's an immersive feature that brings 3D models into the real world via device cameras, providing interactive sensory breaks and reinforcing concepts." },
              { q: "Can I switch learning modes manually?", a: "Yes, while the AI adapts automatically, parents or students can lock or switch modes manually at any time." },
              { q: "How does eSewa payment work?", a: "We integrate directly with eSewa's secure gateway. Clicking pay will redirect you to eSewa to securely complete the transaction." }
            ].map((faq, i) => (
              <details key={i} className="glass rounded-xl group overflow-hidden">
                <summary className="px-6 py-4 cursor-pointer font-medium flex justify-between items-center list-none outline-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform text-primary" />
                </summary>
                <div className="px-6 pb-4 text-gray-400">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass p-8 md:p-12 rounded-3xl max-w-4xl mx-auto flex flex-col md:flex-row gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-display font-bold mb-4">Get in Touch</h2>
              <p className="text-gray-400 mb-8">Have questions about NeuroLearn? Send us a message and our team will get back to you shortly.</p>
              <div className="space-y-4 text-gray-300">
                <p>📍 Kathmandu, Nepal</p>
                <p>📧 contact@neurolearn.com</p>
                <p>📞 +977 9800000000</p>
              </div>
            </div>
            <form className="flex-1 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Name" className="w-full bg-dark/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-white" />
              <input type="email" placeholder="Email" className="w-full bg-dark/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-white" />
              <textarea placeholder="Message" rows={4} className="w-full bg-dark/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-white resize-none"></textarea>
              <Button type="button" className="w-full">Send Message</Button>
            </form>
          </div>
        </div>
      </section>

<<<<<<< Updated upstream
      {/* Footer */}
      <footer className="border-t border-white/10 bg-dark pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🧠</span>
                <span className="font-display font-bold text-xl tracking-tight text-white">NeuroLearn</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                Empowering autistic minds through adaptive, compassionate technology.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#about" className="hover:text-primary transition-colors">About Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#contact" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2025 NeuroLearn. All rights reserved.</p>
=======
      {/* Clean Light Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Pragya Logo"
              className="h-20 sm:h-24 md:h-32 w-auto object-contain"
            />
            <span className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full ml-1">
              Adaptive Education
            </span>
>>>>>>> Stashed changes
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default LandingPage;

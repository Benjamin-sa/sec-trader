'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import {
  Activity,
  Users,
  BarChart3,
  Award,
  PieChart,
  Link,
  ArrowRight,
  TrendingUp,
  Zap,
  Shield,
} from 'lucide-react';

// ============================================
// Header Component
// ============================================
const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`
        fixed top-0 left-0 right-0 z-50 
        transition-all duration-300
        ${scrolled 
          ? 'bg-white/80 backdrop-blur-lg shadow-sm' 
          : 'bg-white/50 backdrop-blur-sm'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xl font-bold text-gray-800">
                InsightSider
              </span>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {['Features', 'Showcase', 'Pricing'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="
                  text-sm font-medium text-gray-600 
                  hover:text-blue-600 
                  transition-colors duration-200
                "
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="
              px-4 sm:px-6 py-2 sm:py-3 
              bg-gradient-to-r from-blue-600 to-blue-700
              text-white text-sm font-semibold 
              rounded-xl 
              shadow-sm hover:shadow-md 
              transition-all duration-200
              focus-visible:outline-2 focus-visible:outline-blue-500
            "
            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Request Early Access
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

// ============================================
// Hero Section
// ============================================
const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            Go Beyond the Data.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Trade with Conviction.
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto"
        >
          InsightSider transforms noisy SEC filings into clear, actionable signals,
          giving you the edge the market is missing.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="
              px-8 py-4 
              bg-gradient-to-r from-blue-600 to-blue-700
              text-white text-lg font-semibold 
              rounded-xl 
              shadow-sm hover:shadow-lg 
              transition-all duration-200
              flex items-center gap-2
              focus-visible:outline-2 focus-visible:outline-blue-500
            "
            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Request Early Access
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="
              px-8 py-4 
              bg-white border-2 border-gray-300
              text-gray-700 text-lg font-semibold 
              rounded-xl 
              shadow-sm hover:shadow-md hover:border-gray-400
              transition-all duration-200
              flex items-center gap-2
            "
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            How it Works
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-8 pt-8"
        >
          {[
            { icon: Zap, text: 'Real-time Analysis' },
            { icon: Shield, text: 'SEC-Grade Data' },
            { icon: TrendingUp, text: 'Proven Signals' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-gray-600">
              <item.icon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// How It Works & Stats Section
// ============================================
const HowItWorksAndStats = () => {
  const [ref, inView] = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  const steps = [
    {
      number: '01',
      title: 'Aggregate Data',
      description: 'We continuously monitor and ingest every Form 4 filing from the SEC in real-time.',
    },
    {
      number: '02',
      title: 'Apply Intelligence',
      description: 'Our proprietary algorithms analyze trades, track patterns, and identify what truly matters.',
    },
    {
      number: '03',
      title: 'Uncover Signals',
      description: 'Receive instant alerts on high-conviction trades with context and historical performance.',
    },
  ];

  const stats = [
    { value: 1200000, suffix: '+', label: 'Filings Analyzed Daily' },
    { value: 45000, suffix: '+', label: 'Corporate Insiders Tracked' },
    { value: 97, suffix: '%', label: 'Signal-to-Noise Reduction' },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            From Noise to Signal in Seconds
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform does the heavy lifting, so you can focus on making informed decisions.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative"
            >
              <div className="
                bg-white 
                border border-gray-200/60 
                rounded-xl 
                p-6 sm:p-8
                shadow-sm hover:shadow-lg 
                transition-all duration-300 
                hover:-translate-y-1
              ">
                <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Animated Stats */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="
                bg-gradient-to-br from-blue-50/50 to-indigo-50/30 
                border border-blue-200/60 
                rounded-2xl 
                p-8 
                text-center
                shadow-md hover:shadow-xl 
                transition-all duration-300
                hover:-translate-y-1
              "
            >
              <div className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-2">
                {inView && (
                  <CountUp
                    end={stat.value}
                    duration={2.5}
                    separator=","
                    suffix={stat.suffix}
                  />
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// Features Section
// ============================================
const Features = () => {
  const features = [
    {
      icon: Activity,
      title: 'The Conviction Score',
      description: 'Our proprietary algorithm scores every trade based on size, role, and historical context, so you see what matters.',
    },
    {
      icon: Users,
      title: 'Cluster Buy Alerts',
      description: 'Get instantly notified when multiple insiders at the same company are buying—one of the strongest bullish signals.',
    },
    {
      icon: BarChart3,
      title: 'Insider Track Records',
      description: 'Analyze an insider\'s past performance to see if their trades have historically predicted stock movement.',
    },
    {
      icon: Award,
      title: 'First-Time Buyer Alerts',
      description: 'Discover when a long-time executive makes their first-ever open market purchase—a powerful sign of confidence.',
    },
    {
      icon: PieChart,
      title: 'Sector-Level Sentiment',
      description: 'Gauge insider sentiment across entire industries to spot macroeconomic trends before they happen.',
    },
    {
      icon: Link,
      title: 'Smart Correlation Engine',
      description: 'Connect insider trades to other corporate filings (8-Ks, 10-Ks) to understand the \'why\' behind the trade.',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            An Unfair Advantage is Coming.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform is being engineered to provide unparalleled insights. 
            Here&apos;s a preview of what&apos;s under the hood.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 30 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5 }}
              className="
                bg-white/80 backdrop-blur-sm 
                border border-gray-200/60 
                rounded-xl 
                p-6 sm:p-8
                shadow-sm hover:shadow-xl 
                transition-all duration-300 
                hover:-translate-y-1 hover:scale-[1.01]
                group
              "
            >
              {/* Icon */}
              <div className="
                w-12 h-12 
                bg-gradient-to-br from-blue-100 to-indigo-100 
                rounded-xl 
                flex items-center justify-center 
                mb-4
                group-hover:scale-110
                transition-transform duration-300
              ">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// Visual Showcase Section
// ============================================
const Showcase = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section id="showcase" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Visualize the Signal
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A glimpse into the future of insider trading intelligence.
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          style={{ y }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="
            relative 
            rounded-2xl 
            overflow-hidden 
            shadow-[0_8px_24px_-4px_rgba(59,130,246,0.2)]
            hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.3)]
            transition-shadow duration-500
            border border-blue-200/60
          ">
            {/* Placeholder for dashboard image */}
            <div className="
              aspect-video 
              bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-50
              flex items-center justify-center
              relative overflow-hidden
            ">
              {/* Animated grid background */}
              <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-8 grid-rows-6 h-full w-full gap-4 p-8">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="bg-blue-400 rounded-lg"
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 text-center space-y-4">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="
                    w-20 h-20 
                    bg-gradient-to-br from-blue-600 to-indigo-600 
                    rounded-2xl 
                    flex items-center justify-center 
                    mx-auto
                    shadow-lg
                  "
                >
                  <TrendingUp className="w-10 h-10 text-white" />
                </motion.div>
                <div className="text-2xl font-bold text-gray-700">
                  Dashboard Preview
                </div>
                <div className="text-gray-600">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl" />
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// Waitlist/CTA Section
// ============================================
const Waitlist = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send to an API
    console.log('Email submitted:', email);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail('');
    }, 3000);
  };

  return (
    <section id="waitlist" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="
            bg-white/80 backdrop-blur-lg 
            border border-white/20 
            rounded-2xl 
            shadow-xl 
            p-8 sm:p-12
            text-center
            space-y-8
          "
        >
          {/* Header */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Be the First to Know.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Join our exclusive waitlist to get early access and a special 
              introductory offer when we launch.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="
                  flex-1
                  px-4 py-3 
                  bg-white 
                  border-2 border-gray-300 
                  rounded-xl 
                  text-gray-900 
                  placeholder-gray-400
                  transition-all duration-200
                  focus:border-blue-500 
                  focus:ring-4 focus:ring-blue-100
                  focus:outline-none
                "
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitted}
                className="
                  px-6 py-3 
                  bg-gradient-to-r from-blue-600 to-blue-700
                  text-white font-semibold 
                  rounded-xl 
                  shadow-sm hover:shadow-md 
                  transition-all duration-200
                  focus-visible:outline-2 focus-visible:outline-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  whitespace-nowrap
                "
              >
                {submitted ? 'Submitted! ✓' : 'Request Access'}
              </motion.button>
            </div>
          </form>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Instant access</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Special launch offer</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// Footer Component
// ============================================
const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="text-center md:text-left">
            <div className="text-lg font-bold text-gray-800 mb-2">
              InsightSider
            </div>
            <div className="text-sm text-gray-500">
              © 2025 InsightSider. All rights reserved.
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-sm font-medium text-gray-600 
                hover:text-blue-600 
                transition-colors duration-200
              "
            >
              Twitter
            </a>
            <a
              href="mailto:contact@insightsider.com"
              className="
                text-sm font-medium text-gray-600 
                hover:text-blue-600 
                transition-colors duration-200
              "
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// Main App Component
// ============================================
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <HowItWorksAndStats />
        <Features />
        <Showcase />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}

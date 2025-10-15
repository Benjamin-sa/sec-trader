/**
 * Insider Trading Guide - Educational Page
 * 
 * Comprehensive guide explaining insider trading signals, strategies, and best practices.
 * This page helps users understand how to interpret and act on insider trading data.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Brain, Target, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export default function InsiderTradingGuidePage() {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </motion.div>
          
          <div className="max-w-3xl">
            <motion.h1 
              className="text-4xl sm:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Master Insider Trading Signals
            </motion.h1>
            <motion.p 
              className="text-xl text-blue-100 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Learn proven strategies to identify profitable opportunities by following what corporate insiders are doing with their own money.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <div className="text-3xl mb-2">📈</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">15-25%</div>
            <div className="text-sm text-gray-600">Average annual outperformance when following insider buying</div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            variants={fadeInUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Real-Time</div>
            <div className="text-sm text-gray-600">SEC Form 4 filings must be submitted within 2 business days</div>
          </motion.div>
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
            variants={fadeInUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">High Signal</div>
            <div className="text-sm text-gray-600">Open market purchases are the strongest bullish indicator</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Understanding Transaction Types */}
            <AnimatedSection>
              <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <h2 className="text-3xl font-bold text-gray-900">Understanding Transaction Types</h2>
                </div>

              <div className="space-y-6">
                {/* Open Market Purchase */}
                <div className="border-l-4 border-green-500 bg-green-50 rounded-r-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">💰</span>
                    <div>
                      <h3 className="text-xl font-bold text-green-900 mb-2">Open Market Purchase (P+A)</h3>
                      <div className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase rounded-full mb-3">
                        Highest Importance
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    When an insider buys shares on the open market with their own money, it&apos;s the strongest signal available. They&apos;re putting personal capital at risk.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>Why it matters:</strong> Insiders have inside knowledge of company prospects and wouldn&apos;t risk their own money if they didn&apos;t expect gains.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>What to look for:</strong> Multiple insiders buying, large purchases relative to their net worth, clustering of purchases.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>Best time frame:</strong> Strongest signal when purchases occur after significant stock price drops or during quiet periods.</p>
                    </div>
                  </div>
                </div>

                {/* Open Market Sale */}
                <div className="border-l-4 border-red-500 bg-red-50 rounded-r-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">💸</span>
                    <div>
                      <h3 className="text-xl font-bold text-red-900 mb-2">Open Market Sale (S+D)</h3>
                      <div className="inline-block px-3 py-1 bg-amber-500 text-white text-xs font-bold uppercase rounded-full mb-3">
                        Mixed Signal
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    Sales are trickier to interpret. Insiders sell for many reasons unrelated to company prospects: taxes, diversification, house purchases, college tuition.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>Red flags:</strong> Multiple insiders selling, CEO selling large portions, sales near all-time highs, unusual timing.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>Less concerning:</strong> Scheduled 10b5-1 sales, small percentages of holdings, diversification after IPO lock-up.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700"><strong>Key insight:</strong> &quot;There are many reasons to sell, but only one reason to buy&quot; - focus more on purchases than sales.</p>
                    </div>
                  </div>
                </div>

                {/* Compensation */}
                <div className="border-l-4 border-gray-400 bg-gray-50 rounded-r-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">🎁</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Grants, Awards & Options (A, M, F)</h3>
                      <div className="inline-block px-3 py-1 bg-gray-400 text-white text-xs font-bold uppercase rounded-full mb-3">
                        Low Signal Strength
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    These are compensation-related transactions. The insider didn&apos;t choose to invest - shares were given as part of employment.
                  </p>
                  <div className="bg-white rounded-xl p-4">
                    <p className="text-sm text-gray-700"><strong>Why ignore them:</strong> No personal capital at risk, predetermined by compensation agreements, not reflective of insider&apos;s view on stock value. Focus on actual purchases instead.</p>
                  </div>
                </div>
              </div>
              </section>
            </AnimatedSection>

            {/* Winning Strategies */}
            <AnimatedSection delay={0.2}>
              <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <Target className="h-8 w-8 text-purple-600" />
                <h2 className="text-3xl font-bold text-gray-900">Proven Trading Strategies</h2>
              </div>

              <div className="space-y-6">
                {/* Strategy 1 */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">1️⃣ Cluster Buying Strategy</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    When 3+ insiders buy within a 30-day window, the signal strength multiplies. This suggests widespread insider confidence.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-purple-900 mb-1">📊 Entry Signal:</div>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• 3+ insiders make open market purchases</li>
                        <li>• Total purchases exceed $500K combined</li>
                        <li>• Stock down 15-30% from recent highs</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-purple-900 mb-1">🎯 Position Sizing:</div>
                      <p className="text-sm text-gray-700">Start with 25-33% of intended position, add on continued insider buying or positive catalysts.</p>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-purple-900 mb-1">⏱️ Time Horizon:</div>
                      <p className="text-sm text-gray-700">3-12 months. Insiders typically buy ahead of catalysts that may take quarters to materialize.</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 2 */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">2️⃣ CEO Conviction Strategy</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    When the CEO buys significant amounts, pay extra attention. CEOs have the most complete view of company prospects.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-green-900 mb-1">🎯 What qualifies:</div>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Purchase exceeds $1M or 10% of CEO&apos;s net worth</li>
                        <li>• Multiple purchases showing sustained conviction</li>
                        <li>• CEO increases stake significantly (e.g., doubles holdings)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-900 mb-1">🚀 Best scenarios:</div>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• New CEO buying within first 6 months (showing confidence in turnaround)</li>
                        <li>• CEO buying after earnings miss (disagreeing with market reaction)</li>
                        <li>• Founder CEO adding to already large position</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Strategy 3 */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">3️⃣ Post-Earnings Dip Strategy</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    Insiders buying immediately after disappointing earnings suggests they know the market overreacted to short-term issues.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-blue-900 mb-1">⚡ Entry conditions:</div>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Stock drops 10%+ on earnings</li>
                        <li>• Insiders buy within 1-5 days after the drop</li>
                        <li>• Company fundamentals remain intact (not structural problems)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-900 mb-1">💡 Why it works:</div>
                      <p className="text-sm text-gray-700">Insiders can see if the issue is temporary (execution, timing) or permanent (market shift, competition). Their buying reveals it&apos;s temporary.</p>
                    </div>
                  </div>
                </div>

                {/* Strategy 4 */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">4️⃣ Turnaround Detection Strategy</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    Struggling companies with new management buying heavily can signal inflection points before the market recognizes them.
                  </p>
                  <div className="bg-white rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-sm font-bold text-amber-900 mb-1">🔍 What to look for:</div>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Stock down 40%+ from highs</li>
                        <li>• New CEO or CFO joined recently (within 12 months)</li>
                        <li>• New management team buying aggressively</li>
                        <li>• Operational improvements starting to show</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-900 mb-1">⚠️ Risk management:</div>
                      <p className="text-sm text-gray-700">Higher risk strategy. Use smaller position sizes (1-3% of portfolio). Wait for at least 2 quarters of operational progress before adding.</p>
                    </div>
                  </div>
                </div>
              </div>
              </section>
            </AnimatedSection>

            {/* Red Flags */}
            <AnimatedSection delay={0.3}>
              <section className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl shadow-lg p-8 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <h2 className="text-3xl font-bold text-red-900">Critical Red Flags to Avoid</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 border-l-4 border-red-500">
                  <h3 className="font-bold text-red-900 mb-2">🚨 Mass Insider Selling</h3>
                  <p className="text-gray-700 text-sm">When multiple insiders sell large portions (50%+) of holdings simultaneously, especially near highs. This is a strong warning signal.</p>
                </div>
                
                <div className="bg-white rounded-xl p-5 border-l-4 border-red-500">
                  <h3 className="font-bold text-red-900 mb-2">🚨 CEO Selling Right After Buying</h3>
                  <p className="text-gray-700 text-sm">If a CEO buys then sells shortly after (within 3-6 months), it may indicate manipulation or loss of confidence.</p>
                </div>
                
                <div className="bg-white rounded-xl p-5 border-l-4 border-red-500">
                  <h3 className="font-bold text-red-900 mb-2">🚨 Buying During Blackout Periods</h3>
                  <p className="text-gray-700 text-sm">Insiders shouldn&apos;t trade during blackout periods (typically weeks before earnings). If they do, scrutinize carefully - could signal compliance issues.</p>
                </div>
                
                <div className="bg-white rounded-xl p-5 border-l-4 border-red-500">
                  <h3 className="font-bold text-red-900 mb-2">🚨 No Insider Ownership</h3>
                  <p className="text-gray-700 text-sm">If key executives have minimal or zero holdings, their interests aren&apos;t aligned with shareholders. &quot;Skin in the game&quot; matters.</p>
                </div>
              </div>
              </section>
            </AnimatedSection>

            {/* Advanced Tips */}
            <AnimatedSection delay={0.4}>
              <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="h-8 w-8 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-900">Advanced Tips & Insights</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5">
                  <h3 className="font-bold text-indigo-900 mb-2">💎 Size Matters</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    A $50K purchase from a VP earning $300K/year is more significant than a $500K purchase from a billionaire CEO. 
                    Look at purchases relative to the insider&apos;s wealth and salary.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5">
                  <h3 className="font-bold text-blue-900 mb-2">⏰ Timing Context</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Buying during market corrections or sector weakness is more bullish than buying when everything is going up. 
                    Contrarian insider buying is the strongest signal.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5">
                  <h3 className="font-bold text-green-900 mb-2">🔄 Track History</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Some insiders have excellent track records with their purchases. Build a database of insiders whose purchases have led to gains. 
                    Follow the &quot;smart money&quot; within the smart money.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5">
                  <h3 className="font-bold text-amber-900 mb-2">📊 Combine with Fundamentals</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Don&apos;t rely on insider buying alone. Check if the company has: reasonable valuation, growing revenues, 
                    healthy balance sheet, competitive advantages. Insider buying + good fundamentals = highest probability setup.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
                  <h3 className="font-bold text-purple-900 mb-2">🎯 Position Sizing Formula</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    <strong>Base position:</strong> 2-3% of portfolio.<br />
                    <strong>Add 1% if:</strong> Multiple insiders buying, large dollar amounts, CEO involved, stock down significantly.<br />
                    <strong>Maximum:</strong> 5-7% for highest conviction ideas with cluster buying.
                  </p>
                </div>
              </div>
              </section>
            </AnimatedSection>
          </div>

          {/* Sidebar */}
          <motion.div 
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {/* Quick Reference Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white sticky top-20">
              <h3 className="text-xl font-bold mb-4">Quick Reference</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-blue-100 text-sm font-semibold mb-2">Transaction Importance</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Open Market Buy</span>
                      <span className="px-2 py-0.5 bg-green-500 rounded text-xs font-bold">HIGH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cluster Buying</span>
                      <span className="px-2 py-0.5 bg-green-500 rounded text-xs font-bold">HIGH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CEO Purchase</span>
                      <span className="px-2 py-0.5 bg-green-500 rounded text-xs font-bold">HIGH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Open Market Sale</span>
                      <span className="px-2 py-0.5 bg-amber-500 rounded text-xs font-bold">MED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Option Exercise</span>
                      <span className="px-2 py-0.5 bg-amber-500 rounded text-xs font-bold">MED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Grants/Awards</span>
                      <span className="px-2 py-0.5 bg-gray-400 rounded text-xs font-bold">LOW</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-500 pt-4">
                  <div className="text-blue-100 text-sm font-semibold mb-2">Key Metrics</div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-blue-200">Strong Signal:</div>
                      <div>$1M+ purchase or 10%+ of net worth</div>
                    </div>
                    <div>
                      <div className="text-blue-200">Cluster Buying:</div>
                      <div>3+ insiders within 30 days</div>
                    </div>
                    <div>
                      <div className="text-blue-200">Time Horizon:</div>
                      <div>3-12 months typically</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Resources</h3>
              <div className="space-y-3">
                <a href="https://www.sec.gov/forms" target="_blank" rel="noopener noreferrer" 
                   className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="font-semibold text-gray-900 text-sm mb-1">SEC Forms Guide</div>
                  <div className="text-xs text-gray-600">Official SEC documentation</div>
                </a>
                <a href="#" className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="font-semibold text-gray-900 text-sm mb-1">Watch List Tutorial</div>
                  <div className="text-xs text-gray-600">How to set up alerts</div>
                </a>
                <a href="#" className="block p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="font-semibold text-gray-900 text-sm mb-1">Case Studies</div>
                  <div className="text-xs text-gray-600">Real examples of successful trades</div>
                </a>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Ready to Start?</h3>
              <p className="text-sm text-green-100 mb-4">
                Apply these strategies with real-time insider trading data.
              </p>
              <Link 
                href="/"
                className="block w-full py-3 bg-white text-green-700 rounded-xl font-bold text-center hover:bg-green-50 transition-colors"
              >
                View Latest Trades
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer CTA */}
      <AnimatedSection>
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Start Following Insider Signals Today</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Join thousands of investors who use insider trading data to find their next winning investment.
            </p>
            <Link 
              href="/"
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
            >
              Explore Insider Trades →
            </Link>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}

// Animated section wrapper component
function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

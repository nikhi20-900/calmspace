import React, { useState } from 'react';
import { Sliders, Sparkles, Calendar, ShieldAlert, Heart, Moon, Brain, Coffee, PhoneCall } from 'lucide-react';

export const ProductPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'guidance' | 'planner' | 'safety'>('checkin');

  // Interactive slider state inside preview
  const [previewMood, setPreviewMood] = useState(3);
  const [previewSleep, setPreviewSleep] = useState(7);
  const [previewStress, setPreviewStress] = useState(2);

  const moodLabels = ['Very low', 'Low', 'Balanced', 'Good', 'Very good'];
  const stressLabels = ['Calm', 'Mild', 'Moderate', 'High', 'Extreme'];

  return (
    <section id="experience" className="py-20 sm:py-28 bg-white border-t border-[#E8E6F1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9E7FB] text-xs font-semibold text-[#5554B8] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Preview</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[#25233B] tracking-tight">
            Built for calm, not engagement loops.
          </h2>
          <p className="mt-4 text-lg text-[#625F78] leading-relaxed">
            Every screen is designed with soft edges, generous whitespace, and zero notifications begging for your attention.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          <button
            type="button"
            onClick={() => setActiveTab('checkin')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'checkin'
                ? 'bg-[#5554B8] text-white shadow-soft'
                : 'bg-[#F7F6FB] text-[#625F78] hover:text-[#25233B] border border-[#E8E6F1]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Daily Check-in</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guidance')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'guidance'
                ? 'bg-[#5554B8] text-white shadow-soft'
                : 'bg-[#F7F6FB] text-[#625F78] hover:text-[#25233B] border border-[#E8E6F1]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Supportive Guidance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'planner'
                ? 'bg-[#5554B8] text-white shadow-soft'
                : 'bg-[#F7F6FB] text-[#625F78] hover:text-[#25233B] border border-[#E8E6F1]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Study-Life Planner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'safety'
                ? 'bg-[#5554B8] text-white shadow-soft'
                : 'bg-[#F7F6FB] text-[#625F78] hover:text-[#25233B] border border-[#E8E6F1]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Safety Routing</span>
          </button>
        </div>

        {/* Tab Viewport: Styled Mockup Screen */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#F7F6FB] border border-[#E8E6F1] shadow-card p-6 sm:p-10 transition-all duration-300">
          {activeTab === 'checkin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E8E6F1] pb-4">
                <div>
                  <h3 className="font-heading text-xl font-bold text-[#25233B]">
                    How are you feeling right now?
                  </h3>
                  <p className="text-xs text-[#625F78] mt-1">
                    Try adjusting the sliders below to experience the check-in interaction.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E9E7FB] text-[#5554B8]">
                  Step 1 of 3
                </span>
              </div>

              {/* Mood Slider */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6F1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#25233B]">
                    <Heart className="w-4 h-4 text-[#5554B8]" />
                    Mood state
                  </span>
                  <span className="text-xs font-semibold text-[#5554B8] px-2 py-0.5 rounded bg-[#F2F1FD]">
                    {moodLabels[previewMood - 1]} ({previewMood}/5)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={previewMood}
                  onChange={(e) => setPreviewMood(Number(e.target.value))}
                  className="w-full accent-[#5554B8] cursor-pointer"
                  aria-label="Mood rating"
                />
                <div className="flex justify-between text-[11px] text-[#625F78]">
                  <span>Very low</span>
                  <span>Neutral</span>
                  <span>Thriving</span>
                </div>
              </div>

              {/* Sleep Slider */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6F1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#25233B]">
                    <Moon className="w-4 h-4 text-[#9A5B2D]" />
                    Last night's sleep
                  </span>
                  <span className="text-xs font-semibold text-[#9A5B2D] px-2 py-0.5 rounded bg-[#F4DCCB]">
                    {previewSleep} hours
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={previewSleep}
                  onChange={(e) => setPreviewSleep(Number(e.target.value))}
                  className="w-full accent-[#9A5B2D] cursor-pointer"
                  aria-label="Sleep hours"
                />
                <div className="flex justify-between text-[11px] text-[#625F78]">
                  <span>3 hrs</span>
                  <span>7-8 hrs (optimal)</span>
                  <span>12 hrs</span>
                </div>
              </div>

              {/* Stress Slider */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6F1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#25233B]">
                    <Brain className="w-4 h-4 text-[#2F6B4F]" />
                    Current study stress
                  </span>
                  <span className="text-xs font-semibold text-[#2F6B4F] px-2 py-0.5 rounded bg-[#DCE9DF]">
                    {stressLabels[previewStress]}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={previewStress}
                  onChange={(e) => setPreviewStress(Number(e.target.value))}
                  className="w-full accent-[#2F6B4F] cursor-pointer"
                  aria-label="Stress rating"
                />
                <div className="flex justify-between text-[11px] text-[#625F78]">
                  <span>Calm</span>
                  <span>Manageable</span>
                  <span>Overwhelming</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guidance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E8E6F1] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#5554B8] text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#E9E7FB]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#25233B]">
                      Calmspace Thoughtful Guidance
                    </h3>
                    <p className="text-xs text-[#625F78]">
                      AI crafted support · Non-clinical · Grounding
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#DCE9DF] text-[#2F6B4F]">
                  Low Stress Route
                </span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[#E8E6F1] space-y-4 shadow-subtle">
                <p className="text-base text-[#25233B] leading-relaxed">
                  "It sounds like you had a decent rest last night, but today's upcoming lab exam is sitting in the back of your mind. Remember that you do not need to master every single topic in one sitting."
                </p>
                <div className="p-4 rounded-xl bg-[#F2F1FD] border border-[#E9E7FB] text-sm text-[#5554B8] space-y-1">
                  <span className="font-semibold block">Suggested gentle micro-practice:</span>
                  <p className="text-xs leading-relaxed text-[#625F78]">
                    Take 8 minutes to drink water and step outside or look out a window before opening your course slides.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6F1] flex items-center justify-between text-xs text-[#625F78]">
                <span>Routing decision: Deterministic Rule Engine</span>
                <span className="font-semibold text-[#5554B8]">Zero Medical Diagnosis</span>
              </div>
            </div>
          )}

          {activeTab === 'planner' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E8E6F1] pb-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#25233B]">
                    Balanced Study Blocks
                  </h3>
                  <p className="text-xs text-[#625F78]">
                    Focus periods with protected restorative intervals
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E9E7FB] text-[#5554B8]">
                  Today's Schedule
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border-l-4 border-l-[#5554B8] border border-[#E8E6F1] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[#5554B8]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#25233B]">Deep Revision: Cognitive Psychology</h4>
                      <p className="text-xs text-[#625F78]">45 mins · Moderate cognitive load</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#5554B8] bg-[#F2F1FD] px-2.5 py-1 rounded-full">
                    10:00 - 10:45 AM
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#DCE9DF]/40 border-l-4 border-l-[#2F6B4F] border border-[#DCE9DF] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-[#2F6B4F]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#25233B]">Protected Rest Period</h4>
                      <p className="text-xs text-[#2F6B4F]">20 mins · No screens · Gentle hydration</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#2F6B4F] bg-white px-2.5 py-1 rounded-full">
                    10:45 - 11:05 AM
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border-l-4 border-l-[#5554B8] border border-[#E8E6F1] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[#5554B8]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#25233B]">Lab Problem Set Practice</h4>
                      <p className="text-xs text-[#625F78]">35 mins · Practice problems</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#5554B8] bg-[#F2F1FD] px-2.5 py-1 rounded-full">
                    11:05 - 11:40 AM
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E8E6F1] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#25233B]">
                      High Distress Safety Escalation
                    </h3>
                    <p className="text-xs text-[#625F78]">
                      Triggered automatically when high risk is detected
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  Human Escalation
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <p className="text-sm font-medium text-[#25233B]">
                  "When you indicate extreme distress or overwhelming crisis, Calmspace stops automated AI advice immediately and connects you directly with verified humans who can help."
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border border-[#E8E6F1] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#5554B8] uppercase tracking-wide">
                      National 24/7 Helpline
                    </span>
                    <h4 className="text-sm font-bold text-[#25233B]">Tele-MANAS Mental Health Services</h4>
                    <p className="text-xs text-[#625F78]">Toll-free tele-counselling in 20+ languages</p>
                  </div>
                  <a
                    href="tel:14416"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call 14416</span>
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E8E6F1] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                      Emergency Dispatch
                    </span>
                    <h4 className="text-sm font-bold text-[#25233B]">112 National Emergency Line</h4>
                    <p className="text-xs text-[#625F78]">Immediate medical or dispatch response</p>
                  </div>
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Dial 112</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

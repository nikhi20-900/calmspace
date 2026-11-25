import React, { useState } from 'react';
import { Sliders, Sparkles, Calendar, ShieldAlert, Heart, Moon, Brain, Coffee, PhoneCall } from 'lucide-react';

export const ProductPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'guidance' | 'planner' | 'safety'>('checkin');

  const [previewMood, setPreviewMood] = useState(3);
  const [previewSleep, setPreviewSleep] = useState(7);
  const [previewStress, setPreviewStress] = useState(2);

  const moodLabels = ['Very low', 'Low', 'Balanced', 'Good', 'Very good'];
  const stressLabels = ['Calm', 'Mild', 'Moderate', 'High', 'Extreme'];

  return (
    <section id="experience" className="py-20 sm:py-28 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--color-lavender-soft)] text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Preview</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] tracking-tight">
            Built for calm, not engagement loops.
          </h2>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)] leading-relaxed">
            Every screen is designed with soft edges, generous whitespace, and zero notifications begging for your attention.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {[
            { id: 'checkin' as const, label: 'Daily Check-in', icon: Sliders },
            { id: 'guidance' as const, label: 'Supportive Guidance', icon: Sparkles },
            { id: 'planner' as const, label: 'Study-Life Planner', icon: Calendar },
            { id: 'safety' as const, label: 'Safety Routing', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary-fill)] text-white shadow-soft'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-card p-6 sm:p-10 transition-all duration-300">
          {activeTab === 'checkin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                  <h3 className="font-heading text-xl font-bold text-[var(--color-text-main)]">
                    How are you feeling right now?
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Try adjusting the sliders below to experience the check-in interaction.
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)]">
                  Step 1 of 3
                </span>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                    <Heart className="w-4 h-4 text-[var(--color-primary)]" />
                    Mood state
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-primary)] px-2.5 py-0.5 rounded bg-[var(--color-primary-subtle)]">
                    {moodLabels[previewMood - 1]} ({previewMood}/5)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={previewMood}
                  onChange={(e) => setPreviewMood(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)] cursor-pointer"
                  aria-label="Mood rating"
                />
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>Very low</span>
                  <span>Neutral</span>
                  <span>Thriving</span>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                    <Moon className="w-4 h-4 text-[var(--color-amber-text)]" />
                    Last night's sleep
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-amber-text)] px-2.5 py-0.5 rounded bg-[var(--color-amber-soft)]">
                    {previewSleep} hours
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={previewSleep}
                  onChange={(e) => setPreviewSleep(Number(e.target.value))}
                  className="w-full accent-[var(--color-amber-text)] cursor-pointer"
                  aria-label="Sleep hours"
                />
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>3 hrs</span>
                  <span>7-8 hrs (optimal)</span>
                  <span>12 hrs</span>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                    <Brain className="w-4 h-4 text-[var(--color-sage-text)]" />
                    Current study stress
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-sage-text)] px-2.5 py-0.5 rounded bg-[var(--color-sage-soft)]">
                    {stressLabels[previewStress]}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={previewStress}
                  onChange={(e) => setPreviewStress(Number(e.target.value))}
                  className="w-full accent-[var(--color-sage-text)] cursor-pointer"
                  aria-label="Stress rating"
                />
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                  <span>Calm</span>
                  <span>Manageable</span>
                  <span>Overwhelming</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guidance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-fill)] text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)]">
                      Calmspace Thoughtful Guidance
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      AI crafted support · Non-clinical · Grounding
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-text)]">
                  Low Stress Route
                </span>
              </div>

              <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] space-y-4 shadow-subtle">
                <p className="text-base text-[var(--color-text-main)] leading-relaxed">
                  "It sounds like you had a decent rest last night, but today's upcoming lab exam is sitting in the back of your mind. Remember that you do not need to master every single topic in one sitting."
                </p>
                <div className="p-4 rounded-xl bg-[var(--color-primary-subtle)] border border-[var(--color-lavender-border)] text-sm text-[var(--color-primary)] space-y-1">
                  <span className="font-semibold block">Suggested gentle micro-practice:</span>
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    Take 8 minutes to drink water and step outside or look out a window before opening your course slides.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                <span>Routing decision: Deterministic Rule Engine</span>
                <span className="font-semibold text-[var(--color-primary)]">Zero Medical Diagnosis</span>
              </div>
            </div>
          )}

          {activeTab === 'planner' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)]">
                    Balanced Study Blocks
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Focus periods with protected restorative intervals
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-lavender-soft)] text-[var(--color-primary)]">
                  Today's Schedule
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border-l-4 border-l-[var(--color-primary)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[var(--color-primary)]" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-main)]">Deep Revision: Cognitive Psychology</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">45 mins · Moderate cognitive load</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-2.5 py-1 rounded-full">
                    10:00 - 10:45 AM
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--color-sage-light)] border-l-4 border-l-[var(--color-sage-text)] border border-[var(--color-sage-border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-[var(--color-sage-text)]" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-main)]">Protected Rest Period</h4>
                      <p className="text-sm text-[var(--color-sage-text)]">20 mins · No screens · Gentle hydration</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-sage-text)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">
                    10:45 - 11:05 AM
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border-l-4 border-l-[var(--color-primary)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-[var(--color-primary)]" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-main)]">Lab Problem Set Practice</h4>
                      <p className="text-sm text-[var(--color-text-secondary)]">35 mins · Practice problems</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-2.5 py-1 rounded-full">
                    11:05 - 11:40 AM
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[var(--color-text-main)]">
                      High Distress Safety Escalation
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Triggered automatically when high risk is detected
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger-text)]">
                  Human Escalation
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] space-y-3">
                <p className="text-sm font-medium text-[var(--color-text-main)]">
                  "When you indicate extreme distress or overwhelming crisis, Calmspace stops automated AI advice immediately and connects you directly with verified humans who can help."
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide">
                      National 24/7 Helpline
                    </span>
                    <h4 className="text-sm font-bold text-[var(--color-text-main)]">Tele-MANAS Mental Health Services</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Toll-free tele-counselling in 20+ languages</p>
                  </div>
                  <a
                    href="tel:14416"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary-fill)] text-white text-sm font-semibold hover:bg-[var(--color-primary-fill-hover)] shrink-0"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call 14416</span>
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[var(--color-danger-text)] uppercase tracking-wide">
                      Emergency Dispatch
                    </span>
                    <h4 className="text-sm font-bold text-[var(--color-text-main)]">112 National Emergency Line</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Immediate medical or dispatch response</p>
                  </div>
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800 shrink-0"
                  >
                    <PhoneCall className="w-4 h-4" />
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

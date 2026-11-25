import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sliders, LineChart, HeartHandshake, ArrowRight, Sparkles } from 'lucide-react';
import { ScrollStagger, ScrollStaggerItem } from './ScrollReveal';

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      num: '01',
      title: 'Check in with yourself',
      duration: 'Under 60 seconds',
      icon: Sliders,
      description:
        'A gentle reflection on how you feel today. Adjust intuitive scales for mood, sleep duration, and study stress. Add optional private thoughts without forced formatting.',
      highlights: ['No long clinical questionnaires', 'Encouraging, low-friction sliders', 'Zero judgment or streaks'],
    },
    {
      num: '02',
      title: 'Understand your patterns',
      duration: 'Insightful & transparent',
      icon: LineChart,
      description:
        'Calmspace maps your week into honest, gentle observations. Discover how late nights connect with high stress before exams, without punitive scores or streak anxiety.',
      highlights: ['Clear weekly rhythm trends', 'Sleep and stress correlation', 'Purely educational context'],
    },
    {
      num: '03',
      title: 'Take a restorative step',
      duration: 'At your own pace',
      icon: HeartHandshake,
      description:
        'Receive low-pressure guidance tailored to how you are doing today: realistic study-break blocks, mindful breathing, or one-tap connection to verified human helplines.',
      highlights: ['Supportive AI guidance for mild stress', 'Structured study-life balance planner', 'Immediate human escalation for high distress'],
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#F7F6FB] border-t border-[#E8E6F1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9E7FB] text-xs font-semibold text-[#5554B8] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>How Calmspace Works</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[#25233B] tracking-tight">
            Small steps count.
          </h2>
          <p className="mt-4 text-lg text-[#625F78] leading-relaxed">
            We designed Calmspace to feel like taking a slow, deep breath in a quiet room.
            No streaks to maintain, no algorithms ranking your productivity.
          </p>
        </div>

        {/* 3 Step Cards */}
        <ScrollStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <ScrollStaggerItem
                key={step.num}
                className="bg-white rounded-3xl p-8 border border-[#E8E6F1] shadow-subtle hover:shadow-card hover:border-[#DCD9F5] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-heading text-3xl font-extrabold text-[#5554B8]/30">
                      {step.num}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F2F1FD] text-[#5554B8] border border-[#E9E7FB]">
                      {step.duration}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-[#E9E7FB] text-[#5554B8] flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="font-heading text-xl font-bold text-[#25233B] mb-3">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#625F78] leading-relaxed mb-6">
                    {step.description}
                  </p>
                </div>

                <div className="border-t border-[#F0EFF7] pt-5 space-y-2.5">
                  {step.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#25233B] font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#5554B8] shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </ScrollStaggerItem>
            );
          })}
        </ScrollStagger>

        {/* Action Callout */}
        <div className="mt-14 text-center">
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-white bg-[#5554B8] hover:bg-[#4645A7] shadow-soft hover:shadow-card transition-all active:scale-98"
          >
            <span>Start a 60-second check-in</span>
            <ArrowRight className="w-4 h-4 text-[#E9E7FB]" />
          </button>
        </div>
      </div>
    </section>
  );
};

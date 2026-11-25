import React from 'react';
import { BookOpen, Moon, Users, Compass, Sparkles } from 'lucide-react';
import { ScrollStagger, ScrollStaggerItem } from './ScrollReveal';

export const StudentReality: React.FC = () => {
  const experiences = [
    {
      icon: BookOpen,
      tag: 'Academic Overwhelm',
      tagColor: 'bg-[var(--color-lavender-soft)] text-[var(--color-primary)]',
      title: 'When deadlines stack up',
      description:
        'Three assignments due Friday, two lab reports pending, and breathing feels rushed. It is hard to know where to start when everything feels urgent.',
    },
    {
      icon: Moon,
      tag: 'Sleep Debt',
      tagColor: 'bg-[var(--color-amber-soft)] text-[var(--color-amber-text)]',
      title: 'Tired body, racing thoughts',
      description:
        'Staring at the ceiling at 3 AM replaying a presentation or tomorrow’s schedule while exhaustion sits heavily behind your eyes.',
    },
    {
      icon: Users,
      tag: 'Imposter Syndrome',
      tagColor: 'bg-[var(--color-sage-soft)] text-[var(--color-sage-text)]',
      title: 'Alone in a crowded room',
      description:
        'Surrounded by classmates who seem to effortlessly balance exams, internships, and social lives, wondering why you feel like an outsider.',
    },
    {
      icon: Compass,
      tag: 'The In-Between',
      tagColor: 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]',
      title: 'Not in crisis, but not okay',
      description:
        'You are getting through your days, but the spark feels distant. You do not need a medical diagnosis — you simply need a quiet moment to recalibrate.',
    },
  ];

  return (
    <section id="reality" className="py-20 sm:py-28 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--color-lavender-soft)] text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Student Reality</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] tracking-tight">
            Some days are heavier than others.
          </h2>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)] leading-relaxed">
            University life is demanding, fast, and often isolating.
            You do not have to put on a brave face here. Calmspace was built for real student days.
          </p>
        </div>

        <ScrollStagger className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {experiences.map((item, idx) => {
            const Icon = item.icon;
            return (
              <ScrollStaggerItem
                key={idx}
                className="p-8 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-lavender-border)] hover:bg-[var(--color-surface)] hover:shadow-card transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-subtle group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${item.tagColor}`}>
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[var(--color-text-main)] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </ScrollStaggerItem>
            );
          })}
        </ScrollStagger>

        <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-[var(--color-primary-subtle)] border border-[var(--color-lavender-border)] text-center max-w-3xl mx-auto shadow-subtle">
          <p className="font-heading text-lg sm:text-xl font-bold text-[var(--color-text-main)]">
            "You don't have to wait for burnout or crisis to check in with yourself."
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Even two minutes of honest reflection can help restore your perspective.
          </p>
        </div>
      </div>
    </section>
  );
};

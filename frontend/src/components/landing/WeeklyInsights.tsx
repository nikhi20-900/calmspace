import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const WeeklyInsights: React.FC = () => {
  const isReducedMotion = useReducedMotion();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (isReducedMotion) {
      setIsInView(true);
      return;
    }

    const element = chartContainerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const days = [
    { name: 'Mon', mood: 3.4, x: 50, y: 78 },
    { name: 'Tue', mood: 3.8, x: 116.7, y: 66 },
    { name: 'Wed', mood: 3.2, x: 183.3, y: 84 },
    { name: 'Thu', mood: 3.6, x: 250.0, y: 72 },
    { name: 'Fri', mood: 4.0, x: 316.7, y: 60 },
    { name: 'Sat', mood: 3.8, x: 383.3, y: 66 },
    { name: 'Sun', mood: 3.4, x: 450.0, y: 78 },
  ];

  const pathD = `M ${days.map((d) => `${d.x},${d.y}`).join(' L ')}`;
  const areaD = `${pathD} L 450,150 L 50,150 Z`;

  return (
    <section id="insights" className="py-20 sm:py-28 bg-[var(--color-bg)] border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--color-lavender-soft)] text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Weekly Rhythms</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-text-main)] tracking-tight">
            Understand your week, not just your numbers.
          </h2>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)] leading-relaxed">
            Wellbeing is not a linear climb. Calmspace reflects your natural patterns without streaks or pressure,
            helping you make sense of your energy.
          </p>
        </div>

        <div
          ref={chartContainerRef}
          className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-card p-6 sm:p-10 max-w-4xl mx-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-2.5 py-1 rounded-full border border-[var(--color-lavender-border)]">
                  Example Weekly Summary
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">Past 7 Days</span>
              </div>
              <h3 className="font-heading text-2xl font-bold text-[var(--color-text-main)] mt-2">
                Balanced rhythm with midweek dip
              </h3>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-sm text-[var(--color-text-secondary)] block">7-Day Average</span>
                <span className="font-heading text-2xl font-bold text-[var(--color-primary)]">
                  3.6 <span className="text-sm font-normal text-[var(--color-text-secondary)]">/ 5.0</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-[var(--color-text-secondary)] block">Sleep Average</span>
                <span className="font-heading text-2xl font-bold text-[var(--color-amber-text)]">
                  7.2 <span className="text-sm font-normal text-[var(--color-text-secondary)]">hrs</span>
                </span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[500px]">
              <svg
                viewBox="0 0 500 180"
                className="w-full h-auto overflow-visible select-none"
                aria-label="Example 7-day mood graph showing scores between 3.2 and 4.0, averaging 3.60"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="50" y1="60" x2="450" y2="60" stroke="var(--color-chart-grid)" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="50" y1="90" x2="450" y2="90" stroke="var(--color-chart-grid)" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="50" y1="120" x2="450" y2="120" stroke="var(--color-chart-grid)" strokeDasharray="4 4" strokeWidth="1" />

                <text x="35" y="64" fill="var(--color-chart-axis)" fontSize="11" textAnchor="end">4.0</text>
                <text x="35" y="94" fill="var(--color-chart-axis)" fontSize="11" textAnchor="end">3.0</text>
                <text x="35" y="124" fill="var(--color-chart-axis)" fontSize="11" textAnchor="end">2.0</text>

                <path
                  d={areaD}
                  fill="url(#chartGradient)"
                  style={{
                    opacity: isInView || isReducedMotion ? 1 : 0,
                    transition: isReducedMotion ? 'none' : 'opacity 1.1s ease-out 0.35s',
                  }}
                />

                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 550,
                    strokeDashoffset: isInView || isReducedMotion ? 0 : 550,
                    transition: isReducedMotion
                      ? 'none'
                      : 'stroke-dashoffset 1.35s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {days.map((d, i) => {
                  const pointDelay = 0.12 + i * 0.16;

                  return (
                    <g key={i}>
                      <line
                        x1={d.x}
                        y1={d.y}
                        x2={d.x}
                        y2="150"
                        stroke="var(--color-border)"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                        style={{
                          opacity: isInView || isReducedMotion ? 1 : 0,
                          transition: isReducedMotion ? 'none' : `opacity 0.4s ease-out ${pointDelay}s`,
                        }}
                      />

                      <g
                        style={{
                          opacity: isInView || isReducedMotion ? 1 : 0,
                          transform: isInView || isReducedMotion ? 'scale(1)' : 'scale(0)',
                          transformOrigin: `${d.x}px ${d.y}px`,
                          transition: isReducedMotion
                            ? 'none'
                            : `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${pointDelay}s, opacity 0.25s ease-out ${pointDelay}s`,
                        }}
                      >
                        <circle cx={d.x} cy={d.y} r="7" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2.5" />
                        <circle cx={d.x} cy={d.y} r="3" fill="var(--color-primary)" />
                      </g>

                      <text
                        x={d.x}
                        y="166"
                        fill="var(--color-text-secondary)"
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {d.name}
                      </text>

                      <text
                        x={d.x}
                        y={d.y - 12}
                        fill="var(--color-primary)"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                        style={{
                          opacity: isInView || isReducedMotion ? 1 : 0,
                          transform: isInView || isReducedMotion ? 'translateY(0)' : 'translateY(6px)',
                          transformOrigin: `${d.x}px ${d.y - 12}px`,
                          transition: isReducedMotion
                            ? 'none'
                            : `transform 0.38s cubic-bezier(0.16, 1, 0.3, 1) ${pointDelay + 0.08}s, opacity 0.3s ease-out ${pointDelay + 0.08}s`,
                        }}
                      >
                        {d.mood.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-5 border-t border-[var(--color-border-light)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[var(--color-text-secondary)]">
            <p className="leading-relaxed max-w-xl">
              <strong className="text-[var(--color-text-main)]">Gentle Observation:</strong> Midweek dipped slightly to 3.2 on Wednesday (coinciding with 5.5 hours of sleep), then steadily bounced back as sleep recovered to 8 hours by Friday.
            </p>
            <span className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-text)] font-semibold">
              No streaks or pressure
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <h4 className="font-heading text-base font-bold text-[var(--color-text-main)] mb-2">
              No Streak Counter
            </h4>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Missing a day will never reset a flame or penalize your progress. Calmspace is here when you need it, and waiting patiently when you don't.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <h4 className="font-heading text-base font-bold text-[var(--color-text-main)] mb-2">
              No Red Alert Scores
            </h4>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              We never label your days with harsh reds or alarming scorecards. Low-energy days are treated as a natural invitation for gentler pacing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <h4 className="font-heading text-base font-bold text-[var(--color-text-main)] mb-2">
              Context, Not Judgement
            </h4>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              View how exam weeks correlate with sleep without algorithmic shame. Knowledge gives you agency to protect rest periods.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

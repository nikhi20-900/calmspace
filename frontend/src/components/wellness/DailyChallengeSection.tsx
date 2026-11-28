import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getDailyChallengeForDate } from '../../data/wellnessContent';
import {
  countWeeklyCompletedChallenges,
  getLocalDateKey,
  loadChallengesState,
  markChallengeCompleted,
} from '../../utils/wellnessStorage';

export const DailyChallengeSection: React.FC = () => {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const challenge = useMemo(() => getDailyChallengeForDate(todayKey), [todayKey]);

  const [challengesState, setChallengesState] = useState(() => loadChallengesState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [responseText, setResponseText] = useState(
    () => loadChallengesState().responses[todayKey] || ''
  );
  const [justCompleted, setJustCompleted] = useState(false);

  const isCompletedToday = Boolean(challengesState.completedDates[todayKey]);
  const weeklyCompletedCount = useMemo(
    () => countWeeklyCompletedChallenges(challengesState.completedDates),
    [challengesState.completedDates]
  );
  const weeklyPercent = Math.min(100, Math.round((weeklyCompletedCount / 7) * 100));

  const handleComplete = () => {
    if (isCompletedToday) return;
    const updated = markChallengeCompleted(todayKey, challenge.id, responseText);
    setChallengesState(updated);
    setJustCompleted(true);
  };

  return (
    <section aria-label="Today's Mindful Challenge">
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
              <Sparkles className="w-4 h-4" />
              <span>Today&apos;s Mindful Challenge</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
              {challenge.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7F6FB] text-[#625F78] border border-[#E8E6F1]">
              {challenge.category}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F7F6FB] text-[#625F78] border border-[#E8E6F1]">
              <Clock className="w-3.5 h-3.5 text-[#5554B8]" />
              <span>{challenge.estimatedMinutes} min</span>
            </span>
            {isCompletedToday && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCE9DF] text-[#245532] border border-[#BCD4C3]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed Today</span>
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-[#625F78] leading-relaxed">
          {challenge.description}
        </p>

        {/* Action / Activity Area */}
        {!isExpanded && !isCompletedToday ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExpanded(true)}
            >
              Start Challenge
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] space-y-3">
            {challenge.isWritingChallenge && (
              <div className="space-y-1.5">
                <label
                  htmlFor="daily-challenge-response"
                  className="block text-xs font-semibold text-[#25233B]"
                >
                  Your reflection (saved privately on this device)
                </label>
                <textarea
                  id="daily-challenge-response"
                  rows={3}
                  value={responseText}
                  disabled={isCompletedToday}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={challenge.promptPlaceholder || 'Write your thoughts here...'}
                  className="w-full p-3 text-xs sm:text-sm bg-white border border-[#E8E6F1] rounded-input text-[#25233B] placeholder-[#8E8AA7] focus:outline-none focus:ring-2 focus:ring-[#5554B8] disabled:bg-[#F7F6FB] disabled:text-[#625F78]"
                />
              </div>
            )}

            {!challenge.isWritingChallenge && !isCompletedToday && (
              <p className="text-xs text-[#625F78]">
                Take {challenge.estimatedMinutes} unhurried minutes for this activity, then mark it complete when you&apos;re ready.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant={isCompletedToday ? 'secondary' : 'primary'}
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                disabled={isCompletedToday}
                onClick={handleComplete}
              >
                {isCompletedToday ? 'Completed for Today' : 'Mark as Completed'}
              </Button>

              {!isCompletedToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  Minimize
                </Button>
              )}
            </div>

            {justCompleted && (
              <p
                role="status"
                className="text-xs font-medium text-[#245532] bg-[#DCE9DF]/60 border border-[#BCD4C3] rounded-input px-3 py-2"
              >
                Nice work taking a mindful moment today. Your weekly progress has been updated.
              </p>
            )}
          </div>
        )}

        {/* Weekly Progress Indicator */}
        <div className="pt-3 border-t border-[#F0EFF7] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#25233B]">
              <Award className="w-4 h-4 text-[#5554B8]" />
              <span>This Week&apos;s Progress</span>
            </span>
            <span className="text-[#625F78] font-medium">
              {weeklyCompletedCount} of 7 days completed
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-[#E9E7FB] overflow-hidden"
            role="progressbar"
            aria-valuenow={weeklyCompletedCount}
            aria-valuemin={0}
            aria-valuemax={7}
            aria-label={`Weekly mindful challenges completed: ${weeklyCompletedCount} of 7`}
          >
            <div
              className="h-full bg-[#5554B8] rounded-full transition-all duration-300"
              style={{ width: `${weeklyPercent}%` }}
            />
          </div>
        </div>
      </Card>
    </section>
  );
};

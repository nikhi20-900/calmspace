import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Bell,
  Heart,
  Sun,
  BookOpen,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import {
  DailyHighlightItem,
  HighlightCategory,
  getDailyHighlightsForDate,
} from '../../data/wellnessContent';
import {
  getLocalDateKey,
  loadReadHighlightIds,
  saveReadHighlightIds,
} from '../../utils/wellnessStorage';

const CATEGORY_STYLES: Record<
  HighlightCategory,
  { icon: React.ReactNode; badgeBg: string; badgeText: string }
> = {
  'Daily Affirmation': {
    icon: <Sparkles className="w-4 h-4 text-[#5554B8]" />,
    badgeBg: 'bg-[#E9E7FB]',
    badgeText: 'text-[#5554B8]',
  },
  'Mindful Reminder': {
    icon: <Bell className="w-4 h-4 text-[#7A4D05]" />,
    badgeBg: 'bg-[#F6E6CC]',
    badgeText: 'text-[#7A4D05]',
  },
  'Self-Care Tip': {
    icon: <Heart className="w-4 h-4 text-[#245532]" />,
    badgeBg: 'bg-[#DCE9DF]',
    badgeText: 'text-[#245532]',
  },
  'Gratitude Prompt': {
    icon: <Sun className="w-4 h-4 text-[#8C4A27]" />,
    badgeBg: 'bg-[#F4DCCB]',
    badgeText: 'text-[#8C4A27]',
  },
  'Mental Wellness Fact': {
    icon: <BookOpen className="w-4 h-4 text-[#5554B8]" />,
    badgeBg: 'bg-[#E9E7FB]',
    badgeText: 'text-[#5554B8]',
  },
};

export const DailyHighlightsSection: React.FC = () => {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const highlights = useMemo(() => getDailyHighlightsForDate(todayKey), [todayKey]);

  const [readIds, setReadIds] = useState<string[]>(() => loadReadHighlightIds(todayKey));
  const [selectedHighlight, setSelectedHighlight] = useState<DailyHighlightItem | null>(null);

  const unreadCount = highlights.filter((h) => !readIds.includes(h.id)).length;

  const handleMarkAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const updated = [...readIds, id];
    setReadIds(updated);
    saveReadHighlightIds(updated, todayKey);
  };

  return (
    <section aria-label="Daily Highlights" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#25233B]">
            Daily Highlights
          </h2>
          <p className="text-xs text-[#625F78]">
            Gentle daily notes for your mind • {unreadCount === 0 ? 'All caught up today' : `${unreadCount} unread today`}
          </p>
        </div>
      </div>

      {/* Smooth horizontal scrollable card collection */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        role="list"
        aria-label="Daily wellness highlight cards"
      >
        {highlights.map((item) => {
          const isRead = readIds.includes(item.id);
          const style = CATEGORY_STYLES[item.category];
          return (
            <div
              key={item.id}
              role="listitem"
              className="snap-start shrink-0 w-[260px] sm:w-[280px]"
            >
              <Card
                padding="md"
                hoverable
                onClick={() => setSelectedHighlight(item)}
                className="h-full flex flex-col justify-between gap-3 text-left"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${style.badgeBg} ${style.badgeText}`}
                    >
                      {style.icon}
                      <span>{item.category}</span>
                    </span>

                    {!isRead ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5554B8]"
                        aria-label="Unread highlight"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#5554B8]" />
                        <span>New</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#245532]"
                        aria-label="Read highlight"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#25233B] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#625F78] leading-relaxed line-clamp-3">
                    {item.shortDescription}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F0EFF7] flex items-center justify-between text-xs font-semibold text-[#5554B8]">
                  <span>Read more</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Highlight Detail Modal (portaled to body so it centers above Sidebar) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <Dialog
            isOpen={Boolean(selectedHighlight)}
            onClose={() => setSelectedHighlight(null)}
            title={selectedHighlight?.title || ''}
            description={selectedHighlight?.category}
            maxWidth="sm"
          >
            {selectedHighlight && (
              <div className="space-y-5">
                <p className="text-sm text-[#25233B] leading-relaxed">
                  {selectedHighlight.fullContent}
                </p>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#E8E6F1]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedHighlight(null)}
                  >
                    Close
                  </Button>
                  <Button
                    variant={readIds.includes(selectedHighlight.id) ? 'secondary' : 'primary'}
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    disabled={readIds.includes(selectedHighlight.id)}
                    onClick={() => handleMarkAsRead(selectedHighlight.id)}
                  >
                    {readIds.includes(selectedHighlight.id) ? 'Marked as Read' : 'Mark as Read'}
                  </Button>
                </div>
              </div>
            )}
          </Dialog>,
          document.body
        )}
    </section>
  );
};

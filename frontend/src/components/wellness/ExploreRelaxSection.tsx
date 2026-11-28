import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  Heart,
  Bookmark,
  ArrowRight,
  Clock,
  Sparkles,
  Wind,
  Moon,
  Sun,
  Coffee,
  Brain,
  PlayCircle,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { GuidedVideoPlayer } from './GuidedVideoPlayer';
import {
  EXPLORE_ARTICLES,
  EXPLORE_CATEGORIES,
  ExploreArticle,
  ExploreCategory,
  ExploreFormat,
} from '../../data/wellnessContent';
import {
  loadExploreBookmarks,
  loadExploreLikes,
  saveExploreBookmarks,
  saveExploreLikes,
} from '../../utils/wellnessStorage';

const CATEGORY_THEMES: Record<
  ExploreCategory,
  { icon: React.ReactNode; bannerGradient: string; badgeClass: string }
> = {
  Mindfulness: {
    icon: <Wind className="w-4 h-4 text-[#5554B8]" />,
    bannerGradient: 'bg-gradient-to-r from-[#E9E7FB] via-[#F1EFFD] to-[#E6F2EA]',
    badgeClass: 'bg-white/90 text-[#5554B8] border-[#D8D4F6]',
  },
  'Stress Management': {
    icon: <Sparkles className="w-4 h-4 text-[#7A4D05]" />,
    bannerGradient: 'bg-gradient-to-r from-[#F6E6CC] via-[#FAF0DF] to-[#F4DCCB]',
    badgeClass: 'bg-white/90 text-[#7A4D05] border-[#E8CEA5]',
  },
  Sleep: {
    icon: <Moon className="w-4 h-4 text-[#245532]" />,
    bannerGradient: 'bg-gradient-to-r from-[#DCE9DF] via-[#E8F2EB] to-[#E9E7FB]',
    badgeClass: 'bg-white/90 text-[#245532] border-[#BCD4C3]',
  },
  'Self-Care': {
    icon: <Coffee className="w-4 h-4 text-[#8C4A27]" />,
    bannerGradient: 'bg-gradient-to-r from-[#F4DCCB] via-[#FAECE3] to-[#F6E6CC]',
    badgeClass: 'bg-white/90 text-[#8C4A27] border-[#EAC4AC]',
  },
  Motivation: {
    icon: <Sun className="w-4 h-4 text-[#5554B8]" />,
    bannerGradient: 'bg-gradient-to-r from-[#E6ECFC] via-[#F0EEFC] to-[#F6E6CC]',
    badgeClass: 'bg-white/90 text-[#5554B8] border-[#D2DDFB]',
  },
  'Mental Wellness': {
    icon: <Brain className="w-4 h-4 text-[#5554B8]" />,
    bannerGradient: 'bg-gradient-to-r from-[#E9E7FB] via-[#F5F3FD] to-[#DCE9DF]',
    badgeClass: 'bg-white/90 text-[#5554B8] border-[#D8D4F6]',
  },
};

export interface ExploreRelaxSectionProps {
  previewOnly?: boolean;
}

export const ExploreRelaxSection: React.FC<ExploreRelaxSectionProps> = ({
  previewOnly = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory | 'All'>('All');
  const [selectedFormat, setSelectedFormat] = useState<ExploreFormat | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>(() => loadExploreLikes());
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => loadExploreBookmarks());
  const [activeArticle, setActiveArticle] = useState<ExploreArticle | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXPLORE_ARTICLES.filter((article) => {
      if (selectedCategory !== 'All' && article.category !== selectedCategory) {
        return false;
      }
      if (selectedFormat !== 'all' && article.format !== selectedFormat) {
        return false;
      }
      if (savedOnly && !bookmarkedIds.includes(article.id)) {
        return false;
      }
      if (q) {
        const matchesTitle = article.title.toLowerCase().includes(q);
        const matchesKeyword = article.keywords.some((kw) => kw.toLowerCase().includes(q));
        const matchesDesc = article.shortDescription.toLowerCase().includes(q);
        return matchesTitle || matchesKeyword || matchesDesc;
      }
      return true;
    });
  }, [selectedCategory, selectedFormat, savedOnly, bookmarkedIds, searchQuery]);

  const displayedArticles =
    previewOnly &&
    selectedCategory === 'All' &&
    selectedFormat === 'all' &&
    !savedOnly &&
    !searchQuery.trim()
      ? filteredArticles.slice(0, 3)
      : filteredArticles;

  const toggleLike = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = likedIds.includes(id)
      ? likedIds.filter((x) => x !== id)
      : [...likedIds, id];
    setLikedIds(next);
    saveExploreLikes(next);
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter((x) => x !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(next);
    saveExploreBookmarks(next);
  };

  const toggleActionStep = (articleId: string, stepIdx: number) => {
    const key = `${articleId}-${stepIdx}`;
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section aria-label="Explore & Relax" className="space-y-4">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
            <Compass className="w-4 h-4" />
            <span>Wellness Library &amp; Guided Videos</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
            Explore &amp; Relax
          </h2>
          <p className="text-xs text-[#625F78]">
            Short guided videos and practical reads for mindfulness, sleep, and calm focus.
          </p>
        </div>

        {previewOnly && (
          <Link
            to="/explore"
            className="text-xs font-semibold text-[#5554B8] hover:text-[#4645A7] flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded px-1 py-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Search, Format Tabs & Saved Filter Bar */}
      <div className="flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8E8AA7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles & videos (e.g. sleep, desk, focus)..."
            aria-label="Search wellness articles and videos"
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-[#E8E6F1] rounded-input text-[#25233B] placeholder-[#8E8AA7] focus:outline-none focus:ring-2 focus:ring-[#5554B8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format Filter */}
          <div
            role="group"
            aria-label="Filter by content format"
            className="inline-flex items-center gap-1 p-1 bg-white rounded-input border border-[#E8E6F1]"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'video', label: 'Videos' },
              { id: 'article', label: 'Articles' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSelectedFormat(fmt.id as ExploreFormat | 'all')}
                aria-pressed={selectedFormat === fmt.id}
                className={`px-2.5 py-1 rounded-button text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  selectedFormat === fmt.id
                    ? 'bg-[#5554B8] text-white'
                    : 'text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSavedOnly((prev) => !prev)}
            aria-pressed={savedOnly}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-input border text-xs font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
              savedOnly
                ? 'bg-[#5554B8] text-white border-[#5554B8]'
                : 'bg-white text-[#25233B] border-[#E8E6F1] hover:bg-[#F7F6FB]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-current' : ''}`} />
            <span>Saved ({bookmarkedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="Filter wellness articles by category"
        className="flex flex-wrap items-center gap-1.5"
      >
        <button
          type="button"
          onClick={() => setSelectedCategory('All')}
          aria-pressed={selectedCategory === 'All'}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
            selectedCategory === 'All'
              ? 'bg-[#5554B8] text-white border-[#5554B8]'
              : 'bg-white text-[#625F78] border-[#E8E6F1] hover:text-[#25233B] hover:bg-[#F7F6FB]'
          }`}
        >
          All Categories
        </button>
        {EXPLORE_CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                active
                  ? 'bg-[#5554B8] text-white border-[#5554B8]'
                  : 'bg-white text-[#625F78] border-[#E8E6F1] hover:text-[#25233B] hover:bg-[#F7F6FB]'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Cards Grid or Empty State */}
      {displayedArticles.length === 0 ? (
        <Card padding="lg" className="text-center py-10 space-y-2">
          <Bookmark className="w-6 h-6 text-[#8E8AA7] mx-auto" />
          <h3 className="text-sm font-bold text-[#25233B]">
            {savedOnly
              ? 'No bookmarked content yet'
              : 'No matching articles or videos found'}
          </h3>
          <p className="text-xs text-[#625F78] max-w-sm mx-auto">
            {savedOnly
              ? 'Tap the bookmark icon on any guide or video to save it here for quick access later.'
              : 'Try clearing your search keyword or switching category/format filters.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedArticles.map((article) => {
            const isLiked = likedIds.includes(article.id);
            const isBookmarked = bookmarkedIds.includes(article.id);
            const theme = CATEGORY_THEMES[article.category];
            const isVideo = article.format === 'video';

            return (
              <Card
                key={article.id}
                padding="none"
                hoverable
                onClick={() => setActiveArticle(article)}
                className="flex flex-col justify-between h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* Category Pastel Banner */}
                <div>
                  <div
                    className={`px-4 py-3 border-b border-[#E8E6F1]/70 flex items-center justify-between gap-2 ${theme.bannerGradient}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badgeClass}`}
                    >
                      {theme.icon}
                      <span>{article.category}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/85 text-[#25233B]">
                      {isVideo ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-[#5554B8]" />
                          <span>Video</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 text-[#625F78]" />
                          <span>{article.readTimeMinutes}m read</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-[#25233B] leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-xs text-[#625F78] leading-relaxed">
                      {article.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-[#F0EFF7] flex items-center justify-between gap-2 bg-[#FAFAFD]">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5554B8]">
                    {isVideo ? (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>Watch guide</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Read &amp; practice</span>
                      </>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => toggleLike(article.id, e)}
                      aria-pressed={isLiked}
                      aria-label={isLiked ? `Unlike ${article.title}` : `Like ${article.title}`}
                      className={`p-1.5 rounded-button border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                        isLiked
                          ? 'bg-[#FDEEE9] border-[#F4DCCB] text-[#B24823]'
                          : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(article.id, e)}
                      aria-pressed={isBookmarked}
                      aria-label={
                        isBookmarked
                          ? `Remove bookmark for ${article.title}`
                          : `Bookmark ${article.title}`
                      }
                      className={`p-1.5 rounded-button border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                        isBookmarked
                          ? 'bg-[#E9E7FB] border-[#5554B8]/30 text-[#5554B8]'
                          : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Article / Guided Video Modal (portaled to body above Sidebar) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <Dialog
            isOpen={Boolean(activeArticle)}
            onClose={() => setActiveArticle(null)}
            title={activeArticle?.title || ''}
            description={
              activeArticle
                ? `${activeArticle.category} • ${
                    activeArticle.format === 'video'
                      ? `Guided Video (${activeArticle.videoDurationSeconds || 60}s)`
                      : `${activeArticle.readTimeMinutes} min read`
                  }`
                : undefined
            }
            maxWidth="md"
          >
            {activeArticle && (
              <div className="space-y-4">
                {activeArticle.format === 'video' && (
                  <GuidedVideoPlayer
                    scene={activeArticle.videoScene || 'sunrise'}
                    durationSeconds={activeArticle.videoDurationSeconds || 60}
                    captions={activeArticle.videoCaptions || []}
                  />
                )}

                <div className="space-y-3">
                  {activeArticle.fullArticle.map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-[#25233B] leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Interactive Action Steps Checklist */}
                {activeArticle.actionSteps && activeArticle.actionSteps.length > 0 && (
                  <div className="p-3.5 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5554B8] block">
                      Interactive Practice Steps
                    </span>
                    <div className="space-y-1.5">
                      {activeArticle.actionSteps.map((step, idx) => {
                        const checked = Boolean(checkedSteps[`${activeArticle.id}-${idx}`]);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleActionStep(activeArticle.id, idx)}
                            aria-pressed={checked}
                            className={`w-full text-left p-2 rounded-input border text-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                              checked
                                ? 'bg-[#DCE9DF]/60 border-[#BCD4C3] text-[#245532] line-through'
                                : 'bg-white border-[#E8E6F1] text-[#25233B] hover:bg-[#E9E7FB]/40'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                checked ? 'text-[#245532]' : 'text-[#8E8AA7]'
                              }`}
                            />
                            <span>{step}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E8E6F1]">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={likedIds.includes(activeArticle.id) ? 'secondary' : 'outline'}
                      size="sm"
                      leftIcon={
                        <Heart
                          className={`w-4 h-4 ${
                            likedIds.includes(activeArticle.id) ? 'fill-current text-[#B24823]' : ''
                          }`}
                        />
                      }
                      onClick={() => toggleLike(activeArticle.id)}
                    >
                      {likedIds.includes(activeArticle.id) ? 'Liked' : 'Like'}
                    </Button>

                    <Button
                      variant={bookmarkedIds.includes(activeArticle.id) ? 'secondary' : 'outline'}
                      size="sm"
                      leftIcon={
                        <Bookmark
                          className={`w-4 h-4 ${
                            bookmarkedIds.includes(activeArticle.id)
                              ? 'fill-current text-[#5554B8]'
                              : ''
                          }`}
                        />
                      }
                      onClick={() => toggleBookmark(activeArticle.id)}
                    >
                      {bookmarkedIds.includes(activeArticle.id) ? 'Saved' : 'Bookmark'}
                    </Button>
                  </div>

                  <Button variant="primary" size="sm" onClick={() => setActiveArticle(null)}>
                    Done
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

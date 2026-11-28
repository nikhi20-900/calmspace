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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import {
  EXPLORE_ARTICLES,
  EXPLORE_CATEGORIES,
  ExploreArticle,
  ExploreCategory,
} from '../../data/wellnessContent';
import {
  loadExploreBookmarks,
  loadExploreLikes,
  saveExploreBookmarks,
  saveExploreLikes,
} from '../../utils/wellnessStorage';

const CATEGORY_ICONS: Record<ExploreCategory, React.ReactNode> = {
  Mindfulness: <Wind className="w-4 h-4 text-[#5554B8]" />,
  'Stress Management': <Sparkles className="w-4 h-4 text-[#7A4D05]" />,
  Sleep: <Moon className="w-4 h-4 text-[#245532]" />,
  'Self-Care': <Coffee className="w-4 h-4 text-[#8C4A27]" />,
  Motivation: <Sun className="w-4 h-4 text-[#5554B8]" />,
  'Mental Wellness': <Brain className="w-4 h-4 text-[#5554B8]" />,
};

export interface ExploreRelaxSectionProps {
  previewOnly?: boolean;
}

export const ExploreRelaxSection: React.FC<ExploreRelaxSectionProps> = ({
  previewOnly = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>(() => loadExploreLikes());
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => loadExploreBookmarks());
  const [activeArticle, setActiveArticle] = useState<ExploreArticle | null>(null);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXPLORE_ARTICLES.filter((article) => {
      if (selectedCategory !== 'All' && article.category !== selectedCategory) {
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
  }, [selectedCategory, savedOnly, bookmarkedIds, searchQuery]);

  const displayedArticles =
    previewOnly && selectedCategory === 'All' && !savedOnly && !searchQuery.trim()
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

  return (
    <section aria-label="Explore & Relax" className="space-y-4">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
            <Compass className="w-4 h-4" />
            <span>Wellness Library</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
            Explore &amp; Relax
          </h2>
          <p className="text-xs text-[#625F78]">
            Short, practical reads for mindfulness, sleep, and calm focus.
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

      {/* Search & Saved Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8E8AA7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or keyword (e.g. sleep, exam, focus)..."
            aria-label="Search wellness articles"
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-[#E8E6F1] rounded-input text-[#25233B] placeholder-[#8E8AA7] focus:outline-none focus:ring-2 focus:ring-[#5554B8]"
          />
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
          All
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
              ? 'No bookmarked articles yet'
              : 'No matching articles found'}
          </h3>
          <p className="text-xs text-[#625F78] max-w-sm mx-auto">
            {savedOnly
              ? 'Tap the bookmark icon on any article to save it here for quick reading later.'
              : 'Try clearing your search keyword or selecting another category.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedArticles.map((article) => {
            const isLiked = likedIds.includes(article.id);
            const isBookmarked = bookmarkedIds.includes(article.id);
            return (
              <Card
                key={article.id}
                padding="md"
                hoverable
                onClick={() => setActiveArticle(article)}
                className="flex flex-col justify-between gap-3 h-full"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F6FB] text-[#5554B8] border border-[#E8E6F1]">
                      {CATEGORY_ICONS[article.category]}
                      <span>{article.category}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#625F78]">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTimeMinutes} min</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#25233B] leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-[#625F78] leading-relaxed">
                    {article.shortDescription}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#F0EFF7] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#5554B8]">
                    Read article
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
                        isBookmarked ? `Remove bookmark for ${article.title}` : `Bookmark ${article.title}`
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

      {/* Full Article Modal (portaled to body so it centers above Sidebar) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <Dialog
            isOpen={Boolean(activeArticle)}
            onClose={() => setActiveArticle(null)}
            title={activeArticle?.title || ''}
            description={
              activeArticle
                ? `${activeArticle.category} • ${activeArticle.readTimeMinutes} min read`
                : undefined
            }
            maxWidth="md"
          >
            {activeArticle && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {activeArticle.fullArticle.map((paragraph, idx) => (
                    <p key={idx} className="text-sm text-[#25233B] leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

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
                            bookmarkedIds.includes(activeArticle.id) ? 'fill-current text-[#5554B8]' : ''
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

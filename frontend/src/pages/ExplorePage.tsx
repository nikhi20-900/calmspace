import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ExploreRelaxSection } from '../components/wellness/ExploreRelaxSection';

export const ExplorePage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5554B8] hover:text-[#4645A7] mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
        <PageHeader
          tag="Wellness Library"
          title="Explore & Relax"
          description="Browse short, supportive guides for mindfulness, stress management, sleep, and gentle motivation."
        />
      </div>

      <ExploreRelaxSection previewOnly={false} />
    </div>
  );
};

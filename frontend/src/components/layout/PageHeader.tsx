import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  tag?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  tag,
  action,
}) => {
  return (
    <header className="mb-6 sm:mb-8">
      {tag && (
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#5554B8] bg-[#E9E7FB] px-2.5 py-1 rounded-full mb-2">
          {tag}
        </span>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#25233B] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-[#625F78] mt-1 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
};

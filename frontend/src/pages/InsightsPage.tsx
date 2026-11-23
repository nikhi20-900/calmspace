import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { InsightSummary } from '../types';
import { Smile, Moon, Activity, Info, Calendar } from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightSummary | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      try {
        const data = await api.getInsights(days);
        setInsights(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [days]);

  if (loading) {
    return <LoadingState message="Compiling your personal insights..." />;
  }

  const hasData = insights && insights.check_in_count > 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          tag="Personal Wellbeing Analytics"
          title="Understanding your rhythm"
          description="Reflective patterns over time. Never medical diagnoses — strictly supportive observations."
        />

        {/* Time-Range Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-button border border-[#E8E6F1] shadow-subtle shrink-0">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-button transition-colors ${
                days === d
                  ? 'bg-[#5554B8] text-white shadow-xs'
                  : 'text-[#625F78] hover:text-[#25233B]'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <Card padding="lg" className="text-center py-12">
          <Calendar className="w-10 h-10 text-[#5554B8] mx-auto mb-3 opacity-60" />
          <h2 className="text-base font-bold text-[#25233B]">
            No check-in entries in this period.
          </h2>
          <p className="text-xs text-[#625F78] mt-1 max-w-sm mx-auto">
            Take a moment to submit your daily check-in to start mapping your mood, sleep, and stress cycles.
          </p>
        </Card>
      ) : (
        <>
          {/* Plain Language Summary Alert */}
          <div className="p-4 rounded-card bg-[#F2F1FD] border border-[#D9D5F4] flex items-start gap-3">
            <Info className="w-5 h-5 text-[#5554B8] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5554B8]">
                Accessible Plain-Language Summary
              </h2>
              <p className="text-sm text-[#25233B] mt-0.5 leading-relaxed font-normal">
                {insights.plain_summary}
              </p>
            </div>
          </div>

          {/* Metric 1: Mood Trend Chart */}
          <Card padding="lg" className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E9E7FB] flex items-center justify-center text-[#5554B8]">
                <Smile className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#25233B]">
                  Mood Evolution (1 to 5)
                </h3>
                <p className="text-xs text-[#625F78]">
                  Higher indicates content and balanced headspace. Average: {insights.average_mood} / 5
                </p>
              </div>
            </div>

            <div className="h-56 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={insights.mood_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                  <XAxis dataKey="day" stroke="#8E8AA7" fontSize={11} tickLine={false} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#8E8AA7" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E8E6F1',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    name="Mood Score"
                    stroke="#5554B8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#5554B8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Metric 2 & 3: Sleep & Stress in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sleep Rest Chart */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DCE9DF] flex items-center justify-center text-[#245532]">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#25233B]">
                    Sleep Duration (Hours)
                  </h3>
                  <p className="text-xs text-[#625F78]">
                    Average: {insights.average_sleep} hrs logged nightly
                  </p>
                </div>
              </div>

              <div className="h-48 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.sleep_trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                    <XAxis dataKey="day" stroke="#8E8AA7" fontSize={11} tickLine={false} />
                    <YAxis stroke="#8E8AA7" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E8E6F1',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="sleep" name="Hours Slept" fill="#245532" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stress Trend Chart */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F6E6CC] flex items-center justify-center text-[#7A4D05]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#25233B]">
                    Academic Stress Load (1 to 5)
                  </h3>
                  <p className="text-xs text-[#625F78]">
                    Average: {insights.average_stress} / 5
                  </p>
                </div>
              </div>

              <div className="h-48 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.stress_trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFF7" />
                    <XAxis dataKey="day" stroke="#8E8AA7" fontSize={11} tickLine={false} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#8E8AA7" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E8E6F1',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(91,91,214,0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      name="Stress Rating"
                      stroke="#7A4D05"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#7A4D05' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Screen Reader Accessible Data Table */}
          <div className="mt-6 bg-white p-4 rounded-card border border-[#E8E6F1]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#625F78] mb-2">
              Accessible Table Data (Screen-Reader Optimized)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#25233B]">
                <thead className="border-b border-[#E8E6F1] text-[#625F78]">
                  <tr>
                    <th className="py-2">Entry Label</th>
                    <th className="py-2">Mood (1-5)</th>
                    <th className="py-2">Sleep (hrs)</th>
                    <th className="py-2">Stress (1-5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFF7]">
                  {insights.mood_trend.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium">{item.day}</td>
                      <td className="py-2">{item.mood} / 5</td>
                      <td className="py-2">{insights.sleep_trend[idx]?.sleep ?? '—'} hrs</td>
                      <td className="py-2">{insights.stress_trend[idx]?.stress ?? '—'} / 5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

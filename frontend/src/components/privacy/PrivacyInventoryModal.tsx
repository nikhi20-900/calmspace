import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  EyeOff,
  Database,
  Lock,
  Sparkles,
  Trash2,
  Clock,
  CheckCircle2,
  Info,
  Server,
  KeyRound,
} from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export interface PrivacyInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InventoryRecord {
  field: string;
  table: string;
  type: string;
  purpose: string;
  storedOnServer: boolean;
  accessScope: string;
  retention: string;
  isTransient?: boolean;
}

const INVENTORY_DATA: InventoryRecord[] = [
  {
    field: 'session_id',
    table: 'checkins, tasks, user_settings',
    type: 'Text (Client Session ID)',
    purpose: 'Anonymous session partition key (X-Session-ID)',
    storedOnServer: true,
    accessScope: 'Client & Server (WHERE session_id = ?)',
    retention: 'Deleted when all check-ins, tasks, and settings are purged',
  },
  {
    field: 'mood',
    table: 'checkins',
    type: 'Integer (1–5)',
    purpose: 'Daily mood tracking & trend graphs',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'stress',
    table: 'checkins',
    type: 'Integer (1–5)',
    purpose: 'Stress load tracking & safety evaluation',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'sleep_hours',
    table: 'checkins',
    type: 'Float (0.0–24.0)',
    purpose: 'Rest tracking & restorative sleep insights',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'route',
    table: 'checkins',
    type: "Enum ('LOW', 'MEDIUM', 'HIGH')",
    purpose: 'Deterministic safety classification',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'reflection',
    table: 'N/A (Transient)',
    type: 'Text (<= 2,000 chars)',
    purpose: 'Crisis keyword detection & opt-in AI guidance',
    storedOnServer: false,
    accessScope: 'Volatile request scope only',
    retention: 'NEVER PERSISTED. Not saved to DB, logs, or disk',
    isTransient: true,
  },
  {
    field: 'title, category, estimated_minutes',
    table: 'tasks',
    type: 'Text, Integer',
    purpose: 'Study planner task management',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Until deleted by student or purged in Settings',
  },
  {
    field: 'completed',
    table: 'tasks',
    type: 'Integer (Boolean)',
    purpose: 'Task completion indicator',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Until task or session is deleted',
  },
  {
    field: 'nickname',
    table: 'user_settings',
    type: 'Text (1–60 chars)',
    purpose: 'Friendly dashboard greeting (non-identifying)',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Until updated or session is deleted',
  },
  {
    field: 'break_reminders_enabled, reminder_interval_minutes',
    table: 'user_settings',
    type: 'Boolean, Integer (5–240)',
    purpose: 'In-app study pacing break preferences',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Until updated or session is deleted',
  },
  {
    field: 'share_anonymous_analytics',
    table: 'user_settings',
    type: 'Boolean (default false)',
    purpose: 'Opt-in anonymous trend preference',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Until updated or session is deleted',
  },
  {
    field: 'data_retention_days, planner_seeded',
    table: 'user_settings',
    type: 'Integer (14/30/60/90), Boolean',
    purpose: 'Rolling retention window & one-time starter task flag',
    storedOnServer: true,
    accessScope: 'Session-scoped (unauthenticated MVP key)',
    retention: 'Default 30 days; purged on full data deletion',
  },
];

type TabType = 'matrix' | 'never-stored' | 'ai-safety' | 'retention-deletion';

export const PrivacyInventoryModal: React.FC<PrivacyInventoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('matrix');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'matrix', label: 'Data Inventory Matrix', icon: Database },
    { id: 'never-stored', label: 'What We Never Store', icon: EyeOff },
    { id: 'ai-safety', label: 'AI & Safety Routing', icon: Sparkles },
    { id: 'retention-deletion', label: 'Retention & Deletion', icon: Clock },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = tabs.length - 1;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      setActiveTab(tabs[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Calmspace Privacy & Data Inventory"
      description="Field-by-field disclosure of all data collected, ephemeral processing lifecycles, and session-scoped storage."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Guiding Principle Banner */}
        <div className="p-3.5 rounded-card bg-[var(--color-primary-subtle)] border border-[var(--color-lavender-border)] flex items-center gap-2.5 text-sm text-[var(--color-text-main)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          <span>
            <strong>Our Guiding Principle:</strong> &ldquo;Rules decide safety. AI writes the language. Humans help. Privacy by default.&rdquo;
          </span>
        </div>

        {/* Tab Navigation with WAI-ARIA Arrow Key Support */}
        <div
          role="tablist"
          aria-label="Privacy disclosures sections"
          className="flex border-b border-[var(--color-border)] gap-1 overflow-x-auto pb-1"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isSelected
                    ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-lavender-soft)]/50'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Field-by-Field Inventory Matrix */}
        {activeTab === 'matrix' && (
          <div
            role="tabpanel"
            id="tabpanel-matrix"
            aria-labelledby="tab-matrix"
            tabIndex={0}
            className="space-y-3 focus:outline-none"
          >
            <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
              <span>Field-by-field storage and retention policies:</span>
              <span className="font-medium text-[var(--color-sage-text)] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 12 documented fields
              </span>
            </div>

            <div className="border border-[var(--color-border)] rounded-card overflow-hidden bg-[var(--color-surface)] shadow-xs max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[var(--color-surface-subtle)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--color-text-main)]">Field</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--color-text-main)]">Entity / Table</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--color-text-main)]">Purpose</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--color-text-main)]">Stored?</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--color-text-main)]">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {INVENTORY_DATA.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.isTransient
                          ? 'bg-[var(--color-sage-light)] font-medium'
                          : 'hover:bg-[var(--color-surface-subtle)] transition-colors'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono text-xs text-[var(--color-text-main)]">
                        {item.field}
                        {item.isTransient && (
                          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--color-sage-soft)] text-[var(--color-sage-text)]">
                            TRANSIENT ONLY
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-secondary)] font-mono text-xs">
                        {item.table}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
                        {item.purpose}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.storedOnServer ? (
                          <span className="inline-flex items-center gap-1 text-[var(--color-primary)] font-semibold text-xs">
                            <Server className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[var(--color-sage-text)] font-bold text-xs">
                            <EyeOff className="w-3.5 h-3.5 text-[var(--color-sage-text)]" /> NEVER
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-secondary)] text-xs">
                        {item.retention}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic">
              * Note: Check-in records strictly contain mood, stress, sleep, and triage route. No free-text reflections are persisted.
            </p>
          </div>
        )}

        {/* Tab 2: What We NEVER Store */}
        {activeTab === 'never-stored' && (
          <div
            role="tabpanel"
            id="tabpanel-never-stored"
            aria-labelledby="tab-never-stored"
            tabIndex={0}
            className="space-y-3.5 focus:outline-none"
          >
            <div className="p-4 rounded-card bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-sage-text)] uppercase tracking-wider">
                <EyeOff className="w-4 h-4" />
                <span>Strict Non-Persistence Guarantees</span>
              </div>
              <ul className="text-sm text-[var(--color-text-secondary)] space-y-3 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-sage-text)] mt-2 shrink-0" />
                  <div>
                    <strong className="text-[var(--color-text-main)]">Zero Reflection Persistence:</strong> Written reflections are never written to any database, file system, or persistent log. They reside exclusively in transient memory during request processing and are freed by runtime garbage collection immediately after the response is sent.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-sage-text)] mt-2 shrink-0" />
                  <div>
                    <strong className="text-[var(--color-text-main)]">Zero Personal Identifiers:</strong> We do not collect student IDs, university email addresses, real names, phone numbers, or IP addresses. Your browser uses a local anonymous session identifier to partition records.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-sage-text)] mt-2 shrink-0" />
                  <div>
                    <strong className="text-[var(--color-text-main)]">No Medical Profiling or Clinical Diagnoses:</strong> Calmspace does not generate clinical diagnoses, ICD/DSM codes, or permanent psychiatric records. Data is never shared with health insurers, hospital systems, or university disciplinary bodies.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-sage-text)] mt-2 shrink-0" />
                  <div>
                    <strong className="text-[var(--color-text-main)]">No Third-Party Ad Trackers or Data Brokers:</strong> We do not include marketing analytics, cross-site trackers, Facebook pixels, or data broker cookies.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: AI Guidance & Safety Routing */}
        {activeTab === 'ai-safety' && (
          <div
            role="tabpanel"
            id="tabpanel-ai-safety"
            aria-labelledby="tab-ai-safety"
            tabIndex={0}
            className="space-y-3.5 focus:outline-none"
          >
            <div className="p-4 rounded-card bg-[#FAF9FD] border border-[var(--color-border)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Explicit Consent & Deterministic Safety Rules</span>
              </div>

              <div className="space-y-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-1">
                    1. Deterministic Local Safety Rules Come First
                  </strong>
                  Before any AI language model is ever invoked, your inputs and reflection are analyzed by deterministic, rule-based safety checks to detect crisis or distress indicators. Safety evaluations are not left to unpredictable LLM outputs.
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-1">
                    2. High-Risk / Crisis AI Bypass (Zero-Call Guarantee)
                  </strong>
                  If a check-in is evaluated as HIGH risk or detects crisis signals, external AI generation is strictly bypassed (0 API calls are made). Immediate, verified human emergency contacts (like Tele-MANAS 14416 and 112) are displayed directly.
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-1">
                    3. Point-of-Collection Opt-In (Default: OFF)
                  </strong>
                  AI-assisted supportive messages are completely optional. The consent checkbox is unchecked by default on every check-in. If you do not check it, your reflection is never sent to external AI providers.
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <strong className="text-[var(--color-text-main)] block mb-1">
                    4. Ephemeral Cloud Provider Gateway
                  </strong>
                  When you explicitly opt in on Low/Medium routes, your reflection is transmitted over TLS to Google Gemini solely to generate real-time compassionate guidance. It is not saved in Calmspace databases and is discarded immediately after generation.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Retention, Isolation & Erasure */}
        {activeTab === 'retention-deletion' && (
          <div
            role="tabpanel"
            id="tabpanel-retention-deletion"
            aria-labelledby="tab-retention-deletion"
            tabIndex={0}
            className="space-y-3.5 focus:outline-none"
          >
            <div className="p-4 rounded-card bg-[#FAF9FD] border border-[var(--color-border)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Session Isolation & Destruction Controls</span>
              </div>

              <div className="space-y-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--color-text-main)] mb-1">
                    <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Anonymous Session Scoping</span>
                  </div>
                  <p>
                    All stored check-ins, study planner tasks, and settings are partitioned by your browser-generated anonymous session ID. Every database query enforces{' '}
                    <code className="px-1.5 py-0.5 bg-[var(--color-bg)] rounded text-[var(--color-primary)]">
                      WHERE session_id = ?
                    </code>
                    . Because Calmspace uses anonymous browser tokens rather than user accounts or passwords, keep your device and session ID private.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--color-text-main)] mb-1">
                    <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Configurable Rolling Retention (14, 30, 60, 90 Days)</span>
                  </div>
                  <p>
                    You can set your preferred rolling retention window in Settings (default 30 days). Historical entries outside this window are slated for automated cleanup.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-red-200">
                  <div className="flex items-center gap-2 font-semibold text-red-700 mb-1">
                    <Trash2 className="w-4 h-4" />
                    <span>Immediate Permanent Erasure (&ldquo;Delete All My Data&rdquo;)</span>
                  </div>
                  <p>
                    In Settings, you can trigger irreversible two-step deletion. This permanently deletes your check-in history, study tasks, and settings from database tables and clears your active local check-in cache.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 font-semibold text-[var(--color-text-main)] mb-1">
                    <Info className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Opt-In Aggregated Analytics</span>
                  </div>
                  <p>
                    Sharing aggregated anonymous trends to help campus wellbeing initiatives is disabled by default and requires explicit opt-in in Settings. When disabled, zero aggregate analytics queries include your metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-[var(--color-sage-text)]" />
            <span>Authoritative source: docs/privacy_data_inventory.md</span>
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Inventory
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

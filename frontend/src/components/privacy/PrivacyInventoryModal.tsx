import React, { useState } from 'react';
import {
  ShieldCheck,
  EyeOff,
  Database,
  Lock,
  Sparkles,
  Trash2,
  AlertTriangle,
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
    table: 'anonymous_sessions',
    type: 'UUIDv4',
    purpose: 'Anonymous session partition key',
    storedOnServer: true,
    accessScope: 'Client & Server',
    retention: 'Inactivity expiry (60d or 90d lifecycle)',
  },
  {
    field: 'token_hash',
    table: 'anonymous_sessions',
    type: 'VARCHAR(64)',
    purpose: 'Verifies Bearer secret credential',
    storedOnServer: true,
    accessScope: 'Server internal (one-way hashed)',
    retention: 'Deleted/revoked upon session purge or expiry',
  },
  {
    field: 'mood',
    table: 'check_ins',
    type: 'Integer (1–5)',
    purpose: 'Daily mood tracking & trend graphs',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'stress',
    table: 'check_ins',
    type: 'Integer (1–5)',
    purpose: 'Stress load tracking & safety evaluation',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'sleep_hours',
    table: 'check_ins',
    type: 'Float (0.0–24.0)',
    purpose: 'Rest tracking & restorative sleep insights',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'route',
    table: 'check_ins',
    type: "Enum ('LOW', 'MEDIUM', 'HIGH')",
    purpose: 'Deterministic safety classification',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Rolling retention (14, 30, 60, or 90 days; default 30d)',
  },
  {
    field: 'reflection',
    table: 'N/A (Transient)',
    type: 'Text (≤ 2,000 chars)',
    purpose: 'Crisis keyword detection & opt-in AI guidance',
    storedOnServer: false,
    accessScope: 'Volatile request scope only',
    retention: 'NEVER PERSISTED. Not saved to DB, logs, or disk',
    isTransient: true,
  },
  {
    field: 'title, category, estimated_minutes',
    table: 'study_tasks',
    type: 'String, Integer',
    purpose: 'Study planner task management',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Until checked off, expired, or deleted by student',
  },
  {
    field: 'completed',
    table: 'study_tasks',
    type: 'Boolean',
    purpose: 'Task completion indicator',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Until task or session is deleted',
  },
  {
    field: 'nickname',
    table: 'user_settings',
    type: 'String (≤ 60 chars)',
    purpose: 'Friendly dashboard greeting (non-identifying)',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Until updated or session is deleted',
  },
  {
    field: 'break_reminders_enabled',
    table: 'user_settings',
    type: 'Boolean',
    purpose: 'In-app study pacing break toggle',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Until updated or session is deleted',
  },
  {
    field: 'data_retention_days',
    table: 'user_settings',
    type: 'Integer (14, 30, 60, 90)',
    purpose: 'Student-chosen rolling retention window',
    storedOnServer: true,
    accessScope: 'Authenticated session only',
    retention: 'Default 30 days (choices: 14, 30, 60, 90 days)',
  },
];

type TabType = 'matrix' | 'never-stored' | 'ai-safety' | 'retention-deletion';

export const PrivacyInventoryModal: React.FC<PrivacyInventoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('matrix');

  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'matrix', label: 'Data Inventory Matrix', icon: Database },
    { id: 'never-stored', label: 'What We Never Store', icon: EyeOff },
    { id: 'ai-safety', label: 'AI & Safety Routing', icon: Sparkles },
    { id: 'retention-deletion', label: 'Retention & Deletion', icon: Clock },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Calmspace Privacy & Data Inventory"
      description="Field-by-field disclosure of all data collected, ephemeral processing lifecycles, and cryptographic isolation."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Guiding Principle Banner */}
        <div className="p-3 rounded-card bg-[#F0EFFC] border border-[#D5D1E5] flex items-center gap-2.5 text-xs text-[#25233B]">
          <ShieldCheck className="w-4 h-4 text-[#5554B8] shrink-0" />
          <span>
            <strong>Our Guiding Principle:</strong> &ldquo;Rules decide safety. AI writes the language. Humans help. Privacy by default.&rdquo;
          </span>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Privacy disclosures sections"
          className="flex border-b border-[#E8E6F1] gap-1 overflow-x-auto pb-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  isSelected
                    ? 'border-b-2 border-[#5554B8] text-[#5554B8] bg-[#E9E7FB]/50'
                    : 'text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
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
            <div className="flex items-center justify-between text-xs text-[#625F78]">
              <span>Field-by-field storage and retention policies:</span>
              <span className="font-medium text-[#245532] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 12 documented fields
              </span>
            </div>

            {/* Scrollable Table View */}
            <div className="border border-[#E8E6F1] rounded-card overflow-hidden bg-white shadow-xs max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF9FD] sticky top-0 z-10 border-b border-[#E8E6F1]">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[#25233B]">Field</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[#25233B]">Entity / Table</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[#25233B]">Purpose</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[#25233B]">Stored?</th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-[#25233B]">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6F1]/70">
                  {INVENTORY_DATA.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.isTransient
                          ? 'bg-[#EAF5ED]/60 font-medium'
                          : 'hover:bg-[#FAF9FD] transition-colors'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#25233B]">
                        {item.field}
                        {item.isTransient && (
                          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DCE9DF] text-[#245532]">
                            TRANSIENT ONLY
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#625F78] font-mono text-[11px]">
                        {item.table}
                      </td>
                      <td className="py-2.5 px-3 text-[#625F78] max-w-xs leading-relaxed">
                        {item.purpose}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.storedOnServer ? (
                          <span className="inline-flex items-center gap-1 text-[#5554B8] font-semibold text-[11px]">
                            <Server className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#245532] font-bold text-[11px]">
                            <EyeOff className="w-3 h-3 text-[#245532]" /> NEVER
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#625F78] text-[11px]">
                        {item.retention}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-[#625F78] leading-relaxed italic">
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
            <div className="p-4 rounded-card bg-[#FAF9FD] border border-[#E8E6F1] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#245532] uppercase tracking-wider">
                <EyeOff className="w-4 h-4" />
                <span>Strict Non-Persistence Guarantees</span>
              </div>
              <ul className="text-xs text-[#625F78] space-y-3 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#245532] mt-1 shrink-0" />
                  <div>
                    <strong className="text-[#25233B]">Zero Reflection Persistence:</strong> Written reflections are never written to any database, file system, or persistent log. They reside exclusively in transient memory during request processing and are freed by runtime garbage collection immediately after the response is sent.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#245532] mt-1 shrink-0" />
                  <div>
                    <strong className="text-[#25233B]">Zero Personal Identifiers:</strong> We do not collect student IDs, university email addresses, real names, phone numbers, or IP addresses. You are known only by an anonymous cryptographic token.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#245532] mt-1 shrink-0" />
                  <div>
                    <strong className="text-[#25233B]">No Medical Profiling or Clinical Diagnoses:</strong> Calmspace does not generate clinical diagnoses, ICD/DSM codes, or permanent psychiatric records. Data is never shared with health insurers, hospital systems, or university disciplinary bodies.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#245532] mt-1 shrink-0" />
                  <div>
                    <strong className="text-[#25233B]">No Third-Party Ad Trackers or Data Brokers:</strong> We do not include marketing analytics, cross-site trackers, Facebook pixels, or data broker cookies.
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
            <div className="p-4 rounded-card bg-[#FAF9FD] border border-[#E8E6F1] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5554B8] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Explicit Consent & Deterministic Safety Rules</span>
              </div>

              <div className="space-y-3 text-xs text-[#625F78] leading-relaxed">
                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <strong className="text-[#25233B] block mb-1">
                    1. Deterministic Local Safety Rules Come First
                  </strong>
                  Before any AI language model is ever invoked, your inputs and reflection are analyzed by deterministic, rule-based safety checks to detect crisis or distress indicators. Safety evaluations are not left to unpredictable LLM outputs.
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <strong className="text-[#25233B] block mb-1">
                    2. High-Risk / Crisis AI Bypass (Zero-Call Guarantee)
                  </strong>
                  If a check-in is evaluated as HIGH risk or detects crisis signals, external AI generation is strictly bypassed (0 API calls are made). Immediate, verified human emergency contacts (like Tele-MANAS 14416 and 112) are displayed directly.
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <strong className="text-[#25233B] block mb-1">
                    3. Point-of-Collection Opt-In (Default: OFF)
                  </strong>
                  AI-assisted supportive messages are completely optional. The consent checkbox is unchecked by default on every check-in. If you do not check it, your reflection is never sent to external AI providers.
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <strong className="text-[#25233B] block mb-1">
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
            <div className="p-4 rounded-card bg-[#FAF9FD] border border-[#E8E6F1] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5554B8] uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Session Isolation & Destruction Controls</span>
              </div>

              <div className="space-y-3 text-xs text-[#625F78] leading-relaxed">
                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <div className="flex items-center gap-2 font-semibold text-[#25233B] mb-1">
                    <KeyRound className="w-4 h-4 text-[#5554B8]" />
                    <span>Cryptographic Session Scoping</span>
                  </div>
                  <p>
                    All stored check-ins, study planner tasks, and settings are strictly partitioned by your anonymous session UUID. Every database query enforces <code className="px-1 py-0.5 bg-[#F7F6FB] rounded text-[#5554B8]">WHERE session_id = ?</code>. No user can view or alter another user&rsquo;s entries.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <div className="flex items-center gap-2 font-semibold text-[#25233B] mb-1">
                    <Clock className="w-4 h-4 text-[#5554B8]" />
                    <span>Configurable Rolling Retention (14, 30, 60, 90 Days)</span>
                  </div>
                  <p>
                    You can set your preferred rolling retention window in Settings (default 30 days). Historical entries outside this window are slated for automated cleanup.
                  </p>
                  <p className="mt-1 text-[11px] text-[#7A4D05] bg-[#FDF8F0] p-2 rounded border border-[#E8CEA5]">
                    ℹ️ <strong>Stage 1 Status:</strong> Retention preferences are persisted to your user profile. Automated background pruning is scheduled for the Stage 2 rollout.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-red-200">
                  <div className="flex items-center gap-2 font-semibold text-red-700 mb-1">
                    <Trash2 className="w-4 h-4" />
                    <span>Immediate Permanent Erasure (&ldquo;Delete All My Data&rdquo;)</span>
                  </div>
                  <p>
                    In Settings, you can trigger irreversible two-step deletion. This permanently deletes your check-in history, study tasks, and settings from database tables and invalidates your session credentials immediately.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#E8E6F1]">
                  <div className="flex items-center gap-2 font-semibold text-[#25233B] mb-1">
                    <Info className="w-4 h-4 text-[#5554B8]" />
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
        <div className="pt-3 border-t border-[#E8E6F1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#625F78]">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#245532]" />
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

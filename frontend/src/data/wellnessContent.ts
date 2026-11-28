export type HighlightCategory =
  | 'Daily Affirmation'
  | 'Mindful Reminder'
  | 'Self-Care Tip'
  | 'Gratitude Prompt'
  | 'Mental Wellness Fact';

export interface DailyHighlightItem {
  id: string;
  title: string;
  shortDescription: string;
  fullContent: string;
  category: HighlightCategory;
}

export type ExploreCategory =
  | 'Mindfulness'
  | 'Stress Management'
  | 'Sleep'
  | 'Self-Care'
  | 'Motivation'
  | 'Mental Wellness';

export const EXPLORE_CATEGORIES: readonly ExploreCategory[] = [
  'Mindfulness',
  'Stress Management',
  'Sleep',
  'Self-Care',
  'Motivation',
  'Mental Wellness',
];

export type ExploreFormat = 'article' | 'video';

export interface ExploreArticle {
  id: string;
  title: string;
  category: ExploreCategory;
  format: ExploreFormat;
  shortDescription: string;
  fullArticle: string[];
  actionSteps?: string[];
  videoDurationSeconds?: number;
  videoScene?: 'waves' | 'sunrise' | 'nightfall' | 'breath';
  videoCaptions?: Array<{ timeSec: number; text: string }>;
  readTimeMinutes: number;
  keywords: string[];
}

export interface DailyChallengeItem {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  isWritingChallenge: boolean;
  promptPlaceholder?: string;
}

export interface SoundTrack {
  id: 'meditation' | 'ocean' | 'night';
  title: string;
  description: string;
  audioUrl: string;
}

const DAILY_HIGHLIGHT_POOL: readonly DailyHighlightItem[] = [
  {
    id: 'hl-affirmation-1',
    title: 'Steady Progress Counts',
    shortDescription: 'You do not need to finish everything today to be worthy of rest.',
    fullContent:
      'Academic seasons often make productivity feel like the only measure of a day. Remind yourself that resting between study blocks is part of learning, not a detour from it. Even small, unhurried steps forward matter.',
    category: 'Daily Affirmation',
  },
  {
    id: 'hl-mindful-1',
    title: 'Notice Your Shoulders',
    shortDescription: 'Pause for ten seconds and let your shoulders drop away from your ears.',
    fullContent:
      'When we concentrate on screens or lecture notes, tension quietly gathers in the jaw, neck, and shoulders. Take one slow breath, unclench your jaw, and let your shoulders settle downward.',
    category: 'Mindful Reminder',
  },
  {
    id: 'hl-selfcare-1',
    title: 'Hydrate Between Chapters',
    shortDescription: 'A glass of water and two minutes away from your desk can reset focus.',
    fullContent:
      'Mild dehydration quietly amplifies fatigue and irritability. Keep a water bottle beside your study space and take a brief stretch whenever you finish a section or problem set.',
    category: 'Self-Care Tip',
  },
  {
    id: 'hl-gratitude-1',
    title: 'One Quietly Good Thing',
    shortDescription: 'Name one small moment from the last 24 hours that felt comforting.',
    fullContent:
      'Gratitude does not require ignoring hard days. It simply invites your attention to notice one steady anchor—a warm drink, a supportive text, or a moment of quiet before class.',
    category: 'Gratitude Prompt',
  },
  {
    id: 'hl-fact-1',
    title: 'Slow Exhales Calm the Vagus Nerve',
    shortDescription: 'Steady, unhurried breathing signals your nervous system that you are safe.',
    fullContent:
      'Rhythmic breathing—such as inhaling for 4 seconds, holding for 4, and exhaling for 4—helps shift your body out of high-alert stress mode and into a calmer baseline.',
    category: 'Mental Wellness Fact',
  },
  {
    id: 'hl-affirmation-2',
    title: 'Learning Takes Time',
    shortDescription: 'Struggling with a concept means you are stretching, not failing.',
    fullContent:
      'Every complex skill feels awkward before it feels familiar. Treat yourself with the same patience you would offer a close friend who is learning something new.',
    category: 'Daily Affirmation',
  },
  {
    id: 'hl-mindful-2',
    title: 'Look Toward the Horizon',
    shortDescription: 'Rest your eyes on something 20 feet away for 20 seconds.',
    fullContent:
      'Close-up screen focus strains both your eyes and your mental energy. Looking out a window or across a room gives your visual system a gentle micro-break.',
    category: 'Mindful Reminder',
  },
  {
    id: 'hl-selfcare-2',
    title: 'Protect Your Wind-Down Hour',
    shortDescription: 'Dim bright screens 30 minutes before sleep to cue natural rest.',
    fullContent:
      'Creating a gentle transition between studying and sleeping—like tidying your desk or listening to rain sounds—helps your mind stop rehearsing tomorrow’s to-do list.',
    category: 'Self-Care Tip',
  },
];

/**
 * Returns 5 daily highlights rotated deterministically by the local calendar date
 * so each day surfaces a fresh, balanced set across all 5 categories.
 */
export function getDailyHighlightsForDate(dateKey: string): DailyHighlightItem[] {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    seed = (seed * 31 + dateKey.charCodeAt(i)) % 100000;
  }

  const categories: HighlightCategory[] = [
    'Daily Affirmation',
    'Mindful Reminder',
    'Self-Care Tip',
    'Gratitude Prompt',
    'Mental Wellness Fact',
  ];

  const selected: DailyHighlightItem[] = [];
  for (let idx = 0; idx < categories.length; idx += 1) {
    const matches = DAILY_HIGHLIGHT_POOL.filter((item) => item.category === categories[idx]);
    if (matches.length > 0) {
      const pick = matches[(seed + idx) % matches.length];
      selected.push(pick);
    }
  }
  return selected;
}

export const EXPLORE_ARTICLES: readonly ExploreArticle[] = [
  {
    id: 'exp-mindful-grounding',
    title: 'The 5-4-3-2-1 Grounding Reset',
    category: 'Mindfulness',
    format: 'article',
    shortDescription: 'A gentle sensory anchor when your thoughts feel scattered before an exam.',
    readTimeMinutes: 3,
    keywords: ['grounding', 'exam', 'focus', 'sensory', 'present'],
    actionSteps: [
      'Name 5 calm things you can see in your room',
      'Notice 4 physical textures you can touch right now',
      'Listen for 3 quiet sounds around you',
      'Take 1 slow, unhurried breath',
    ],
    fullArticle: [
      'When your mind races ahead to upcoming deadlines, gently bring your attention back to the room you are sitting in right now.',
      'Notice 5 things you can see, 4 things you can physically feel (like your feet on the floor or the texture of your desk), 3 things you can hear, 2 things you can smell, and 1 slow breath.',
      'You do not need to force your thoughts to stop—simply give your senses something steady to rest on for sixty seconds.',
    ],
  },
  {
    id: 'exp-video-desk-reset',
    title: '2-Minute Guided Desk De-Stress',
    category: 'Stress Management',
    format: 'video',
    shortDescription: 'Follow along with a calm visual reset to release shoulder and study tension.',
    readTimeMinutes: 2,
    videoDurationSeconds: 60,
    videoScene: 'sunrise',
    videoCaptions: [
      { timeSec: 0, text: 'Welcome. Step back slightly from your screen and rest your hands.' },
      { timeSec: 12, text: 'Roll your shoulders slowly backward three times, letting them drop.' },
      { timeSec: 26, text: 'Unclench your jaw and soften the muscles around your eyes.' },
      { timeSec: 40, text: 'Take two slow breaths—inhale calm, exhale the last hour of effort.' },
      { timeSec: 52, text: 'Return to your work whenever you feel ready, one small step at a time.' },
    ],
    keywords: ['video', 'desk', 'stretch', 'tension', 'stress', 'guided'],
    fullArticle: [
      'This short guided visual break helps release physical tension that builds up during long study blocks.',
      'Watch the gentle sunrise motion, follow the captions, and let your shoulders settle downward.',
    ],
  },
  {
    id: 'exp-stress-pacing',
    title: 'Breaking Overwhelm into 20-Minute Windows',
    category: 'Stress Management',
    format: 'article',
    shortDescription: 'How smaller, bounded study blocks reduce procrastination and mental fatigue.',
    readTimeMinutes: 4,
    keywords: ['overwhelm', 'study', 'pomodoro', 'procrastination', 'deadlines'],
    actionSteps: [
      'Pick one tiny starting task (not the whole assignment)',
      'Set a calm 20-minute focus window',
      'Take a 5-minute screen break when the timer ends',
    ],
    fullArticle: [
      'Large assignments feel paralyzing when our brain tries to hold the entire finished project at once.',
      'Instead of aiming to "finish the paper," set a gentle 20-minute timer with one small goal: open the document and write three rough bullet points.',
      'When the timer ends, give yourself permission to pause, stretch, and decide calmly whether to do one more short block.',
    ],
  },
  {
    id: 'exp-video-sleep-drift',
    title: 'Evening Wind-Down Visual Meditation',
    category: 'Sleep',
    format: 'video',
    shortDescription: 'A soothing night-sky guided visual to quiet racing thoughts before sleep.',
    readTimeMinutes: 2,
    videoDurationSeconds: 60,
    videoScene: 'nightfall',
    videoCaptions: [
      { timeSec: 0, text: 'Dim your screen brightness and let today’s tasks wait until tomorrow.' },
      { timeSec: 14, text: 'Watch the gentle stars drift slowly across the night sky.' },
      { timeSec: 28, text: 'Let your breathing slow down—each exhale slightly longer than the inhale.' },
      { timeSec: 44, text: 'Feel the weight of your body supported comfortably where you rest.' },
    ],
    keywords: ['video', 'sleep', 'night', 'meditation', 'wind down'],
    fullArticle: [
      'Use this calm 60-second evening visual right before putting your device away for the night.',
    ],
  },
  {
    id: 'exp-sleep-buffer',
    title: 'Building a Calm Pre-Sleep Buffer',
    category: 'Sleep',
    format: 'article',
    shortDescription: 'Simple evening cues to help your brain step away from late-night coursework.',
    readTimeMinutes: 3,
    keywords: ['sleep', 'night', 'rest', 'insomnia', 'wind down'],
    actionSteps: [
      'Write tomorrow’s top 2 priorities on paper before bed',
      'Switch to warm, dim lighting 20 minutes before sleep',
      'Listen to a gentle ambient track to signal rest',
    ],
    fullArticle: [
      'Going straight from intense problem-solving into bed often leaves your mind still trying to solve equations in the dark.',
      'Try a 15-minute buffer: write tomorrow’s top two priorities on paper so your brain does not have to guard them overnight, dim your lights, and listen to soft ambient sound.',
      'Consistent wind-down cues matter far more than perfection.',
    ],
  },
  {
    id: 'exp-video-ocean-focus',
    title: 'Mindful Horizon: Calm Wave Visual',
    category: 'Mindfulness',
    format: 'video',
    shortDescription: 'A tranquil animated ocean horizon to steady your attention between classes.',
    readTimeMinutes: 1,
    videoDurationSeconds: 45,
    videoScene: 'waves',
    videoCaptions: [
      { timeSec: 0, text: 'Follow the gentle rise and fall of the tide.' },
      { timeSec: 15, text: 'Thoughts come and go like waves—you only need to watch them pass.' },
      { timeSec: 30, text: 'Take one steady breath in with the swell, and breathe out as it recedes.' },
    ],
    keywords: ['video', 'ocean', 'waves', 'mindfulness', 'calm'],
    fullArticle: [
      'A brief visual mindfulness pause designed to calm mental chatter between lectures.',
    ],
  },
  {
    id: 'exp-selfcare-boundaries',
    title: 'Guilt-Free Rest Days on Campus',
    category: 'Self-Care',
    format: 'article',
    shortDescription: 'Why intentional downtime sustains long-term focus better than nonstop grinding.',
    readTimeMinutes: 3,
    keywords: ['rest', 'burnout', 'campus', 'guilt', 'balance'],
    actionSteps: [
      'Protect at least one screen-free hour today',
      'Step outside for fresh air or a slow walk',
    ],
    fullArticle: [
      'Rest is not something you only earn after every task is checked off; it is the maintenance that keeps your curiosity and memory working.',
      'Schedule a protected pocket of time—even an hour for a walk, music, or a meal with friends—without bringing guilt along with you.',
    ],
  },
  {
    id: 'exp-motivation-micro',
    title: 'Starting When Motivation Is Low',
    category: 'Motivation',
    format: 'article',
    shortDescription: 'Gentle momentum strategies for days when energy feels scarce.',
    readTimeMinutes: 3,
    keywords: ['motivation', 'energy', 'momentum', 'start', 'low'],
    actionSteps: [
      'Shrink the first step to just 2 minutes',
      'Acknowledge small progress without self-criticism',
    ],
    fullArticle: [
      'Waiting to feel inspired before starting often creates more pressure. Action can be tiny and still count.',
      'Lower the bar for starting: read just one paragraph, organize your notes for five minutes, or review two flashcards. Often, clarity arrives after the first gentle step.',
    ],
  },
  {
    id: 'exp-wellness-selfcompassion',
    title: 'Practicing Self-Compassion After a Tough Week',
    category: 'Mental Wellness',
    format: 'article',
    shortDescription: 'Replacing harsh inner criticism with steady, supportive self-talk.',
    readTimeMinutes: 4,
    keywords: ['compassion', 'perfectionism', 'kindness', 'grades', 'setback'],
    actionSteps: [
      'Notice harsh self-talk without believing every word',
      'Speak to yourself as you would to a close friend',
    ],
    fullArticle: [
      'When a quiz or presentation goes differently than hoped, the inner critic tends to speak loudly. Yet research consistently shows that harsh self-judgment increases stress rather than resilience.',
      'Ask yourself: "What would I say to a friend in this exact situation?" Offer yourself that same grounded kindness as you regroup.',
    ],
  },
];

export const DAILY_CHALLENGES: readonly DailyChallengeItem[] = [
  {
    id: 'ch-gratitude',
    title: 'Gratitude Moment',
    description: 'Write down three things you are grateful for.',
    category: 'Gratitude',
    estimatedMinutes: 3,
    isWritingChallenge: true,
    promptPlaceholder: '1. ...\n2. ...\n3. ...',
  },
  {
    id: 'ch-breathing',
    title: 'Mindful Breathing',
    description: 'Complete a two-minute breathing exercise.',
    category: 'Mindfulness',
    estimatedMinutes: 2,
    isWritingChallenge: false,
  },
  {
    id: 'ch-detox',
    title: 'Digital Detox',
    description: 'Stay away from your phone for 15 minutes.',
    category: 'Balance',
    estimatedMinutes: 15,
    isWritingChallenge: false,
  },
  {
    id: 'ch-positive',
    title: 'Positive Thinking',
    description: 'Write one positive thought.',
    category: 'Mindset',
    estimatedMinutes: 2,
    isWritingChallenge: true,
    promptPlaceholder: 'Write one encouraging or kind thought for yourself today...',
  },
  {
    id: 'ch-walking',
    title: 'Mindful Walking',
    description: 'Take a 10-minute mindful walk.',
    category: 'Movement',
    estimatedMinutes: 10,
    isWritingChallenge: false,
  },
  {
    id: 'ch-selfcare',
    title: 'Self-Care Break',
    description: 'Spend five minutes doing something relaxing.',
    category: 'Self-Care',
    estimatedMinutes: 5,
    isWritingChallenge: false,
  },
  {
    id: 'ch-journaling',
    title: 'Journaling',
    description: 'Write about your day.',
    category: 'Reflection',
    estimatedMinutes: 5,
    isWritingChallenge: true,
    promptPlaceholder: 'How has your day felt so far? Write freely without judgment...',
  },
];

/**
 * Deterministically picks one challenge for the given local date key (YYYY-MM-DD).
 */
export function getDailyChallengeForDate(dateKey: string): DailyChallengeItem {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 100000;
  }
  return DAILY_CHALLENGES[hash % DAILY_CHALLENGES.length];
}

export const SOUND_LOUNGE_TRACKS: readonly SoundTrack[] = [
  {
    id: 'meditation',
    title: 'Meditation Calm',
    description: 'Slow, soothing meditation melody for deep relaxation.',
    audioUrl: '/audio/meditation.wav',
  },
  {
    id: 'ocean',
    title: 'Ocean Waves',
    description: 'Calm ocean waves and peaceful shore ambience.',
    audioUrl: '/audio/ocean.wav',
  },
  {
    id: 'night',
    title: 'Night Calm',
    description: 'Gentle evening crickets and peaceful night ambience.',
    audioUrl: '/audio/night.wav',
  },
];

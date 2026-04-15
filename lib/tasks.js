// 4 categories × 4 tasks = 16 daily checkpoints
// Each category completion = 1 streak point. All 4 = Perfect Day.

export const CATEGORIES = {
  scaler: {
    name: 'Scaler',
    icon: '🎓',
    color: '#8B5CF6',      // violet
    bgTint: 'rgba(139, 92, 246, 0.1)',
    glow: 'rgba(139, 92, 246, 0.4)',
    description: 'Curriculum progress - non-negotiable',
  },
  skills: {
    name: 'Skills',
    icon: '🧠',
    color: '#10B981',      // emerald
    bgTint: 'rgba(16, 185, 129, 0.1)',
    glow: 'rgba(16, 185, 129, 0.4)',
    description: 'SQL, Python, Dashboards, Case Studies',
  },
  portfolio: {
    name: 'Portfolio',
    icon: '📁',
    color: '#F59E0B',      // amber
    bgTint: 'rgba(245, 158, 11, 0.1)',
    glow: 'rgba(245, 158, 11, 0.4)',
    description: 'Projects, GitHub, Resume, LinkedIn',
  },
  jobhunt: {
    name: 'Job Hunt',
    icon: '💼',
    color: '#EF4444',      // red
    bgTint: 'rgba(239, 68, 68, 0.1)',
    glow: 'rgba(239, 68, 68, 0.4)',
    description: 'Applications, Networking, Interview Prep',
  },
};

// Default task sets - user can edit these per day
export const DEFAULT_TASKS = {
  scaler: [
    'Watch 2 backlog lectures (sequential from Day 2)',
    'Attend live class (if MWF) OR revise today\'s concept',
    'Complete same-day Scaler assignments',
    'Write notes + solve 2 additional problems',
  ],
  skills: [
    'SQL: Solve 3 window function / join problems',
    'Python/Pandas: 30 min hands-on (groupby, merge, pivot)',
    'Dashboard practice: 20 min Tableau/Power BI',
    'Case study: Read 1 data analytics case + frame approach',
  ],
  portfolio: [
    'Project work: 1 hour on ANZ simulation / new project',
    'GitHub: Commit code + update README',
    'LinkedIn: 1 post OR engage with 5 data-role posts',
    'Resume: Review once + iterate if feedback received',
  ],
  jobhunt: [
    'Apply to 5 quality remote DA/DS roles (not spray)',
    'Send 3 personalized recruiter / referral messages',
    'Interview prep: 2 SQL + 1 case question (solve aloud)',
    'Update job tracker sheet (applied, replies, interviews)',
  ],
};

// Motivational messages for streak milestones
export const STREAK_MESSAGES = {
  1: "Day 1. The hardest part is starting.",
  3: "3-day streak. Momentum building.",
  7: "One week. You're forming the habit.",
  14: "Two weeks. This is who you are now.",
  21: "21 days. Science says the habit is locked in.",
  30: "30 days. You're a different person than Day 1.",
  42: "42 days = 6 weeks. Job-ready territory.",
};

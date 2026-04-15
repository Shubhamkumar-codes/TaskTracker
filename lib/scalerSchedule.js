// Scaler curriculum schedule - Day 53 through Day 72
// Live classes: Mon, Wed, Fri 9:00 PM - 11:30 PM

export const SCALER_SCHEDULE = [
  { day: 53, date: '2026-04-22', topic: 'Intro to CV and CNN Fundamentals', assignments: 5, additional: 4, isLive: true },
  { day: 54, date: '2026-04-24', topic: 'Tackling Overfitting in CNN', assignments: 5, additional: 4, isLive: true },
  { day: 55, date: '2026-04-27', topic: 'Transfer Learning', assignments: 5, additional: 5, isLive: true },
  { day: 56, date: '2026-04-29', topic: 'Image Similarity using CNN', assignments: 5, additional: 5, isLive: true },
  { day: 57, date: '2026-05-04', topic: 'Object Localization and Detection 1', assignments: 5, additional: 4, isLive: true },
  { day: 58, date: '2026-05-06', topic: 'Object Localization and Detection 2', assignments: 5, additional: 5, isLive: true },
  { day: 59, date: '2026-05-08', topic: 'Object Segmentation', assignments: 5, additional: 5, isLive: true },
  { day: 60, date: '2026-05-11', topic: 'Siamese Network', assignments: 6, additional: 3, isLive: true },
  { day: 61, date: '2026-05-13', topic: 'GANs for Image Generation', assignments: 6, additional: 6, isLive: true },
  { day: 62, date: '2026-05-15', topic: 'Text Pre-Processing (NLTK/spaCy)', assignments: 8, additional: 5, isLive: true },
  { day: 63, date: '2026-05-18', topic: 'Word Embeddings', assignments: 7, additional: 5, isLive: true },
  { day: 64, date: '2026-05-20', topic: 'Lexicon-Based Sentiment & Topic Modeling', assignments: 6, additional: 4, isLive: true },
  { day: 65, date: '2026-05-22', topic: 'RNN', assignments: 6, additional: 4, isLive: true },
  { day: 66, date: '2026-05-25', topic: 'LSTM', assignments: 7, additional: 4, isLive: true },
  { day: 67, date: '2026-05-29', topic: 'NER (Named Entity Recognition)', assignments: 6, additional: 4, isLive: true },
  { day: 68, date: '2026-06-01', topic: 'Attention Mechanism', assignments: 7, additional: 4, isLive: true },
  { day: 69, date: '2026-06-03', topic: 'Transformers', assignments: 7, additional: 5, isLive: true },
  { day: 70, date: '2026-06-05', topic: 'Pre-trained Models (BERT)', assignments: 6, additional: 4, isLive: true },
  { day: 71, date: '2026-06-08', topic: 'Applied AI Practice Test', assignments: 0, additional: 0, isTest: true },
  { day: 72, date: '2026-06-10', topic: 'Applied AI Module Test', assignments: 0, additional: 0, isTest: true },
];

// Find today's Scaler topic (or next upcoming if today is a buffer day)
export function getTodayScalerDay(dateStr) {
  const exact = SCALER_SCHEDULE.find(s => s.date === dateStr);
  if (exact) return exact;
  // Find next upcoming lecture
  const upcoming = SCALER_SCHEDULE.find(s => s.date > dateStr);
  return upcoming || null;
}

export function getBacklogLecturesForDate(dateStr) {
  // Returns the 2 backlog lectures to watch today (sequential from Day 2)
  // Formula: Day 2 started April 14, 2 lectures/day
  const startDate = new Date('2026-04-14');
  const today = new Date(dateStr);
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  if (daysDiff < 0) return [];
  const firstLecture = 2 + daysDiff * 2;
  return [firstLecture, firstLecture + 1].filter(n => n < 53); // Don't exceed current module
}

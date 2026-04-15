'use client';

import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, DEFAULT_TASKS, STREAK_MESSAGES } from '../lib/tasks';
import { SCALER_SCHEDULE, getTodayScalerDay, getBacklogLecturesForDate } from '../lib/scalerSchedule';
import { loadState, saveState, getTodayStr, exportState, importState } from '../lib/storage';
import {
  DEFAULT_REMINDERS,
  requestNotificationPermission,
  registerServiceWorker,
  scheduleDailyReminders,
  sendTestNotification,
} from '../lib/notifications';

// ---------- Initial state shape ----------
function makeEmptyDayTasks() {
  const obj = {};
  Object.keys(CATEGORIES).forEach(cat => {
    obj[cat] = DEFAULT_TASKS[cat].map(text => ({ text, done: false }));
  });
  return obj;
}

function makeInitialState() {
  const today = getTodayStr();
  return {
    today,
    tasks: makeEmptyDayTasks(),        // { scaler: [{text, done}, ...], ... }
    customTasks: {},                   // date -> tasks (for edited days)
    streaks: { scaler: 0, skills: 0, portfolio: 0, jobhunt: 0 },
    bestStreaks: { scaler: 0, skills: 0, portfolio: 0, jobhunt: 0 },
    completedCats: { scaler: false, skills: false, portfolio: false, jobhunt: false },
    perfectDays: 0,
    history: {},                       // date -> { catName: true/false }
    reminders: DEFAULT_REMINDERS,
    notificationsEnabled: false,
  };
}

// ---------- Main Component ----------
export default function Home() {
  const [state, setState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingTaskCat, setEditingTaskCat] = useState(null);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef(null);

  // ----- Load + daily reset logic -----
  useEffect(() => {
    const saved = loadState();
    const today = getTodayStr();

    if (!saved) {
      setState(makeInitialState());
      return;
    }

    if (saved.today === today) {
      // Same day — recompute completedCats from tasks
      saved.completedCats = computeCompletedCats(saved.tasks);
      setState(saved);
      return;
    }

    // New day — archive yesterday, check streak continuity
    const newHistory = { ...saved.history };
    newHistory[saved.today] = computeCompletedCats(saved.tasks);

    // Streak logic: for each category, if yesterday was completed, streak continues (but doesn't increment until today's tasks done).
    // If not, streak resets.
    const newStreaks = { ...saved.streaks };
    Object.keys(CATEGORIES).forEach(cat => {
      if (!newHistory[saved.today]?.[cat]) {
        newStreaks[cat] = 0;
      }
    });

    // Check if user had customized today's tasks ahead of time
    const customForToday = saved.customTasks?.[today];
    const freshTasks = customForToday
      ? JSON.parse(JSON.stringify(customForToday))
      : makeEmptyDayTasks();

    const newState = {
      ...saved,
      today,
      tasks: freshTasks,
      streaks: newStreaks,
      completedCats: { scaler: false, skills: false, portfolio: false, jobhunt: false },
      history: newHistory,
    };
    saveState(newState);
    setState(newState);
  }, []);

  // ----- Persist on every change -----
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  // ----- Register SW + schedule reminders on mount -----
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (state?.notificationsEnabled && state?.reminders) {
      scheduleDailyReminders(state.reminders);
    }
  }, [state?.notificationsEnabled, state?.reminders]);

  useEffect(() => {
     if (toast) {
       const t = setTimeout(() => setToast(null), 4000);
       return () => clearTimeout(t);
     }
   }, [toast]);

  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748B' }}>
        Loading your tracker...
      </div>
    );
  }

  // ---------- Derived values ----------
  const totalTasks = Object.keys(CATEGORIES).reduce((sum, cat) => sum + state.tasks[cat].length, 0);
  const doneTasks = Object.keys(CATEGORIES).reduce(
    (sum, cat) => sum + state.tasks[cat].filter(t => t.done).length, 0
  );
  const overallPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const catsCompleted = Object.values(state.completedCats).filter(Boolean).length;
  const isPerfectDay = catsCompleted === 4;

  // ---------- Handlers ----------
  function toggleTask(cat, idx) {
    setState(prev => {
      const newTasks = { ...prev.tasks };
      newTasks[cat] = newTasks[cat].map((t, i) => i === idx ? { ...t, done: !t.done } : t);
      const newCompleted = computeCompletedCats(newTasks);

      // Streak increment: category just became complete
      const newStreaks = { ...prev.streaks };
      const newBest = { ...prev.bestStreaks };
      if (newCompleted[cat] && !prev.completedCats[cat]) {
        newStreaks[cat] = prev.streaks[cat] + 1;
        if (newStreaks[cat] > newBest[cat]) newBest[cat] = newStreaks[cat];
        showMilestoneToast(cat, newStreaks[cat]);
      } else if (!newCompleted[cat] && prev.completedCats[cat]) {
        // Unchecked after completion — pull streak back
        newStreaks[cat] = Math.max(0, prev.streaks[cat] - 1);
      }

      // Perfect Day check
      let newPerfect = prev.perfectDays;
      const wasPerfect = Object.values(prev.completedCats).every(Boolean);
      const nowPerfect = Object.values(newCompleted).every(Boolean);
      if (nowPerfect && !wasPerfect) {
        newPerfect = prev.perfectDays + 1;
        triggerConfetti();
        setToast({ type: 'perfect', msg: '🎉 PERFECT DAY! All 4 categories crushed.' });
      } else if (!nowPerfect && wasPerfect) {
        newPerfect = Math.max(0, prev.perfectDays - 1);
      }

      return {
        ...prev,
        tasks: newTasks,
        completedCats: newCompleted,
        streaks: newStreaks,
        bestStreaks: newBest,
        perfectDays: newPerfect,
      };
    });
  }

  function showMilestoneToast(cat, streak) {
    const msg = STREAK_MESSAGES[streak];
    if (msg) setToast({ type: 'milestone', msg: `${CATEGORIES[cat].icon} ${CATEGORIES[cat].name}: ${msg}` });
  }

  function triggerConfetti() {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
  }

  function startEditTask(cat, idx) {
    setEditingTaskCat(cat);
    setEditingTaskIdx(idx);
    setEditingText(state.tasks[cat][idx].text);
  }

  function saveEditTask() {
    if (editingTaskCat === null) return;
    setState(prev => {
      const newTasks = { ...prev.tasks };
      newTasks[editingTaskCat] = newTasks[editingTaskCat].map((t, i) =>
        i === editingTaskIdx ? { ...t, text: editingText } : t
      );
      // Also save to customTasks so it persists for today
      const newCustom = { ...prev.customTasks, [prev.today]: newTasks };
      return { ...prev, tasks: newTasks, customTasks: newCustom };
    });
    setEditingTaskCat(null);
    setEditingTaskIdx(null);
    setEditingText('');
  }

  function addTask(cat) {
    setState(prev => {
      const newTasks = { ...prev.tasks };
      newTasks[cat] = [...newTasks[cat], { text: 'New task (tap to edit)', done: false }];
      const newCustom = { ...prev.customTasks, [prev.today]: newTasks };
      return { ...prev, tasks: newTasks, customTasks: newCustom };
    });
  }

  function removeTask(cat, idx) {
    setState(prev => {
      const newTasks = { ...prev.tasks };
      newTasks[cat] = newTasks[cat].filter((_, i) => i !== idx);
      const newCompleted = computeCompletedCats(newTasks);
      const newCustom = { ...prev.customTasks, [prev.today]: newTasks };
      return { ...prev, tasks: newTasks, completedCats: newCompleted, customTasks: newCustom };
    });
  }

  function resetToDefaults() {
    if (!confirm('Reset today\'s tasks to default templates? Your streaks will be preserved.')) return;
    setState(prev => ({ ...prev, tasks: makeEmptyDayTasks(), customTasks: { ...prev.customTasks, [prev.today]: undefined } }));
  }

  async function enableNotifications() {
    const { granted, reason } = await requestNotificationPermission();
    if (granted) {
      setState(prev => ({ ...prev, notificationsEnabled: true }));
      setToast({ type: 'info', msg: '🔔 Notifications enabled. You\'ll get reminders at scheduled times.' });
      sendTestNotification();
    } else {
      setToast({ type: 'warn', msg: `Notifications ${reason}. Enable manually in browser settings.` });
    }
  }

  function updateReminderTime(id, newTime) {
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.map(r => r.id === id ? { ...r, time: newTime } : r),
    }));
  }

  // ---------- Render ----------
  return (
    <div className="container">
      {showConfetti && <Confetti />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <Header
        perfectDays={state.perfectDays}
        today={state.today}
        overallPct={overallPct}
        isPerfectDay={isPerfectDay}
        onOpenSettings={() => setShowSettings(true)}
      />

      {activeTab === 'dashboard' && (
        <DashboardTab
          state={state}
          toggleTask={toggleTask}
          startEditTask={startEditTask}
          editingTaskCat={editingTaskCat}
          editingTaskIdx={editingTaskIdx}
          editingText={editingText}
          setEditingText={setEditingText}
          saveEditTask={saveEditTask}
          cancelEdit={() => { setEditingTaskCat(null); setEditingTaskIdx(null); }}
          addTask={addTask}
          removeTask={removeTask}
          resetToDefaults={resetToDefaults}
        />
      )}

      {activeTab === 'scaler' && <ScalerTab today={state.today} />}
      {activeTab === 'calendar' && <CalendarTab state={state} />}
      {activeTab === 'stats' && <StatsTab state={state} />}

      {showSettings && (
        <SettingsModal
          state={state}
          onClose={() => setShowSettings(false)}
          enableNotifications={enableNotifications}
          updateReminderTime={updateReminderTime}
          onExport={exportState}
          onImportClick={() => fileInputRef.current?.click()}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const data = await importState(f);
            setState(data);
            setToast({ type: 'info', msg: '✅ Data imported successfully.' });
          } catch {
            setToast({ type: 'warn', msg: '⚠️ Import failed. Invalid file.' });
          }
        }}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

// ==================== COMPUTE HELPERS ====================
function computeCompletedCats(tasks) {
  const result = {};
  Object.keys(CATEGORIES).forEach(cat => {
    const list = tasks[cat] || [];
    result[cat] = list.length > 0 && list.every(t => t.done);
  });
  return result;
}

// ==================== HEADER ====================
function Header({ perfectDays, today, overallPct, isPerfectDay, onOpenSettings }) {
  const dateObj = new Date(today);
  const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>{dateStr}</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, background: isPerfectDay ? 'linear-gradient(90deg, #F59E0B, #EF4444, #8B5CF6)' : 'none', WebkitBackgroundClip: isPerfectDay ? 'text' : 'initial', WebkitTextFillColor: isPerfectDay ? 'transparent' : '#F1F5F9' }}>
          {isPerfectDay ? '🔥 Perfect Day!' : `Today: ${overallPct}%`}
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
          🏆 {perfectDays} Perfect {perfectDays === 1 ? 'Day' : 'Days'} total
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        style={{ padding: 10, background: '#1E293B', borderRadius: 10, fontSize: 18 }}
        aria-label="Settings"
      >⚙️</button>
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab({ state, toggleTask, startEditTask, editingTaskCat, editingTaskIdx, editingText, setEditingText, saveEditTask, cancelEdit, addTask, removeTask, resetToDefaults }) {
  return (
    <div>
      {/* Streak cards row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 20,
      }}>
        {Object.keys(CATEGORIES).map(cat => (
          <StreakCard
            key={cat}
            cat={cat}
            streak={state.streaks[cat]}
            best={state.bestStreaks[cat]}
            tasks={state.tasks[cat]}
            completed={state.completedCats[cat]}
          />
        ))}
      </div>

      {/* Task checklists by category */}
      {Object.keys(CATEGORIES).map(cat => (
        <CategoryChecklist
          key={cat}
          cat={cat}
          tasks={state.tasks[cat]}
          completed={state.completedCats[cat]}
          toggleTask={(idx) => toggleTask(cat, idx)}
          startEditTask={(idx) => startEditTask(cat, idx)}
          editingIdx={editingTaskCat === cat ? editingTaskIdx : null}
          editingText={editingText}
          setEditingText={setEditingText}
          saveEditTask={saveEditTask}
          cancelEdit={cancelEdit}
          addTask={() => addTask(cat)}
          removeTask={(idx) => removeTask(cat, idx)}
        />
      ))}

      <button
        onClick={resetToDefaults}
        style={{
          width: '100%', padding: 12, marginTop: 16,
          background: '#1E293B', color: '#94A3B8',
          borderRadius: 10, fontSize: 13, fontWeight: 500,
        }}
      >
        ↺ Reset today's tasks to defaults
      </button>
    </div>
  );
}

function StreakCard({ cat, streak, best, tasks, completed }) {
  const C = CATEGORIES[cat];
  const doneCount = tasks.filter(t => t.done).length;
  return (
    <div style={{
      background: completed ? C.bgTint : '#1E293B',
      border: `1px solid ${completed ? C.color : '#334155'}`,
      borderRadius: 12,
      padding: '10px 8px',
      textAlign: 'center',
      boxShadow: completed ? `0 0 20px ${C.glow}` : 'none',
      transition: 'all 0.25s',
    }}>
      <div style={{ fontSize: 20 }}>{C.icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: completed ? C.color : '#F1F5F9', lineHeight: 1.2 }}>
        🔥 {streak}
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>
        {C.name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 6 }}>
        {tasks.map((t, i) => (
          <div key={i} style={{
            width: 14, height: 3, borderRadius: 2,
            background: t.done ? C.color : '#334155',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>Best: {best}</div>
    </div>
  );
}

function CategoryChecklist({ cat, tasks, completed, toggleTask, startEditTask, editingIdx, editingText, setEditingText, saveEditTask, cancelEdit, addTask, removeTask }) {
  const C = CATEGORIES[cat];
  return (
    <div style={{
      background: '#1E293B',
      border: `1px solid ${completed ? C.color : '#334155'}`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      boxShadow: completed ? `0 0 16px ${C.glow}` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.color }}>
            {C.icon} {C.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{C.description}</div>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
          {tasks.filter(t => t.done).length}/{tasks.length}
        </div>
      </div>

      {tasks.map((task, idx) => (
        <div key={idx} style={{ marginBottom: 6 }}>
          {editingIdx === idx ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveEditTask()}
                autoFocus
                style={{
                  flex: 1, padding: 10, background: '#0F172A',
                  border: `1px solid ${C.color}`, borderRadius: 8,
                  color: '#F1F5F9', fontSize: 14,
                }}
              />
              <button onClick={saveEditTask} style={{ padding: '8px 12px', background: C.color, color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Save</button>
              <button onClick={cancelEdit} style={{ padding: '8px 10px', background: '#334155', borderRadius: 8, fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <div
              onClick={() => toggleTask(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: task.done ? C.bgTint : '#0F172A',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                border: `2px solid ${task.done ? C.color : '#475569'}`,
                background: task.done ? C.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {task.done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
              </div>
              <div style={{
                flex: 1, fontSize: 14,
                color: task.done ? '#64748B' : '#F1F5F9',
                textDecoration: task.done ? 'line-through' : 'none',
                lineHeight: 1.35,
              }}>
                {task.text}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); startEditTask(idx); }}
                style={{ padding: 4, fontSize: 14, color: '#64748B' }}
                aria-label="Edit"
              >✏️</button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Remove this task?')) removeTask(idx); }}
                style={{ padding: 4, fontSize: 12, color: '#64748B' }}
                aria-label="Delete"
              >🗑</button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addTask}
        style={{
          width: '100%', padding: 8, marginTop: 6,
          background: 'transparent', border: `1px dashed ${C.color}`,
          borderRadius: 8, color: C.color, fontSize: 12, fontWeight: 600,
        }}
      >
        + Add task
      </button>
    </div>
  );
}

// ==================== SCALER TAB ====================
function ScalerTab({ today }) {
  const todayDay = getTodayScalerDay(today);
  const backlog = getBacklogLecturesForDate(today);

  return (
    <div>
      <SectionTitle>🎓 Scaler Schedule</SectionTitle>

      {todayDay && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
          border: '1px solid #8B5CF6', borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {todayDay.date === today ? '⭐ TODAY' : 'Next Lecture'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            Day {todayDay.day}: {todayDay.topic}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
            📅 {new Date(todayDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {!todayDay.isTest && (
            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
              📝 {todayDay.assignments} assignments · {todayDay.additional} additional problems
            </div>
          )}
          {todayDay.isLive && (
            <div style={{ fontSize: 12, color: '#10B981', marginTop: 6, fontWeight: 600 }}>
              🔴 Live class 9:00 - 11:30 PM — DO NOT MISS
            </div>
          )}
        </div>
      )}

      {backlog.length > 0 && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Today's Backlog Lectures</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>
            Watch Day {backlog[0]} & Day {backlog[1]}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            Sequential backlog completion - 2 lectures/day pace
          </div>
        </div>
      )}

      <SectionTitle>📅 Upcoming Module</SectionTitle>
      <div style={{ background: '#1E293B', borderRadius: 14, overflow: 'hidden' }}>
        {SCALER_SCHEDULE.map((s, i) => {
          const isPast = s.date < today;
          const isToday = s.date === today;
          return (
            <div key={s.day} style={{
              padding: 14,
              borderBottom: i < SCALER_SCHEDULE.length - 1 ? '1px solid #334155' : 'none',
              opacity: isPast ? 0.5 : 1,
              background: isToday ? 'rgba(139,92,246,0.1)' : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                    Day {s.day} · {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s.topic}</div>
                  {!s.isTest && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {s.assignments} assignments · {s.additional} practice
                    </div>
                  )}
                </div>
                {s.isTest && (
                  <div style={{ fontSize: 10, padding: '4px 8px', background: '#EF4444', borderRadius: 6, fontWeight: 700 }}>
                    TEST
                  </div>
                )}
                {isToday && !s.isTest && (
                  <div style={{ fontSize: 10, padding: '4px 8px', background: '#8B5CF6', borderRadius: 6, fontWeight: 700 }}>
                    TODAY
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== CALENDAR TAB ====================
function CalendarTab({ state }) {
  // Show last 4 weeks + current
  const weeks = [];
  const today = new Date(state.today);
  for (let w = 4; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7) - (today.getDay() - d));
      const ds = date.toISOString().slice(0, 10);
      const isToday = ds === state.today;
      const isFuture = date > today;
      let status = 'empty';
      if (isToday) status = 'today';
      else if (isFuture) status = 'future';
      else {
        const h = state.history[ds];
        if (h) {
          const cnt = Object.values(h).filter(Boolean).length;
          if (cnt === 4) status = 'perfect';
          else if (cnt >= 2) status = 'partial';
          else if (cnt >= 1) status = 'weak';
          else status = 'missed';
        } else status = 'missed';
      }
      week.push({ date: ds, day: date.getDate(), status });
    }
    weeks.push(week);
  }

  const legend = [
    { label: 'Perfect', emoji: '🔥', color: '#F59E0B' },
    { label: 'Partial', emoji: '⚡', color: '#10B981' },
    { label: 'Weak', emoji: '💧', color: '#64748B' },
    { label: 'Missed', emoji: '☁️', color: '#334155' },
  ];

  return (
    <div>
      <SectionTitle>📆 Your Journey</SectionTitle>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {legend.map(l => (
          <div key={l.label} style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{l.emoji}</span> {l.label}
          </div>
        ))}
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: '#64748B', fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {week.map((d, di) => {
              const bg = {
                perfect: '#F59E0B',
                partial: '#10B981',
                weak: '#475569',
                missed: '#1E293B',
                today: '#8B5CF6',
                future: '#0F172A',
              }[d.status];
              const emoji = { perfect: '🔥', partial: '⚡', weak: '💧', missed: '', today: '⭐', future: '' }[d.status];
              return (
                <div key={di} style={{
                  aspectRatio: '1',
                  background: bg,
                  borderRadius: 6,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                  color: d.status === 'future' ? '#334155' : '#F1F5F9',
                  border: d.status === 'today' ? '2px solid #A78BFA' : 'none',
                }}>
                  <div style={{ fontSize: 13 }}>{emoji}</div>
                  <div style={{ fontSize: 9 }}>{d.day}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== STATS TAB ====================
function StatsTab({ state }) {
  const totalHistoryDays = Object.keys(state.history).length;
  const perfectInHistory = Object.values(state.history).filter(h => Object.values(h).filter(Boolean).length === 4).length;
  const consistency = totalHistoryDays ? Math.round((perfectInHistory / totalHistoryDays) * 100) : 0;

  return (
    <div>
      <SectionTitle>📊 Your Stats</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatBox label="Perfect Days" value={state.perfectDays} color="#F59E0B" />
        <StatBox label="Consistency" value={`${consistency}%`} color="#10B981" />
        <StatBox label="Days Tracked" value={totalHistoryDays + 1} color="#8B5CF6" />
        <StatBox label="Best Overall" value={Math.max(...Object.values(state.bestStreaks), 0)} color="#EF4444" />
      </div>

      <SectionTitle>🔥 Streaks by Category</SectionTitle>
      {Object.keys(CATEGORIES).map(cat => {
        const C = CATEGORIES[cat];
        return (
          <div key={cat} style={{
            background: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10,
            borderLeft: `4px solid ${C.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{C.icon} {C.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Best: {state.bestStreaks[cat]} days</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.color }}>
                🔥 {state.streaks[cat]}
              </div>
            </div>
          </div>
        );
      })}

      <SectionTitle>🎯 6-Week Sprint Plan</SectionTitle>
      <div style={{ background: '#1E293B', borderRadius: 14, padding: 16, fontSize: 13, lineHeight: 1.8, color: '#CBD5E1' }}>
        <div style={{ marginBottom: 10 }}>
          <strong style={{ color: '#8B5CF6' }}>Week 1-2 (Foundation):</strong> Clear Scaler backlog, finalize 2 portfolio projects, rewrite LinkedIn, start 5 applications/day.
        </div>
        <div style={{ marginBottom: 10 }}>
          <strong style={{ color: '#10B981' }}>Week 3-4 (Acceleration):</strong> Deploy 1st project, master SQL window functions, start mock interviews, 10 applications/day.
        </div>
        <div>
          <strong style={{ color: '#EF4444' }}>Week 5-6 (Land):</strong> Deploy 2nd project, intensive interview prep, recruiter outreach, close the offer.
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: '#1E293B', borderRadius: 12, padding: 14,
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: '#CBD5E1', margin: '20px 0 12px' }}>{children}</div>;
}

// ==================== SETTINGS MODAL ====================
function SettingsModal({ state, onClose, enableNotifications, updateReminderTime, onExport, onImportClick }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0F172A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          maxWidth: 600, width: '100%', padding: 20,
          maxHeight: '85vh', overflowY: 'auto',
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>⚙️ Settings</div>
          <button onClick={onClose} style={{ fontSize: 22, color: '#64748B' }}>✕</button>
        </div>

        <SectionTitle>🔔 Notifications</SectionTitle>
        <div style={{ background: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 10, lineHeight: 1.5 }}>
            Browser notifications work best when the app is installed as a PWA (Add to Home Screen). On desktop: works while browser is open. On iOS: requires PWA install.
          </div>
          <button
            onClick={enableNotifications}
            style={{
              width: '100%', padding: 12,
              background: state.notificationsEnabled ? '#10B981' : '#8B5CF6',
              color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 14,
            }}
          >
            {state.notificationsEnabled ? '✓ Notifications Enabled (tap to test)' : 'Enable Notifications'}
          </button>

          <div style={{ marginTop: 14 }}>
            {state.reminders.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #334155' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{r.body}</div>
                </div>
                <input
                  type="time"
                  value={r.time}
                  onChange={e => updateReminderTime(r.id, e.target.value)}
                  style={{
                    padding: '6px 8px', background: '#0F172A',
                    border: '1px solid #334155', borderRadius: 6,
                    color: '#F1F5F9', fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>💾 Data</SectionTitle>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button
            onClick={onExport}
            style={{ flex: 1, padding: 12, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
          >📤 Export Backup</button>
          <button
            onClick={onImportClick}
            style={{ flex: 1, padding: 12, background: '#1E293B', border: '1px solid #334155', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
          >📥 Import</button>
        </div>

        <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
          Your data is stored locally in your browser.<br/>
          Export regularly to avoid losing progress.
        </div>
      </div>
    </div>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: 'Today' },
    { id: 'scaler', icon: '🎓', label: 'Scaler' },
    { id: 'calendar', icon: '📆', label: 'Calendar' },
    { id: 'stats', icon: '📊', label: 'Stats' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #334155',
      padding: '8px 0',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 50,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          style={{
            flex: 1, padding: '8px 4px',
            color: activeTab === t.id ? '#A78BFA' : '#64748B',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2,
          }}
        >
          <div style={{ fontSize: 20 }}>{t.icon}</div>
          <div style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</div>
        </button>
      ))}
    </div>
  );
}

// ==================== CONFETTI + TOAST ====================
function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'];
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
      {pieces.map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `-10px`,
          width: 8, height: 14,
          background: colors[Math.floor(Math.random() * colors.length)],
          animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 0.5}s forwards`,
        }} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const bg = { perfect: '#F59E0B', milestone: '#8B5CF6', info: '#10B981', warn: '#EF4444' }[toast.type] || '#1E293B';
  return (
    <div style={{
      position: 'fixed', top: 20, left: 16, right: 16, maxWidth: 500,
      marginLeft: 'auto', marginRight: 'auto',
      background: bg, color: '#fff',
      padding: '12px 16px', borderRadius: 12,
      fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      zIndex: 150, animation: 'slideUp 0.25s',
    }} onClick={onClose}>
      {toast.msg}
    </div>
  );
}

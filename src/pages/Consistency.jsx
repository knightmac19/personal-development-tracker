import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  CheckCircle2,
  Circle,
  Flame,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Award,
  Target,
  Minus,
  Plus,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isAfter,
  isBefore,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  parseISO,
  getDay,
} from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// ─── Habit Definitions ───────────────────────────────────────────────
// applicableDays: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const HABITS = [
  {
    id: "in-bed-11pm",
    label: "In bed by 11pm",
    emoji: "🛏️",
    applicableDays: [0, 1, 2, 3, 4, 5, 6],
    category: "Sleep",
  },
  {
    id: "up-635am",
    label: "Out of bed by 6:35am",
    emoji: "⏰",
    applicableDays: [0, 1, 2, 3, 4, 5, 6],
    category: "Sleep",
  },
  {
    id: "tracked-expenses",
    label: "Tracked all expenses",
    emoji: "💰",
    applicableDays: [0, 1, 2, 3, 4, 5, 6],
    category: "Finances",
  },
  {
    id: "gym",
    label: "Went to the gym",
    emoji: "🏋️",
    applicableDays: [1, 3, 4, 6], // Mon, Wed, Thu, Sat
    category: "Fitness",
  },
  {
    id: "mobility",
    label: "Completed mobility workout",
    emoji: "🧘",
    applicableDays: [0, 1, 2, 3, 4, 5, 6],
    category: "Fitness",
  },
  {
    id: "iron-neck",
    label: "Completed iron neck workout",
    emoji: "🦴",
    applicableDays: [1, 3, 5], // Mon, Wed, Fri
    category: "Fitness",
  },
  {
    id: "core",
    label: "Completed core workout",
    emoji: "💪",
    applicableDays: [1, 3, 5], // Mon, Wed, Fri
    category: "Fitness",
  },
  {
    id: "kegels",
    label: "Completed kegels",
    emoji: "🔄",
    applicableDays: [2, 4, 6], // Tue, Thu, Sat
    category: "Fitness",
  },
  {
    id: "bjj",
    label: "Attended jiu jitsu",
    emoji: "🥋",
    applicableDays: [1, 3, 4, 6], // Mon, Wed, Thu, Sat (core)
    bonusDays: [2], // Tue (bonus, not scored against consistency)
    category: "BJJ",
    hasClassCount: true,
  },
  {
    id: "forearm-work",
    label: "Completed forearm workout",
    emoji: "🤜",
    applicableDays: [3, 4, 6], // Wed, Thu, Sat
    category: "Fitness",
  },
  {
    id: "laundry-lifesaver",
    label: "2 focused hours on Laundry Lifesaver",
    emoji: "🧺",
    applicableDays: [1, 2, 3, 4, 5], // Mon-Fri
    category: "Work",
  },
  {
    id: "heatmap-hq",
    label: "2 focused hours on Heat Map HQ",
    emoji: "🗺️",
    applicableDays: [1, 2, 3, 4], // Mon-Thu
    category: "Work",
  },
  {
    id: "read-30min",
    label: "Read 30 minutes before bed",
    emoji: "📖",
    applicableDays: [0, 1, 2, 3, 4, 5, 6],
    category: "Personal",
  },
];

const PROGRAM_START = new Date(2026, 3, 20); // April 20, 2026
const BJJ_GOAL_TARGET = 190;
const BJJ_GOAL_END = new Date(2026, 11, 31); // December 31, 2026

// ─── Helper Functions ────────────────────────────────────────────────

const getDateKey = (date) => format(date, "yyyy-MM-dd");

const getApplicableHabits = (date) => {
  const dow = getDay(date); // 0=Sun ... 6=Sat
  return HABITS.filter((h) => {
    const isApplicable = h.applicableDays.includes(dow);
    const isBonus = h.bonusDays?.includes(dow);
    return isApplicable || isBonus;
  });
};

const getScoredHabits = (date) => {
  const dow = getDay(date);
  return HABITS.filter((h) => h.applicableDays.includes(dow));
};

const calcDayScore = (log, date) => {
  if (!log) return null;
  const scored = getScoredHabits(date);
  if (scored.length === 0) return 100;
  const completed = scored.filter((h) => log.habits?.[h.id]).length;
  return Math.round((completed / scored.length) * 100);
};

// ─── Main Component ──────────────────────────────────────────────────

export const Consistency = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [viewMonth, setViewMonth] = useState(new Date());

  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);
  const selectedKey = getDateKey(selectedDate);

  // ─── Data Fetching ───────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const logsQuery = query(
        collection(db, "consistencyLogs"),
        where("userId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(logsQuery);
      const logsMap = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        logsMap[data.date] = data;
      });
      setLogs(logsMap);
    } catch (error) {
      console.error("Error fetching consistency logs:", error);
      toast.error("Failed to load consistency data");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Save / Toggle ─────────────────────────────────────────────

  const toggleHabit = async (habitId, date) => {
    if (!currentUser) return;
    const dateKey = getDateKey(date);
    if (isAfter(date, today) && !isSameDay(date, today)) return;

    setSaving(true);
    const existingLog = logs[dateKey] || {
      userId: currentUser.uid,
      date: dateKey,
      dayOfWeek: getDay(date),
      habits: {},
      bjjClassCount: 0,
    };

    const updatedHabits = {
      ...existingLog.habits,
      [habitId]: !existingLog.habits?.[habitId],
    };

    // If unchecking BJJ, reset class count
    let bjjCount = existingLog.bjjClassCount || 0;
    if (habitId === "bjj" && !updatedHabits.bjj) {
      bjjCount = 0;
    }
    if (habitId === "bjj" && updatedHabits.bjj && bjjCount === 0) {
      bjjCount = 1;
    }

    const updatedLog = {
      ...existingLog,
      habits: updatedHabits,
      bjjClassCount: bjjCount,
      updatedAt: serverTimestamp(),
    };

    if (!existingLog.createdAt) {
      updatedLog.createdAt = serverTimestamp();
    }

    try {
      await setDoc(
        doc(db, "consistencyLogs", `${currentUser.uid}_${dateKey}`),
        updatedLog,
        { merge: true }
      );
      setLogs((prev) => ({ ...prev, [dateKey]: updatedLog }));
    } catch (error) {
      console.error("Error saving habit:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateBjjCount = async (date, delta) => {
    if (!currentUser) return;
    const dateKey = getDateKey(date);
    const existingLog = logs[dateKey];
    if (!existingLog?.habits?.bjj) return;

    const newCount = Math.max(0, Math.min(4, (existingLog.bjjClassCount || 1) + delta));
    if (newCount === 0) return; // minimum 1 if checked

    const updatedLog = {
      ...existingLog,
      bjjClassCount: newCount,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(
        doc(db, "consistencyLogs", `${currentUser.uid}_${dateKey}`),
        updatedLog,
        { merge: true }
      );
      setLogs((prev) => ({ ...prev, [dateKey]: updatedLog }));
    } catch (error) {
      console.error("Error updating BJJ count:", error);
    }
  };

  // ─── Computed Stats ────────────────────────────────────────────

  const stats = useMemo(() => {
    const logEntries = Object.entries(logs);

    // Current streak (consecutive days with 100% of scored habits)
    let streak = 0;
    let checkDate = new Date(today);
    // If today hasn't been logged yet, start from yesterday
    if (!logs[getDateKey(checkDate)]) {
      checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const key = getDateKey(checkDate);
      const log = logs[key];
      if (isBefore(checkDate, PROGRAM_START)) break;
      const scored = getScoredHabits(checkDate);
      if (scored.length === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      if (!log) break;
      const allDone = scored.every((h) => log.habits?.[h.id]);
      if (!allDone) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // BJJ class total
    let bjjTotal = 0;
    logEntries.forEach(([, log]) => {
      if (log.habits?.bjj) {
        bjjTotal += log.bjjClassCount || 1;
      }
    });

    // Weeks remaining for BJJ goal
    const weeksRemaining = Math.max(
      0,
      differenceInCalendarWeeks(BJJ_GOAL_END, today, { weekStartsOn: 1 })
    );
    const bjjRemaining = Math.max(0, BJJ_GOAL_TARGET - bjjTotal);
    const bjjPaceNeeded =
      weeksRemaining > 0 ? (bjjRemaining / weeksRemaining).toFixed(1) : "N/A";

    // Overall consistency (all logged days)
    let totalScored = 0;
    let totalCompleted = 0;
    logEntries.forEach(([dateStr, log]) => {
      const d = parseISO(dateStr);
      const scored = getScoredHabits(d);
      totalScored += scored.length;
      totalCompleted += scored.filter((h) => log.habits?.[h.id]).length;
    });
    const overallPct =
      totalScored > 0 ? Math.round((totalCompleted / totalScored) * 100) : 0;

    // Today's score
    const todayLog = logs[todayKey];
    const todayScore = calcDayScore(todayLog, today);

    return {
      streak,
      bjjTotal,
      bjjRemaining,
      bjjPaceNeeded,
      weeksRemaining,
      overallPct,
      todayScore,
    };
  }, [logs, today, todayKey]);

  // ─── Weekly View Data ──────────────────────────────────────────

  const weekDays = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  // ─── Monthly Chart Data ────────────────────────────────────────

  const monthChartData = useMemo(() => {
    const mStart = startOfMonth(viewMonth);
    const mEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: mStart, end: mEnd });

    const labels = [];
    const data = [];
    const colors = [];

    days.forEach((d) => {
      if (isAfter(d, today)) return;
      if (isBefore(d, PROGRAM_START)) return;
      const key = getDateKey(d);
      const log = logs[key];
      const score = calcDayScore(log, d);
      labels.push(format(d, "d"));
      data.push(score !== null ? score : 0);
      colors.push(
        score === null
          ? "rgba(156, 163, 175, 0.4)"
          : score >= 80
            ? "rgba(34, 197, 94, 0.7)"
            : score >= 50
              ? "rgba(234, 179, 8, 0.7)"
              : "rgba(239, 68, 68, 0.7)"
      );
    });

    return {
      labels,
      datasets: [
        {
          label: "Daily Consistency %",
          data,
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  }, [logs, viewMonth, today]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: "rgba(156,163,175,0.15)" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // ─── Monthly Habit Breakdown ───────────────────────────────────

  const monthlyBreakdown = useMemo(() => {
    const mStart = startOfMonth(viewMonth);
    const mEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: mStart, end: mEnd }).filter(
      (d) =>
        !isAfter(d, today) && !isBefore(d, PROGRAM_START)
    );

    return HABITS.map((habit) => {
      let applicable = 0;
      let completed = 0;
      days.forEach((d) => {
        const dow = getDay(d);
        if (habit.applicableDays.includes(dow)) {
          applicable++;
          const log = logs[getDateKey(d)];
          if (log?.habits?.[habit.id]) completed++;
        }
      });
      const pct = applicable > 0 ? Math.round((completed / applicable) * 100) : null;
      return { ...habit, applicable, completed, pct };
    }).filter((h) => h.applicable > 0);
  }, [logs, viewMonth, today]);

  // ─── Rendering ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const selectedDayLog = logs[selectedKey];
  const applicableHabits = getApplicableHabits(selectedDate);
  const isFuture =
    isAfter(selectedDate, today) && !isSameDay(selectedDate, today);
  const isBeforeProgram = isBefore(selectedDate, PROGRAM_START);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Consistency Dashboard</h1>
        <p className="opacity-90">
          12-Week Program: April 20 – July 12, 2026
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card text-center">
          <Flame className="h-6 w-6 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.streak}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Day Streak
          </p>
        </div>
        <div className="card text-center">
          <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.overallPct}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Overall
          </p>
        </div>
        <div className="card text-center">
          <CheckCircle2 className="h-6 w-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.todayScore !== null ? `${stats.todayScore}%` : "—"}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Today</p>
        </div>
        <div className="card text-center col-span-2 lg:col-span-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">🥋</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.bjjTotal}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {" "}
                / {BJJ_GOAL_TARGET}
              </span>
            </p>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (stats.bjjTotal / BJJ_GOAL_TARGET) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            BJJ Classes by Dec 31 · {stats.bjjRemaining} to go ·{" "}
            {stats.bjjPaceNeeded}/week needed
          </p>
        </div>
      </div>

      {/* ─── Daily Check-In ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isSameDay(selectedDate, today)
              ? "Today's Habits"
              : format(selectedDate, "EEEE, MMM d")}
          </h2>
          {!isSameDay(selectedDate, today) && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Go to today
            </button>
          )}
        </div>

        {isBeforeProgram ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Program starts April 20, 2026
          </p>
        ) : isFuture ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Future date. Check back when the day arrives.
          </p>
        ) : applicableHabits.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No habits scheduled for this day.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Group by category */}
            {Object.entries(
              applicableHabits.reduce((acc, h) => {
                if (!acc[h.category]) acc[h.category] = [];
                acc[h.category].push(h);
                return acc;
              }, {})
            ).map(([category, habits]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-3 mb-1">
                  {category}
                </p>
                {habits.map((habit) => {
                  const isChecked = selectedDayLog?.habits?.[habit.id] || false;
                  const dow = getDay(selectedDate);
                  const isBonus = habit.bonusDays?.includes(dow);

                  return (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <button
                        onClick={() => toggleHabit(habit.id, selectedDate)}
                        disabled={saving}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            isChecked
                              ? "text-gray-500 dark:text-gray-400 line-through"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {habit.emoji} {habit.label}
                        </span>
                        {isBonus && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            bonus
                          </span>
                        )}
                      </button>

                      {/* BJJ class counter */}
                      {habit.hasClassCount && isChecked && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => updateBjjCount(selectedDate, -1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Minus className="h-4 w-4 text-gray-500" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedDayLog?.bjjClassCount || 1}
                          </span>
                          <button
                            onClick={() => updateBjjCount(selectedDate, 1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Plus className="h-4 w-4 text-gray-500" />
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            classes
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Day score */}
            {selectedDayLog && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Day Score
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {calcDayScore(selectedDayLog, selectedDate)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      calcDayScore(selectedDayLog, selectedDate) >= 80
                        ? "bg-emerald-500"
                        : calcDayScore(selectedDayLog, selectedDate) >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${calcDayScore(selectedDayLog, selectedDate)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Weekly Calendar ────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Week of {format(weekStart, "MMM d")}
          </h2>
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const key = getDateKey(day);
            const log = logs[key];
            const score = calcDayScore(log, day);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const isFutureDay = isAfter(day, today) && !isToday;
            const beforeProgram = isBefore(day, PROGRAM_START);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                  isSelected
                    ? "ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                } ${isToday ? "bg-gray-50 dark:bg-gray-700/30" : ""}`}
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {format(day, "EEE")}
                </span>
                <span
                  className={`text-sm font-semibold mt-0.5 ${
                    isToday
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1">
                  {beforeProgram || isFutureDay ? (
                    <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
                  ) : score === null ? (
                    <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                  ) : score >= 80 ? (
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  ) : score >= 50 ? (
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  )}
                </div>
                {score !== null && !beforeProgram && !isFutureDay && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {score}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              80%+
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              50–79%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              &lt;50%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              No data
            </span>
          </div>
        </div>
      </div>

      {/* ─── Monthly Chart ──────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(viewMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="h-48 sm:h-64">
          {monthChartData.labels.length > 0 ? (
            <Bar data={monthChartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              No data for this month yet
            </div>
          )}
        </div>
      </div>

      {/* ─── Monthly Habit Breakdown ────────────────────────── */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {format(viewMonth, "MMMM")} Habit Breakdown
        </h2>

        {monthlyBreakdown.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No data for this month yet
          </p>
        ) : (
          <div className="space-y-3">
            {monthlyBreakdown.map((habit) => (
              <div key={habit.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {habit.emoji} {habit.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {habit.completed}/{habit.applicable}{" "}
                    <span className="text-gray-500 dark:text-gray-400">
                      ({habit.pct}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      habit.pct >= 80
                        ? "bg-emerald-500"
                        : habit.pct >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${habit.pct || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

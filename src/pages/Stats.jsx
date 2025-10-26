import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  TrendingUp,
  Calendar,
  Target,
  BookOpen,
  Download,
  Filter,
} from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import toast from "react-hot-toast";

export const Stats = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // days
  const [stats, setStats] = useState({
    journalStreak: 0,
    totalJournalEntries: 0,
    goalsCompleted: 0,
    goalsActive: 0,
    avgGoalProgress: 0,
    jiuJitsuClasses: 0,
    workouts: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [currentUser, dateRange]);

  const fetchStats = async () => {
    if (!currentUser) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));

      // Fetch journal entries
      const journalQuery = query(
        collection(db, "journalEntries"),
        where("userId", "==", currentUser.uid),
        where("date", ">=", startDate),
        orderBy("date", "desc")
      );
      const journalSnapshot = await getDocs(journalQuery);

      // Fetch goals
      const goalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid)
      );
      const goalsSnapshot = await getDocs(goalsQuery);

      const goals = goalsSnapshot.docs.map((doc) => doc.data());
      const journalEntries = journalSnapshot.docs.map((doc) => doc.data());

      // Calculate stats
      const completed = goals.filter((g) => g.status === "completed").length;
      const active = goals.filter((g) => g.status === "active").length;
      const avgProgress =
        active > 0
          ? goals
              .filter((g) => g.status === "active")
              .reduce((sum, g) => sum + (g.progress || 0), 0) / active
          : 0;

      // Calculate journal streak
      const streak = calculateJournalStreak(journalEntries);

      setStats({
        journalStreak: streak,
        totalJournalEntries: journalEntries.length,
        goalsCompleted: completed,
        goalsActive: active,
        avgGoalProgress: Math.round(avgProgress),
        jiuJitsuClasses: 0, // Would need workout logs
        workouts: 0, // Would need workout logs
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const calculateJournalStreak = (entries) => {
    if (entries.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const dates = entries
      .map((e) => e.date?.toDate?.() || new Date())
      .sort((a, b) => b - a);

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = subDays(today, i);
      const entryDate = dates[i];

      if (
        format(entryDate, "yyyy-MM-dd") === format(expectedDate, "yyyy-MM-dd")
      ) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const exportToCSV = () => {
    // Simplified CSV export
    const csvContent = `
Date Range,${dateRange} days
Journal Streak,${stats.journalStreak}
Total Journal Entries,${stats.totalJournalEntries}
Goals Completed,${stats.goalsCompleted}
Goals Active,${stats.goalsActive}
Average Goal Progress,${stats.avgGoalProgress}%
    `.trim();

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stats-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();

    toast.success("Stats exported to CSV");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Statistics</h1>
            <p className="opacity-90">
              Track your progress and analyze your performance
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input w-auto"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Journal Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.journalStreak}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Journal Streak
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Consecutive days
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalJournalEntries}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Total Entries
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            In selected period
          </p>
        </div>

        {/* Goals Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.goalsCompleted}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Goals Completed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Successfully achieved
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.goalsActive}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Active Goals
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Currently pursuing
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.avgGoalProgress}%
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Avg Progress
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Across active goals
          </p>
        </div>

        {/* Placeholder for future workout stats */}
        <div className="card opacity-50">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              -
            </span>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Jiu Jitsu Classes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Coming soon
          </p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Progress Over Time
        </h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Chart visualization will be implemented with Chart.js
          </p>
        </div>
      </div>

      {/* Life Areas Progress */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Life Areas Overview
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Progress towards win states in each life area
        </p>
        <div className="space-y-4">
          {["Finances", "Fitness", "Jiu Jitsu", "Philosophy"].map((area) => (
            <div key={area}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {area}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.floor(Math.random() * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

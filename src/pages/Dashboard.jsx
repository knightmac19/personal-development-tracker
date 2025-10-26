import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Target,
  TrendingUp,
  Calendar,
  BookOpen,
  Award,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";

export const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [recentGoals, setRecentGoals] = useState([]);
  const [recentJournalEntries, setRecentJournalEntries] = useState([]);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    journalStreak: 0,
    weeklyProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  const lifeAreas = [
    { id: "finances", name: "Finances", icon: "💰", color: "bg-green-500" },
    { id: "fitness", name: "Fitness", icon: "💪", color: "bg-blue-500" },
    { id: "jiu-jitsu", name: "Jiu Jitsu", icon: "🥋", color: "bg-purple-500" },
    { id: "women", name: "Women", icon: "💑", color: "bg-pink-500" },
    {
      id: "attractiveness",
      name: "Attractiveness",
      icon: "✨",
      color: "bg-yellow-500",
    },
    { id: "nutrition", name: "Nutrition", icon: "🥗", color: "bg-green-400" },
    {
      id: "philosophy",
      name: "Philosophy",
      icon: "🧠",
      color: "bg-indigo-500",
    },
    { id: "languages", name: "Languages", icon: "🌍", color: "bg-teal-500" },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      // Fetch recent goals
      const goalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const goalsSnapshot = await getDocs(goalsQuery);
      const goals = goalsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentGoals(goals);

      // Fetch recent journal entries
      const journalQuery = query(
        collection(db, "journalEntries"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const journalSnapshot = await getDocs(journalQuery);
      const entries = journalSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentJournalEntries(entries);

      // Calculate stats
      const allGoalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid)
      );
      const allGoalsSnapshot = await getDocs(allGoalsQuery);
      const totalGoals = allGoalsSnapshot.size;
      const completedGoals = allGoalsSnapshot.docs.filter(
        (doc) => doc.data().status === "completed"
      ).length;

      setStats({
        totalGoals,
        completedGoals,
        journalStreak: calculateJournalStreak(entries),
        weeklyProgress: calculateWeeklyProgress(goals),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateJournalStreak = (entries) => {
    // Simple streak calculation - can be enhanced
    if (entries.length === 0) return 0;

    const today = new Date();
    const lastEntry = entries[0].createdAt?.toDate() || new Date();
    const daysDiff = Math.floor((today - lastEntry) / (1000 * 60 * 60 * 24));

    return daysDiff === 0 ? 1 : 0;
  };

  const calculateWeeklyProgress = (goals) => {
    if (goals.length === 0) return 0;

    const progressSum = goals.reduce(
      (sum, goal) => sum + (goal.progress || 0),
      0
    );
    return Math.round(progressSum / goals.length);
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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back,{" "}
          {userProfile?.displayName || currentUser?.email?.split("@")[0]}!
        </h1>
        <p className="opacity-90">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Active Goals
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {recentGoals.length}
              </p>
            </div>
            <Target className="h-8 w-8 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.completedGoals}
              </p>
            </div>
            <Award className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Journal Streak
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.journalStreak} days
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Weekly Progress
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.weeklyProgress}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Life Areas Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Life Areas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {lifeAreas.map((area) => (
            <Link
              key={area.id}
              to={`/subsection/${area.id}`}
              className="card hover:scale-105 transition-transform duration-200"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-16 h-16 ${area.color} rounded-full flex items-center justify-center text-2xl mb-3`}
                >
                  {area.icon}
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {area.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Goals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Active Goals
            </h2>
            <Link
              to="/goals"
              className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {recentGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No active goals yet
              </p>
              <Link
                to="/goals"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="border-l-4 border-primary-500 pl-4 py-2"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {goal.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {goal.timeframe}
                    </span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mr-2">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${goal.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {goal.progress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Journal Entries */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Journal Entries
            </h2>
            <Link
              to="/journal"
              className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {recentJournalEntries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No journal entries yet
              </p>
              <Link
                to="/journal"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Write Entry
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJournalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-4 border-purple-500 pl-4 py-2"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {entry.title || "Untitled Entry"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {entry.content?.replace(/<[^>]*>/g, "").substring(0, 100)}
                    ...
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {entry.createdAt &&
                      format(entry.createdAt.toDate(), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Target,
  Plus,
  Filter,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { GoalCard } from "../components/goals/GoalCard";
import { CreateGoalModal } from "../components/goals/CreateGoalModal";
import { format, isThisWeek, isThisMonth, isThisYear } from "date-fns";

export const Goals = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter states
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [filterSubsection, setFilterSubsection] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  const subsections = [
    "general",
    "finances",
    "fitness",
    "jiu-jitsu",
    "women",
    "attractiveness",
    "nutrition",
    "philosophy",
    "languages",
  ];

  useEffect(() => {
    fetchGoals();
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [goals, filterTimeframe, filterSubsection, filterStatus]);

  const fetchGoals = async () => {
    if (!currentUser) return;

    try {
      const goalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(goalsQuery);
      const goalsData = snapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));

      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...goals];

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((goal) => goal.status === filterStatus);
    }

    // Timeframe filter
    if (filterTimeframe !== "all") {
      filtered = filtered.filter((goal) => goal.timeframe === filterTimeframe);
    }

    // Subsection filter
    if (filterSubsection !== "all") {
      filtered = filtered.filter(
        (goal) => goal.subsection === filterSubsection
      );
    }

    setFilteredGoals(filtered);
  };

  const getGoalsByTimeframe = (timeframe) => {
    return filteredGoals.filter((goal) => goal.timeframe === timeframe);
  };

  const stats = {
    total: goals.length,
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    thisWeek: goals.filter((g) => {
      const startDate = g.startDate?.toDate();
      return startDate && isThisWeek(startDate);
    }).length,
    thisMonth: goals.filter((g) => {
      const startDate = g.startDate?.toDate();
      return startDate && isThisMonth(startDate);
    }).length,
    thisYear: goals.filter((g) => {
      const startDate = g.startDate?.toDate();
      return startDate && isThisYear(startDate);
    }).length,
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Goals Overview</h1>
            <p className="opacity-90">
              Track and manage all your goals across different life areas
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Goal
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Goals
          </p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-primary-600">{stats.active}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">
            {stats.thisMonth}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.thisYear}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">This Year</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Timeframe
            </label>
            <select
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value)}
              className="input"
            >
              <option value="all">All Timeframes</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Life Area
            </label>
            <select
              value={filterSubsection}
              onChange={(e) => setFilterSubsection(e.target.value)}
              className="input"
            >
              <option value="all">All Areas</option>
              {subsections.map((sub) => (
                <option key={sub} value={sub}>
                  {sub.charAt(0).toUpperCase() + sub.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Goals by Timeframe */}
      {filterTimeframe === "all" ? (
        <>
          {/* Yearly Goals */}
          {getGoalsByTimeframe("yearly").length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Yearly Goals ({getGoalsByTimeframe("yearly").length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getGoalsByTimeframe("yearly").map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdate={(updatedGoal) => {
                      setGoals(
                        goals.map((g) =>
                          g.id === updatedGoal.id ? updatedGoal : g
                        )
                      );
                    }}
                    onDelete={(goalId) => {
                      setGoals(goals.filter((g) => g.id !== goalId));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Monthly Goals */}
          {getGoalsByTimeframe("monthly").length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Goals ({getGoalsByTimeframe("monthly").length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getGoalsByTimeframe("monthly").map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdate={(updatedGoal) => {
                      setGoals(
                        goals.map((g) =>
                          g.id === updatedGoal.id ? updatedGoal : g
                        )
                      );
                    }}
                    onDelete={(goalId) => {
                      setGoals(goals.filter((g) => g.id !== goalId));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Weekly Goals */}
          {getGoalsByTimeframe("weekly").length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Weekly Goals ({getGoalsByTimeframe("weekly").length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getGoalsByTimeframe("weekly").map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdate={(updatedGoal) => {
                      setGoals(
                        goals.map((g) =>
                          g.id === updatedGoal.id ? updatedGoal : g
                        )
                      );
                    }}
                    onDelete={(goalId) => {
                      setGoals(goals.filter((g) => g.id !== goalId));
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Filtered Goals */
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Filtered Goals ({filteredGoals.length})
          </h2>
          {filteredGoals.length === 0 ? (
            <div className="card text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No goals match your filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onUpdate={(updatedGoal) => {
                    setGoals(
                      goals.map((g) =>
                        g.id === updatedGoal.id ? updatedGoal : g
                      )
                    );
                  }}
                  onDelete={(goalId) => {
                    setGoals(goals.filter((g) => g.id !== goalId));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Links to Life Areas */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Access to Life Areas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subsections.map((sub) => (
            <Link
              key={sub}
              to={`/subsection/${sub}`}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal
          subsection="general"
          onClose={() => setShowCreateModal(false)}
          onGoalCreated={(newGoal) => {
            setGoals([newGoal, ...goals]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

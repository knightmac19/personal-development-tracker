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
  CheckSquare,
  Trash2,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { TodoList } from "../components/common/TodoList";
import toast from "react-hot-toast";

export const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [recentGoals, setRecentGoals] = useState([]);
  const [recentJournalEntries, setRecentJournalEntries] = useState([]);
  const [todayTodos, setTodayTodos] = useState([]);
  const [weeklyTodos, setWeeklyTodos] = useState([]);
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

      // Fetch todos
      const todayTodosQuery = query(
        collection(db, "todos"),
        where("userId", "==", currentUser.uid),
        where("type", "==", "today"),
        orderBy("createdAt", "desc")
      );
      const todaySnapshot = await getDocs(todayTodosQuery);
      const todayTodosData = todaySnapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));
      setTodayTodos(todayTodosData);

      const weeklyTodosQuery = query(
        collection(db, "todos"),
        where("userId", "==", currentUser.uid),
        where("type", "==", "weekly"),
        orderBy("createdAt", "desc")
      );
      const weeklySnapshot = await getDocs(weeklyTodosQuery);
      const weeklyTodosData = weeklySnapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));
      setWeeklyTodos(weeklyTodosData);

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

  const handleAddTodo = async (text, type) => {
    if (!currentUser) return;

    const todoId = `todo_${Date.now()}`;
    const newTodo = {
      text,
      type,
      completed: false,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "todos", `${currentUser.uid}_${todoId}`), newTodo);

      const todoWithId = {
        id: todoId,
        ...newTodo,
        createdAt: { toDate: () => new Date() },
      };

      if (type === "today") {
        setTodayTodos([todoWithId, ...todayTodos]);
      } else {
        setWeeklyTodos([todoWithId, ...weeklyTodos]);
      }
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  const handleToggleTodo = async (todoId, type) => {
    if (!currentUser) return;

    const todos = type === "today" ? todayTodos : weeklyTodos;
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      await updateDoc(doc(db, "todos", `${currentUser.uid}_${todoId}`), {
        completed: !todo.completed,
      });

      const updatedTodos = todos.map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );

      if (type === "today") {
        setTodayTodos(updatedTodos);
      } else {
        setWeeklyTodos(updatedTodos);
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const handleDeleteTodo = async (todoId, type) => {
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, "todos", `${currentUser.uid}_${todoId}`));

      if (type === "today") {
        setTodayTodos(todayTodos.filter((t) => t.id !== todoId));
      } else {
        setWeeklyTodos(weeklyTodos.filter((t) => t.id !== todoId));
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const handleClearAllTodos = async (type) => {
    const todoList = type === "today" ? todayTodos : weeklyTodos;
    const confirmMessage = `Are you sure you want to clear all ${
      type === "today" ? "today's" : "weekly"
    } todos? This cannot be undone.`;

    if (todoList.length === 0) return;

    if (!confirm(confirmMessage)) return;

    try {
      const deletePromises = todoList.map((todo) =>
        deleteDoc(doc(db, "todos", `${currentUser.uid}_${todo.id}`))
      );

      await Promise.all(deletePromises);

      if (type === "today") {
        setTodayTodos([]);
      } else {
        setWeeklyTodos([]);
      }

      toast.success(
        `All ${type === "today" ? "today's" : "weekly"} todos cleared`
      );
    } catch (error) {
      console.error("Error clearing todos:", error);
      toast.error("Failed to clear todos");
    }
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

      {/* Todos Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Todos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
              Today's Todos
            </h2>
            {todayTodos.length > 0 && (
              <button
                onClick={() => handleClearAllTodos("today")}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                title="Clear all today's todos"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </button>
            )}
          </div>
          <TodoList
            todos={todayTodos}
            title=""
            onAddTodo={(text) => handleAddTodo(text, "today")}
            onToggleTodo={(id) => handleToggleTodo(id, "today")}
            onDeleteTodo={(id) => handleDeleteTodo(id, "today")}
            showDate={false}
            compact={true}
          />
        </div>

        {/* Weekly Todos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Weekly Todos
            </h2>
            {weeklyTodos.length > 0 && (
              <button
                onClick={() => handleClearAllTodos("weekly")}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                title="Clear all weekly todos"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </button>
            )}
          </div>
          <TodoList
            todos={weeklyTodos}
            title=""
            onAddTodo={(text) => handleAddTodo(text, "weekly")}
            onToggleTodo={(id) => handleToggleTodo(id, "weekly")}
            onDeleteTodo={(id) => handleDeleteTodo(id, "weekly")}
            showDate={false}
            compact={true}
          />
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

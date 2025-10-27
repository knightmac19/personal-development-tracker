import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Target,
  Plus,
  Edit2,
  Save,
  X,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { GoalCard } from "../components/goals/GoalCard";
import { CreateGoalModal } from "../components/goals/CreateGoalModal";
import toast from "react-hot-toast";

export const LifeSubsection = () => {
  const { subsectionName } = useParams();
  const { currentUser } = useAuth();
  const [winState, setWinState] = useState(null);
  const [goals, setGoals] = useState([]);
  const [editingWinState, setEditingWinState] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [winStateForm, setWinStateForm] = useState({
    description: "",
    metrics: [],
  });

  const subsectionInfo = {
    finances: {
      name: "Finances",
      icon: "💰",
      color: "bg-green-500",
      defaultMetrics: [
        { name: "Net Worth", unit: "$", targetValue: 0, currentValue: 0 },
        {
          name: "Passive Income",
          unit: "$/month",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
    fitness: {
      name: "Fitness",
      icon: "💪",
      color: "bg-blue-500",
      defaultMetrics: [
        { name: "Body Weight", unit: "lbs", targetValue: 0, currentValue: 0 },
        { name: "Body Fat %", unit: "%", targetValue: 0, currentValue: 0 },
        { name: "Bench Press", unit: "lbs", targetValue: 0, currentValue: 0 },
      ],
    },
    "jiu-jitsu": {
      name: "Jiu Jitsu",
      icon: "🥋",
      color: "bg-purple-500",
      defaultMetrics: [
        { name: "Belt Level", unit: "", targetValue: 0, currentValue: 0 },
        {
          name: "Classes Attended",
          unit: "classes",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Competitions Won",
          unit: "wins",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
    women: {
      name: "Women",
      icon: "💑",
      color: "bg-pink-500",
      defaultMetrics: [
        {
          name: "Relationship Quality",
          unit: "/10",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Social Confidence",
          unit: "/10",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
    attractiveness: {
      name: "Attractive",
      icon: "✨",
      color: "bg-yellow-500",
      defaultMetrics: [
        {
          name: "Physical Fitness",
          unit: "/10",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Style & Grooming",
          unit: "/10",
          targetValue: 0,
          currentValue: 0,
        },
        { name: "Charisma", unit: "/10", targetValue: 0, currentValue: 0 },
      ],
    },
    nutrition: {
      name: "Nutrition",
      icon: "🥗",
      color: "bg-green-400",
      defaultMetrics: [
        {
          name: "Daily Calories",
          unit: "kcal",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Protein Intake",
          unit: "g/day",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Healthy Meals",
          unit: "/week",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
    philosophy: {
      name: "Philosophy",
      icon: "🧠",
      color: "bg-indigo-500",
      defaultMetrics: [
        { name: "Books Read", unit: "books", targetValue: 0, currentValue: 0 },
        {
          name: "Meditation Practice",
          unit: "days/year",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Life Satisfaction",
          unit: "/10",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
    languages: {
      name: "Languages",
      icon: "🌍",
      color: "bg-teal-500",
      defaultMetrics: [
        {
          name: "Languages Fluent",
          unit: "languages",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Vocabulary Size",
          unit: "words",
          targetValue: 0,
          currentValue: 0,
        },
        {
          name: "Practice Hours",
          unit: "hrs/week",
          targetValue: 0,
          currentValue: 0,
        },
      ],
    },
  };

  const currentSubsection =
    subsectionInfo[subsectionName] || subsectionInfo["fitness"];

  useEffect(() => {
    fetchSubsectionData();
  }, [currentUser, subsectionName]);

  const fetchSubsectionData = async () => {
    if (!currentUser) return;

    try {
      // Fetch win state
      const winStateDoc = await getDoc(
        doc(db, "lifeSubsections", `${currentUser.uid}_${subsectionName}`)
      );

      if (winStateDoc.exists()) {
        const data = winStateDoc.data();
        setWinState(data.winState);
        setWinStateForm({
          description: data.winState?.description || "",
          metrics: data.winState?.metrics || currentSubsection.defaultMetrics,
        });
      } else {
        // Initialize with default metrics if no win state exists
        setWinStateForm({
          description: "",
          metrics: currentSubsection.defaultMetrics,
        });
      }

      // Fetch goals for this subsection
      const goalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid),
        where("subsection", "==", subsectionName),
        orderBy("createdAt", "desc")
      );

      const goalsSnapshot = await getDocs(goalsQuery);
      const goalsData = goalsSnapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));

      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching subsection data:", error);
      toast.error("Failed to load subsection data");
    } finally {
      setLoading(false);
    }
  };

  const saveWinState = async () => {
    if (!currentUser) return;

    try {
      await setDoc(
        doc(db, "lifeSubsections", `${currentUser.uid}_${subsectionName}`),
        {
          name: subsectionName,
          userId: currentUser.uid,
          winState: winStateForm,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setWinState(winStateForm);
      setEditingWinState(false);
      toast.success("Win state updated successfully");
    } catch (error) {
      console.error("Error saving win state:", error);
      toast.error("Failed to save win state");
    }
  };

  const addMetric = () => {
    setWinStateForm({
      ...winStateForm,
      metrics: [
        ...winStateForm.metrics,
        { name: "", unit: "", targetValue: 0, currentValue: 0 },
      ],
    });
  };

  const updateMetric = (index, field, value) => {
    const updatedMetrics = [...winStateForm.metrics];
    updatedMetrics[index][field] = field.includes("Value")
      ? parseFloat(value) || 0
      : value;
    setWinStateForm({
      ...winStateForm,
      metrics: updatedMetrics,
    });
  };

  const removeMetric = (index) => {
    setWinStateForm({
      ...winStateForm,
      metrics: winStateForm.metrics.filter((_, i) => i !== index),
    });
  };

  const calculateOverallProgress = () => {
    if (!winState?.metrics || winState.metrics.length === 0) return 0;

    let totalProgress = 0;
    let validMetrics = 0;

    winState.metrics.forEach((metric) => {
      if (metric.targetValue > 0) {
        const progress = (metric.currentValue / metric.targetValue) * 100;
        totalProgress += Math.min(progress, 100);
        validMetrics++;
      }
    });

    return validMetrics > 0 ? Math.round(totalProgress / validMetrics) : 0;
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

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
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className={`w-16 h-16 ${currentSubsection.color} rounded-full flex items-center justify-center text-3xl`}
            >
              {currentSubsection.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{currentSubsection.name}</h1>
              <p className="text-gray-300 mt-1">
                Track your progress and achieve your goals
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Overall Progress</p>
            <p className="text-3xl font-bold">{calculateOverallProgress()}%</p>
          </div>
        </div>
      </div>

      {/* Win State Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
            Win State
          </h2>
          <button
            onClick={() => setEditingWinState(!editingWinState)}
            className="btn-secondary flex items-center"
          >
            {editingWinState ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </button>
        </div>

        {editingWinState ? (
          <div className="space-y-4">
            <div>
              <label className="label">Win State Description</label>
              <textarea
                value={winStateForm.description}
                onChange={(e) =>
                  setWinStateForm({
                    ...winStateForm,
                    description: e.target.value,
                  })
                }
                className="input min-h-[100px]"
                placeholder="Describe what success looks like in this area..."
              />
            </div>

            <div>
              <label className="label">Success Metrics</label>
              <div className="space-y-3">
                {winStateForm.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={metric.name}
                      onChange={(e) =>
                        updateMetric(index, "name", e.target.value)
                      }
                      className="input flex-1"
                      placeholder="Metric name"
                    />
                    <input
                      type="text"
                      value={metric.unit}
                      onChange={(e) =>
                        updateMetric(index, "unit", e.target.value)
                      }
                      className="input w-24"
                      placeholder="Unit"
                    />
                    <input
                      type="number"
                      value={metric.currentValue}
                      onChange={(e) =>
                        updateMetric(index, "currentValue", e.target.value)
                      }
                      className="input w-32"
                      placeholder="Current"
                    />
                    <input
                      type="number"
                      value={metric.targetValue}
                      onChange={(e) =>
                        updateMetric(index, "targetValue", e.target.value)
                      }
                      className="input w-32"
                      placeholder="Target"
                    />
                    <button
                      onClick={() => removeMetric(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2 mt-4">
                <button onClick={addMetric} className="btn-secondary">
                  Add Metric
                </button>
                <button onClick={saveWinState} className="btn-primary">
                  <Save className="h-4 w-4 mr-2" />
                  Save Win State
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {winState?.description ? (
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {winState.description}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic mb-4">
                No win state defined yet. Click edit to define your success
                criteria.
              </p>
            )}

            {winState?.metrics && winState.metrics.length > 0 && (
              <div className="space-y-3">
                {winState.metrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {metric.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {metric.currentValue} / {metric.targetValue}{" "}
                        {metric.unit}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(
                            (metric.currentValue / metric.targetValue) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Active Goals ({activeGoals.length})
          </h2>
          <button
            onClick={() => setShowCreateGoal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Goal
          </button>
        </div>

        {activeGoals.length === 0 ? (
          <div className="card text-center py-12">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No active goals in this area yet
            </p>
            <button
              onClick={() => setShowCreateGoal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeGoals.map((goal) => (
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

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {completedGoals.map((goal) => (
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

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <CreateGoalModal
          subsection={subsectionName}
          onClose={() => setShowCreateGoal(false)}
          onGoalCreated={(newGoal) => {
            setGoals([newGoal, ...goals]);
            setShowCreateGoal(false);
          }}
        />
      )}
    </div>
  );
};

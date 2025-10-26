import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X, Plus, Trash2, Calendar, Target, ChevronDown } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import {
  addDays,
  addMonths,
  addYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import toast from "react-hot-toast";

export const CreateGoalModal = ({
  subsection,
  onClose,
  onGoalCreated,
  parentGoal = null,
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeframe: "monthly",
    customStartDate: "",
    customEndDate: "",
    actionSteps: [
      {
        id: "1",
        description: "",
        completed: false,
        targetValue: null,
        currentValue: 0,
      },
    ],
    parentGoalId: parentGoal?.id || null,
  });

  const calculateDates = () => {
    const now = new Date();
    let startDate, endDate;

    switch (formData.timeframe) {
      case "weekly":
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case "monthly":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "yearly":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "custom":
        startDate = formData.customStartDate
          ? new Date(formData.customStartDate)
          : now;
        endDate = formData.customEndDate
          ? new Date(formData.customEndDate)
          : addDays(now, 30);
        break;
      default:
        startDate = now;
        endDate = addDays(now, 30);
    }

    return { startDate, endDate };
  };

  const addActionStep = () => {
    setFormData({
      ...formData,
      actionSteps: [
        ...formData.actionSteps,
        {
          id: Date.now().toString(),
          description: "",
          completed: false,
          targetValue: null,
          currentValue: 0,
        },
      ],
    });
  };

  const removeActionStep = (index) => {
    if (formData.actionSteps.length > 1) {
      setFormData({
        ...formData,
        actionSteps: formData.actionSteps.filter((_, i) => i !== index),
      });
    }
  };

  const updateActionStep = (index, field, value) => {
    const updatedSteps = [...formData.actionSteps];
    if (field === "targetValue") {
      updatedSteps[index][field] = value ? parseInt(value) : null;
    } else {
      updatedSteps[index][field] = value;
    }
    setFormData({ ...formData, actionSteps: updatedSteps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    if (formData.actionSteps.every((step) => !step.description.trim())) {
      toast.error("Please add at least one action step");
      return;
    }

    setLoading(true);

    try {
      const { startDate, endDate } = calculateDates();
      const goalId = `goal_${Date.now()}`;

      // Filter out empty action steps
      const validActionSteps = formData.actionSteps.filter((step) =>
        step.description.trim()
      );

      const goalData = {
        title: formData.title,
        description: formData.description,
        subsection: subsection,
        timeframe: formData.timeframe,
        startDate,
        endDate,
        actionSteps: validActionSteps,
        progress: 0,
        status: "active",
        userId: currentUser.uid,
        parentGoalId: formData.parentGoalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "goals", `${currentUser.uid}_${goalId}`), goalData);

      toast.success("Goal created successfully!");

      if (onGoalCreated) {
        onGoalCreated({
          id: goalId,
          ...goalData,
          startDate: { toDate: () => startDate },
          endDate: { toDate: () => endDate },
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        });
      }

      onClose();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Goal
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          {parentGoal && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Creating sub-goal for: {parentGoal.title}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Goal Title */}
          <div>
            <label className="label">Goal Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input"
              placeholder="e.g., Attend 20 Jiu Jitsu classes this month"
              disabled={loading}
            />
          </div>

          {/* Goal Description */}
          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input min-h-[80px]"
              placeholder="Add more details about this goal..."
              disabled={loading}
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="label">Timeframe</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["weekly", "monthly", "yearly", "custom"].map((timeframe) => (
                <button
                  key={timeframe}
                  type="button"
                  onClick={() => setFormData({ ...formData, timeframe })}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.timeframe === timeframe
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  disabled={loading}
                >
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {formData.timeframe === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={formData.customStartDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customStartDate: e.target.value,
                    })
                  }
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  value={formData.customEndDate}
                  onChange={(e) =>
                    setFormData({ ...formData, customEndDate: e.target.value })
                  }
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Action Steps */}
          <div>
            <label className="label mb-3">
              Action Steps *
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Define the steps needed to achieve this goal)
              </span>
            </label>
            <div className="space-y-3">
              {formData.actionSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) =>
                        updateActionStep(index, "description", e.target.value)
                      }
                      className="input"
                      placeholder={`Step ${index + 1}: e.g., Attend class #${
                        index + 1
                      }`}
                      disabled={loading}
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={step.targetValue || ""}
                      onChange={(e) =>
                        updateActionStep(index, "targetValue", e.target.value)
                      }
                      className="input"
                      placeholder="Target"
                      disabled={loading}
                    />
                  </div>
                  {formData.actionSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActionStep(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addActionStep}
              className="mt-3 btn-secondary flex items-center"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </button>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ChevronDown
                className={`h-4 w-4 mr-1 transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Advanced options like goal dependencies, notifications, and
                  custom metrics will be available soon.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Create Goal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

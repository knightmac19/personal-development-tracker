import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export const GoalCard = ({ goal, onUpdate, onDelete }) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSteps, setEditedSteps] = useState(goal.actionSteps || []);
  const [loading, setLoading] = useState(false);

  const getNextActionStep = () => {
    const incompleteSteps = goal.actionSteps?.filter((step) => !step.completed);
    return incompleteSteps?.[0];
  };

  const toggleStepCompletion = async (stepIndex) => {
    const updatedSteps = [...editedSteps];
    updatedSteps[stepIndex].completed = !updatedSteps[stepIndex].completed;

    // Update progress for quantifiable steps
    if (updatedSteps[stepIndex].targetValue) {
      updatedSteps[stepIndex].currentValue = updatedSteps[stepIndex].completed
        ? updatedSteps[stepIndex].targetValue
        : 0;
    }

    await updateGoal(updatedSteps);
  };

  const calculateProgress = (steps) => {
    if (!steps || steps.length === 0) return 0;

    let totalWeight = 0;
    let completedWeight = 0;

    steps.forEach((step) => {
      if (step.targetValue) {
        // Quantifiable step
        totalWeight += step.targetValue;
        completedWeight += step.currentValue || 0;
      } else {
        // Binary step
        totalWeight += 1;
        completedWeight += step.completed ? 1 : 0;
      }
    });

    return Math.round((completedWeight / totalWeight) * 100);
  };

  const updateGoal = async (updatedSteps) => {
    setLoading(true);
    try {
      const progress = calculateProgress(updatedSteps);
      const status = progress === 100 ? "completed" : "active";

      await updateDoc(doc(db, "goals", `${currentUser.uid}_${goal.id}`), {
        actionSteps: updatedSteps,
        progress,
        status,
        updatedAt: new Date(),
      });

      setEditedSteps(updatedSteps);

      if (onUpdate) {
        onUpdate({
          ...goal,
          actionSteps: updatedSteps,
          progress,
          status,
        });
      }

      toast.success("Goal updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async () => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "goals", `${currentUser.uid}_${goal.id}`));

      if (onDelete) {
        onDelete(goal.id);
      }

      toast.success("Goal deleted successfully");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    } finally {
      setLoading(false);
    }
  };

  const addActionStep = () => {
    setEditedSteps([
      ...editedSteps,
      {
        id: Date.now().toString(),
        description: "",
        completed: false,
        targetValue: null,
        currentValue: 0,
      },
    ]);
  };

  const removeActionStep = (index) => {
    setEditedSteps(editedSteps.filter((_, i) => i !== index));
  };

  const updateActionStep = (index, field, value) => {
    const updated = [...editedSteps];
    updated[index][field] = value;
    setEditedSteps(updated);
  };

  const nextStep = getNextActionStep();
  const timeframeColors = {
    weekly: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    monthly:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    yearly: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    custom:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <div className="card">
      {/* Goal Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {goal.title}
          </h3>
          <div className="flex items-center space-x-2 text-sm">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                timeframeColors[goal.timeframe]
              }`}
            >
              {goal.timeframe}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {goal.subsection}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={deleteGoal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {goal.progress || 0}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${goal.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Next Action Step (Collapsed View) */}
      {!isExpanded && nextStep && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Next Step:
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {nextStep.description}
            {nextStep.targetValue && (
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                ({nextStep.currentValue || 0}/{nextStep.targetValue})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Date Information */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          Start:{" "}
          {goal.startDate && format(goal.startDate.toDate(), "MMM d, yyyy")}
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          End: {goal.endDate && format(goal.endDate.toDate(), "MMM d, yyyy")}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center py-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            Show All Steps
          </>
        )}
      </button>

      {/* Expanded Action Steps */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Action Steps
          </h4>

          {isEditing ? (
            <div className="space-y-3">
              {editedSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-2">
                  <input
                    type="text"
                    value={step.description}
                    onChange={(e) =>
                      updateActionStep(index, "description", e.target.value)
                    }
                    className="input flex-1"
                    placeholder="Step description"
                  />
                  <input
                    type="number"
                    value={step.targetValue || ""}
                    onChange={(e) =>
                      updateActionStep(
                        index,
                        "targetValue",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="input w-20"
                    placeholder="Target"
                  />
                  <button
                    onClick={() => removeActionStep(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex space-x-2 mt-4">
                <button onClick={addActionStep} className="btn-secondary">
                  Add Step
                </button>
                <button
                  onClick={() => updateGoal(editedSteps)}
                  className="btn-primary"
                  disabled={loading}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditedSteps(goal.actionSteps || []);
                    setIsEditing(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {goal.actionSteps?.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                  onClick={() => toggleStepCompletion(index)}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span
                    className={`flex-1 ${
                      step.completed
                        ? "line-through text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {step.description}
                  </span>
                  {step.targetValue && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {step.currentValue || 0}/{step.targetValue}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

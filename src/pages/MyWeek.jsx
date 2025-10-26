import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Calendar,
  Grid3x3,
  List,
  Plus,
  Edit2,
  Save,
  X,
  Sunrise,
  Sun,
  Coffee,
  Clock,
  Sunset,
  Moon,
  Bed,
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

export const MyWeek = () => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const timeSlots = [
    "Early Morning",
    "Morning",
    "Late Morning",
    "Afternoon",
    "Late Afternoon",
    "Evening",
    "Night",
  ];

  const timeIcons = {
    "Early Morning": <Sunrise className="h-4 w-4 text-orange-500" />,
    Morning: <Coffee className="h-4 w-4 text-amber-600" />,
    "Late Morning": <Sun className="h-4 w-4 text-yellow-500" />,
    Afternoon: <Sun className="h-4 w-4 text-yellow-600" />,
    "Late Afternoon": <Sunset className="h-4 w-4 text-orange-600" />,
    Evening: <Moon className="h-4 w-4 text-indigo-600" />,
    Night: <Bed className="h-4 w-4 text-purple-600" />,
  };

  const timeDescriptions = {
    "Early Morning": "5:30-7:00",
    Morning: "7:00-10:00",
    "Late Morning": "10:00-12:00",
    Afternoon: "12:00-3:30",
    "Late Afternoon": "3:30-6:00",
    Evening: "6:00-8:30",
    Night: "8:30-10:00",
  };

  const [schedule, setSchedule] = useState({});
  const [editingSchedule, setEditingSchedule] = useState({});

  useEffect(() => {
    fetchSchedule();
  }, [currentUser]);

  const fetchSchedule = async () => {
    if (!currentUser) return;

    try {
      const scheduleDoc = await getDoc(
        doc(db, "weeklySchedule", currentUser.uid)
      );

      if (scheduleDoc.exists()) {
        setSchedule(scheduleDoc.data().schedule || {});
        setEditingSchedule(scheduleDoc.data().schedule || {});
      } else {
        // Initialize empty schedule
        const emptySchedule = {};
        days.forEach((day) => {
          emptySchedule[day] = {};
          timeSlots.forEach((slot) => {
            emptySchedule[day][slot] = "";
          });
        });
        setSchedule(emptySchedule);
        setEditingSchedule(emptySchedule);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "weeklySchedule", currentUser.uid), {
        schedule: editingSchedule,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      setSchedule(editingSchedule);
      setIsEditing(false);
      toast.success("Schedule saved successfully");
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const updateScheduleItem = (day, timeSlot, value) => {
    setEditingSchedule({
      ...editingSchedule,
      [day]: {
        ...editingSchedule[day],
        [timeSlot]: value,
      },
    });
  };

  const cancelEditing = () => {
    setEditingSchedule(schedule);
    setIsEditing(false);
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Week</h1>
            <p className="opacity-90">Your typical weekly schedule template</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="bg-white/20 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600"
                    : "text-white hover:bg-white/20"
                }`}
                title="Grid View"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-blue-600"
                    : "text-white hover:bg-white/20"
                }`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            {/* Edit/Save Button */}
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={saveSchedule}
                  disabled={saving}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
              >
                <Edit2 className="h-5 w-5 mr-2" />
                Edit Schedule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                  Time
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 min-w-[120px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot) => (
                <tr
                  key={timeSlot}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {timeIcons[timeSlot]}
                      <div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {timeSlot}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {timeDescriptions[timeSlot]}
                        </div>
                      </div>
                    </div>
                  </td>
                  {days.map((day) => (
                    <td key={`${day}-${timeSlot}`} className="p-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingSchedule[day]?.[timeSlot] || ""}
                          onChange={(e) =>
                            updateScheduleItem(day, timeSlot, e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500"
                          placeholder="Add activity..."
                        />
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {schedule[day]?.[timeSlot] || (
                            <span className="text-gray-400 dark:text-gray-600 italic">
                              Empty
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day} className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {day}
              </h3>
              <div className="space-y-3">
                {timeSlots.map((timeSlot) => (
                  <div
                    key={`${day}-${timeSlot}`}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex items-center space-x-2 w-40 flex-shrink-0">
                      {timeIcons[timeSlot]}
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {timeSlot}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {timeDescriptions[timeSlot]}
                        </div>
                      </div>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingSchedule[day]?.[timeSlot] || ""}
                        onChange={(e) =>
                          updateScheduleItem(day, timeSlot, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                        placeholder="Add activity..."
                      />
                    ) : (
                      <div className="flex-1 px-3 py-2">
                        {schedule[day]?.[timeSlot] ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {schedule[day][timeSlot]}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 italic">
                            No activity scheduled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {isEditing && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                Editing Your Schedule
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Add your typical activities for each time slot. This template
                represents your ideal week and won't change unless you edit it.
                Use it as a reference for planning your actual week.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

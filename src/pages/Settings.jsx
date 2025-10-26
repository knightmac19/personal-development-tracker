import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  User,
  Moon,
  Sun,
  Bell,
  Shield,
  Mail,
  Save,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

export const Settings = () => {
  const {
    currentUser,
    userProfile,
    updateUserSettings,
    logout,
    resetPassword,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || ""
  );

  const [settings, setSettings] = useState({
    emailNotifications: userProfile?.settings?.emailNotifications || false,
    journalReminders: userProfile?.settings?.journalReminders || false,
    goalDeadlineAlerts: userProfile?.settings?.goalDeadlineAlerts || true,
    weeklyReports: userProfile?.settings?.weeklyReports || false,
  });

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
    if (userProfile?.settings) {
      setSettings({
        emailNotifications: userProfile.settings.emailNotifications || false,
        journalReminders: userProfile.settings.journalReminders || false,
        goalDeadlineAlerts: userProfile.settings.goalDeadlineAlerts || true,
        weeklyReports: userProfile.settings.weeklyReports || false,
      });
    }
  }, [userProfile]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateUserSettings({
        ...userProfile?.settings,
        ...settings,
        displayName,
        theme,
      });
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;

    setSendingReset(true);
    try {
      await resetPassword(currentUser.email);
      toast.success("Password reset email sent");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await logout();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="opacity-90">
          Manage your account and application preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <User className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Profile Information
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="input"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This is how you'll be greeted in the app
            </p>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={currentUser?.email || ""}
              disabled
              className="input bg-gray-50 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="label">User ID</label>
            <input
              type="text"
              value={currentUser?.uid || ""}
              disabled
              className="input bg-gray-50 dark:bg-gray-800 font-mono text-sm"
            />
          </div>

          <div>
            <label className="label">Member Since</label>
            <input
              type="text"
              value={
                userProfile?.createdAt
                  ? new Date(
                      userProfile.createdAt.seconds * 1000
                    ).toLocaleDateString()
                  : "N/A"
              }
              disabled
              className="input bg-gray-50 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          {theme === "light" ? (
            <Sun className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
          ) : (
            <Moon className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
          )}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Theme</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your preferred color scheme
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Email Notifications
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive updates about your goals and progress
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  emailNotifications: !settings.emailNotifications,
                })
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Journal Reminders
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Daily reminders to write in your journal
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  journalReminders: !settings.journalReminders,
                })
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.journalReminders ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Goal Deadline Alerts
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Notifications when goals are approaching deadlines
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  goalDeadlineAlerts: !settings.goalDeadlineAlerts,
                })
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.goalDeadlineAlerts
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Weekly Progress Reports
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Weekly email summary of your progress
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  weeklyReports: !settings.weeklyReports,
                })
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.weeklyReports ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Notification Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Security
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Password Reset
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Send a password reset link to your email address
            </p>
            <button
              onClick={handlePasswordReset}
              disabled={sendingReset}
              className="btn-secondary flex items-center"
            >
              {sendingReset ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200 dark:border-red-900">
        <div className="flex items-center mb-6">
          <LogOut className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
        </div>

        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Sign out of your account on this device
          </p>
          <button
            onClick={handleLogout}
            className="btn-danger flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

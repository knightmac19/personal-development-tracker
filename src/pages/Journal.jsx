import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { JournalEditor } from "../components/journal/JournalEditor";
import toast from "react-hot-toast";

export const Journal = () => {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const subsectionTags = [
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
    fetchJournalEntries();
  }, [currentUser]);

  useEffect(() => {
    filterEntries();
  }, [
    entries,
    searchTerm,
    selectedTags,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const fetchJournalEntries = async () => {
    if (!currentUser) return;

    try {
      const entriesQuery = query(
        collection(db, "journalEntries"),
        where("userId", "==", currentUser.uid),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(entriesQuery);
      const entriesData = snapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));

      setEntries(entriesData);
      setFilteredEntries(entriesData);

      if (entriesData.length > 0 && !selectedEntry) {
        setSelectedEntry(entriesData[0]);
      }
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.content?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((entry) =>
        entry.tags?.some((tag) => selectedTags.includes(tag))
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "three-months":
          startDate = subMonths(now, 3);
          endDate = new Date();
          break;
        case "custom":
          startDate = customStartDate ? new Date(customStartDate) : null;
          endDate = customEndDate ? new Date(customEndDate) : null;
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter((entry) => {
          const entryDate = entry.date?.toDate() || new Date();
          return entryDate >= startDate && entryDate <= endDate;
        });
      }
    }

    setFilteredEntries(filtered);
  };

  const handleCreateEntry = async (entryData) => {
    if (!currentUser) return;

    try {
      const entryId = `entry_${Date.now()}`;
      const newEntry = {
        ...entryData,
        userId: currentUser.uid,
        date: new Date(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "journalEntries", `${currentUser.uid}_${entryId}`),
        newEntry
      );

      const entryWithId = {
        id: entryId,
        ...newEntry,
        date: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      setEntries([entryWithId, ...entries]);
      setSelectedEntry(entryWithId);
      setIsCreating(false);
      toast.success("Journal entry created successfully");
    } catch (error) {
      console.error("Error creating entry:", error);
      toast.error("Failed to create journal entry");
    }
  };

  const handleUpdateEntry = async (entryData) => {
    if (!currentUser || !selectedEntry) return;

    try {
      const updatedEntry = {
        ...entryData,
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "journalEntries", `${currentUser.uid}_${selectedEntry.id}`),
        updatedEntry,
        { merge: true }
      );

      const updatedEntries = entries.map((entry) =>
        entry.id === selectedEntry.id
          ? {
              ...entry,
              ...updatedEntry,
              updatedAt: { toDate: () => new Date() },
            }
          : entry
      );

      setEntries(updatedEntries);
      setSelectedEntry({ ...selectedEntry, ...updatedEntry });
      setIsEditing(false);
      toast.success("Journal entry updated successfully");
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update journal entry");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!currentUser || !confirm("Are you sure you want to delete this entry?"))
      return;

    try {
      await deleteDoc(
        doc(db, "journalEntries", `${currentUser.uid}_${entryId}`)
      );

      const updatedEntries = entries.filter((entry) => entry.id !== entryId);
      setEntries(updatedEntries);

      if (selectedEntry?.id === entryId) {
        setSelectedEntry(updatedEntries[0] || null);
      }

      toast.success("Journal entry deleted successfully");
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete journal entry");
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed bottom-4 right-4 z-40 btn-primary rounded-full p-3 shadow-lg"
      >
        {showSidebar ? (
          <X className="h-6 w-6" />
        ) : (
          <BookOpen className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative z-30 lg:z-auto w-80 lg:w-96 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 overflow-hidden flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Journal Entries
            </h2>
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedEntry(null);
                setShowSidebar(false);
              }}
              className="btn-primary p-2"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
              className="input pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Date Filter */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 block">
              Time Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">This Month</option>
              <option value="three-months">Past 3 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input text-sm"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input text-sm"
              />
            </div>
          )}

          {/* Tag Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 block">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {subsectionTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {entries.length === 0
                  ? "No journal entries yet"
                  : "No entries match your filters"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsCreating(false);
                    setIsEditing(false);
                    setShowSidebar(false);
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                    selectedEntry?.id === entry.id
                      ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600"
                      : ""
                  }`}
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {entry.title || "Untitled Entry"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {entry.content?.replace(/<[^>]*>/g, "").substring(0, 100)}
                    ...
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {entry.date && format(entry.date.toDate(), "MMM d, yyyy")}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {entry.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{entry.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
        {isCreating ? (
          <JournalEditor
            onSave={handleCreateEntry}
            onCancel={() => {
              setIsCreating(false);
              setSelectedEntry(filteredEntries[0] || null);
            }}
          />
        ) : isEditing && selectedEntry ? (
          <JournalEditor
            entry={selectedEntry}
            onSave={handleUpdateEntry}
            onCancel={() => setIsEditing(false)}
          />
        ) : selectedEntry ? (
          <div className="h-full flex flex-col">
            {/* Entry Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedEntry.title || "Untitled Entry"}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {selectedEntry.date &&
                        format(selectedEntry.date.toDate(), "MMMM d, yyyy")}
                    </div>
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4" />
                        {selectedEntry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Entry Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                Select an entry to read or create a new one
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

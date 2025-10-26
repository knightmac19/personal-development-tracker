import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  X,
  Tag,
  Link2,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export const JournalEditor = ({ entry = null, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState(entry?.title || "");
  const [tags, setTags] = useState(entry?.tags || []);
  const [linkedGoals, setLinkedGoals] = useState(entry?.linkedGoals || []);
  const [availableGoals, setAvailableGoals] = useState([]);
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Start writing your journal entry...",
        emptyNodeClass: "is-editor-empty",
      }),
    ],
    content: entry?.content || "",
    editorProps: {
      attributes: {
        class:
          "tiptap prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  useEffect(() => {
    fetchAvailableGoals();
  }, [currentUser]);

  const fetchAvailableGoals = async () => {
    if (!currentUser) return;

    try {
      const goalsQuery = query(
        collection(db, "goals"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "active")
      );

      const snapshot = await getDocs(goalsQuery);
      const goals = snapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));

      setAvailableGoals(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleGoalLink = (goalId) => {
    setLinkedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSave = async () => {
    if (!title.trim() && !editor?.getText().trim()) {
      return;
    }

    setSaving(true);

    const entryData = {
      title: title.trim() || "Untitled Entry",
      content: editor?.getHTML() || "",
      tags,
      linkedGoals,
    };

    await onSave(entryData);
    setSaving(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {entry ? "Edit Journal Entry" : "New Journal Entry"}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
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
                  Save Entry
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title"
          className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 mb-4"
        />

        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <Tag className="h-4 w-4 mr-1" />
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {subsectionTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  tags.includes(tag)
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Goals */}
        <div>
          <button
            onClick={() => setShowGoalSelector(!showGoalSelector)}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Link2 className="h-4 w-4 mr-1" />
            Link to Goals ({linkedGoals.length})
          </button>

          {showGoalSelector && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
              {availableGoals.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No active goals available
                </p>
              ) : (
                <div className="space-y-2">
                  {availableGoals.map((goal) => (
                    <label
                      key={goal.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={linkedGoals.includes(goal.id)}
                        onChange={() => toggleGoalLink(goal.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {goal.title}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({goal.subsection})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-700" : ""
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-700" : ""
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("underline") ? "bg-gray-200 dark:bg-gray-700" : ""
            }`}
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("bulletList")
                ? "bg-gray-200 dark:bg-gray-700"
                : ""
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
              editor.isActive("orderedList")
                ? "bg-gray-200 dark:bg-gray-700"
                : ""
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {editor.storage.characterCount?.characters() || 0} characters
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

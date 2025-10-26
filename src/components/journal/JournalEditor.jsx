import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
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
  Heading1,
  Heading2,
  Type,
  Strikethrough,
  Quote,
  Highlighter,
  AlignJustify,
  Link2Off,
  Pilcrow,
  ChevronDown,
  ChevronUp,
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
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [lineSpacing, setLineSpacing] = useState("1.0");
  const [showLineSpacing, setShowLineSpacing] = useState(false);
  const [paragraphSpacing, setParagraphSpacing] = useState(true); // true = space between paragraphs
  const [tagsCollapsed, setTagsCollapsed] = useState(false);

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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary-600 hover:text-primary-700 underline",
        },
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: "bg-purple-200 dark:bg-purple-900",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your journal entry...",
        emptyNodeClass: "is-editor-empty",
      }),
    ],
    content: entry?.content || "",
    editorProps: {
      attributes: {
        class: `tiptap prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4`,
      },
    },
    onUpdate: ({ editor }) => {
      setCharacterCount(editor.getText().length);
    },
  });

  const [characterCount, setCharacterCount] = useState(0);

  const getLineSpacingClass = (spacing) => {
    switch (spacing) {
      case "0.5":
        return "leading-tight";
      case "0.75":
        return "leading-snug";
      case "1.0":
        return "leading-normal";
      case "1.5":
        return "leading-relaxed";
      case "2.0":
        return "leading-loose";
      default:
        return "leading-normal";
    }
  };

  useEffect(() => {
    if (editor) {
      setCharacterCount(editor.getText().length);
      // Update line spacing and paragraph spacing classes
      const spacingClass = getLineSpacingClass(lineSpacing);
      const paragraphClass = paragraphSpacing ? "prose-p:mb-4" : "prose-p:mb-0";
      editor.view.dom.className = `tiptap prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4 ${spacingClass} ${paragraphClass}`;
    }
  }, [editor, lineSpacing, paragraphSpacing]);

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

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
  };

  const changeLineSpacing = (spacing) => {
    setLineSpacing(spacing);
    setShowLineSpacing(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {entry ? "Edit Journal Entry" : "New Journal Entry"}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Desktop buttons */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="hidden sm:flex btn-primary items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Entry
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="hidden sm:block btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>

            {/* Mobile icon-only buttons */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="sm:hidden p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onCancel}
              className="sm:hidden p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              disabled={saving}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title"
          className="w-full text-lg sm:text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 mb-3"
        />

        {/* Collapsible Tags Section on Mobile */}
        <div className="sm:hidden mb-3">
          <button
            onClick={() => setTagsCollapsed(!tagsCollapsed)}
            className="flex items-center justify-between w-full text-left"
          >
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              Tags & Goals
            </label>
            {tagsCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {!tagsCollapsed && (
            <div className="mt-2 space-y-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {subsectionTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      tags.includes(tag)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Linked Goals */}
              <div>
                <button
                  onClick={() => setShowGoalSelector(!showGoalSelector)}
                  className="flex items-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Link to Goals ({linkedGoals.length})
                </button>
                {showGoalSelector && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-32 overflow-y-auto">
                    {availableGoals.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No active goals available
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {availableGoals.map((goal) => (
                          <label
                            key={goal.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={linkedGoals.includes(goal.id)}
                              onChange={() => toggleGoalLink(goal.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {goal.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Tags Section (always visible) */}
        <div className="hidden sm:block space-y-3">
          {/* Tags */}
          <div>
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
      <div
        className={`border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-all duration-200 ${
          showLineSpacing ? "p-2 sm:p-3" : "p-2 sm:p-3 overflow-x-auto"
        }`}
      >
        <div
          className={`flex items-center space-x-1 sm:space-x-2 ${
            showLineSpacing ? "" : "min-w-max"
          }`}
        >
          {/* Text Format */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("heading", { level: 1 })
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Heading"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("heading", { level: 2 })
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Subheading"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("paragraph") && !editor.isActive("heading")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Body text"
            >
              <Type className="h-4 w-4" />
            </button>
          </div>

          {/* Basic Formatting */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("underline")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("strike") ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
          </div>

          {/* Lists and Blocks */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("bulletList")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Bullet list"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("orderedList")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Numbered list"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("blockquote")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </button>
          </div>

          {/* Highlight and Line Spacing */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive("highlight")
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4 text-purple-600" />
            </button>
            <button
              onClick={() => setParagraphSpacing(!paragraphSpacing)}
              className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                paragraphSpacing ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
              title={
                paragraphSpacing
                  ? "Remove paragraph spacing"
                  : "Add paragraph spacing"
              }
            >
              <Pilcrow className="h-4 w-4" />
            </button>
            {!showLineSpacing ? (
              <button
                onClick={() => setShowLineSpacing(true)}
                className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Line spacing"
              >
                <AlignJustify className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center space-x-1 bg-white dark:bg-gray-700 rounded-lg px-2 py-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 mr-1">
                  Spacing:
                </span>
                {["0.5", "0.75", "1.0", "1.5", "2.0"].map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => changeLineSpacing(spacing)}
                    className={`px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      lineSpacing === spacing
                        ? "bg-gray-200 dark:bg-gray-600 font-semibold"
                        : ""
                    }`}
                  >
                    {spacing}
                  </button>
                ))}
                <button
                  onClick={() => setShowLineSpacing(false)}
                  className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            {showLinkInput ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL"
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setLink();
                    }
                  }}
                />
                <button
                  onClick={setLink}
                  className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                >
                  <Save className="h-3 w-3" />
                </button>
                <button
                  onClick={removeLink}
                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className={`p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  editor.isActive("link") ? "bg-gray-200 dark:bg-gray-700" : ""
                }`}
                title="Add link"
              >
                <Link2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Character count - hidden on mobile */}
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            {characterCount} characters
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

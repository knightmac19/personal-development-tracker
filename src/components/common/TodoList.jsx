import React, { useState } from "react";
import { Square, CheckSquare, Plus, X, Calendar, Flag } from "lucide-react";
import { format } from "date-fns";

export const TodoList = ({
  todos,
  title,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  showDate = true,
  compact = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim());
      setNewTodoText("");
      setShowAddForm(false);
    }
  };

  return (
    <div className={compact ? "" : "space-y-4"}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <Plus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center space-x-2 mb-3"
        >
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add a todo..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
          <button
            type="submit"
            className="p-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setNewTodoText("");
            }}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className={`space-y-${compact ? "1" : "2"}`}>
        {todos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No todos yet
          </p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center space-x-2 ${
                compact
                  ? "py-1"
                  : "p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              } transition-colors cursor-pointer group`}
              onClick={() => onToggleTodo(todo.id)}
            >
              {todo.completed ? (
                <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <Square className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    todo.completed
                      ? "line-through text-gray-500 dark:text-gray-500"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {todo.text}
                </p>
                {showDate && todo.createdAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Added{" "}
                    {format(
                      todo.createdAt.toDate
                        ? todo.createdAt.toDate()
                        : new Date(todo.createdAt),
                      "MMM d"
                    )}
                  </p>
                )}
              </div>
              {todo.priority && (
                <Flag
                  className={`h-4 w-4 flex-shrink-0 ${
                    todo.priority === "high"
                      ? "text-red-500"
                      : todo.priority === "medium"
                      ? "text-yellow-500"
                      : "text-gray-400"
                  }`}
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTodo(todo.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
              >
                <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

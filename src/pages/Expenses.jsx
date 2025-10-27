import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
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
import toast from "react-hot-toast";

export const Expenses = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteStates, setDeleteStates] = useState({});

  // Filter states
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'expense', 'income'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    note: "",
    type: "expense", // 'expense' or 'income'
  });

  useEffect(() => {
    fetchTransactions();
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [transactions, dateFilter, typeFilter, customStartDate, customEndDate]);

  const fetchTransactions = async () => {
    if (!currentUser) return;

    try {
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("userId", "==", currentUser.uid),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(transactionsQuery);
      const transactionsData = snapshot.docs.map((doc) => ({
        id: doc.id.replace(`${currentUser.uid}_`, ""),
        ...doc.data(),
      }));

      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate, endDate;

      switch (dateFilter) {
        case "this-month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last-month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case "last-3-months":
          startDate = subMonths(now, 3);
          endDate = now;
          break;
        case "custom":
          startDate = customStartDate ? new Date(customStartDate) : null;
          endDate = customEndDate ? new Date(customEndDate) : null;
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter((t) => {
          const transactionDate = t.date?.toDate
            ? t.date.toDate()
            : new Date(t.date);
          return transactionDate >= startDate && transactionDate <= endDate;
        });
      }
    }

    setFilteredTransactions(filtered);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.note) {
      toast.error("Please fill in all fields");
      return;
    }

    const transactionId = `transaction_${Date.now()}`;
    const amount = parseFloat(formData.amount);

    try {
      const newTransaction = {
        date: new Date(formData.date),
        amount:
          formData.type === "income" ? Math.abs(amount) : -Math.abs(amount),
        note: formData.note,
        type: formData.type,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "transactions", `${currentUser.uid}_${transactionId}`),
        newTransaction
      );

      const transactionWithId = {
        id: transactionId,
        ...newTransaction,
        date: { toDate: () => new Date(formData.date) },
        createdAt: { toDate: () => new Date() },
      };

      setTransactions([transactionWithId, ...transactions]);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        note: "",
        type: "expense",
      });
      setShowAddForm(false);
      toast.success("Transaction added successfully");
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const handleDeleteClick = (transactionId) => {
    if (deleteStates[transactionId] === "pending") {
      // Second click - actually delete
      deleteTransaction(transactionId);
    } else {
      // First click - set to pending
      setDeleteStates({
        ...deleteStates,
        [transactionId]: "pending",
      });

      // Reset after 3 seconds if not clicked again
      setTimeout(() => {
        setDeleteStates((prev) => {
          const newStates = { ...prev };
          if (newStates[transactionId] === "pending") {
            delete newStates[transactionId];
          }
          return newStates;
        });
      }, 3000);
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      await deleteDoc(
        doc(db, "transactions", `${currentUser.uid}_${transactionId}`)
      );
      setTransactions(transactions.filter((t) => t.id !== transactionId));
      setDeleteStates((prev) => {
        const newStates = { ...prev };
        delete newStates[transactionId];
        return newStates;
      });
      toast.success("Transaction deleted");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const clearAllTransactions = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL transactions? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const deletePromises = transactions.map((t) =>
        deleteDoc(doc(db, "transactions", `${currentUser.uid}_${t.id}`))
      );
      await Promise.all(deletePromises);
      setTransactions([]);
      setFilteredTransactions([]);
      toast.success("All transactions cleared");
    } catch (error) {
      console.error("Error clearing transactions:", error);
      toast.error("Failed to clear transactions");
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Type", "Amount", "Note"],
      ...filteredTransactions.map((t) => [
        format(
          t.date?.toDate ? t.date.toDate() : new Date(t.date),
          "yyyy-MM-dd"
        ),
        t.type,
        t.amount,
        t.note,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();

    toast.success("Transactions exported to CSV");
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
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Expenses</h1>
            <p className="opacity-90 text-sm sm:text-base">
              Track your income and expenses
            </p>
          </div>
          <div className="flex sm:flex-row flex-col items-end sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <button
              onClick={exportToCSV}
              className="bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center text-sm sm:text-base whitespace-nowrap"
            >
              <Download className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white text-green-600 px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Transactions</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}
        </div>

        {transactions.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={clearAllTransactions}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Clear All Transactions
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transactions ({filteredTransactions.length})
        </h2>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No transactions found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      transaction.amount > 0
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {transaction.amount > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-semibold ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.type === "income" ? "Income" : "Expense"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {transaction.note}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(
                        transaction.date?.toDate
                          ? transaction.date.toDate()
                          : new Date(transaction.date),
                        "MMM d, yyyy"
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClick(transaction.id)}
                  className={`p-2 rounded-lg transition-all ${
                    deleteStates[transaction.id] === "pending"
                      ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  title={
                    deleteStates[transaction.id] === "pending"
                      ? "Click again to confirm delete"
                      : "Delete transaction"
                  }
                >
                  <Trash2
                    className={`h-5 w-5 ${
                      deleteStates[transaction.id] === "pending"
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Transaction
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: "expense" })
                    }
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      formData.type === "expense"
                        ? "border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "income" })}
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      formData.type === "income"
                        ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-600"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="input"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="label">Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="input"
                  placeholder="What was this for?"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

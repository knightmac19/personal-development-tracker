import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db, ALLOWED_EMAILS } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Sign up function with email whitelist check
  const signup = async (email, password) => {
    // Check if email is in whitelist
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      throw new Error("This email is not authorized to create an account.");
    }

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
        settings: {
          theme: "light",
          emailNotifications: true,
          journalReminders: false,
        },
      });

      // Initialize life subsections for the new user
      const subsections = [
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

      for (const subsection of subsections) {
        await setDoc(doc(db, "lifeSubsections", `${user.uid}_${subsection}`), {
          name: subsection,
          userId: user.uid,
          winState: {
            description: "",
            targetValue: 0,
            currentValue: 0,
            unit: "",
            metrics: [],
          },
          createdAt: serverTimestamp(),
        });
      }

      toast.success("Account created successfully!");
      return user;
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.message);
      throw error;
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      return user;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Invalid email or password");
      throw error;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error logging out");
      throw error;
    }
  };

  // Password reset function
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Error sending password reset email");
      throw error;
    }
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUserProfile({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Update user settings
  const updateUserSettings = async (settings) => {
    if (!currentUser) return;

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          settings,
        },
        { merge: true }
      );

      setUserProfile((prev) => ({
        ...prev,
        settings,
      }));

      toast.success("Settings updated");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
      throw error;
    }
  };

  // Set up authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    resetPassword,
    updateUserSettings,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

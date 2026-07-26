"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);

    if (isSignUp) {
      // --- SIGN UP LOGIC ---
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert("Sign Up Error: " + error.message);
      } else {
        // If "Confirm Email" is OFF in Supabase, this logs them in instantly
        router.push("/dashboard"); 
      }
    } else {
      // --- LOGIN LOGIC ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("Login Error: " + error.message);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-obsidian text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slateSecondary p-8 rounded-2xl border border-gray-800 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-neon mb-2">SCORE<span className="text-white">SUM</span></h1>
          <p className="text-gray-400 text-sm">
            {isSignUp ? "Create a Scorer Account" : "Welcome Back, Scorer"}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
            <input 
              type="email" 
              placeholder="Email Address" 
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-neon focus:outline-none transition text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-neon focus:outline-none transition text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-neon text-obsidian font-bold py-3 rounded-xl hover:bg-springGreen transition mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : (isSignUp ? <><UserPlus className="w-4 h-4"/> Create Account</> : <><LogIn className="w-4 h-4"/> Login</>)}
          </button>

          {/* The Toggle Switch */}
          <div className="text-center mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-2">
              {isSignUp ? "Already have an account?" : "New to ScoreSum?"}
            </p>
            <button 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-sm font-bold text-white hover:text-neon transition underline"
            >
              {isSignUp ? "Login here" : "Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
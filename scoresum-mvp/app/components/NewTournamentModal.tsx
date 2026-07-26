"use client";

import { useState } from "react";
import { X, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NewTournamentModal({ isOpen, onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !organizer) return alert("Fill all fields!");
    setLoading(true);

    // 1. Get Current User ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert("You must be logged in to create a tournament.");
        setLoading(false);
        return;
    }

    // 2. Insert with user_id
    const { error } = await supabase.from("tournaments").insert([{ 
        name, 
        organizer, 
        user_id: user.id // <--- CRITICAL SECURITY FIX
    }]);

    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert("Error creating tournament");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-black dark:text-white">Create Tournament</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tournament Name</label>
            <input type="text" className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Organizer Name</label>
            <input type="text" className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={organizer} onChange={e => setOrganizer(e.target.value)} />
          </div>
          <button onClick={handleCreate} disabled={loading} className="w-full py-4 bg-neon text-black font-bold rounded-xl hover:bg-springGreen transition flex items-center justify-center gap-2 mt-4">
            <Trophy className="w-4 h-4" /> Create Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
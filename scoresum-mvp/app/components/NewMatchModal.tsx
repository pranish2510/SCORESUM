"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NewMatchModal({ isOpen, onClose, tournamentId, onSuccess }: any) {
  const [teams, setTeams] = useState<any[]>([]);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState(10);
  const [loading, setLoading] = useState(false);

  // Fetch Registered Teams
  useEffect(() => {
    if (isOpen && tournamentId) {
      const fetchTeams = async () => {
        const { data } = await supabase.from("teams").select("name").eq("tournament_id", tournamentId);
        if (data) setTeams(data);
      };
      fetchTeams();
    }
  }, [isOpen, tournamentId]);

  const handleCreate = async () => {
    if (!teamA || !teamB) return alert("Select both teams!");
    setLoading(true);
    
    const { error } = await supabase.from("matches").insert([{
        tournament_id: tournamentId,
        team_a: teamA,
        team_b: teamB,
        total_overs: overs,
        status: "scheduled",
        start_time: new Date().toISOString()
    }]);

    setLoading(false);
    if (!error) {
      onSuccess();
      onClose();
    } else {
        alert("Error creating match");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-black dark:text-white">Schedule New Match</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Team A</label>
            {teams.length > 0 ? (
                <select className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={teamA} onChange={e => setTeamA(e.target.value)}>
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            ) : (
                <input type="text" placeholder="Enter Team A Name" className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={teamA} onChange={e => setTeamA(e.target.value)} />
            )}
          </div>

          <div className="flex justify-center font-bold text-gray-400">VS</div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Team B</label>
            {teams.length > 0 ? (
                <select className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={teamB} onChange={e => setTeamB(e.target.value)}>
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            ) : (
                <input type="text" placeholder="Enter Team B Name" className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={teamB} onChange={e => setTeamB(e.target.value)} />
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Overs</label>
            <input type="number" className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-black dark:text-white" value={overs} onChange={e => setOvers(Number(e.target.value))} />
          </div>

          <button onClick={handleCreate} disabled={loading} className="w-full py-4 bg-neon text-black font-bold rounded-xl hover:bg-springGreen transition flex items-center justify-center gap-2 mt-4">
            <Save className="w-4 h-4" /> Schedule Match
          </button>
        </div>
      </div>
    </div>
  );
}
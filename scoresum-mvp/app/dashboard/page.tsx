"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trophy, Plus, Crown, ChevronDown, Zap, Shield, Star, PlayCircle, LogOut } from "lucide-react";
import NewTournamentModal from "@/app/components/NewTournamentModal";

export default function Dashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("admin");

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || "admin");
      
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });
        
      if (data) setTournaments(data);
    } else {
        const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
        if (data) setTournaments(data);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-neon selection:text-black font-sans pb-20">
      
      {/* Create Tournament Modal */}
      <NewTournamentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTournaments} 
      />

      {/* --- HEADER --- */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-[#0a0a0a] sticky top-0 z-40">
         <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-neon p-1.5 rounded-lg shadow-[0_0_15px_rgba(204,255,0,0.3)]">
               <Trophy className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-widest drop-shadow-md hidden sm:block">
               <span className="text-white">SCORE</span>
               <span className="text-neon">SUM</span>
            </span>
         </div>
         
         <div className="flex items-center gap-4">
           <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Logout">
               <LogOut className="w-5 h-5" />
           </button>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-green-900 border border-green-700 rounded-full flex items-center justify-center font-bold text-white uppercase">
                 {userEmail.substring(0, 2)}
             </div>
             <div className="hidden sm:block text-sm">
                <div className="font-bold text-white leading-tight truncate max-w-[120px]">{userEmail.split('@')[0]}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Scorer Free</div>
             </div>
             <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
           </div>
         </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        
        {/* --- HERO SECTION --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Dashboard</h1>
              <p className="text-gray-400 text-sm">Manage your leagues and broadcast live matches.</p>
           </div>
           <button 
              onClick={() => setIsModalOpen(true)} 
              className="px-5 py-3 bg-neon text-black font-bold rounded-xl hover:bg-springGreen transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.2)] hover:shadow-[0_0_25px_rgba(204,255,0,0.4)] hover:-translate-y-0.5 w-full sm:w-auto text-sm"
            >
              <Plus className="w-4 h-4" /> Create Tournament
           </button>
        </div>

        {/* --- 1. YOUR TOURNAMENTS --- */}
        <div>
           <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-4 h-4 text-gray-400" />
              <h2 className="text-xl font-bold text-white">Your Tournaments</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.length === 0 ? (
                 <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-2xl text-gray-500 bg-white/5">
                     <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                     <p className="text-sm">No tournaments created yet. Start your first league!</p>
                 </div>
              ) : (
                 tournaments.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => router.push(`/tournaments/${t.id}`)} 
                        className="bg-[#111] border border-gray-800 p-5 rounded-2xl hover:border-gray-600 hover:bg-[#161616] cursor-pointer transition-all group shadow-sm hover:shadow-md"
                    >
                       <h3 className="font-bold text-lg text-white mb-1 group-hover:text-neon transition-colors truncate">{t.name}</h3>
                       <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold truncate">{t.organizer}</p>
                       <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-xs font-bold text-gray-500">
                           <span>{new Date(t.created_at).toLocaleDateString()}</span>
                           <span className="text-neon opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage <PlayCircle className="w-3 h-3" /></span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

        {/* --- 2. SCORESUM ULTRA BANNER --- */}
        <div className="relative w-full rounded-[1.5rem] overflow-hidden shadow-lg group border border-white/10 bg-[#1a1a1a]">
           
           {/* FIX: Highly reliable Pexels link with explicit z-index and crossOrigin */}
           <img 
             src="https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
             alt="Football Background"
             crossOrigin="anonymous"
             className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60 z-0"
           />
           
           {/* Dark Gradient Overlay to ensure text readability */}
           <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10"></div>
           
           <div className="relative z-20 p-8 flex flex-col items-start justify-center min-h-[220px] max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight drop-shadow-md">
                  Try <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Scoresum Ultra</span>
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 font-medium drop-shadow-sm">
                  Scoring solution for your Football, Kabaddi, Volleyball, Badminton and other sport local tournaments..!!
              </p>
              <button className="px-6 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-gray-200 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.3)] flex items-center gap-2 hover:-translate-y-1">
                 Check it Out <PlayCircle className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* --- 3. SCORESUM PRO PRICING --- */}
        <div>
           <div className="flex items-center gap-2 mb-6">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-white">ScoreSum Scorer Pro</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Monthly Card */}
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all hover:border-gray-700">
                 <div className="absolute top-5 right-5 bg-gray-800 text-[10px] font-bold px-2.5 py-1 rounded text-gray-400 uppercase">Starter</div>
                 <h3 className="text-lg font-bold text-white mb-2">Monthly</h3>
                 <div className="mb-6 flex items-baseline gap-1"><span className="text-4xl font-black text-blue-400">₹149</span><span className="text-xs text-gray-500 font-medium">/mo</span></div>
                 <ul className="space-y-3 mb-8 flex-1 text-xs text-gray-300 font-medium">
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400"/> Ad-free Scoring</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400"/> Basic Stats</li>
                    <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400"/> Includes Scoresum Ultra</li>
                 </ul>
                 <button className="w-full py-3 rounded-lg border border-blue-500/30 text-blue-400 text-sm font-bold hover:bg-blue-500/10 transition-colors">Buy Now</button>
              </div>

              {/* Quarterly Card (Highlighted) */}
              <div className="bg-[#161b22] border border-neon rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(204,255,0,0.05)] transform md:-translate-y-2 z-10">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-neon text-black text-[10px] font-black px-3 py-1 rounded-b-lg tracking-widest uppercase shadow-sm">Most Popular</div>
                 <h3 className="text-lg font-bold text-white mb-2 mt-2">Quarterly</h3>
                 <div className="mb-6 flex items-baseline gap-1"><span className="text-4xl font-black text-neon">₹249</span><span className="text-xs text-gray-500 font-medium">/3mo</span></div>
                 <ul className="space-y-3 mb-8 flex-1 text-xs text-gray-300 font-medium">
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-neon"/> Everything in Monthly</li>
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-neon"/> Points Tables</li>
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-neon"/> PDF Exports</li>
                 </ul>
                 <button className="w-full py-3 rounded-lg bg-neon text-black text-sm font-black hover:bg-springGreen transition-all shadow-[0_5px_15px_rgba(204,255,0,0.15)] hover:shadow-[0_5px_20px_rgba(204,255,0,0.3)]">Upgrade</button>
              </div>

              {/* Yearly Card */}
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all hover:border-gray-700">
                 <div className="absolute top-5 right-5 bg-gray-800 text-[10px] font-bold px-2.5 py-1 rounded text-gray-400 uppercase">Pro Max</div>
                 <h3 className="text-lg font-bold text-white mb-2">Yearly</h3>
                 <div className="mb-6 flex items-baseline gap-1"><span className="text-4xl font-black text-purple-400">₹999</span><span className="text-xs text-gray-500 font-medium">/yr</span></div>
                 <ul className="space-y-3 mb-8 flex-1 text-xs text-gray-300 font-medium">
                    <li className="flex items-center gap-2"><Star className="w-4 h-4 text-purple-400"/> All Features Unlocked</li>
                    <li className="flex items-center gap-2"><Star className="w-4 h-4 text-purple-400"/> Custom Branding</li>
                 </ul>
                 <button className="w-full py-3 rounded-lg border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-500/10 transition-colors">Buy Now</button>
              </div>

           </div>
        </div>

      </main>
    </div>
  );
}
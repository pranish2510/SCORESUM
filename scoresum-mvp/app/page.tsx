"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trophy, Activity, PlayCircle, ArrowRight, ChevronDown, User, LogOut, Shield } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);

  useEffect(() => {
    fetchSession();
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const fetchLiveMatches = async () => {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "live")
      .order("start_time", { ascending: false })
      .limit(4);
    if (data) setLiveMatches(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-neon selection:text-black overflow-hidden font-sans relative">
      
      {/* --- TOP NAVBAR --- */}
      <header className="absolute top-0 w-full z-50 px-6 py-5 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        
        {/* LOGO */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-neon p-1.5 rounded-lg shadow-[0_0_15px_rgba(204,255,0,0.3)]">
               <Trophy className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-widest drop-shadow-md hidden sm:block">
               <span className="text-white">SCORE</span>
               <span className="text-neon">SUM</span>
            </span>
         </div>
         
        {/* AUTH BUTTONS */}
        <div className="relative">
          {user ? (
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => router.push('/dashboard')}
                 className="px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold rounded-lg transition-all"
               >
                 Dashboard
               </button>
               <button 
                 onClick={handleLogout}
                 className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg transition-all"
                 title="Logout"
               >
                 <LogOut className="w-5 h-5" />
               </button>
             </div>
          ) : (
             <div>
                <button 
                  onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl transition-all"
                >
                  Login <ChevronDown className={`w-4 h-4 transition-transform ${isLoginDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* LOGIN DROPDOWN */}
                {isLoginDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <button 
                      onClick={() => router.push('/login?role=scorer')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neon hover:text-black transition-colors font-semibold"
                    >
                      <Shield className="w-4 h-4" /> As Scorer/Admin
                    </button>
                    <div className="h-[1px] bg-white/5 w-full"></div>
                    <button 
                      onClick={() => router.push('/login?role=player')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neon hover:text-black transition-colors font-semibold"
                    >
                      <User className="w-4 h-4" /> As Player
                    </button>
                  </div>
                )}
             </div>
          )}
        </div>
      </header>

      {/* --- HERO SECTION WITH HD BACKGROUND --- */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center p-6 pt-32">
        
        {/* HD Background Image */}
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2500&auto=format&fit=crop')] 
          bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity scale-105 animate-[pulse_10s_ease-in-out_infinite]"
        ></div>
        
        {/* Smooth Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]"></div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center text-center">
          
          {/* --- LIVE MATCHES TICKER (GLASSMORPHISM) --- */}
          {liveMatches.length > 0 && (
            <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                <h3 className="text-sm font-bold tracking-widest text-red-500 uppercase">Live Now</h3>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {liveMatches.map((match) => (
                  <button 
                    key={match.id}
                    onClick={() => router.push(`/live/${match.id}`)}
                    className="group relative text-left w-full sm:w-80 bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-neon/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Live</span>
                      <Activity className="w-4 h-4 text-neon animate-pulse" />
                    </div>
                    <h4 className="font-bold text-lg leading-tight mb-1 truncate text-white drop-shadow-md">
                      {match.team_a} <span className="text-gray-400 text-sm font-normal mx-1">vs</span> {match.team_b}
                    </h4>
                    <p className="text-neon font-mono text-sm font-bold">In Progress <ArrowRight className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- HERO TYPOGRAPHY --- */}
          <div className="max-w-4xl animate-in fade-in zoom-in-95 duration-1000 delay-150 fill-mode-both">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-6 drop-shadow-2xl">
              The Future of <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon via-green-400 to-emerald-300 filter drop-shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                Grassroots Cricket.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10 font-light drop-shadow-md">
              Professional-grade scoring for everyone. Whether you are watching from home, scoring at the ground, or playing in the middle.
            </p>
            
            {/* --- CALL TO ACTIONS --- */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => router.push(user ? '/dashboard' : '/login?role=scorer')} 
                className="w-full sm:w-auto px-8 py-4 bg-neon text-black font-black rounded-xl hover:bg-springGreen hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
              >
                <Trophy className="w-5 h-5" /> Start a Tournament
              </button>
              <button 
                onClick={() => router.push('/tournaments')} 
                className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
              >
                <PlayCircle className="w-5 h-5" /> View All Matches
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* --- FEATURE HIGHLIGHTS SECTION --- */}
      <div className="relative z-10 bg-[#0a0a0a] py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Ball-by-Ball Accuracy", desc: "Track every extra, fall of wicket, and boundary with a professional scorer's interface." },
            { title: "Live NRR & Standings", desc: "Real-time points tables and Net Run Rate calculations updated instantly." },
            { title: "Smart MVP Algorithm", desc: "Automated Man of the Match selections based on complex impact-value scoring." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-neon/30 transition-colors group">
              <div className="w-12 h-12 bg-neon/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-neon/20 transition-colors">
                <div className="w-4 h-4 bg-neon rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
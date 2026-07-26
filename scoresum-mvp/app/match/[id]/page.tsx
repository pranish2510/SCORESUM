"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Sun, Moon, RotateCcw, RefreshCw, Trophy, AlertTriangle, Eye, Lock, Medal } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const WAGON_ZONES = [{id:"third_man",label:"Third Man"},{id:"point",label:"Point"},{id:"covers",label:"Covers"},{id:"mid_off",label:"Mid Off"},{id:"mid_on",label:"Mid On"},{id:"mid_wicket",label:"Mid Wicket"},{id:"square_leg",label:"Square Leg"},{id:"fine_leg",label:"Fine Leg"},{id:"long_off",label:"Long Off"},{id:"long_on",label:"Long On"}];
const WICKET_TYPES = ["Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket"];
const NB_REASONS = ["Overstepping", "Height", "Understepping", "3rd Bouncer", "Dead Ball"];

export default function MatchScoring({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [match, setMatch] = useState<any>(null);
  const [balls, setBalls] = useState<any[]>([]);
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); 

  // Setup
  const [teamASquadRaw, setTeamASquadRaw] = useState("");
  const [teamBSquadRaw, setTeamBSquadRaw] = useState("");
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState("bat");
  const [totalOversInput, setTotalOversInput] = useState(10);
  const [opener1, setOpener1] = useState("");
  const [opener2, setOpener2] = useState("");
  const [openBowler, setOpenBowler] = useState("");

  // Modals & Action States
  const [showWagonWheel, setShowWagonWheel] = useState(false);
  const [pendingRun, setPendingRun] = useState(0); 
  const [showNewBowlerModal, setShowNewBowlerModal] = useState(false);
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showInningsBreakModal, setShowInningsBreakModal] = useState(false);
  
  // Extras Modals
  const [showExtrasModal, setShowExtrasModal] = useState<string | null>(null); // 'wd', 'nb', 'lb'
  const [extraRuns, setExtraRuns] = useState(0);
  const [nbReason, setNbReason] = useState("Overstepping");
  const [byeType, setByeType] = useState("Leg Bye");

  // Wicket Data
  const [wicketType, setWicketType] = useState("Caught");
  const [wicketAssist, setWicketAssist] = useState(""); 
  const [wicketRuns, setWicketRuns] = useState(0); 
  
  const toggleTheme = () => { setIsDarkMode(!isDarkMode); document.documentElement.classList.toggle('dark'); };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: m } = await supabase.from("matches").select("*, tournaments(user_id)").eq("id", id).single();
    
    if (m) {
        if (m.tournaments?.user_id && user?.id !== m.tournaments.user_id) { router.replace(`/live/${id}`); return; }
        setMatch(m);
        if(!teamASquadRaw && m.team_a_squad) setTeamASquadRaw(m.team_a_squad.join(", "));
        if(!teamBSquadRaw && m.team_b_squad) setTeamBSquadRaw(m.team_b_squad.join(", "));
        if(m.total_overs) setTotalOversInput(m.total_overs);
        if (m.tournament_id) {
            const { data: t } = await supabase.from("teams").select("*").eq("tournament_id", m.tournament_id);
            if (t) setRegisteredTeams(t);
        }
    }
    const { data: b } = await supabase.from("balls").select("*").eq("match_id", id).order("created_at", { ascending: true });
    if (b) setBalls(b);
  };

  useEffect(() => { fetchData(); document.documentElement.classList.add('dark'); }, [id]);

  useEffect(() => {
      if (match && registeredTeams.length > 0) {
          if (!teamASquadRaw) {
              const regA = registeredTeams.find(t => t.name === match.team_a);
              if (regA && regA.squad) setTeamASquadRaw(regA.squad.join(", "));
          }
          if (!teamBSquadRaw) {
              const regB = registeredTeams.find(t => t.name === match.team_b);
              if (regB && regB.squad) setTeamBSquadRaw(regB.squad.join(", "));
          }
      }
  }, [match, registeredTeams]);

  const loadSquad = (teamSide: 'A'|'B', teamId: string) => {
      const t = registeredTeams.find(t => t.id === teamId);
      if (t) teamSide === 'A' ? setTeamASquadRaw(t.squad.join(", ")) : setTeamBSquadRaw(t.squad.join(", "));
  };

  const getAvailableBatsmen = () => {
    if (!match) return [];
    const squad = match.current_batting_team === match.team_a ? match.team_a_squad : match.team_b_squad;
    if (!squad) return [];
    const innBalls = balls.filter(b => b.innings === match.current_innings);
    const out = innBalls.filter(b => b.is_wicket).map(b => b.player_out_name || b.batsman_name);
    return squad.filter((p: string) => !out.includes(p) && p !== match.striker_name && p !== match.non_striker_name);
  };

  const getNextInningsSquads = () => {
      if(!match) return { bat: [], bowl: [] };
      const nBat = match.current_bowling_team; 
      const nBowl = match.current_batting_team;
      return { 
          bat: (nBat === match.team_a ? match.team_a_squad : match.team_b_squad) || [], 
          bowl: (nBowl === match.team_a ? match.team_a_squad : match.team_b_squad) || [] 
      };
  };

  const getStats = () => {
    let runs=0, w=0, legal=0, sR=0, sB=0, bR=0, bW=0, bL=0;
    const curBalls = balls.filter(b => b.innings === match?.current_innings);
    
    curBalls.forEach(b => {
      runs += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
      if (b.is_wicket) w++;
      if (!b.is_wide && !b.is_no_ball) legal++;

      if (b.batsman_name === match?.striker_name) {
          if (!b.is_wide && !b.is_no_ball && !b.is_bye && !b.is_leg_bye) sR += b.runs;
          if (!b.is_wide) sB++; 
      }

      if (b.bowler_name === match?.bowler_name) {
        if (!b.is_wide && !b.is_no_ball) bL++;
        if (!b.is_bye && !b.is_leg_bye) bR += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
        if (b.is_wicket && b.wicket_type !== 'Run Out') bW++;
      }
    });

    const crr = legal > 0 ? (runs / (legal/6)).toFixed(2) : "0.00";
    const max = (match?.total_overs || 10) * 6;
    const end = legal >= max || w >= 10 || (match?.current_innings === 2 && match?.target_score && runs >= match?.target_score);
    
    let chase = "";
    if (match?.current_innings === 2 && match?.target_score) {
        const need = match.target_score - runs;
        chase = runs >= match.target_score ? "Won!" : w >= 10 || max - legal <= 0 ? `Lost by ${need}` : `Need ${need} off ${max - legal}`;
    }

    return { 
      runs, wickets: w, crr, chase,
      overs: `${Math.floor(legal/6)}.${legal%6}`,
      striker: { runs: sR, balls: sB },
      bowler: { runs: bR, wickets: bW, overs: `${Math.floor(bL/6)}.${bL%6}` },
      isOverComplete: legal > 0 && legal % 6 === 0,
      isInningsComplete: end
    };
  };
  const stats = getStats();

  useEffect(() => {
    if (!match) return;
    if (stats.isInningsComplete && !showInningsBreakModal && match.status === 'live') {
        setOpener1(""); setOpener2(""); setOpenBowler("");
        if (match.current_innings === 1) setShowInningsBreakModal(true); else finishMatch(true); 
    } else if (stats.isOverComplete && balls.length > 0 && !stats.isInningsComplete) {
       const last = balls[balls.length - 1];
       if (last.bowler_name === match?.bowler_name) setShowNewBowlerModal(true);
    }
  }, [stats.isOverComplete, stats.isInningsComplete]);

  // --- ACTIONS ---
  const handleScoringClick = (run: number) => {
    if (stats.isInningsComplete) { setShowInningsBreakModal(true); return; }
    if (run > 0) { setPendingRun(run); setShowWagonWheel(true); } else { confirmBall(0, null); }
  };

  const handleWicketClick = () => { 
      if (stats.isInningsComplete) return;
      setWicketType("Caught"); setWicketAssist(""); setWicketRuns(0); setShowWicketModal(true); 
  };

  const confirmWicket = () => {
    setShowWicketModal(false);
    confirmBall(wicketRuns, null, true, false, wicketType, wicketAssist);
    if (stats.wickets < 9) setTimeout(() => setShowNewBatsmanModal(true), 500); 
  };

  const confirmExtras = () => {
      const r = extraRuns;
      setShowExtrasModal(null);
      setExtraRuns(0);
      
      if (showExtrasModal === 'wd') {
          confirmBall(r, null, false, true); 
      } else if (showExtrasModal === 'nb') {
          confirmBall(r, null, false, false, null, null, true, nbReason);
      } else if (showExtrasModal === 'lb') {
          const isB = byeType === 'Bye';
          const isLb = byeType === 'Leg Bye';
          confirmBall(r, null, false, false, null, null, false, null, isB, isLb);
      }
  };

  const confirmBall = async (r: number, zone: string | null, isW = false, isWd = false, wType: string|null = null, wAssist: string|null = null, isNb = false, nbR: string|null = null, isB = false, isLb = false) => {
    setLoading(true); setShowWagonWheel(false); 
    
    await supabase.from("balls").insert([{
      match_id: id, innings: match.current_innings, runs: r, 
      is_wicket: isW, is_wide: isWd, wagon_zone: zone,
      batsman_name: match.striker_name, bowler_name: match.bowler_name, 
      player_out_name: isW ? match.striker_name : null, 
      wicket_type: wType, wicket_assist: wAssist,
      is_no_ball: isNb, no_ball_reason: nbR,
      is_bye: isB, is_leg_bye: isLb
    }]);

    if ((r % 2 !== 0) && !isWd && !isW) {
        await supabase.from("matches").update({ striker_name: match.non_striker_name, non_striker_name: match.striker_name }).eq("id", id);
    }
    
    fetchData(); setLoading(false);
  };

  const startSecondInnings = async () => {
      if(!opener1 || !opener2 || !openBowler) return alert("Please select Striker, Non-Striker, and Bowler!");
      if(opener1 === opener2) return alert("Striker and Non-Striker cannot be the same player!");

      setLoading(true);
      await supabase.from("matches").update({
          current_innings: 2, target_score: stats.runs + 1,
          current_batting_team: match.current_bowling_team, current_bowling_team: match.current_batting_team,
          striker_name: opener1, non_striker_name: opener2, bowler_name: openBowler
      }).eq("id", id);
      setShowInningsBreakModal(false); fetchData(); setLoading(false);
  };

  // --- EXPERT MAN OF THE MATCH ALGORITHM ---
  const finishMatch = async (auto = false) => {
    if(!auto && !confirm("End Match?")) return;
    setLoading(true);
    
    let result = "", winner: string | null = null, winInn = 0;
    
    if (match.current_innings === 2) {
        if (stats.runs >= match.target_score) {
            result = `${match.current_batting_team} won by ${10 - stats.wickets} wickets`;
            winner = match.current_batting_team; winInn = 2; 
        } else {
            result = `${match.current_bowling_team} won by ${match.target_score - stats.runs - 1} runs`;
            winner = match.current_bowling_team; winInn = 1;
        }
    } else {
        result = "Match Ended";
    }
    
    const { data: allBalls } = await supabase.from("balls").select("*").eq("match_id", id);
    
    let playerStats: Record<string, any> = {};
    
    const initPlayer = (name: string) => {
        if (!playerStats[name]) {
            playerStats[name] = { 
                team: match.team_a_squad?.includes(name) ? match.team_a : (match.team_b_squad?.includes(name) ? match.team_b : ''), 
                runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, 
                wickets: 0, dotBalls: 0, runsConceded: 0, legalBallsBowled: 0, 
                catches: 0, runOuts: 0 
            };
        }
    };

    allBalls?.forEach(b => {
        if (b.batsman_name) {
            initPlayer(b.batsman_name);
            if(!b.is_wide && !b.is_no_ball && !b.is_bye && !b.is_leg_bye) {
                playerStats[b.batsman_name].runs += b.runs;
                if(b.runs === 4) playerStats[b.batsman_name].fours++;
                if(b.runs === 6) playerStats[b.batsman_name].sixes++;
            }
            if(!b.is_wide) playerStats[b.batsman_name].balls++;
        }
        
        if (b.is_wicket && b.player_out_name) {
            initPlayer(b.player_out_name);
            playerStats[b.player_out_name].isOut = true;
        }
        
        if (b.bowler_name) {
            initPlayer(b.bowler_name);
            if(!b.is_wide && !b.is_no_ball) playerStats[b.bowler_name].legalBallsBowled++;
            if(!b.is_bye && !b.is_leg_bye) playerStats[b.bowler_name].runsConceded += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
            if(b.runs === 0 && !b.is_wide && !b.is_no_ball && !b.is_bye && !b.is_leg_bye) playerStats[b.bowler_name].dotBalls++;
            if(b.is_wicket && b.wicket_type !== 'Run Out') playerStats[b.bowler_name].wickets++;
        }
        
        if (b.is_wicket && b.wicket_assist) {
            initPlayer(b.wicket_assist);
            if (b.wicket_type === 'Caught') playerStats[b.wicket_assist].catches++;
            if (b.wicket_type === 'Run Out') playerStats[b.wicket_assist].runOuts++;
        }
    });

    let motm = "";
    let maxIVS = -9999;
    
    Object.keys(playerStats).forEach(name => {
        const p = playerStats[name];
        
        if (winner && p.team !== winner) return; 
        
        let ivs = 0;
        
        ivs += p.runs; 
        ivs += (p.fours * 1) + (p.sixes * 2); 
        if (p.runs >= 100) ivs += 25; 
        else if (p.runs >= 50) ivs += 10; 
        
        if (p.balls >= 10) {
            const sr = (p.runs / p.balls) * 100;
            if (sr > 200) ivs += 20; 
            else if (sr > 150) ivs += 10; 
            else if (sr < 100) ivs -= 10; 
        }
        
        if (winInn === 2 && !p.isOut && p.balls > 0) ivs += 10;
        
        ivs += (p.wickets * 25); 
        ivs += (p.dotBalls * 1); 
        if (p.wickets >= 5) ivs += 30; 
        else if (p.wickets >= 3) ivs += 15; 
        
        if (p.legalBallsBowled >= 12) {
            const eco = p.runsConceded / (p.legalBallsBowled / 6);
            if (eco < 5.0) ivs += 20; 
            else if (eco < 7.0) ivs += 10; 
            else if (eco > 11.0) ivs -= 10; 
        }
        
        ivs += (p.catches * 10);
        ivs += (p.runOuts * 15);
        
        if (ivs > maxIVS) {
            maxIVS = ivs;
            motm = name;
        }
    });

    if (!auto) { 
        const m = prompt(`Auto-Selected MoM: ${motm}\nConfirm or edit result description:`, result); 
        if (m !== null) result = m; 
    }
    
    await supabase.from("matches").update({ status: 'completed', result_description: result, winner_team: winner, man_of_the_match: motm }).eq("id", id);
    fetchData(); setLoading(false);
  };

  const handleUndo = async () => {
    if (balls.length === 0 || !confirm("Delete last ball?")) return;
    setLoading(true);
    const last = balls[balls.length - 1];
    if (last.innings !== match.current_innings) { alert("Cannot undo prev innings!"); setLoading(false); return; }
    await supabase.from("balls").delete().eq("id", last.id);
    if ((last.runs % 2 !== 0) && !last.is_wide && !last.is_wicket) await supabase.from("matches").update({ striker_name: match.non_striker_name, non_striker_name: match.striker_name }).eq("id", id);
    if (last.is_wicket && last.player_out_name) await supabase.from("matches").update({ striker_name: last.player_out_name }).eq("id", id);
    setShowNewBatsmanModal(false); setShowNewBowlerModal(false); fetchData(); setLoading(false);
  };

  const changeBowler = async (name: string) => { setLoading(true); await supabase.from("matches").update({ bowler_name: name }).eq("id", id); setShowNewBowlerModal(false); fetchData(); setLoading(false); };
  const changeBatsman = async (name: string) => { setLoading(true); await supabase.from("matches").update({ striker_name: name }).eq("id", id); setShowNewBatsmanModal(false); fetchData(); setLoading(false); };
  
  const startMatch = async () => {
    if (!teamASquadRaw || !teamBSquadRaw) return alert("Enter squads");
    
    // VALIDATION: Ensure scorers don't skip player selection
    if (!opener1 || !opener2 || !openBowler) return alert("Please select Striker, Non-Striker, and Bowler!");
    if (opener1 === opener2) return alert("Striker and Non-Striker cannot be the same player!");

    setLoading(true);
    const batT = tossDecision === 'bat' ? (tossWinner === match.team_a ? match.team_a : match.team_b) : (tossWinner === match.team_a ? match.team_b : match.team_a);
    const bowlT = batT === match.team_a ? match.team_b : match.team_a;
    await supabase.from("matches").update({ 
        team_a_squad: teamASquadRaw.split(','), team_b_squad: teamBSquadRaw.split(','), 
        toss_winner: tossWinner, toss_decision: tossDecision, 
        current_batting_team: batT, current_bowling_team: bowlT,
        striker_name: opener1, non_striker_name: opener2, bowler_name: openBowler, 
        status: 'live', total_overs: totalOversInput, current_innings: 1 
    }).eq("id", id); fetchData(); setLoading(false);
  };
  const reOpenMatch = async () => { if(!confirm("Re-open?")) return; await supabase.from("matches").update({ status: 'live' }).eq("id", id); fetchData(); };

  if (!match) return <div className="p-10 text-white">Loading...</div>;

  const { bat: nextBatSquad, bowl: nextBowlSquad } = getNextInningsSquads();

  // VIEW: SETUP SCREEN
  if (!match.status || match.status === 'scheduled') {
    const tAList = teamASquadRaw ? teamASquadRaw.split(',') : [];
    const tBList = teamBSquadRaw ? teamBSquadRaw.split(',') : [];
    const isABat = (tossWinner === match.team_a && tossDecision === 'bat') || (tossWinner === match.team_b && tossDecision === 'bowl');
    const batSq = isABat ? tAList : tBList;
    const bowlSq = isABat ? tBList : tAList;

    return (
        <div className="min-h-screen bg-daySurface dark:bg-obsidian text-dayText dark:text-white p-6 pb-20">
            <h1 className="text-2xl font-bold text-red-600 dark:text-neon mb-4">Setup</h1>
            <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-500">Overs</label><input type="number" className="w-full bg-gray-100 dark:bg-gray-900 p-3 rounded border border-gray-300 dark:border-gray-700" value={totalOversInput} onChange={e=>setTotalOversInput(Number(e.target.value))} /></div>
                
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">{match.team_a}</label>
                        <select className="text-xs bg-gray-200 dark:bg-gray-800 text-red-600 dark:text-neon p-1 rounded" onChange={(e) => loadSquad('A', e.target.value)}>
                            <option>Load Team...</option>
                            {registeredTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <textarea className="w-full bg-gray-100 dark:bg-gray-900 border p-2 rounded border-gray-300 dark:border-gray-700" rows={3} value={teamASquadRaw} onChange={e=>setTeamASquadRaw(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">{match.team_b}</label>
                        <select className="text-xs bg-gray-200 dark:bg-gray-800 text-red-600 dark:text-neon p-1 rounded" onChange={(e) => loadSquad('B', e.target.value)}>
                            <option>Load Team...</option>
                            {registeredTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <textarea className="w-full bg-gray-100 dark:bg-gray-900 border p-2 rounded border-gray-300 dark:border-gray-700" rows={3} value={teamBSquadRaw} onChange={e=>setTeamBSquadRaw(e.target.value)} />
                </div>
                
                <div className="pt-2"><label className="text-xs font-bold text-gray-500">Toss Winner</label><div className="flex gap-2"><button onClick={()=>setTossWinner(match.team_a)} className={`flex-1 p-3 rounded border font-bold ${tossWinner===match.team_a?'bg-red-600 dark:bg-neon text-white dark:text-black':'border-gray-300 dark:border-gray-500'}`}>{match.team_a}</button><button onClick={()=>setTossWinner(match.team_b)} className={`flex-1 p-3 rounded border font-bold ${tossWinner===match.team_b?'bg-red-600 dark:bg-neon text-white dark:text-black':'border-gray-300 dark:border-gray-500'}`}>{match.team_b}</button></div></div>
                <div><label className="text-xs font-bold text-gray-500">Decision</label><div className="flex gap-2"><button onClick={()=>setTossDecision('bat')} className={`flex-1 p-3 rounded border font-bold ${tossDecision==='bat'?'bg-gray-800 text-white dark:bg-white dark:text-black':'border-gray-300 dark:border-gray-500'}`}>Bat</button><button onClick={()=>setTossDecision('bowl')} className={`flex-1 p-3 rounded border font-bold ${tossDecision==='bowl'?'bg-gray-800 text-white dark:bg-white dark:text-black':'border-gray-300 dark:border-gray-500'}`}>Bowl</button></div></div>
                
                {/* FIXED DROPDOWNS: Clear Labels and Unselectable Placeholders */}
                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Striker</label>
                        <select className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white" value={opener1} onChange={e=>setOpener1(e.target.value)}>
                            <option value="" disabled>-- Select Player --</option>
                            {batSq.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Non-Striker</label>
                        <select className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white" value={opener2} onChange={e=>setOpener2(e.target.value)}>
                            <option value="" disabled>-- Select Player --</option>
                            {batSq.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Opening Bowler</label>
                        <select className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-black dark:text-white" value={openBowler} onChange={e=>setOpenBowler(e.target.value)}>
                            <option value="" disabled>-- Select Player --</option>
                            {bowlSq.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={startMatch} disabled={loading} className="w-full bg-red-600 dark:bg-neon text-white dark:text-black font-bold py-4 rounded-xl mt-4 shadow-lg shadow-red-500/30 dark:shadow-neon/20">Start Match</button>
            </div>
        </div>
    );
  }

  // VIEW: SCORING SCREEN
  const isCompleted = match.status === 'completed';
  return (
    <div className="min-h-screen bg-white dark:bg-obsidian text-black dark:text-white flex flex-col font-sans transition-colors">
      <header className="p-4 flex justify-between bg-white dark:bg-slateSecondary sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => router.push('/dashboard')} />
        <div className="text-center"><span className="text-[10px] text-red-600 dark:text-neon uppercase tracking-widest">{match.current_batting_team} ({match.current_innings} Inn)</span><div className="text-xs font-bold">{match.current_bowling_team} Bowling</div></div>
        <button onClick={toggleTheme}><Sun className="w-5 h-5" /></button>
      </header>
      <div className="flex-1 flex flex-col items-center py-6 space-y-4">
        {isCompleted && <div className="flex flex-col items-center gap-2 mb-2 w-full px-4"><div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-6 py-3 rounded-full font-bold text-center w-full max-w-md">{match.result_description}</div>{match.man_of_the_match && <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 animate-bounce"><Medal className="w-4 h-4" /> MOTM: {match.man_of_the_match}</div>}</div>}
        <div className="text-7xl font-black">{stats.runs}/{stats.wickets}</div>
        
        <div className="text-red-600 dark:text-neon font-mono flex flex-col items-center"><div className="flex gap-4"><span>Overs: {stats.overs} / {match.total_overs}</span><span className="text-gray-500">CRR: {stats.crr}</span></div>{stats.chase && <div className="text-sm font-bold text-orange-400 mt-1">{stats.chase}</div>}</div>
        
        <div className="w-full max-w-md px-4 grid grid-cols-2 gap-2">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border border-red-500 dark:border-neon shadow-sm relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 dark:bg-neon"></div><div className="text-xs text-gray-500">STRIKER</div><div className="font-bold text-lg">{match.striker_name}*</div><div className="text-red-600 dark:text-neon font-mono">{stats.striker.runs} ({stats.striker.balls})</div></div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-700 opacity-80 shadow-sm"><div className="text-xs text-gray-500">NON-STRIKER</div><div className="font-bold">{match.non_striker_name}</div></div>
        </div>
        <div className="w-full max-w-md px-4"><div className="bg-gray-100 dark:bg-slateSecondary p-3 rounded border border-gray-300 dark:border-gray-700 flex justify-between items-center shadow-sm"><div className="flex items-center gap-2"><div><div className="text-xs text-gray-500">BOWLER</div><div className="font-bold">{match.bowler_name}</div></div><button onClick={() => setShowNewBowlerModal(true)} disabled={isCompleted} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:text-red-600 dark:hover:text-neon transition disabled:opacity-50"><RefreshCw className="w-4 h-4" /></button></div><div className="font-mono">{stats.bowler.wickets}-{stats.bowler.runs} <span className="text-xs text-gray-500">({stats.bowler.overs})</span></div></div></div>
        
        <div className="w-full px-4 overflow-x-auto flex gap-2 pb-2">{balls.slice(-8).map((b, i) => (<div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${b.is_wicket ? 'border-red-500 text-red-500 bg-red-100' : 'border-gray-400 bg-white dark:bg-gray-800'}`}>{b.is_wicket ? 'W' : b.runs}</div>))}</div>
      </div>

      <div className="bg-gray-50 dark:bg-slateSecondary p-4 rounded-t-3xl border-t border-gray-200 dark:border-gray-700 pb-10 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        {isCompleted ? (
            <div className="flex flex-col gap-3">
                <Link href={`/live/${id}`} className="w-full py-4 bg-red-600 dark:bg-neon text-white dark:text-black font-bold rounded-xl text-center hover:bg-red-500 dark:hover:bg-springGreen flex items-center justify-center gap-2"><Eye className="w-5 h-5" /> View Full Scorecard</Link>
                <button onClick={reOpenMatch} className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:text-black dark:hover:text-white flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700"><Lock className="w-4 h-4" /> Re-open Match</button>
            </div>
        ) : stats.isInningsComplete ? (
            <div className="text-center py-4"><h3 className="text-xl font-bold text-red-600 dark:text-neon mb-2">Innings Break!</h3><button onClick={() => setShowInningsBreakModal(true)} className="w-full py-4 bg-red-600 dark:bg-neon text-white dark:text-black font-bold rounded-xl animate-pulse shadow-lg">{match.current_innings === 1 ? "Start Next" : "Finish Match"}</button></div>
        ) : (
            <>
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto mb-2">
                {[0, 1, 2, 3, 4, 6].map(run => (<button key={run} onClick={() => handleScoringClick(run)} className="aspect-square bg-white dark:bg-gray-800 rounded-xl text-lg font-bold border border-gray-300 dark:border-gray-700 active:scale-95 shadow-sm">{run}</button>))}
                
                <button onClick={() => setShowExtrasModal('wd')} className="aspect-square bg-yellow-100 text-yellow-700 border border-yellow-400 rounded-xl font-bold text-sm shadow-sm">Wd</button>
                <button onClick={() => setShowExtrasModal('nb')} className="aspect-square bg-purple-100 text-purple-700 border border-purple-400 rounded-xl font-bold text-sm shadow-sm">NB</button>
                <button onClick={() => setShowExtrasModal('lb')} className="col-span-2 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-400 dark:border-gray-600 rounded-xl font-bold text-sm shadow-sm">Lb/B</button>
            </div>
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                <button onClick={handleWicketClick} className="col-span-3 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 font-bold border border-red-500 rounded-xl shadow-sm text-lg tracking-widest">OUT</button>
                <button onClick={handleUndo} className="col-span-2 py-3 bg-gray-200 dark:bg-gray-800 rounded-xl text-xs font-bold uppercase border border-gray-300 dark:border-gray-700 shadow-sm"><RotateCcw className="w-4 h-4 inline mr-1"/> Undo</button>
                <button onClick={() => finishMatch(false)} className="col-span-5 py-4 mt-2 bg-red-600 text-white rounded-xl text-sm font-bold uppercase shadow-lg shadow-red-500/30 tracking-widest"><Trophy className="w-4 h-4 inline mr-1"/> Finish Match</button>
            </div>
            </>
        )}
      </div>

      {/* --- MODALS --- */}
      {showExtrasModal && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4 uppercase">
                {showExtrasModal === 'wd' ? 'Wide Ball' : showExtrasModal === 'nb' ? 'No Ball' : 'Byes / Leg Byes'}
            </h2>
            <div className="w-full max-w-sm space-y-4">
                
                {showExtrasModal === 'nb' && (
                    <select className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white" value={nbReason} onChange={e=>setNbReason(e.target.value)}>
                        {NB_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                )}

                {showExtrasModal === 'lb' && (
                    <div className="flex gap-2">
                        <button onClick={() => setByeType('Leg Bye')} className={`flex-1 p-3 rounded font-bold ${byeType==='Leg Bye'?'bg-neon text-black':'bg-gray-800 text-gray-400'}`}>Leg Bye</button>
                        <button onClick={() => setByeType('Bye')} className={`flex-1 p-3 rounded font-bold ${byeType==='Bye'?'bg-neon text-black':'bg-gray-800 text-gray-400'}`}>Bye</button>
                    </div>
                )}

                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">
                        {showExtrasModal === 'wd' ? 'Extra Runs Ran?' : showExtrasModal === 'nb' ? 'Runs scored on NB?' : 'How many runs?'}
                    </label>
                    <div className="flex flex-wrap justify-center gap-2">
                        {(showExtrasModal === 'lb' ? [1,2,3,4] : [0,1,2,3,4,6]).map(r => (
                            <button key={r} onClick={() => setExtraRuns(r)} className={`w-12 h-12 rounded-lg font-bold text-lg ${extraRuns===r?'bg-neon text-black':'bg-gray-800 text-white'}`}>{r}</button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button onClick={confirmExtras} className="flex-1 py-3 bg-neon text-black font-bold rounded-lg">Confirm</button>
                    <button onClick={() => setShowExtrasModal(null)} className="px-4 bg-gray-700 text-white rounded-lg">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showInningsBreakModal && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-white mb-2">Innings Break</h2>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8 w-full max-w-sm">
                <div className="text-gray-500 uppercase text-xs font-bold mb-1">TARGET SCORE</div>
                <div className="text-5xl font-black text-neon">{stats.runs + 1}</div>
                <div className="text-gray-400 text-sm mt-2">{match.current_bowling_team} needs {stats.runs + 1} runs to win.</div>
            </div>
            
            {/* FIXED DROPDOWNS: Clear Labels and Unselectable Placeholders */}
            <div className="w-full max-w-sm space-y-4 text-left">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">2nd Innings Striker</label>
                    <select className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white" value={opener1} onChange={e=>setOpener1(e.target.value)}>
                        <option value="" disabled>-- Select Player --</option>
                        {nextBatSquad.map((p:string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">2nd Innings Non-Striker</label>
                    <select className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white" value={opener2} onChange={e=>setOpener2(e.target.value)}>
                        <option value="" disabled>-- Select Player --</option>
                        {nextBatSquad.map((p:string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">2nd Innings Bowler</label>
                    <select className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white" value={openBowler} onChange={e=>setOpenBowler(e.target.value)}>
                        <option value="" disabled>-- Select Player --</option>
                        {nextBowlSquad.map((p:string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <button onClick={startSecondInnings} disabled={loading} className="w-full bg-neon text-black font-bold py-4 rounded-xl mt-4 hover:bg-springGreen transition shadow-lg shadow-neon/20">Start 2nd Innings 🏏</button>
            </div>
        </div>
      )}

      {showWagonWheel && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <h3 className="text-neon text-xl font-bold mb-6">Where was the shot?</h3>
            <div className="flex flex-wrap gap-3 justify-center max-w-xs">{WAGON_ZONES.map(z => <button key={z.id} onClick={() => confirmBall(pendingRun, z.id)} className="bg-gray-800 border border-gray-600 px-4 py-3 rounded-lg hover:bg-neon hover:text-black font-bold text-sm">{z.label}</button>)}</div>
            <button onClick={() => setShowWagonWheel(false)} className="mt-8 text-gray-500 underline">Cancel</button>
        </div>
      )}
      
      {showWicketModal && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6"><h2 className="text-2xl font-bold text-red-500 mb-6">Wicket Details</h2>
            <div className="w-full max-w-md space-y-4">
                <div className="grid grid-cols-2 gap-2 mt-2">{WICKET_TYPES.map(type => <button key={type} onClick={() => setWicketType(type)} className={`p-3 rounded-lg text-sm font-bold border ${wicketType === type ? 'bg-red-500 text-white border-red-500' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>{type}</button>)}</div>
                
                {wicketType === 'Run Out' && (
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Runs Completed</label>
                        <select className="w-full p-3 mt-2 bg-gray-800 border border-gray-700 rounded-lg text-white" value={wicketRuns} onChange={(e) => setWicketRuns(Number(e.target.value))}>
                            {[0,1,2,3,4].map(r => <option key={r} value={r}>{r} Runs</option>)}
                        </select>
                    </div>
                )}

                {["Caught", "Run Out", "Stumped"].includes(wicketType) && (
                    <select className="w-full p-3 mt-2 bg-gray-800 border border-gray-700 rounded-lg text-white" onChange={(e) => setWicketAssist(e.target.value)}>
                        <option value="">Select Fielder...</option>
                        {(match.current_bowling_team === match.team_a ? match.team_a_squad : match.team_b_squad)?.map((p: any) => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
                <button onClick={confirmWicket} className="w-full py-4 bg-red-600 font-bold rounded-xl mt-4 hover:bg-red-500">Confirm Wicket</button>
                <button onClick={() => setShowWicketModal(false)} className="w-full py-3 text-gray-400 text-sm">Cancel</button>
            </div>
        </div>
      )}

      {showNewBatsmanModal && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6"><h2 className="text-2xl font-bold text-red-500 mb-2">New Batsman</h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md max-h-[60vh] overflow-y-auto mt-4">
                {getAvailableBatsmen().length === 0 ? <p className="text-red-500 col-span-2 text-center">Innings Over</p> : getAvailableBatsmen().map((p: string) => (
                        <button key={p} onClick={() => changeBatsman(p)} className="bg-gray-800 p-3 rounded text-sm hover:bg-neon hover:text-black border border-gray-700 text-white">{p}</button>
                ))}
            </div>
        </div>
      )}

      {showNewBowlerModal && !showInningsBreakModal && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6"><h2 className="text-2xl font-bold text-white mb-2">Select Bowler</h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {(match.current_bowling_team === match.team_a ? match.team_a_squad : match.team_b_squad)?.map((p: string) => (
                    <button key={p} onClick={() => changeBowler(p)} className="bg-gray-800 p-3 rounded text-sm hover:bg-neon hover:text-black border border-gray-700 text-white">{p}</button>
                ))}
            </div>
            <button onClick={() => setShowNewBowlerModal(false)} className="mt-6 text-gray-500 text-sm underline">Cancel</button>
        </div>
      )}
    </div>
  );
}
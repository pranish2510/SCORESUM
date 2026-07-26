"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Share2, Trophy, Sun, Moon, Medal, Users, BarChart3, MessageSquare } from "lucide-react";

export default function LiveMatch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Match States
  const [match, setMatch] = useState<any>(null);
  const [balls, setBalls] = useState<any[]>([]);
  
  // Tournament States (For Points Table & Posts)
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [tournamentBalls, setTournamentBalls] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]); 
  
  // UI States
  const [activeTab, setActiveTab] = useState("scorecard");
  const [viewInnings, setViewInnings] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => { setIsDarkMode(!isDarkMode); document.documentElement.classList.toggle('dark'); };

  // --- DATA FETCHING (Includes Tournament Data for Standings & Posts) ---
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    document.documentElement.classList.add('dark');
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
      if(match && match.current_innings === 2 && viewInnings === 1 && !balls.length) setViewInnings(2);
  }, [match?.current_innings]);

  const fetchData = async () => {
    const { data: m } = await supabase.from("matches").select("*").eq("id", id).single();
    if (m) {
        setMatch(m);
        // Fetch Live Standings & Posts Data if Tournament Match
        if (m.tournament_id) {
            const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", m.tournament_id).order("group_name", { ascending: true });
            if (teams) setTournamentTeams(teams);

            const { data: matches } = await supabase.from("matches").select("*").eq("tournament_id", m.tournament_id);
            if (matches) {
                setTournamentMatches(matches);
                const mIds = matches.map((match: any) => match.id);
                if (mIds.length > 0) {
                    const { data: tBalls } = await supabase.from("balls").select("*").in("match_id", mIds);
                    if (tBalls) setTournamentBalls(tBalls);
                }
            }

            // Fetch Tournament Posts
            const { data: pData } = await supabase.from("tournament_posts").select("*").eq("tournament_id", m.tournament_id).order("created_at", { ascending: false });
            if (pData) setPosts(pData);
        }
    }
    const { data: b } = await supabase.from("balls").select("*").eq("match_id", id).order("created_at", { ascending: true }); 
    if (b) setBalls(b);
  };

  // Helper: Make links clickable in text
  const renderTextWithLinks = (text: string) => {
      if (!text) return null;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = text.split(urlRegex);
      return parts.map((part, i) => 
          urlRegex.test(part) ? 
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 dark:text-neon dark:hover:text-springGreen underline transition-colors break-words">{part}</a> 
          : <span key={i}>{part}</span>
      );
  };

  // --- HEADER SCORES ---
  const getInningsScore = (inn: number) => {
      const innBalls = balls.filter(b => b.innings === inn);
      if (!innBalls.length) return null;
      let runs = 0, w = 0, valid = 0;
      innBalls.forEach(b => { 
          runs += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0); 
          if (b.is_wicket) w++; 
          if (!b.is_wide && !b.is_no_ball) valid++; 
      });
      return { runs, w, overs: `${Math.floor(valid/6)}.${valid%6}` };
  };

  const score1 = getInningsScore(1);
  const score2 = getInningsScore(2);

  // --- DETAILED STATS ENGINE (Scorecard, Extras, FOW) ---
  const generateStats = (targetInn: number) => {
    const bat: any = {}, bowl: any = {};
    const fow: any[] = [];
    const extras = { wd: 0, nb: 0, b: 0, lb: 0, total: 0 };
    
    // Process chronologically to track exact score at time of wicket
    const activeBalls = balls.filter(b => b.innings === targetInn);

    // Initialize Current Crease Players
    if (match && targetInn === match.current_innings && match.status === 'live') {
        if (match.striker_name) bat[match.striker_name] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: "not out" };
        if (match.non_striker_name) bat[match.non_striker_name] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: "not out" };
    }

    let teamRuns = 0;
    let teamWickets = 0;
    let legalBallsCount = 0;

    activeBalls.forEach(b => {
        const isLegal = !b.is_wide && !b.is_no_ball;
        const ballTotalRuns = b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
        
        teamRuns += ballTotalRuns;
        if (isLegal) legalBallsCount++;

        // EXTRAS TRACKING
        if (b.is_wide) { extras.wd += ballTotalRuns; extras.total += ballTotalRuns; }
        if (b.is_no_ball) { extras.nb += ballTotalRuns; extras.total += ballTotalRuns; }
        if (b.is_bye) { extras.b += b.runs; extras.total += b.runs; }
        if (b.is_leg_bye) { extras.lb += b.runs; extras.total += b.runs; }

        // BATSMAN STATS
        if (b.batsman_name) {
            if (!bat[b.batsman_name]) bat[b.batsman_name] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: "not out" };
            if (b.player_out_name && !bat[b.player_out_name]) bat[b.player_out_name] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: "not out" }; 
            
            if (!b.is_wide && !b.is_no_ball && !b.is_bye && !b.is_leg_bye) {
                bat[b.batsman_name].runs += b.runs; 
                if (b.runs === 4) bat[b.batsman_name].fours++; 
                if (b.runs === 6) bat[b.batsman_name].sixes++; 
            }
            if (!b.is_wide) bat[b.batsman_name].balls++;
        }

        // BOWLER STATS
        if (b.bowler_name) {
            if (!bowl[b.bowler_name]) bowl[b.bowler_name] = { balls: 0, runs: 0, w: 0 };
            if (!b.is_wide && !b.is_no_ball) bowl[b.bowler_name].balls++;
            if (!b.is_bye && !b.is_leg_bye) bowl[b.bowler_name].runs += ballTotalRuns;
            if (b.is_wicket && b.wicket_type !== 'Run Out') bowl[b.bowler_name].w++;
        }

        // FALL OF WICKETS (FOW) TRACKING
        if (b.is_wicket) {
            teamWickets++;
            const outPlayer = b.player_out_name || b.batsman_name;
            // Over at which wicket fell (e.g., 1.2 Ov)
            const overStr = `${Math.floor(legalBallsCount/6)}.${legalBallsCount%6}`;
            
            if (bat[outPlayer]) {
                bat[outPlayer].isOut = true; 
                bat[outPlayer].dismissal = b.wicket_type; 
            }
            
            fow.push({
                batsman: outPlayer,
                score: teamRuns,
                wickets: teamWickets,
                over: overStr
            });
        }
    });

    return { bat, bowl, extras, fow };
  };

  const { bat, bowl, extras, fow } = generateStats(viewInnings);

  // --- YET TO BAT LOGIC ---
  let bat1Team = match?.toss_decision === 'bat' ? match?.toss_winner : (match?.toss_winner === match?.team_a ? match?.team_b : match?.team_a);
  let bat2Team = bat1Team === match?.team_a ? match?.team_b : match?.team_a;
  
  const currentBattingTeam = viewInnings === 1 ? bat1Team : bat2Team;
  const battingSquad = currentBattingTeam === match?.team_a ? match?.team_a_squad || [] : match?.team_b_squad || [];
  const battedPlayers = Object.keys(bat);
  const yetToBat = battingSquad.filter((p: string) => !battedPlayers.includes(p));

  // --- COMMENTARY PROCESSING ---
  const processCommentary = () => {
      const activeBalls = balls.filter(b => b.innings === viewInnings);
      let legalBallCount = 0;
      
      const formatted = activeBalls.map((b: any) => {
          const currentOver = Math.floor(legalBallCount / 6);
          const currentBall = (legalBallCount % 6) + 1;
          const displayOver = (b.is_wide || b.is_no_ball) ? `${currentOver}.${legalBallCount % 6}` : `${currentOver}.${currentBall}`;
          
          if (!b.is_wide && !b.is_no_ball) legalBallCount++;
          
          let text = `${b.runs} runs`;
          if (b.is_wicket) text = `OUT! ${b.wicket_type}`;
          else if (b.is_wide) text = `WIDE + ${b.runs}`;
          else if (b.is_no_ball) text = `NO BALL (${b.no_ball_reason}) + ${b.runs}`;
          else if (b.is_bye) text = `${b.runs} BYES`;
          else if (b.is_leg_bye) text = `${b.runs} LEG BYES`;
          else if (b.runs === 4) text = "FOUR RUNS!";
          else if (b.runs === 6) text = "SIX RUNS!";

          return { ...b, displayOver, text, isBoundary: b.runs >= 4 && !b.is_wicket && !b.is_wide && !b.is_bye && !b.is_leg_bye };
      });
      return formatted.reverse(); 
  };

  const commentaryBalls = processCommentary();

  // --- NRR ENGINE FOR LIVE STANDINGS ---
  const calculatePointsTable = (groupName: string) => {
      const groupTeams = tournamentTeams.filter(t => (t.group_name || "A") === groupName);
      
      return groupTeams.map(team => {
          let played = 0, won = 0, lost = 0, nr = 0;
          let runsFor = 0, ballsFor = 0;
          let runsAgainst = 0, ballsAgainst = 0;

          tournamentMatches.forEach(m => {
              if (m.status === 'completed' && (m.team_a === team.name || m.team_b === team.name)) {
                  played++;
                  if (m.winner_team === team.name) won++;
                  else if (m.winner_team) lost++;
                  else nr++;

                  const isTeamA_BatFirst = (m.toss_decision === 'bat' && m.toss_winner === m.team_a) || (m.toss_decision === 'bowl' && m.toss_winner === m.team_b);
                  const teamBattingInn1 = isTeamA_BatFirst ? m.team_a : m.team_b;
                  const totalOvers = m.total_overs || 10;
                  const maxBalls = totalOvers * 6;
                  const mBalls = tournamentBalls.filter(b => b.match_id === m.id);
                  
                  const getInnStats = (inn: number) => {
                      const innBalls = mBalls.filter(b => b.innings === inn);
                      let r = 0, legal = 0, w = 0;
                      innBalls.forEach(b => {
                          r += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
                          if (!b.is_wide && !b.is_no_ball) legal++;
                          if (b.is_wicket) w++;
                      });
                      const ballsFaced = (w >= 10) ? maxBalls : legal;
                      return { r, ballsFaced };
                  };

                  const inn1 = getInnStats(1);
                  const inn2 = getInnStats(2);

                  if (team.name === teamBattingInn1) {
                      runsFor += inn1.r; ballsFor += inn1.ballsFaced;
                      runsAgainst += inn2.r; ballsAgainst += inn2.ballsFaced;
                  } else {
                      runsFor += inn2.r; ballsFor += inn2.ballsFaced;
                      runsAgainst += inn1.r; ballsAgainst += inn1.ballsFaced;
                  }
              }
          });

          const points = (won * 2) + (nr * 1);
          let nrr = 0;
          if (ballsFor > 0 && ballsAgainst > 0) {
              nrr = ((runsFor / ballsFor) * 6) - ((runsAgainst / ballsAgainst) * 6);
          }

          return { ...team, played, won, lost, nr, points, nrr };
      }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  };
  
  const tournamentGroups = tournamentTeams.length > 0 ? [...new Set(tournamentTeams.map(t => t.group_name || 'A'))].sort() : [];

  const handleShare = async () => {
    try { await navigator.share({ title: match?.name, url: window.location.href }); } catch (err) { console.error(err); }
  };

  if (!match) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-obsidian text-black dark:text-white">Loading Scorecard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-obsidian text-gray-900 dark:text-white font-sans transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slateSecondary p-5 border-b border-gray-300 dark:border-gray-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
            
            {/* UPDATED: Match Title alongside the LIVE badge */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    {match.status === 'completed' ? (
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider">RESULT</span>
                    ) : (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider animate-pulse">LIVE</span>
                    )}
                    <div className="text-sm md:text-base font-black text-gray-800 dark:text-gray-200">
                        {match.team_a} <span className="text-gray-500 dark:text-gray-500 font-medium mx-1">vs</span> {match.team_b}
                    </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white"><Sun className="w-4 h-4" /></button>
                    <button onClick={handleShare} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white"><Share2 className="w-4 h-4" /></button>
                </div>
            </div>

            <h2 className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-4">{match.name}</h2>
            
            <div className="flex flex-col gap-6 mb-6">
                <div className={`flex justify-between items-end ${match.current_innings === 2 ? 'opacity-60' : ''}`}>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-300 truncate max-w-[65%]">{bat1Team}</h1>
                    <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-black text-gray-800 dark:text-gray-300 leading-none">{score1 ? `${score1.runs}/${score1.w}` : "Yet to bat"}</div>
                        {score1 && <div className="text-xs font-mono text-gray-500 mt-1">({score1.overs} ov)</div>}
                    </div>
                </div>

                {match.current_innings === 2 && score1 && (
                    <div className="text-center text-xs font-bold text-red-600 dark:text-orange-400 bg-red-100 dark:bg-orange-900/20 py-2 rounded-lg border border-red-200 dark:border-orange-500/30">Target: {score1.runs + 1}</div>
                )}

                {(score2 || match.current_innings === 2) && (
                    <div className="flex justify-between items-end border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h1 className="text-2xl font-black text-black dark:text-white truncate max-w-[60%]">{bat2Team}</h1>
                        <div className="text-right flex-shrink-0">
                            <div className="text-5xl font-black text-black dark:text-neon leading-none">{score2 ? `${score2.runs}/${score2.w}` : "0/0"}</div>
                            <div className="text-sm font-mono text-gray-600 dark:text-gray-400 mt-1">({score2 ? score2.overs : "0.0"} ov)</div>
                        </div>
                    </div>
                )}
            </div>

            {match.status === 'completed' && match.result_description && (
                <div className="space-y-3 mb-2">
                    <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-400 p-3 rounded-xl flex items-center gap-3 font-bold text-sm"><Trophy className="w-5 h-5" />{match.result_description}</div>
                    {match.man_of_the_match && <div className="bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-400 p-3 rounded-xl flex items-center gap-3 font-bold text-sm"><Medal className="w-5 h-5" /> MOTM: {match.man_of_the_match}</div>}
                </div>
            )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-300 dark:border-gray-800 bg-white dark:bg-slateSecondary/95 sticky top-0 z-20 backdrop-blur-md overflow-x-auto no-scrollbar">
        {['scorecard', 'commentary', 'squads', 'standings', 'posts'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab ? "text-red-600 dark:text-neon border-b-2 border-red-600 dark:border-neon" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {tab}
            </button>
        ))}
      </div>

      <div className="p-4">
        {/* --- SCORECARD TAB --- */}
        {activeTab === "scorecard" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center gap-2 mb-4">
                    <button onClick={() => setViewInnings(1)} className={`px-6 py-2 rounded-full text-xs font-bold transition border ${viewInnings === 1 ? 'bg-red-600 dark:bg-white text-white dark:text-black border-red-600 dark:border-white shadow-md' : 'bg-transparent text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>1st Innings</button>
                    {score2 && <button onClick={() => setViewInnings(2)} className={`px-6 py-2 rounded-full text-xs font-bold transition border ${viewInnings === 2 ? 'bg-red-600 dark:bg-white text-white dark:text-black border-red-600 dark:border-white shadow-md' : 'bg-transparent text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>2nd Innings</button>}
                </div>

                <div className="bg-white dark:bg-slateSecondary/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="bg-gray-100 dark:bg-gray-800/80 p-3 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest flex justify-between items-center">
                        <span>Batting ({currentBattingTeam})</span>
                        <span className="flex gap-4 mr-2"><span className="w-6 text-right">R</span><span className="w-6 text-right">B</span><span className="w-6 text-right">4s</span><span className="w-6 text-right">6s</span><span className="w-8 text-right">SR</span></span>
                    </div>
                    
                    {/* Batted Players */}
                    {Object.entries(bat).map(([name, stats]: any) => (
                        <div key={name} className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <div className="flex flex-col">
                                <div className={`font-bold ${stats.isOut ? 'text-gray-500 dark:text-gray-400' : 'text-black dark:text-white'}`}>
                                    {name} {!stats.isOut && name === match.striker_name && match.current_innings === viewInnings && match.status === 'live' && <span className="text-red-500 dark:text-neon ml-1">*</span>}
                                </div>
                                <span className={`text-[10px] font-semibold uppercase ${stats.isOut ? 'text-red-500' : 'text-gray-400'}`}>{stats.dismissal}</span>
                            </div>
                            <div className="flex gap-4 font-mono text-gray-700 dark:text-gray-300 mr-2">
                                <span className="w-6 text-right font-bold text-black dark:text-white">{stats.runs}</span>
                                <span className="w-6 text-right text-gray-500">{stats.balls}</span>
                                <span className="w-6 text-right text-gray-500">{stats.fours}</span>
                                <span className="w-6 text-right text-gray-500">{stats.sixes}</span>
                                <span className="w-8 text-right text-gray-500">{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : 0}</span>
                            </div>
                        </div>
                    ))}
                    
                    {/* Extras Row */}
                    <div className="p-3 border-y border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-sm font-bold text-gray-800 dark:text-gray-200">
                        <span>EXTRAS</span>
                        <span>{extras.total} <span className="font-normal text-xs text-gray-500 ml-1">(W {extras.wd}, NB {extras.nb}, B {extras.b}, LB {extras.lb})</span></span>
                    </div>

                    {/* Fall of Wickets Row */}
                    {fow.length > 0 && (
                        <div className="p-4 bg-white dark:bg-slateSecondary/40 text-sm">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Fall of Wickets</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-gray-800 dark:text-gray-300">
                                {fow.map((w, i) => (
                                    <span key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                        <span className="font-bold text-red-600 dark:text-red-400">{w.score}-{w.wickets}</span> {w.batsman} <span className="text-xs text-gray-500">({w.over} ov)</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yet to Bat Row */}
                    {yetToBat.length > 0 && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-bold uppercase mr-2 text-gray-500">Yet to bat:</span>
                            {yetToBat.join(", ")}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slateSecondary/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="bg-gray-100 dark:bg-gray-800/80 p-3 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest flex justify-between items-center">
                        <span>Bowling</span>
                        <span className="flex gap-4 mr-2"><span className="w-8 text-right">O</span><span className="w-6 text-right">R</span><span className="w-6 text-right">W</span><span className="w-8 text-right">ECO</span></span>
                    </div>
                    {Object.entries(bowl).map(([name, stats]: any) => (
                        <div key={name} className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                            <div className="font-bold text-black dark:text-white">{name}</div>
                            <div className="flex gap-4 font-mono text-gray-700 dark:text-gray-300 mr-2">
                                <span className="w-8 text-right text-gray-500">{Math.floor(stats.balls/6)}.{stats.balls%6}</span>
                                <span className="w-6 text-right font-bold text-black dark:text-white">{stats.runs}</span>
                                <span className="w-6 text-right font-bold text-red-600 dark:text-neon">{stats.w}</span>
                                <span className="w-8 text-right text-gray-500">{stats.balls > 0 ? (stats.runs / (stats.balls/6)).toFixed(1) : 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- COMMENTARY TAB --- */}
        {activeTab === "commentary" && (
            <div className="space-y-3">
                {commentaryBalls.map((ball: any, i) => (
                    <div key={i} className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-3 last:border-0">
                         <div className="flex flex-col items-center min-w-[3rem]">
                            <div className="font-mono text-xs text-gray-500 mb-1">{ball.displayOver}</div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${ball.is_wicket ? 'bg-red-500 text-white border-red-500' : ball.isBoundary ? 'bg-green-600 dark:bg-neon text-white dark:text-black border-green-600 dark:border-neon' : ball.is_wide || ball.is_no_ball ? 'bg-yellow-100 text-yellow-700 border-yellow-400' : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700'}`}>
                                {ball.is_wicket ? 'W' : ball.is_wide ? 'wd' : ball.is_no_ball ? 'nb' : ball.is_bye || ball.is_leg_bye ? 'b' : ball.runs}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-800 dark:text-gray-300">{ball.bowler_name} to {ball.batsman_name}</div>
                            <div className={`text-xs mt-1 ${ball.is_wicket ? 'text-red-500 font-bold uppercase' : ball.isBoundary ? 'text-green-600 dark:text-neon font-bold uppercase' : 'text-gray-500 italic'}`}>
                                {ball.text}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- SQUADS TAB --- */}
        {activeTab === "squads" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slateSecondary/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div className="bg-gray-100 dark:bg-gray-800/80 p-3 font-bold text-center text-red-600 dark:text-neon uppercase tracking-widest">{match.team_a}</div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                        {match.team_a_squad?.map((p: string) => <div key={p} className="p-3 text-center text-gray-700 dark:text-gray-300">{p}</div>)}
                    </div>
                </div>
                <div className="bg-white dark:bg-slateSecondary/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div className="bg-gray-100 dark:bg-gray-800/80 p-3 font-bold text-center text-red-600 dark:text-neon uppercase tracking-widest">{match.team_b}</div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                        {match.team_b_squad?.map((p: string) => <div key={p} className="p-3 text-center text-gray-700 dark:text-gray-300">{p}</div>)}
                    </div>
                </div>
            </div>
        )}

        {/* --- STANDINGS TAB --- */}
        {activeTab === "standings" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {match?.tournament_id ? (
                  tournamentGroups.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">No teams registered yet.</div>
                  ) : (
                      tournamentGroups.map(group => (
                          <div key={group} className="bg-white dark:bg-slateSecondary/40 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                              <div className="bg-gray-100 dark:bg-gray-800/80 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-red-600 dark:text-neon" />
                                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">Group {group}</h3>
                              </div>
                              <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                                      <tr>
                                          <th className="px-4 py-3">Team</th><th className="px-2 py-3 text-center">P</th><th className="px-2 py-3 text-center">W</th><th className="px-2 py-3 text-center">L</th><th className="px-2 py-3 text-center">NR</th><th className="px-2 py-3 text-center">NRR</th><th className="px-2 py-3 text-center text-red-600 dark:text-neon">Pts</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {calculatePointsTable(group).map((team, i) => (
                                          <tr key={team.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                              <td className="px-4 py-3 font-bold text-gray-900 dark:text-white flex items-center gap-2"><span className="text-gray-400 text-xs w-3">{i + 1}</span>{team.name}</td>
                                              <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-300">{team.played}</td>
                                              <td className="px-2 py-3 text-center text-green-600 dark:text-green-500 font-bold">{team.won}</td>
                                              <td className="px-2 py-3 text-center text-red-500">{team.lost}</td>
                                              <td className="px-2 py-3 text-center text-gray-500">{team.nr}</td>
                                              <td className="px-2 py-3 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{team.nrr ? (team.nrr > 0 ? '+' : '') + team.nrr.toFixed(3) : "0.000"}</td>
                                              <td className="px-2 py-3 text-center font-black text-red-600 dark:text-neon text-base">{team.points}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              </div>
                          </div>
                      ))
                  )
              ) : (
                  <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">This match is not part of a tournament.</div>
              )}
          </div>
        )}

        {/* --- POSTS TAB (VIEWER MODE) --- */}
        {activeTab === "posts" && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {posts.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slateSecondary/30 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No posts yet for this tournament.</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-slateSecondary/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 dark:from-neon dark:to-emerald-500 flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-white dark:text-black" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-black dark:text-white">Tournament Update</div>
                                        <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {post.content && (
                                <p className="text-gray-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {renderTextWithLinks(post.content)}
                                </p>
                            )}

                            {post.image_url && (
                                <img src={post.image_url} alt="Tournament Update" className="mt-4 rounded-xl max-h-[500px] w-full object-cover border border-gray-100 dark:border-gray-800" loading="lazy" />
                            )}

                            {post.video_url && (
                                <video src={post.video_url} controls className="mt-4 rounded-xl max-h-[500px] w-full object-cover border border-gray-100 dark:border-gray-800" />
                            )}
                        </div>
                    ))
                )}
            </div>
        )}

      </div>
    </div>
  );
}
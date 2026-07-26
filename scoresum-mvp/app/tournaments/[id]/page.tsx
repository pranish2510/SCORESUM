"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Plus, Clock, Trash2, Users, Shield, Trophy, Medal, Star, Edit2, Save, X, Eye, ImageIcon, Send, MessageSquare, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NewMatchModal from "@/app/components/NewMatchModal";

export default function TournamentDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Data States
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [allBalls, setAllBalls] = useState<any[]>([]); 
  const [posts, setPosts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  // UI States
  const [activeTab, setActiveTab] = useState("matches"); 
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  // Form States
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSquad, setNewTeamSquad] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("A"); 
  
  // Post Form States
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postVideo, setPostVideo] = useState<File | null>(null); // NEW: Video State
  
  const [loading, setLoading] = useState(false);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: tData } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (tData) setTournament(tData);

    const { data: mData } = await supabase.from("matches").select("*").eq("tournament_id", id).order("start_time", { ascending: true });
    if (mData) {
        setMatches(mData);
        const matchIds = mData.map(m => m.id);
        if (matchIds.length > 0) {
            const { data: bData } = await supabase.from("balls").select("*").in("match_id", matchIds);
            if (bData) setAllBalls(bData);
        }
    }

    const { data: teamData } = await supabase.from("teams").select("*").eq("tournament_id", id).order("group_name", { ascending: true });
    if (teamData) setTeams(teamData);

    const { data: pData } = await supabase.from("tournament_posts").select("*").eq("tournament_id", id).order("created_at", { ascending: false });
    if (pData) setPosts(pData);
  };

  useEffect(() => { fetchData(); }, [id]);

  // FIX: If tournament has NO user_id (created before update), allow the logged-in user to be the owner.
  const isOwner = !tournament?.user_id || (userId && tournament?.user_id === userId);

  // --- POSTS ACTIONS ---
  const handleCreatePost = async () => {
      if (!postContent.trim() && !postImage && !postVideo) return alert("Post cannot be empty!");
      setLoading(true);
      let imageUrl = null;
      let videoUrl = null;

      // Handle Image Upload
      if (postImage) {
          const fileExt = postImage.name.split('.').pop();
          const fileName = `img_${Math.random()}.${fileExt}`;
          const { data, error } = await supabase.storage.from('tournament_images').upload(fileName, postImage);
          if (data) {
              const { data: publicUrlData } = supabase.storage.from('tournament_images').getPublicUrl(fileName);
              imageUrl = publicUrlData.publicUrl;
          } else console.error(error);
      }

      // Handle Video Upload
      if (postVideo) {
          const fileExt = postVideo.name.split('.').pop();
          const fileName = `vid_${Math.random()}.${fileExt}`;
          const { data, error } = await supabase.storage.from('tournament_images').upload(fileName, postVideo);
          if (data) {
              const { data: publicUrlData } = supabase.storage.from('tournament_images').getPublicUrl(fileName);
              videoUrl = publicUrlData.publicUrl;
          } else console.error(error);
      }

      // Save Post to DB
      const { error } = await supabase.from("tournament_posts").insert([{
          tournament_id: id,
          content: postContent,
          image_url: imageUrl,
          video_url: videoUrl,
          author_id: userId
      }]);

      if (!error) {
          setPostContent("");
          setPostImage(null);
          setPostVideo(null);
          setIsPostModalOpen(false);
          fetchData();
      } else {
          alert("Error creating post");
      }
      setLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
      if (!confirm("Delete this post?")) return;
      await supabase.from("tournament_posts").delete().eq("id", postId);
      fetchData();
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

  // --- MATCH ACTIONS ---
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Delete match?")) return;
    setLoading(true);
    await supabase.from("balls").delete().eq("match_id", matchId);
    await supabase.from("matches").delete().eq("id", matchId);
    fetchData(); setLoading(false);
  };

  // --- TEAM ACTIONS ---
  const openAddTeamModal = () => { setEditingTeamId(null); setNewTeamName(""); setNewTeamSquad(""); setNewTeamGroup("A"); setIsTeamFormOpen(true); };
  const openEditTeamModal = (team: any) => { setEditingTeamId(team.id); setNewTeamName(team.name); setNewTeamSquad(team.squad ? team.squad.join(", ") : ""); setNewTeamGroup(team.group_name || "A"); setIsTeamFormOpen(true); };
  const handleDeleteTeam = async (teamId: string) => { if(!confirm("Delete this team?")) return; await supabase.from("teams").delete().eq("id", teamId); fetchData(); };

  const handleSaveTeam = async () => {
    if (!newTeamName) return alert("Enter team name!");
    setLoading(true);
    const squadArray = newTeamSquad.split(",").map(p => p.trim()).filter(p => p);
    const groupToSave = newTeamGroup || "A";
    let error;

    if (editingTeamId) {
        const { error: updateError } = await supabase.from("teams").update({ name: newTeamName, squad: squadArray, group_name: groupToSave }).eq("id", editingTeamId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from("teams").insert([{ tournament_id: id, name: newTeamName, squad: squadArray, group_name: groupToSave, org_id: userId }]);
        error = insertError;
    }

    if (error) alert("Error saving team: " + error.message);
    else { setNewTeamName(""); setNewTeamSquad(""); setIsTeamFormOpen(false); fetchData(); }
    setLoading(false);
  };

  // --- ENGINES ---
  const calculatePointsTable = (groupName: string) => {
      const groupTeams = teams.filter(t => (t.group_name || "A") === groupName);
      return groupTeams.map(team => {
          let played = 0, won = 0, lost = 0, nr = 0, runsFor = 0, ballsFor = 0, runsAgainst = 0, ballsAgainst = 0;
          matches.forEach(m => {
              if (m.status === 'completed' && (m.team_a === team.name || m.team_b === team.name)) {
                  played++;
                  if (m.winner_team === team.name) won++; else if (m.winner_team) lost++; else nr++;

                  const isTeamA_BatFirst = (m.toss_decision === 'bat' && m.toss_winner === m.team_a) || (m.toss_decision === 'bowl' && m.toss_winner === m.team_b);
                  const teamBattingInn1 = isTeamA_BatFirst ? m.team_a : m.team_b;
                  const maxBalls = (m.total_overs || 10) * 6;
                  const mBalls = allBalls.filter(b => b.match_id === m.id);
                  
                  const getInnStats = (inn: number) => {
                      const innBalls = mBalls.filter(b => b.innings === inn);
                      let r = 0, legal = 0, w = 0;
                      innBalls.forEach(b => {
                          r += b.runs + (b.is_wide || b.is_no_ball ? 1 : 0);
                          if (!b.is_wide && !b.is_no_ball) legal++;
                          if (b.is_wicket) w++;
                      });
                      return { r, ballsFaced: (w >= 10) ? maxBalls : legal };
                  };

                  const inn1 = getInnStats(1), inn2 = getInnStats(2);
                  if (team.name === teamBattingInn1) {
                      runsFor += inn1.r; ballsFor += inn1.ballsFaced; runsAgainst += inn2.r; ballsAgainst += inn2.ballsFaced;
                  } else {
                      runsFor += inn2.r; ballsFor += inn2.ballsFaced; runsAgainst += inn1.r; ballsAgainst += inn1.ballsFaced;
                  }
              }
          });
          const points = (won * 2) + (nr * 1);
          let nrr = 0;
          if (ballsFor > 0 && ballsAgainst > 0) nrr = ((runsFor / ballsFor) * 6) - ((runsAgainst / ballsAgainst) * 6);
          return { ...team, played, won, lost, nr, points, nrr };
      }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  };

  const calculateLeaderboard = () => {
      const playerStats: Record<string, { runs: number, wickets: number }> = {};
      allBalls.forEach(ball => {
          if (ball.batsman_name) {
              if (!playerStats[ball.batsman_name]) playerStats[ball.batsman_name] = { runs: 0, wickets: 0 };
              if (!ball.is_wide && !ball.is_no_ball && !ball.is_bye && !ball.is_leg_bye) playerStats[ball.batsman_name].runs += ball.runs;
          }
          if (ball.bowler_name) {
              if (!playerStats[ball.bowler_name]) playerStats[ball.bowler_name] = { runs: 0, wickets: 0 };
              if (ball.is_wicket && ball.wicket_type !== 'Run Out') playerStats[ball.bowler_name].wickets++;
          }
      });
      const players = Object.entries(playerStats).map(([name, stats]) => ({ name, ...stats, mvpScore: stats.runs + (stats.wickets * 20) }));
      return {
          mostRuns: [...players].sort((a, b) => b.runs - a.runs).slice(0, 5),
          mostWickets: [...players].sort((a, b) => b.wickets - a.wickets).slice(0, 5),
          mvp: [...players].sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 5)
      };
  };

  const leaderboard = calculateLeaderboard();
  const groups = teams.length > 0 ? [...new Set(teams.map(t => t.group_name || 'A'))].sort() : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-obsidian text-gray-900 dark:text-white p-4 pb-20 transition-colors">
      
      <NewMatchModal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} tournamentId={id} onSuccess={fetchData} />

      <button onClick={() => router.push('/dashboard')} className="flex items-center text-gray-500 mb-4 hover:text-red-600 dark:hover:text-neon transition">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-black text-red-600 dark:text-neon uppercase tracking-tight">{tournament?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Organizer: {tournament?.organizer}</p>
        {!isOwner && tournament?.user_id && <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] px-2 py-1 rounded mt-1 inline-block font-bold">Viewer Mode</span>}
      </div>

      {/* --- NAVIGATION TABS --- */}
      <div className="flex gap-4 border-b border-gray-300 dark:border-gray-800 mb-6 overflow-x-auto no-scrollbar">
        {['matches', 'teams', 'points', 'leaderboard', 'posts'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-xs font-bold uppercase tracking-wider px-4 whitespace-nowrap transition ${activeTab === tab ? "text-red-600 dark:text-neon border-b-2 border-red-600 dark:border-neon" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"}`}>
                {tab === 'points' ? 'Points Table' : tab}
            </button>
        ))}
      </div>

      {/* --- POSTS TAB (NEW) --- */}
      {activeTab === "posts" && (
        <div className="space-y-6 max-w-2xl mx-auto">
            
            {/* Create Post Action */}
            {isOwner && !isPostModalOpen && (
                <button onClick={() => setIsPostModalOpen(true)} className="w-full bg-white dark:bg-slateSecondary/50 border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-neon p-4 rounded-xl flex items-center gap-3 text-gray-500 transition-colors shadow-sm">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" /></div>
                    <span className="font-medium">Share an update, news, photo, or video...</span>
                </button>
            )}

            {/* Create Post Form */}
            {isPostModalOpen && (
                <div className="bg-white dark:bg-slateSecondary p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Create Post</h3>
                        <button onClick={() => { setIsPostModalOpen(false); setPostImage(null); setPostVideo(null); setPostContent(""); }}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    
                    <textarea 
                        placeholder="What's happening? (Links will be clickable)" 
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl text-black dark:text-white min-h-[120px] focus:ring-2 focus:ring-red-500 dark:focus:ring-neon outline-none transition" 
                        value={postContent} 
                        onChange={e => setPostContent(e.target.value)} 
                    />
                    
                    <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 w-full sm:w-auto overflow-hidden">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-red-600 dark:hover:text-neon transition">
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl"><ImageIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-bold truncate max-w-[90px]">{postImage ? postImage.name : "Image"}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => setPostImage(e.target.files?.[0] || null)} />
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-red-600 dark:hover:text-neon transition">
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl"><Video className="w-5 h-5" /></div>
                                <span className="text-sm font-bold truncate max-w-[90px]">{postVideo ? postVideo.name : "Video"}</span>
                                <input type="file" accept="video/*" className="hidden" onChange={e => setPostVideo(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        
                        <button onClick={handleCreatePost} disabled={loading} className="w-full sm:w-auto px-8 py-3 bg-red-600 dark:bg-neon text-white dark:text-black font-bold rounded-xl hover:bg-red-700 dark:hover:bg-springGreen transition flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? "Posting..." : <><Send className="w-4 h-4" /> Post</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-6">
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
                                {isOwner && (
                                    <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
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
        </div>
      )}

      {/* --- MATCHES TAB --- */}
      {activeTab === "matches" && (
        <div className="space-y-4">
          {isOwner && (
              <button onClick={() => setIsMatchModalOpen(true)} className="w-full bg-red-600 dark:bg-neon text-white dark:text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 dark:hover:bg-springGreen transition shadow-md">
                <Plus className="w-5 h-5" /> Schedule Match
              </button>
          )}
          
          {matches.map((match) => (
            <div key={match.id} className="bg-white dark:bg-slateSecondary/40 border border-gray-200 dark:border-slateSecondary p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-1">
                  <Clock className="w-3 h-3" />
                  {new Date(match.start_time).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute:'2-digit' })}
                  {match.status === 'live' && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 animate-pulse">LIVE</span>}
                  {match.status === 'completed' && <span className="bg-green-600 text-white px-1.5 py-0.5 rounded ml-2">DONE</span>}
                </div>
                <h4 className="font-bold text-lg leading-tight text-black dark:text-white">{match.team_a} <span className="text-gray-400 text-sm">vs</span> {match.team_b}</h4>
                {match.status === 'completed' ? <div className="mt-2 text-sm font-bold text-green-600 dark:text-neon">{match.result_description}</div> : <p className="text-xs text-gray-500 mt-1">{match.total_overs || 10} Overs • Upcoming</p>}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isOwner ? (
                    <button onClick={() => router.push(`/match/${match.id}`)} className={`flex-1 sm:flex-none px-6 py-2 border rounded-lg text-sm font-bold transition ${match.status === 'completed' ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700' : 'bg-white dark:bg-obsidian border-gray-300 dark:border-gray-700 hover:border-red-500 dark:hover:border-neon text-black dark:text-white'}`}>
                      {match.status === 'live' ? 'Resume 🔴' : match.status === 'completed' ? 'Edit Score' : 'Start Match'}
                    </button>
                ) : (
                    <button onClick={() => router.push(`/live/${match.id}`)} className="flex-1 sm:flex-none px-6 py-2 bg-red-600 dark:bg-neon text-white dark:text-black rounded-lg text-sm font-bold hover:bg-red-700 dark:hover:bg-springGreen transition flex items-center justify-center gap-2 shadow-md">
                        <Eye className="w-4 h-4" /> Watch Live
                    </button>
                )}
                {isOwner && (
                    <button onClick={() => handleDeleteMatch(match.id)} className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TEAMS TAB --- */}
      {activeTab === "teams" && (
        <div className="space-y-4">
            {isOwner && !isTeamFormOpen && (
                <button onClick={openAddTeamModal} className="w-full bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
                    <Users className="w-5 h-5" /> Register New Team
                </button>
            )}

            {isTeamFormOpen && (
                <div className="bg-white dark:bg-slateSecondary/50 border border-gray-200 dark:border-gray-700 p-5 rounded-xl space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-black dark:text-white">{editingTeamId ? "Edit Team" : "Add Team"}</h3>
                        <button onClick={() => setIsTeamFormOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <input type="text" placeholder="Team Name" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-black dark:text-white" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-bold">Group:</span>
                        {['A','B','C','D'].map(g => (
                            <button key={g} onClick={() => setNewTeamGroup(g)} className={`px-3 py-1.5 rounded text-sm font-bold border transition-colors ${newTeamGroup === g ? 'bg-red-600 dark:bg-neon text-white dark:text-black border-red-600 dark:border-neon shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'}`}>{g}</button>
                        ))}
                    </div>
                    <textarea placeholder="Player Names (Comma separated)" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-black dark:text-white" value={newTeamSquad} onChange={e => setNewTeamSquad(e.target.value)} />
                    <button onClick={handleSaveTeam} disabled={loading} className="w-full bg-red-600 dark:bg-neon text-white dark:text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-red-700 dark:hover:bg-springGreen transition">
                        <Save className="w-4 h-4" /> {editingTeamId ? "Update Team" : "Save Team"}
                    </button>
                </div>
            )}
            
            <div className="grid grid-cols-1 gap-3">
                {teams.map(team => (
                    <div key={team.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center group shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white text-xs px-2 py-0.5 rounded font-bold">{team.group_name || "A"}</span>
                                <div className="font-bold text-lg text-black dark:text-white">{team.name}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{team.squad?.length || 0} Players</div>
                        </div>
                        {isOwner && (
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEditTeamModal(team)} className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/20 dark:hover:bg-blue-500 text-blue-500 dark:text-blue-400 dark:hover:text-white rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteTeam(team.id)} className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/20 dark:hover:bg-red-500 text-red-500 dark:text-red-400 dark:hover:text-white rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- POINTS TABLE TAB --- */}
      {activeTab === "points" && (
          <div className="space-y-8">
              {groups.length === 0 ? <div className="text-center py-10 text-gray-500">No teams registered yet.</div> : groups.map(group => (
                  <div key={group} className="bg-white dark:bg-slateSecondary/40 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 dark:bg-gray-800/80 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-red-600 dark:text-neon" />
                          <h3 className="font-bold text-black dark:text-white uppercase tracking-wider">Group {group}</h3>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-white dark:bg-gray-900/50">
                              <tr>
                                  <th className="px-4 py-3">Team</th><th className="px-2 py-3 text-center">P</th><th className="px-2 py-3 text-center">W</th><th className="px-2 py-3 text-center">L</th><th className="px-2 py-3 text-center">NR</th><th className="px-2 py-3 text-center">NRR</th><th className="px-2 py-3 text-center text-red-600 dark:text-neon">Pts</th>
                              </tr>
                          </thead>
                          <tbody>
                              {calculatePointsTable(group).map((team, i) => (
                                  <tr key={team.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                      <td className="px-4 py-3 font-bold text-black dark:text-white flex items-center gap-2"><span className="text-gray-400 text-xs w-3">{i + 1}</span>{team.name}</td>
                                      <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-300">{team.played}</td>
                                      <td className="px-2 py-3 text-center text-green-600 font-bold">{team.won}</td>
                                      <td className="px-2 py-3 text-center text-red-500">{team.lost}</td>
                                      <td className="px-2 py-3 text-center text-gray-500">{team.nr}</td>
                                      <td className="px-2 py-3 text-center font-mono text-xs text-gray-500">{team.nrr ? (team.nrr > 0 ? '+' : '') + team.nrr.toFixed(3) : "0.000"}</td>
                                      <td className="px-2 py-3 text-center font-black text-red-600 dark:text-neon text-base">{team.points}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === "leaderboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slateSecondary/40 border border-orange-200 dark:border-orange-500/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-orange-50 dark:bg-orange-500/10 p-4 border-b border-orange-100 dark:border-orange-500/30 flex items-center gap-3"><Trophy className="w-6 h-6 text-orange-500" /><div><h3 className="font-black text-black dark:text-white uppercase text-lg">Orange Cap</h3><p className="text-xs text-orange-600 dark:text-orange-400">Most Runs</p></div></div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">{leaderboard.mostRuns.map((p, i) => <div key={p.name} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5 transition"><div className="flex items-center gap-3"><span className={`text-sm font-bold w-4 ${i===0?'text-orange-500':'text-gray-400'}`}>#{i+1}</span><span className="font-bold text-black dark:text-white">{p.name}</span></div><div className="font-mono font-bold text-orange-600 dark:text-orange-400">{p.runs} <span className="text-[10px] text-gray-500">runs</span></div></div>)}</div>
              </div>
              <div className="bg-white dark:bg-slateSecondary/40 border border-purple-200 dark:border-purple-500/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-purple-50 dark:bg-purple-500/10 p-4 border-b border-purple-100 dark:border-purple-500/30 flex items-center gap-3"><Medal className="w-6 h-6 text-purple-500" /><div><h3 className="font-black text-black dark:text-white uppercase text-lg">Purple Cap</h3><p className="text-xs text-purple-600 dark:text-purple-400">Most Wickets</p></div></div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">{leaderboard.mostWickets.map((p, i) => <div key={p.name} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5 transition"><div className="flex items-center gap-3"><span className={`text-sm font-bold w-4 ${i===0?'text-purple-500':'text-gray-400'}`}>#{i+1}</span><span className="font-bold text-black dark:text-white">{p.name}</span></div><div className="font-mono font-bold text-purple-600 dark:text-purple-400">{p.wickets} <span className="text-[10px] text-gray-500">wkts</span></div></div>)}</div>
              </div>
              <div className="bg-white dark:bg-slateSecondary/40 border border-red-200 dark:border-neon/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-red-50 dark:bg-neon/10 p-4 border-b border-red-100 dark:border-neon/30 flex items-center gap-3"><Star className="w-6 h-6 text-red-600 dark:text-neon" /><div><h3 className="font-black text-black dark:text-white uppercase text-lg">MVP</h3><p className="text-xs text-red-600 dark:text-neon">Best All-Rounder</p></div></div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">{leaderboard.mvp.map((p, i) => <div key={p.name} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5 transition"><div className="flex items-center gap-3"><span className={`text-sm font-bold w-4 ${i===0?'text-red-600 dark:text-neon':'text-gray-400'}`}>#{i+1}</span><span className="font-bold text-black dark:text-white">{p.name}</span></div><div className="text-right"><div className="font-mono font-bold text-red-600 dark:text-neon">{p.mvpScore} <span className="text-[10px] text-gray-500">pts</span></div></div></div>)}</div>
              </div>
          </div>
      )}

    </div>
  );
}
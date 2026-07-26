"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestConnection() {
  const [status, setStatus] = useState("Checking connection...");
  const [details, setDetails] = useState("");
  const [envCheck, setEnvCheck] = useState("");

  useEffect(() => {
    async function checkSupabase() {
      // 1. Check if keys are loaded
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setEnvCheck("❌ MISSING KEYS: .env.local file is not loading or keys are empty.");
        return;
      } else {
        setEnvCheck(`✅ Keys Detected. URL starts with: ${url.substring(0, 15)}...`);
      }

      // 2. Try to fetch ANY data (even if table is empty)
      const { data, error } = await supabase.from("tournaments").select("*").limit(1);

      if (error) {
        setStatus("❌ CONNECTION FAILED");
        setDetails(JSON.stringify(error, null, 2));
      } else {
        setStatus("✅ CONNECTION SUCCESSFUL");
        setDetails(`Database is connected! Found ${data.length} rows in 'tournaments'.`);
      }
    }

    checkSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-10 font-mono">
      <h1 className="text-2xl font-bold mb-4 text-neon">Supabase Connection Test</h1>
      
      <div className="p-4 border border-gray-700 rounded mb-4">
        <h2 className="text-gray-400 text-sm uppercase">Environment Check</h2>
        <p className="mt-1">{envCheck}</p>
      </div>

      <div className={`p-4 border rounded ${status.includes("SUCCESS") ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"}`}>
        <h2 className="font-bold text-xl">{status}</h2>
        <pre className="mt-4 p-2 bg-black rounded overflow-auto text-xs text-gray-300">
          {details}
        </pre>
      </div>
    </div>
  );
}
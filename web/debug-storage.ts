
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS for debugging
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars:", { 
    url: !!supabaseUrl, 
    key: !!supabaseKey,
    keys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const profileId = "a6bda2c8-29a7-4a70-b292-ab9ed9c9b02f";
const sourceId = "638595d7-766a-4e98-ac21-cb762a9a616e";

async function listFiles() {
  console.log(`Listing files for source: ${sourceId} in profile: ${profileId}`);
  
  // Try to list at the root of the source
  const { data, error } = await supabase
    .storage
    .from('sources')
    .list(`${profileId}/${sourceId}`);

  if (error) {
    console.error("Error listing files:", error);
    return;
  }

  console.log("Root files:", data);

  // Try to list inside 'hls' folder
  const { data: hlsData, error: hlsError } = await supabase
    .storage
    .from('sources')
    .list(`${profileId}/${sourceId}/hls`);

  if (hlsError) {
    console.error("Error listing HLS files:", hlsError);
    return;
  }

  console.log("HLS files:", hlsData);
}

listFiles();

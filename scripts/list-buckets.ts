import { createClient } from "@supabase/supabase-js";
import "./bootstrap";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    console.log("Got error while retrieving buckets:", error);
  }
  console.log("Got buckets:", JSON.stringify(data, null, 2));
}

main();

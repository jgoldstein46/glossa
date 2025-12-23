import "./bootstrap";
import { createClient } from "@supabase/supabase-js";
import { generateModule } from "../lib/services/moduleGeneration";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const title = process.argv[2] || "Day of the dead";
  const language = process.argv[3] || "Spanish";

  console.log(`\n🎯 Generating module: "${title}" in ${language}\n`);
  console.log("This will:");
  console.log("  1. Generate content via OpenAI");
  console.log("  2. Create module and sections in database");
  console.log("  3. Generate audio for each section via ElevenLabs");
  console.log("  4. Upload audio to Supabase Storage");
  console.log("");

  const startTime = Date.now();

  const result = await generateModule(supabase, title, language);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!result.success) {
    console.error("❌ Generation failed:", result.error);
    console.error("Details:", result.details);
    process.exit(1);
  }

  console.log(`\n✅ Module generated in ${elapsed}s\n`);
  console.log("Module:", {
    id: result.module.id,
    title: result.module.title,
    topic: result.module.topic,
    difficulty: result.module.difficulty,
  });

  console.log("\nSections:");
  for (const section of result.sections) {
    const audioStatus = section.audio_url ? "🔊 Audio" : "❌ No audio";
    console.log(
      `  ${section.order_index + 1}. ${section.title} [${audioStatus}]`,
    );
    if (section.audio_url) {
      console.log(`     ${section.audio_url}`);
    }
  }

  console.log(`\nQuizzes: ${result.quizzes.length} created`);

  // Summary
  const sectionsWithAudio = result.sections.filter((s) => s.audio_url).length;
  console.log(`\n📊 Summary:`);
  console.log(`   Sections: ${result.sections.length}`);
  console.log(`   With audio: ${sectionsWithAudio}/${result.sections.length}`);
  console.log(`   Total time: ${elapsed}s`);
}

main().catch(console.error);

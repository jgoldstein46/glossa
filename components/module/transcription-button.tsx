import { useScribe } from "@elevenlabs/react";

export default function TranscriptionButton({
  token,
}: {
  token: string | null;
}) {
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      console.log("Partial:", data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed:", data.text);
    },
    onCommittedTranscriptWithTimestamps: (data) => {
      console.log("Committed with timestamps:", data.text);
      console.log("Timestamps:", data.words);
    },
  });

  const handleStart = async () => {
    if (token) {
      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    }
  };

  async function handleStop() {
    scribe.disconnect();
    // TODO: Send result to api
  }

  return (
    <div>
      <button
        className="w-[80%] px-4 py-2 text-center bg-black rounded-lg text-lg text-white"
        onClick={scribe.isConnected ? handleStop : handleStart}
        disabled={!token}
      >
        Start Recording
      </button>

      {scribe.partialTranscript && <p>Live: {scribe.partialTranscript}</p>}

      <div>
        {scribe.committedTranscripts.map((t) => (
          <p key={t.id}>{t.text}</p>
        ))}
      </div>
    </div>
  );
}

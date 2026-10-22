// A soft twinkle as a vote goes in, made on the fly so there's nothing to
// load. Browsers only let a page make sound once it's been tapped, so the tap
// gets it ready and the sound plays when the vote's in.
import type { VoteCategory } from "../../convex/features/votes/schema";

type WithAudio = typeof window & { webkitAudioContext?: typeof AudioContext };
type WithAudioSession = Navigator & { audioSession?: { type: string } };

let context: AudioContext | null = null;

// Call from the tap itself
export function readyVoteSound() {
  try {
    if (!context) {
      const Context =
        window.AudioContext ?? (window as WithAudio).webkitAudioContext;
      if (!Context) return;
      // On iPhones, so the silent switch mutes it and it doesn't stop music
      const session = (navigator as WithAudioSession).audioSession;
      if (session) session.type = "ambient";
      context = new Context();
    }
    if (context.state !== "running") void context.resume();
    // Older iPhones want something played in the tap too, so a silent blip
    const blip = context.createBufferSource();
    blip.buffer = context.createBuffer(1, 1, context.sampleRate);
    blip.connect(context.destination);
    blip.start();
  } catch {
    // No sound is fine
  }
}

// Notes in Hz, a bright run up for best display and a little jingle for most
// jolly
const NOTES: Record<VoteCategory, number[]> = {
  best_display: [1318.5, 1568, 1975.5, 2637],
  most_jolly: [1568, 1318.5, 1568, 2093, 2637],
};
const STEP_S = 0.065;
const RING_S = 0.22;
const VOLUME = 0.05;

export function playVoteSound(category: VoteCategory) {
  const audio = context;
  if (audio?.state !== "running") return;
  const start = audio.currentTime + 0.01;
  NOTES[category].forEach((frequency, i) => {
    const at = start + i * STEP_S;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = "triangle";
    tone.frequency.value = frequency;
    // A quick strike then a bell-like fade
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(VOLUME, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + RING_S);
    tone.connect(gain).connect(audio.destination);
    tone.start(at);
    tone.stop(at + RING_S);
  });
}

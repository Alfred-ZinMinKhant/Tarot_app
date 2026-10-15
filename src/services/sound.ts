import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/** Original synthesised effects (scripts/render-sounds.ts). */
const SOURCES = {
  flip: require('../../assets/sounds/flip.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
  chime: require('../../assets/sounds/chime.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players = new Map<SoundName, AudioPlayer>();
let modeSet = false;

/** Plays a short effect. Mixes with other audio and respects the silent switch on iOS. */
export function playSound(name: SoundName): void {
  try {
    if (!modeSet) {
      modeSet = true;
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      player.volume = 0.5;
      players.set(name, player);
    }
    void player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Sound is decoration; never let it break the reading flow.
  }
}

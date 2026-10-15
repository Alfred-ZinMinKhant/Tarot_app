/** In-memory stand-in for expo-audio under Jest. `played` lists every source that was played. */
export const played: unknown[] = [];

export function createAudioPlayer(source: unknown) {
  return {
    volume: 1,
    play: () => {
      played.push(source);
    },
    seekTo: async () => undefined,
    remove: () => undefined,
  };
}

export async function setAudioModeAsync(): Promise<void> {}

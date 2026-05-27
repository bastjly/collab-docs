import { useRef, useCallback } from 'react';

export function useCallSounds() {
  const ringAudio = useRef(null);

  const playRing = useCallback(() => {
    if (!ringAudio.current) {
      ringAudio.current = new Audio('/sounds/ring.mp3');
      ringAudio.current.loop = true;
    }
    ringAudio.current.currentTime = 0;
    ringAudio.current.play().catch(() => {});
  }, []);

  const stopRing = useCallback(() => {
    if (!ringAudio.current) return;
    ringAudio.current.pause();
    ringAudio.current.currentTime = 0;
  }, []);

  const playHangup = useCallback(() => {
    new Audio('/sounds/hangup.mp3').play().catch(() => {});
  }, []);

  return { playRing, stopRing, playHangup };
}

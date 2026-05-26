import { useRef, useCallback } from 'react';

function makeContext() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  return ctx;
}

function beep(ctx, frequency, startTime, duration) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.25, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function useCallSounds() {
  const intervalRef = useRef(null);

  const playRing = useCallback(() => {
    clearInterval(intervalRef.current);
    function ring() {
      const ctx = makeContext();
      beep(ctx, 800, ctx.currentTime, 0.35);
      beep(ctx, 640, ctx.currentTime + 0.45, 0.35);
    }
    ring();
    intervalRef.current = setInterval(ring, 2500);
  }, []);

  const stopRing = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const playHangup = useCallback(() => {
    stopRing();
    const ctx = makeContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }, [stopRing]);

  return { playRing, stopRing, playHangup };
}

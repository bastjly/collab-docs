import { useState, useRef, useEffect, useCallback } from 'react';
import { useCallSounds } from './useCallSounds';

const STUN = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] };

export function useWebRTC(send, on, documentId) {
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [caller, setCaller] = useState(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const pendingOffer = useRef(null);
  const remoteAudioRef = useRef(null);
  const prevCallState = useRef('idle');
  const callStateRef = useRef('idle');

  const { playRing, stopRing, playHangup } = useCallSounds();

  useEffect(() => {
    const prev = prevCallState.current;
    prevCallState.current = callState;
    callStateRef.current = callState;
    if (callState === 'incoming') {
      playRing();
    } else {
      stopRing();
      if (callState === 'idle' && (prev === 'in_call' || prev === 'calling')) {
        playHangup();
      }
    }
  }, [callState, playRing, stopRing, playHangup]);

  const cleanup = useCallback(() => {
    if (pc.current) { pc.current.close(); pc.current = null; }
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    pendingOffer.current = null;
    setCaller(null);
    setIsMuted(false);
    setCallState('idle');
  }, []);

  const createPeerConnection = useCallback(() => {
    const conn = new RTCPeerConnection(STUN);
    conn.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'call_ice', candidate });
    };
    conn.ontrack = (event) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === 'connected') setCallState('in_call');
      if (['disconnected', 'failed', 'closed'].includes(conn.connectionState)) cleanup();
    };
    return conn;
  }, [send, cleanup]);

  const getAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  };

  const startCall = useCallback(async () => {
    try {
      setCallState('calling');
      const stream = await getAudio();
      pc.current = createPeerConnection();
      stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      send({ type: 'call_offer', offer });
    } catch (err) {
      console.error('Erreur au démarrage de l\'appel', err);
      cleanup();
    }
  }, [send, createPeerConnection, cleanup]);

  const endCall = useCallback(() => {
    send({ type: 'call_end' });
    cleanup();
  }, [send, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!pendingOffer.current) return;
    try {
      pc.current = createPeerConnection();
      const stream = await getAudio();
      stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
      await pc.current.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      send({ type: 'call_answer', answer });
      pendingOffer.current = null;
      setCallState('in_call');
    } catch (err) {
      console.error('Erreur à l\'acceptation de l\'appel', err);
      cleanup();
    }
  }, [send, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    send({ type: 'call_rejected' });
    cleanup();
  }, [send, cleanup]);

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
    setIsMuted(m => !m);
  }, []);

  const reOffer = useCallback(async () => {
    if (!localStream.current) return;
    if (pc.current) {
      pc.current.onconnectionstatechange = null;
      pc.current.close();
    }
    pc.current = createPeerConnection();
    localStream.current.getTracks().forEach(t => pc.current.addTrack(t, localStream.current));
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    send({ type: 'call_offer', offer });
    setCallState('calling');
  }, [send, createPeerConnection]);

  const joinCall = useCallback(() => {
    send({ type: 'call_join_request' });
  }, [send]);

  useEffect(() => {
    return on('call_offer', ({ offer, userId }) => {
      if (callStateRef.current !== 'idle') return;
      pendingOffer.current = offer;
      setCaller(userId);
      setCallState('incoming');
    });
  }, [on]);

  useEffect(() => {
    return on('call_join_request', () => {
      if (!['calling', 'in_call'].includes(callStateRef.current)) return;
      reOffer();
    });
  }, [on, reOffer]);

  useEffect(() => {
    return on('call_answer', async ({ answer }) => {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });
  }, [on]);

  useEffect(() => {
    return on('call_ice', async ({ candidate }) => {
      await pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }, [on]);

  useEffect(() => {
    const unsubEnd = on('call_end', cleanup);
    const unsubRejected = on('call_rejected', cleanup);
    return () => { unsubEnd(); unsubRejected(); };
  }, [on, cleanup]);

  useEffect(() => {
    return on('call_ended', ({ documentId: id }) => {
      if (id === documentId) cleanup();
    });
  }, [on, cleanup, documentId]);

  return { callState, isMuted, caller, startCall, endCall, joinCall, acceptCall, rejectCall, toggleMute, remoteAudioRef };
}

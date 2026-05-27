import { useState, useRef, useEffect, useCallback } from 'react';
import { useCallSounds } from './useCallSounds';

const STUN = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] };

export const CALL_STATE = {
  IDLE: 'idle',
  CALLING: 'calling',
  INCOMING: 'incoming',
  IN_CALL: 'in_call',
};

export function useWebRTC(send, on, documentId) {
  const [callState, _setCallState] = useState(CALL_STATE.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const [caller, setCaller] = useState(null);

  const pc = useRef(null);
  const localStream = useRef(null);
  const pendingOffer = useRef(null);
  const remoteAudioRef = useRef(null);

  const callStateRef = useRef(CALL_STATE.IDLE);
  const prevCallStateRef = useRef(CALL_STATE.IDLE);

  const { playRing, stopRing, playHangup } = useCallSounds();

  const setCallState = useCallback((next) => {
    prevCallStateRef.current = callStateRef.current;
    callStateRef.current = next;
    _setCallState(next);
  }, []);

  useEffect(() => {
    if (callState === CALL_STATE.INCOMING) {
      playRing();
      return stopRing;
    }

    stopRing();

    const callJustEnded =
      callState === CALL_STATE.IDLE &&
      (prevCallStateRef.current === CALL_STATE.IN_CALL ||
        prevCallStateRef.current === CALL_STATE.CALLING);
    if (callJustEnded) playHangup();
  }, [callState, playRing, stopRing, playHangup]);

  const cleanup = useCallback(() => {
    if (pc.current) { pc.current.close(); pc.current = null; }
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    pendingOffer.current = null;
    setCaller(null);
    setIsMuted(false);
    setCallState(CALL_STATE.IDLE);
  }, [setCallState]);

  const createPeerConnection = useCallback(() => {
    const conn = new RTCPeerConnection(STUN);
    conn.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'call_ice', candidate });
    };
    conn.ontrack = (event) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === 'connected') setCallState(CALL_STATE.IN_CALL);
      if (['disconnected', 'failed', 'closed'].includes(conn.connectionState)) cleanup();
    };
    return conn;
  }, [send, cleanup, setCallState]);

  const getMicrophoneStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  };

  const startCall = useCallback(async () => {
    try {
      setCallState(CALL_STATE.CALLING);
      const stream = await getMicrophoneStream();
      pc.current = createPeerConnection();
      stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      send({ type: 'call_offer', offer });
    } catch (err) {
      console.error("Erreur au démarrage de l'appel", err);
      cleanup();
    }
  }, [send, createPeerConnection, cleanup, setCallState]);

  const endCall = useCallback(() => {
    send({ type: 'call_end' });
    cleanup();
  }, [send, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!pendingOffer.current) return;
    try {
      pc.current = createPeerConnection();
      const stream = await getMicrophoneStream();
      stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
      await pc.current.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      send({ type: 'call_answer', answer });
      pendingOffer.current = null;
      setCallState(CALL_STATE.IN_CALL);
    } catch (err) {
      console.error("Erreur à l'acceptation de l'appel", err);
      cleanup();
    }
  }, [send, createPeerConnection, cleanup, setCallState]);

  const rejectCall = useCallback(() => {
    send({ type: 'call_rejected' });
    cleanup();
  }, [send, cleanup]);

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
    setIsMuted(m => !m);
  }, []);

  const restartCallOffer = useCallback(async () => {
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
    setCallState(CALL_STATE.CALLING);
  }, [send, createPeerConnection, setCallState]);

  const joinCall = useCallback(() => {
    send({ type: 'call_join_request' });
  }, [send]);


  useEffect(() => {
    const handleIncomingOffer = ({ offer, userId }) => {
      if (callStateRef.current !== CALL_STATE.IDLE) return;
      pendingOffer.current = offer;
      setCaller(userId);
      setCallState(CALL_STATE.INCOMING);
    };

    const handleJoinRequest = () => {
      const isActiveCall = [CALL_STATE.CALLING, CALL_STATE.IN_CALL].includes(callStateRef.current);
      if (!isActiveCall) return;
      restartCallOffer();
    };

    const handleAnswer = async ({ answer }) => {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async ({ candidate }) => {
      await pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleCallEnded = ({ documentId: id }) => {
      if (id === documentId) cleanup();
    };

    const unsubscribers = [
      on('call_offer', handleIncomingOffer),
      on('call_join_request', handleJoinRequest),
      on('call_answer', handleAnswer),
      on('call_ice', handleIceCandidate),
      on('call_end', cleanup),
      on('call_rejected', cleanup),
      on('call_ended', handleCallEnded),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, [on, cleanup, restartCallOffer, documentId, setCallState]);

  return {
    callState,
    isMuted,
    caller,
    startCall,
    endCall,
    joinCall,
    acceptCall,
    rejectCall,
    toggleMute,
    remoteAudioRef,
  };
}

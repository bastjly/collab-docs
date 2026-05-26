import { useState, useRef, useEffect, useCallback } from 'react';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useWebRTC(send, on) {
  const [callState, setCallState] = useState('idle'); // idle, calling, in_call
  const [isMuted, setIsMuted] = useState(false);
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteAudioRef = useRef(null);

  const cleanup = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    setCallState('idle');
    setIsMuted(false);
  }, []);

  const createPeerConnection = useCallback(() => {
    const conn = new RTCPeerConnection(STUN);

    conn.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'call_ice', candidate });
    };

    conn.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
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

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(m => !m);
  }, []);


  useEffect(() => {
    return on('call_offer', async ({ offer }) => {
      try {
        pc.current = createPeerConnection();
        const stream = await getAudio();
        stream.getTracks().forEach(track => pc.current.addTrack(track, stream));

        await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        send({ type: 'call_answer', answer });
        setCallState('in_call');
      } catch (err) {
        console.error('Erreur à la réception de l\'offre', err);
        cleanup();
      }
    });
  }, [on, send, createPeerConnection, cleanup]);


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
    return on('call_end', cleanup);
  }, [on, cleanup]);

  return { callState, isMuted, startCall, endCall, toggleMute, remoteAudioRef };
}

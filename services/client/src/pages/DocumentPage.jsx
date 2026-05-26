import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { CallBar } from '@/components/CallBar';
import { CallIncomingModal } from '@/components/CallIncomingModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DocumentPage() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const saveTimeout = useRef(null);

  const [isCallActive, setIsCallActive] = useState(false);

  const { send, on } = useWebSocket(token, documentId);
  const { callState, isMuted, startCall, endCall, joinCall, acceptCall, rejectCall, toggleMute, remoteAudioRef } = useWebRTC(send, on, documentId);


  useEffect(() => {
    fetch(`${API}/api/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(doc => {
        setDocument(doc);
        setContent(doc.content || '');
      });
  }, [documentId, token]);

  useEffect(() => {
    return on('active_calls', ({ documentIds }) => {
      setIsCallActive(documentIds.includes(documentId));
    });
  }, [on, documentId]);

  useEffect(() => {
    return on('call_started', ({ documentId: id }) => {
      if (id === documentId) setIsCallActive(true);
    });
  }, [on, documentId]);

  useEffect(() => {
    return on('call_ended', ({ documentId: id }) => {
      if (id === documentId) setIsCallActive(false);
    });
  }, [on, documentId]);

  useEffect(() => {
    return on('document_change', ({ content: newContent }) => {
      setContent(newContent);
    });
  }, [on]);

  function handleChange(e) {
    const newContent = e.target.value;
    setContent(newContent);

    send({ type: 'document_change', content: newContent });

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`${API}/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });
    }, 1500);
  }

  if (!document) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CallIncomingModal
        open={callState === 'incoming'}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
      <header className="border-b px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/documents')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">{document.name}</h1>
        </div>
        <CallBar
          callState={callState}
          isMuted={isMuted}
          isCallActive={isCallActive}
          onCall={startCall}
          onJoin={joinCall}
          onHangUp={endCall}
          onToggleMute={toggleMute}
          remoteAudioRef={remoteAudioRef}
        />
      </header>

      <main className="flex-1 flex flex-col p-6">
        <textarea
          className="flex-1 w-full resize-none bg-transparent text-sm focus:outline-none font-mono"
          placeholder="Commencez à écrire..."
          value={content}
          onChange={handleChange}
        />
      </main>
    </div>
  );
}

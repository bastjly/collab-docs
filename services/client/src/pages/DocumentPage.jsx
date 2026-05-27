import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { CallBar } from '@/components/CallBar';
import { CallIncomingModal } from '@/components/CallIncomingModal';
import { InviteDialog } from '@/components/InviteDialog';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, MessageSquare, UserPlus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function FileViewer({ document, token }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let url;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Fichier introuvable');
        return r.blob();
      })
      .then(blob => {
        const typed = document.mimeType
          ? new Blob([blob], { type: document.mimeType })
          : blob;
        url = URL.createObjectURL(typed);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [document.id, document.mimeType, token]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement du fichier...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!blobUrl) return null;

  const mime = document.mimeType || '';

  if (mime.startsWith('image/')) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <img src={blobUrl} alt={document.fileName} className="max-w-full max-h-full object-contain rounded" />
      </div>
    );
  }

  if (mime === 'application/pdf') {
    return (
      <iframe
        src={blobUrl}
        title={document.fileName}
        className="flex-1 w-full border-none"
        style={{ minHeight: 0 }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-muted-foreground">
      <p>Aperçu non disponible pour ce type de fichier.</p>
      <a href={blobUrl} download={document.fileName}>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Télécharger {document.fileName}
        </Button>
      </a>
    </div>
  );
}

export function DocumentPage() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const saveTimeout = useRef(null);

  const [isCallActive, setIsCallActive] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const canInvite = !!(document && user && (
    document.createdById === user.id ||
    user.role === 'ADMIN' ||
    user.role === 'SUPERADMIN'
  ));
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      <InviteDialog
        docId={documentId}
        token={token}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <header className="border-b px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(document.parentId ? `/documents?parent=${document.parentId}` : '/documents')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">{document.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canInvite && (
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Inviter
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => { setChatOpen(o => !o); setUnreadCount(0); }}
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
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
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {document.type === 'FILE' ? (
          <FileViewer document={document} token={token} />
        ) : (
          <main className="flex-1 flex flex-col p-6 min-w-0">
            <textarea
              className="flex-1 w-full resize-none bg-transparent text-sm focus:outline-none font-mono"
              placeholder="Commencez à écrire..."
              value={content}
              onChange={handleChange}
            />
          </main>
        )}
        <ChatPanel
          documentId={documentId}
          token={token}
          currentUserId={user?.id}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onUnread={() => setUnreadCount(c => c + 1)}
          send={send}
          on={on}
        />
      </div>
    </div>
  );
}

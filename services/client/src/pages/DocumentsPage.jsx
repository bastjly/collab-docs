import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { NewDocumentMenu } from '@/components/NewDocumentMenu';
import { FolderOpen, FileText, File, Phone } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TYPE_ICON = {
  FOLDER: <FolderOpen className="w-4 h-4" />,
  TEXT: <FileText className="w-4 h-4" />,
  FILE: <File className="w-4 h-4" />,
};

export function DocumentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [parentId, setParentId] = useState(null);
  const [activeCalls, setActiveCalls] = useState(new Set());

  const { on } = useWebSocket(token);

  const refresh = useCallback(() => {
    const params = parentId ? `?parent_id=${parentId}` : '';
    fetch(`${API}/api/documents${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setDocuments);
  }, [token, parentId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    return on('active_calls', ({ documentIds }) => {
      setActiveCalls(new Set(documentIds));
    });
  }, [on]);

  useEffect(() => {
    return on('call_started', ({ documentId }) => {
      setActiveCalls(prev => new Set([...prev, documentId]));
    });
  }, [on]);

  useEffect(() => {
    return on('call_ended', ({ documentId }) => {
      setActiveCalls(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    });
  }, [on]);

  function open(doc) {
    if (doc.type === 'FOLDER') setParentId(doc.id);
    else navigate(`/documents/${doc.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          {parentId && (
            <Button variant="ghost" size="sm" onClick={() => setParentId(null)}>
              ← Retour
            </Button>
          )}
          <div className="ml-auto">
            <NewDocumentMenu parentId={parentId} token={token} onCreated={refresh} />
          </div>
        </div>
        <div className="divide-y border rounded-lg">
          {documents.length === 0 && (
            <p className="p-4 text-muted-foreground text-sm">Aucun document.</p>
          )}
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => open(doc)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left text-sm"
            >
              {TYPE_ICON[doc.type]}
              <span className="flex-1 font-medium">{doc.name}</span>
              {activeCalls.has(doc.id) && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <Phone className="w-3 h-3" />
                  Appel en cours
                </span>
              )}
              {doc.lastModifiedBy && (
                <span className="text-muted-foreground text-xs">{doc.lastModifiedBy.name}</span>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

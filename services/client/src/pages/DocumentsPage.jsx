import { useCallback, useEffect, useState } from 'react';
import { CALL_MESSAGE_TYPE } from '@collab-docs/shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DocumentList } from '@/components/DocumentList';
import { DropZoneOverlay } from '@/components/DropZoneOverlay';
import { NewDocumentMenu } from '@/components/NewDocumentMenu';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DocumentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const parentId = searchParams.get('parent') || null;
  const [documents, setDocuments] = useState([]);
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

  const { uploadFiles } = useFileUpload(parentId, token, refresh);
  const { isDragging, dragHandlers } = useDragAndDrop(uploadFiles);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    return on(CALL_MESSAGE_TYPE.ACTIVE_CALLS, ({ documentIds }) => {
      setActiveCalls(new Set(documentIds));
    });
  }, [on]);

  useEffect(() => {
    return on(CALL_MESSAGE_TYPE.STARTED, ({ documentId }) => {
      setActiveCalls(prev => new Set([...prev, documentId]));
    });
  }, [on]);

  useEffect(() => {
    return on(CALL_MESSAGE_TYPE.ENDED, ({ documentId }) => {
      setActiveCalls(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    });
  }, [on]);

  function open(doc) {
    if (doc.type === 'FOLDER') setSearchParams({ parent: doc.id });
    else navigate(`/documents/${doc.id}`);
  }

  return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="relative p-6 max-w-3xl mx-auto" {...dragHandlers}>
          {isDragging && <DropZoneOverlay />}
          <div className="flex items-center gap-3 mb-4">
            <Breadcrumb
                parentId={parentId}
                token={token}
                onNavigate={(id) => (id ? setSearchParams({ parent: id }) : setSearchParams({}))}
            />
            <div className="ml-auto">
              <NewDocumentMenu parentId={parentId} token={token} onCreated={refresh} />
            </div>
          </div>
          <DocumentList
              documents={documents}
              activeCalls={activeCalls}
              onOpen={open}
              onRefresh={refresh}
              token={token}
          />
        </main>
      </div>
  );
}
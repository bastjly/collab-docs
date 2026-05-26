import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { NewDocumentMenu } from '@/components/NewDocumentMenu';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DropZoneOverlay } from '@/components/DropZoneOverlay';
import { DocumentList } from '@/components/DocumentList';
import { useFileUpload } from '@/hooks/useFileUpload';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DocumentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const parentId = searchParams.get('parent') || null;
  const [documents, setDocuments] = useState([]);
  const [dragDepth, setDragDepth] = useState(0);

  const refresh = useCallback(() => {
    const params = parentId ? `?parent_id=${parentId}` : '';
    fetch(`${API}/api/documents${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setDocuments);
  }, [token, parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { uploadFiles } = useFileUpload(parentId, token, refresh);

  function open(doc) {
    if (doc.type === 'FOLDER') setSearchParams({ parent: doc.id });
    else navigate(`/documents/${doc.id}`);
  }

  function onDragEnter(e) {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragDepth(d => d + 1);
  }

  function onDragLeave() {
    setDragDepth(d => Math.max(0, d - 1));
  }

  function onDragOver(e) {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragDepth(0);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) uploadFiles(files);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main
        className="relative p-6 max-w-3xl mx-auto"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
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
          onOpen={open}
          onRefresh={refresh}
          token={token}
        />
        {dragDepth > 0 && <DropZoneOverlay />}
      </main>
    </div>
  );
}

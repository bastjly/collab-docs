import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileText, File } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TYPE_ICON = {
  folder: <FolderOpen className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
  file: <File className="w-4 h-4" />,
};

export function DocumentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [parentId, setParentId] = useState(null);

  useEffect(() => {
    const params = parentId ? `?parent_id=${parentId}` : '';
    fetch(`${API}/api/documents${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setDocuments);
  }, [token, parentId]);

  function open(doc) {
    if (doc.type === 'folder') setParentId(doc.id);
    else navigate(`/documents/${doc.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6 max-w-3xl mx-auto">
        {parentId && (
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setParentId(null)}>
            ← Retour
          </Button>
        )}
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
              {doc.lastModifiedBy && (
                <span className="text-muted-foreground text-xs">{doc.lastModifiedByName}</span>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

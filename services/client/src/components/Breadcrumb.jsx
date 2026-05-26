import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Breadcrumb({ parentId, token, onNavigate }) {
  const [ancestors, setAncestors] = useState([]);

  useEffect(() => {
    if (!parentId) {
      setAncestors([]);
      return;
    }
    let cancelled = false;
    fetch(`${API}/api/documents/${parentId}/ancestors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!cancelled) setAncestors(data);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, token]);

  const segments = [{ id: null, name: 'Mes documents' }, ...ancestors];

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={seg.id ?? 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {isLast ? (
              <span className="font-medium text-foreground">{seg.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(seg.id)}
                className="hover:text-foreground hover:underline"
              >
                {seg.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

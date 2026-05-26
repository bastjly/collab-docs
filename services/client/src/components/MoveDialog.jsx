import { useEffect, useMemo, useState } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function collectDescendantIds(rootId, folders) {
  const result = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        added = true;
      }
    }
  }
  return result;
}

function buildTree(folders, excludedIds) {
  const eligible = folders.filter(f => !excludedIds.has(f.id));
  const byParent = new Map();
  for (const f of eligible) {
    const key = f.parentId ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(f);
  }
  function render(parentKey, depth) {
    const children = byParent.get(parentKey) ?? [];
    return children.flatMap(f => [{ ...f, depth }, ...render(f.id, depth + 1)]);
  }
  return render('__root__', 1);
}

export function MoveDialog({ doc, token, open, onOpenChange, onMoved }) {
  const [folders, setFolders] = useState([]);
  const [selected, setSelected] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(undefined);
    fetch(`${API}/api/documents/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : []))
      .then(setFolders);
  }, [open, token]);

  const excludedIds = useMemo(() => collectDescendantIds(doc.id, folders), [doc.id, folders]);
  const flatTree = useMemo(() => buildTree(folders, excludedIds), [folders, excludedIds]);

  const currentParentId = doc.parentId ?? null;
  const canSubmit = selected !== undefined && selected !== currentParentId && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parent_id: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec du déplacement');
      }
      onMoved();
      onOpenChange(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déplacer « {doc.name} »</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto border rounded-md py-1">
          <button
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent ${
              selected === null ? 'bg-accent' : ''
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Mes documents
          </button>
          {flatTree.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelected(folder.id)}
              style={{ paddingLeft: `${0.75 + folder.depth * 1}rem` }}
              className={`w-full flex items-center gap-2 pr-3 py-1.5 text-sm text-left hover:bg-accent ${
                selected === folder.id ? 'bg-accent' : ''
              }`}
            >
              <Folder className="w-4 h-4" />
              {folder.name}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Déplacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

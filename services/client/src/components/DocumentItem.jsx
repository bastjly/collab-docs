import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreVertical, Pencil, Trash2, Download, Upload, Move, FolderOpen, FileText, File, Phone, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { MoveDialog } from './MoveDialog';
import { downloadFile } from '@/lib/downloadFile';
import { useFileUpload } from '@/hooks/useFileUpload';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TYPE_ICON = {
  FOLDER: <FolderOpen className="w-4 h-4" />,
  TEXT: <FileText className="w-4 h-4" />,
  FILE: <File className="w-4 h-4" />,
};

function formatRelativeDate(value) {
  return formatDistanceToNow(new Date(value), { locale: fr, addSuffix: true });
}

function formatAbsoluteDate(value) {
  return new Date(value).toLocaleString('fr-FR');
}

export function DocumentItem({ doc, isCallActive, onOpen, onRefresh, token }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const replaceInputRef = useRef(null);
  const { replaceFile } = useFileUpload(null, token, onRefresh);

  function startEditing() {
    setEditName(doc.name);
    setEditing(true);
  }

  async function commitRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === doc.name) {
      setEditing(false);
      return;
    }
    try {
      const res = await fetch(`${API}/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error('Échec du renommage');
      setEditing(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  }

  function handleDeleted() {
    onRefresh();
    toast(`« ${doc.name} » supprimé`, {
      duration: 5000,
      action: {
        label: 'Annuler',
        onClick: async () => {
          try {
            const res = await fetch(`${API}/api/documents/${doc.id}/restore`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Impossible de restaurer');
            onRefresh();
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
    });
  }

  async function handleReplaceFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await replaceFile(doc.id, file);
  }

  function onDragStart(e) {
    e.dataTransfer.setData('application/x-doc-id', doc.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function isDocDrag(e) {
    return doc.type === 'FOLDER' && e.dataTransfer.types.includes('application/x-doc-id');
  }

  function onDragOver(e) {
    if (!isDocDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDragEnter(e) {
    if (isDocDrag(e)) setIsDragOver(true);
  }

  function onDragLeave() {
    setIsDragOver(false);
  }

  async function onDrop(e) {
    if (doc.type !== 'FOLDER') return;
    const draggedId = e.dataTransfer.getData('application/x-doc-id');
    setIsDragOver(false);
    if (!draggedId || draggedId === doc.id) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/documents/${draggedId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parent_id: doc.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec du déplacement');
      }
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  if (editing) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-3 text-sm">
        {TYPE_ICON[doc.type]}
        <Input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onFocus={(e) => e.target.select()}
          className="flex-1 h-8"
        />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-sm ${
        isDragOver ? 'ring-2 ring-primary ring-inset' : ''
      }`}
    >
      <button
        onClick={() => onOpen(doc)}
        className="flex-1 flex items-center gap-3 text-left"
      >
        {TYPE_ICON[doc.type]}
        <span className="flex-1 font-medium">{doc.name}</span>
        {doc._count?.permissions > 0 && (
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" />
            {doc._count.permissions}
          </span>
        )}
        {isCallActive && (
          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            <Phone className="w-3 h-3" />
            Appel en cours
          </span>
        )}
        {doc.lastModifiedBy && (
          <span className="text-muted-foreground text-xs">{doc.lastModifiedBy.name}</span>
        )}
        <span
          className="text-muted-foreground text-xs"
          title={formatAbsoluteDate(doc.updatedAt)}
        >
          {formatRelativeDate(doc.updatedAt)}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={startEditing}>
            <Pencil className="w-4 h-4" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMoving(true)}>
            <Move className="w-4 h-4" />
            Déplacer
          </DropdownMenuItem>
          {doc.type === 'FILE' && (
            <DropdownMenuItem onSelect={() => downloadFile(doc, token)}>
              <Download className="w-4 h-4" />
              Télécharger
            </DropdownMenuItem>
          )}
          {doc.type === 'FILE' && (
            <DropdownMenuItem onSelect={() => replaceInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              Remplacer
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => setDeleting(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={handleReplaceFileChosen}
      />

      <MoveDialog
        doc={doc}
        token={token}
        open={moving}
        onOpenChange={setMoving}
        onMoved={onRefresh}
      />
      <DeleteConfirmDialog
        doc={doc}
        token={token}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderPlus, FilePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function NewDocumentMenu({ parentId, token, onCreated }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dialogType, setDialogType] = useState(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openDialog(type) {
    setDialogType(type);
    setName('');
  }

  function closeDialog() {
    setDialogType(null);
    setName('');
  }

  async function createDocument(type, docName) {
    const res = await fetch(`${API}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: docName, type, parent_id: parentId }),
    });
    if (!res.ok) throw new Error('Échec de la création');
    return res.json();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const doc = await createDocument(dialogType, trimmed);
      closeDialog();
      if (dialogType === 'TEXT') {
        navigate(`/documents/${doc.id}`);
      } else {
        onCreated();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const doc = await createDocument('FILE', file.name);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/documents/${doc.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Échec de l'upload");
      onCreated();
    } catch (err) {
      alert(err.message);
    }
  }

  const dialogTitle = dialogType === 'FOLDER' ? 'Nouveau dossier' : 'Nouveau document';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nouveau
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => openDialog('FOLDER')}>
            <FolderPlus className="w-4 h-4" />
            Dossier
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openDialog('TEXT')}>
            <FilePlus className="w-4 h-4" />
            Document
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Fichier
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChosen}
      />

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                autoFocus
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button type="submit" disabled={!name.trim() || submitting}>
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

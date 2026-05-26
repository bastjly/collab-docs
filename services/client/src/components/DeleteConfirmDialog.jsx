import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function DeleteConfirmDialog({ doc, token, open, onOpenChange, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const childCount = doc._count?.children ?? 0;

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Échec de la suppression');
      onOpenChange(false);
      onDeleted();
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
          <DialogTitle>Supprimer « {doc.name} » ?</DialogTitle>
          {childCount > 0 && (
            <DialogDescription>
              Ceci supprimera aussi {childCount} élément{childCount > 1 ? 's' : ''} à l'intérieur.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={handleDelete}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

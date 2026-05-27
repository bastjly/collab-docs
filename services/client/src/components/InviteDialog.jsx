import { useEffect, useState, useRef } from 'react';
import { UserPlus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function InviteDialog({ docId, token, open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSearchResults([]);
    fetchCollaborators();
  }, [open, docId]);

  async function fetchCollaborators() {
    const res = await fetch(`${API}/api/documents/${docId}/collaborators`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCollaborators(await res.json());
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `${API}/api/users/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const users = await res.json();
      const collabIds = new Set(collaborators.map(c => c.id));
      setSearchResults(users.filter(u => !collabIds.has(u.id)));
    }, 300);
  }, [query, collaborators]);

  async function invite(userId) {
    const res = await fetch(`${API}/api/documents/${docId}/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      await fetchCollaborators();
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    }
  }

  async function remove(userId) {
    const res = await fetch(`${API}/api/documents/${docId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCollaborators(prev => prev.filter(c => c.id !== userId));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter des collaborateurs</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom ou email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {searchResults.length > 0 && (
          <ul className="border rounded-md divide-y max-h-40 overflow-y-auto">
            {searchResults.map(user => (
              <li key={user.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{user.name}</span>{' '}
                  <span className="text-muted-foreground">{user.email}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => invite(user.id)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {collaborators.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Collaborateurs ({collaborators.length})
            </p>
            <ul className="border rounded-md divide-y">
              {collaborators.map(user => (
                <li key={user.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{user.name}</span>{' '}
                    <span className="text-muted-foreground">{user.email}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(user.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {collaborators.length === 0 && !query && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun collaborateur invité pour le moment.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

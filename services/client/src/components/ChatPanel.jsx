import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function ChatPanel({ documentId, token, currentUserId, open, onClose, onUnread, send, on }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/api/documents/${documentId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      });
  }, [open, documentId, token]);

  useEffect(() => {
    return on('chat_message', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!open) onUnread?.();
    });
  }, [on, open, onUnread]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/documents/${documentId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setInput('');
      send({ type: 'chat_message', id: msg.id, content: msg.content, createdAt: msg.createdAt });
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <aside className="w-80 flex flex-col border-l bg-background shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">Chat</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-6">Aucun message pour l'instant.</p>
        )}
        {messages.map(msg => {
          const isMe = (msg.author?.id ?? msg.authorId) === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-muted-foreground px-1">
                {isMe ? 'Vous' : (msg.author?.name ?? '…')}
              </span>
              <div className={`max-w-[90%] rounded-2xl px-3 py-1.5 text-sm break-words ${
                isMe
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">
                {formatDistanceToNow(new Date(msg.createdAt), { locale: fr, addSuffix: true })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 h-9 text-sm"
          autoComplete="off"
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </aside>
  );
}

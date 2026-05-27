import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CallIncomingModal({ open, callerName, onAccept, onReject }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-xl shadow-lg p-8 flex flex-col items-center gap-6 w-80">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
          <Phone className="w-7 h-7 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">Appel entrant</p>
          <p className="text-sm text-muted-foreground mt-1">{callerName} vous appelle</p>
        </div>
        <div className="flex gap-4">
          <Button variant="destructive" size="lg" onClick={onReject} className="rounded-full w-14 h-14 p-0">
            <PhoneOff className="w-5 h-5" />
          </Button>
          <Button size="lg" onClick={onAccept} className="rounded-full w-14 h-14 p-0 bg-green-500 hover:bg-green-600">
            <Phone className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Refuser · Accepter</p>
      </div>
    </div>
  );
}

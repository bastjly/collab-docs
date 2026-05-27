import { Phone, PhoneOff, Mic, MicOff, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CallBar({ callState, isMuted, collaborators, onCall, onHangUp, onToggleMute, remoteAudioRef }) {
  return (
    <div className="flex items-center gap-2">
      <audio ref={remoteAudioRef} autoPlay />

      {callState === 'idle' && collaborators.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Appeler
              <ChevronDown className="w-3 h-3 ml-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {collaborators.map(collaborator => (
              <DropdownMenuItem
                key={collaborator.id}
                disabled={!collaborator.isOnline}
                onClick={() => collaborator.isOnline && onCall(collaborator.id)}
                className="flex items-center justify-between gap-4"
              >
                <span>{collaborator.name}</span>
                <span className={`text-[10px] font-medium ${collaborator.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {collaborator.isOnline ? '● en ligne' : '○ hors ligne'}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {callState === 'calling' && (
        <>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            En attente de réponse...
          </span>
          <Button size="sm" variant="destructive" onClick={onHangUp}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Annuler
          </Button>
        </>
      )}

      {callState === 'in_call' && (
        <>
          <span className="text-sm text-green-600 font-medium">● En appel</span>
          <Button size="sm" variant={isMuted ? 'secondary' : 'outline'} onClick={onToggleMute}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="destructive" onClick={onHangUp}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Raccrocher
          </Button>
        </>
      )}
    </div>
  );
}

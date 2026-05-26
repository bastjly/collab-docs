import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CallBar({ callState, isMuted, isCallActive, onCall, onJoin, onHangUp, onToggleMute, remoteAudioRef }) {
  return (
    <div className="flex items-center gap-2">
      <audio ref={remoteAudioRef} autoPlay />

      {callState === 'idle' && !isCallActive && (
        <Button size="sm" variant="outline" onClick={onCall}>
          <Phone className="w-4 h-4 mr-2" />
          Appeler les collaborateurs du document
        </Button>
      )}

      {callState === 'idle' && isCallActive && (
        <Button size="sm" variant="outline" onClick={onJoin}>
          <PhoneIncoming className="w-4 h-4 mr-2" />
          Rejoindre l'appel en cours
        </Button>
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

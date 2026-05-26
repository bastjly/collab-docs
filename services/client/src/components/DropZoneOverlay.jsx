import { Upload } from 'lucide-react';

export function DropZoneOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-background/90 border-2 border-dashed border-primary rounded-lg pointer-events-none">
      <Upload className="w-8 h-8 text-primary" />
      <p className="text-lg font-medium">Déposez vos fichiers ici</p>
    </div>
  );
}

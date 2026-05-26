import { DocumentItem } from './DocumentItem';

export function DocumentList({ documents, onOpen, onRefresh, token }) {
  if (documents.length === 0) {
    return (
      <div className="border rounded-lg">
        <p className="p-4 text-muted-foreground text-sm">Aucun document.</p>
      </div>
    );
  }
  return (
    <div className="divide-y border rounded-lg">
      {documents.map(doc => (
        <DocumentItem
          key={doc.id}
          doc={doc}
          onOpen={onOpen}
          onRefresh={onRefresh}
          token={token}
        />
      ))}
    </div>
  );
}

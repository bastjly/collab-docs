const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function downloadFile(doc, token) {
  const res = await fetch(`${API}/api/documents/${doc.id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    alert('Échec du téléchargement');
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName || doc.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useFileUpload(parentId, token, onUploaded) {
  async function uploadOne(file) {
    const res1 = await fetch(`${API}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: file.name, type: 'FILE', parent_id: parentId }),
    });
    if (!res1.ok) throw new Error(`Création de ${file.name} échouée`);
    const doc = await res1.json();

    const formData = new FormData();
    formData.append('file', file);
    const res2 = await fetch(`${API}/api/documents/${doc.id}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res2.ok) throw new Error(`Upload de ${file.name} échoué`);
  }

  async function uploadFiles(files) {
    if (!files.length) return;
    const results = await Promise.allSettled([...files].map(uploadOne));
    onUploaded();
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      alert(failed.map(r => r.reason.message).join('\n'));
    }
  }

  async function replaceFile(docId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/api/documents/${docId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      alert('Échec du remplacement');
      return;
    }
    onUploaded();
  }

  return { uploadFiles, replaceFile };
}

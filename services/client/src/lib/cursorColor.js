// Couleur stable dérivée de l'identifiant utilisateur.
// Même userId -> même teinte sur tous les clients, sans coordination.
export function colorForUser(userId) {
  const str = String(userId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // garder un entier 32 bits
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}

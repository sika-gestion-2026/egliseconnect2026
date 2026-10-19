/**
 * Normalisation de la colonne `members.functions`.
 *
 * La colonne est déclarée en JSONB dans le schéma, donc PostgREST la renvoie
 * déjà désérialisée (un tableau). Mais selon la requête (jointures, RPC,
 * colonnes agrégées), elle peut aussi revenir sous forme de chaîne JSON.
 *
 * Appeler `JSON.parse` sans vérifier le type levait une exception sur un
 * tableau — exception avalée par un `catch {}` vide, ce qui faisait
 * silenciusement disparaître le département du membre, ses contacts par
 * département et ses responsables. On centralise donc la conversion ici.
 */
export function normalizeFunctions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((f): f is string => typeof f === 'string');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.filter((f): f is string => typeof f === 'string')
        : [];
    } catch {
      // Ancien format possible : une liste séparée par des virgules.
      return trimmed
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }

  return [];
}
import { useEffect, useState } from 'react';
import { repository } from '../snippets/snippetRepository';
export function usePreferences() {
  const [preferences, setPreferences] = useState(repository.getPreferences);
  useEffect(() => repository.savePreferences(preferences), [preferences]);
  const update = (key, value) => setPreferences(current => ({ ...current, [key]: value }));
  return { preferences, update };
}

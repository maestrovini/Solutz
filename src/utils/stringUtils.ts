export function capitalizeName(str: string | undefined | null): string {
  if (!str) return '';
  const lowercasePrepositions = [
    'de', 'do', 'da', 'dos', 'das',
    'e', 'o', 'a', 'em', 'no', 'na',
    'nos', 'nas', 'por', 'para', 'com'
  ];
  
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx, arr) => {
      if (word.length === 0) return '';
      
      const upperWord = word.toUpperCase();
      // Keep state abbreviations and POA capitalized
      if (upperWord === 'POA' || upperWord === 'RS' || upperWord === 'SC' || upperWord === 'PR' || upperWord === 'SP' || upperWord === 'RJ') {
        return upperWord;
      }
      
      // Special handling for prepositions with apostrophe like: d'areia -> d'Areia
      if (word.startsWith("d'") && word.length > 2) {
        return "d'" + word.charAt(2).toUpperCase() + word.slice(3);
      }
      if (word.startsWith("d’") && word.length > 2) {
        return "d’" + word.charAt(2).toUpperCase() + word.slice(3);
      }

      // Capitalize the first or last word, or any word that is not a lowercase preposition
      if (idx === 0 || idx === arr.length - 1 || !lowercasePrepositions.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

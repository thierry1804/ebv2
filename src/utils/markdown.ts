/**
 * Convertit le markdown en HTML
 * Supporte les éléments de base : titres, gras, italique, listes, liens, etc.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Séparateurs horizontaux (avant tout)
  html = html.replace(/^---$/gim, '<hr class="my-8 border-neutral-support" />');
  html = html.replace(/^\*\*\*$/gim, '<hr class="my-8 border-neutral-support" />');

  // Traiter les listes avant les autres éléments
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const listClass = listType === 'ul' 
        ? 'list-disc list-inside space-y-2 my-4' 
        : 'list-decimal list-inside space-y-2 my-4';
      const tag = listType;
      processedLines.push(`<${tag} class="${listClass}">${listItems.join('')}</${tag}>`);
      listItems = [];
    }
    inList = false;
    listType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Détecter les listes non ordonnées
    if (/^[-*] (.+)$/.test(line)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const content = line.replace(/^[-*] /, '');
      listItems.push(`<li class="mb-2">${content}</li>`);
      continue;
    }
    
    // Détecter les listes ordonnées
    if (/^\d+\. (.+)$/.test(line)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      const content = line.replace(/^\d+\. /, '');
      listItems.push(`<li class="mb-2">${content}</li>`);
      continue;
    }
    
    // Si on était dans une liste et qu'on rencontre une ligne vide ou autre chose
    if (inList && (line === '' || !line.startsWith(' ') && !line.startsWith('\t'))) {
      flushList();
    }
    
    if (line === '') {
      processedLines.push('');
      continue;
    }
    
    processedLines.push(line);
  }
  
  flushList(); // Flush la dernière liste si elle existe
  html = processedLines.join('\n');

  // Titres (après les listes)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-heading font-bold text-text-dark mt-8 mb-4">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-heading font-bold text-text-dark mt-10 mb-6">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-heading font-bold text-text-dark mt-12 mb-8">$1</h1>');

  // Code inline (avant gras/italique pour éviter les conflits)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-light px-2 py-1 rounded text-sm font-mono">$1</code>');

  // Gras (avant italique)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-dark">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-semibold text-text-dark">$1</strong>');

  // Italique (après gras, éviter les conflits avec les astérisques doubles)
  // Utiliser une approche plus simple : chercher *texte* qui n'est pas **texte**
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>');
  html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em class="italic">$1</em>');

  // Liens
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-secondary hover:text-accent underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphes (traiter par blocs séparés par des lignes vides)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(paragraph => {
    const trimmed = paragraph.trim();
    if (!trimmed) return '';
    
    // Ne pas wrapper si c'est déjà un élément HTML structuré
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || 
        trimmed.startsWith('<hr') || trimmed.startsWith('<p')) {
      return trimmed;
    }
    
    // Convertir les retours à la ligne simples en <br>
    const withBreaks = trimmed.replace(/\n/g, '<br />');
    return `<p class="mb-4 leading-relaxed">${withBreaks}</p>`;
  }).join('\n\n');

  return html;
}


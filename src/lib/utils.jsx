import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function renderMarkdown(text) {
  if (!text) return null;

  // Basic regex for markdown-like formatting
  let lines = text.split('\n');
  
  return lines.map((line, i) => {
    // Bold: **text**
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline Code: `text`
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-primary/10 text-primary px-1 rounded">$1</code>');
    // Links: [text](url)
    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Lists: - item
    if (line.startsWith('- ')) {
      return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processed.substring(2) }} />;
    }
    
    // Headings: # Header
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processed.substring(2) }} />;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: processed.substring(3) }} />;
    }

    return <p key={i} className="mb-2 min-h-[1em]" dangerouslySetInnerHTML={{ __html: processed }} />;
  });
}

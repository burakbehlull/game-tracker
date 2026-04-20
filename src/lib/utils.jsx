import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function renderMarkdown(text) {
  if (!text) return null;

  // Basic HTML Escaping to prevent XSS
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Basic regex for markdown-like formatting
  let lines = text.split('\n');
  
  return lines.map((line, i) => {
    let processed = escapeHtml(line);

    // Bold: **text**
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline Code: `text`
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-primary/10 text-primary px-1 rounded">$1</code>');
    // Links: [text](url)
    // Note: We need to be careful with URLs to prevent javascript: links
    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
      const isSafeUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
      if (!isSafeUrl) return `[${text}](${url})`;
      return `<a href="${url}" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
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

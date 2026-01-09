import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    let html = value
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Bold: **text** ou __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')

      // Italic: *text* ou _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')

      // Line breaks
      .replace(/\n/g, '<br>')

      // Bullet points
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside ml-2">$1</ul>')

      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-2 border-gray-300">')

      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="font-bold text-lg mt-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-bold text-xl mt-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="font-bold text-2xl mt-4">$1</h1>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

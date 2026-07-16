import type {PortableTextBlock} from '@portabletext/react';

/**
 * Flatten Portable Text blocks to plain text for JSON-LD / meta use.
 */
export function portableTextToPlainText(
  blocks: PortableTextBlock[] | null | undefined,
): string {
  if (!blocks?.length) return '';

  return blocks
    .map((block) => {
      if (block._type !== 'block' || !('children' in block) || !block.children) {
        return '';
      }
      return (block.children as Array<{text?: string}>)
        .map((child) => child.text ?? '')
        .join('');
    })
    .filter(Boolean)
    .join('\n\n');
}

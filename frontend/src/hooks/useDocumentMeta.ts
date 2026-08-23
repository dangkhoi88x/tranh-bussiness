import { useEffect } from 'react';

export type DocumentMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  type?: 'website' | 'product';
  imageUrl?: string | null;
  imageAlt?: string | null;
  robots?: string;
  jsonLd?: Record<string, unknown>;
};

type Restorable = () => void;

function writeMeta(attribute: 'name' | 'property', key: string, content: string): Restorable {
  const selector = `meta[${attribute}="${key}"]`;
  const found = document.head.querySelector<HTMLMetaElement>(selector);
  const element = found ?? document.createElement('meta');
  const created = !found;
  const previousContent = element.getAttribute('content');
  if (created) {
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
  return () => {
    if (created) element.remove();
    else if (previousContent === null) element.removeAttribute('content');
    else element.content = previousContent;
  };
}

function writeCanonical(href: string): Restorable {
  const found = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const element = found ?? document.createElement('link');
  const created = !found;
  const previousHref = element.getAttribute('href');
  if (created) {
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
  return () => {
    if (created) element.remove();
    else if (previousHref === null) element.removeAttribute('href');
    else element.href = previousHref;
  };
}

function writeJsonLd(serializedData: string): Restorable {
  const selector = 'script[data-business-store-jsonld]';
  const found = document.head.querySelector<HTMLScriptElement>(selector);
  const element = found ?? document.createElement('script');
  const created = !found;
  const previousText = element.textContent;
  if (created) {
    element.type = 'application/ld+json';
    element.dataset.businessStoreJsonld = '';
    document.head.appendChild(element);
  }
  // JSON-LD nằm trong thẻ script nên phải thay < để dữ liệu sản phẩm không thể đóng thẻ sớm.
  element.textContent = serializedData.replace(/</g, '\\u003c');
  return () => {
    if (created) element.remove();
    else element.textContent = previousText;
  };
}

/**
 * Cập nhật head sau khi React đã tải dữ liệu route. Đây là metadata ở client;
 * preview bot không chạy JavaScript vẫn cần HTML được render sẵn ở tầng deploy.
 */
export function useDocumentMeta(metadata: DocumentMeta | null) {
  const jsonLd = metadata?.jsonLd ? JSON.stringify(metadata.jsonLd) : undefined;
  useEffect(() => {
    if (!metadata) return;
    const originalTitle = document.title;
    const restore = [
      writeMeta('name', 'description', metadata.description),
      writeMeta('property', 'og:title', metadata.title),
      writeMeta('property', 'og:description', metadata.description),
      writeMeta('property', 'og:type', metadata.type ?? 'website'),
      writeMeta('property', 'og:url', metadata.canonicalUrl),
      writeMeta('property', 'og:site_name', 'Bubble Memories'),
      writeMeta('property', 'og:locale', 'vi_VN'),
      writeMeta('name', 'twitter:card', metadata.imageUrl ? 'summary_large_image' : 'summary'),
      writeMeta('name', 'twitter:title', metadata.title),
      writeMeta('name', 'twitter:description', metadata.description),
      writeCanonical(metadata.canonicalUrl),
    ];
    if (metadata.imageUrl) {
      restore.push(
        writeMeta('property', 'og:image', metadata.imageUrl),
        writeMeta('name', 'twitter:image', metadata.imageUrl),
      );
      if (metadata.imageAlt) restore.push(writeMeta('property', 'og:image:alt', metadata.imageAlt));
    }
    if (metadata.robots) restore.push(writeMeta('name', 'robots', metadata.robots));
    if (jsonLd) restore.push(writeJsonLd(jsonLd));
    document.title = metadata.title;
    return () => {
      document.title = originalTitle;
      restore.reverse().forEach((restoreEntry) => restoreEntry());
    };
  }, [
    metadata?.title,
    metadata?.description,
    metadata?.canonicalUrl,
    metadata?.type,
    metadata?.imageUrl,
    metadata?.imageAlt,
    metadata?.robots,
    jsonLd,
  ]);
}

export function absoluteSiteUrl(pathOrUrl: string): string {
  try {
    const configuredBase = import.meta.env.VITE_SITE_URL?.trim();
    const base = configuredBase || window.location.origin;
    return new URL(pathOrUrl, base).toString();
  } catch {
    return pathOrUrl;
  }
}

export function metaDescription(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim() || fallback;
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157).trimEnd()}…`;
}

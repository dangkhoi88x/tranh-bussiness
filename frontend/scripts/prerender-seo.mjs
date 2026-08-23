import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const apiBase = (process.env.SEO_API_BASE ?? process.env.VITE_API_BASE ?? '').replace(/\/+$/, '');
const siteUrl = (process.env.SEO_SITE_URL ?? process.env.VITE_SITE_URL ?? '').replace(/\/+$/, '');

if (!apiBase || !siteUrl) {
  throw new Error('SEO_API_BASE và SEO_SITE_URL là bắt buộc. Xem .env.example trước khi chạy npm run seo:prerender.');
}

new URL(apiBase);
new URL(siteUrl);

function text(value, fallback) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  const result = normalized || fallback;
  return result.length <= 160 ? result : `${result.slice(0, 157).trimEnd()}…`;
}

function absolute(pathOrUrl) {
  return new URL(pathOrUrl, `${siteUrl}/`).toString();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}

async function request(path) {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) throw new Error(`GET ${path} thất bại (${response.status}).`);
  const payload = await response.json();
  return payload?.data ?? payload;
}

async function fetchProducts() {
  const products = [];
  for (let page = 1; ; page += 1) {
    const data = await request(`/products?sort=NEWEST&page=${page}&size=100`);
    products.push(...(data.items ?? []));
    if (!data.hasNext) return products;
  }
}

function imageOf(product) {
  return product.primaryImageUrl
    ?? product.images?.find((image) => image.primaryImage)?.secureUrl
    ?? product.images?.[0]?.secureUrl
    ?? null;
}

function stripMeta(html) {
  const metaNames = ['description', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'robots'];
  const metaProperties = ['og:locale', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt'];
  let output = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
  for (const name of metaNames) output = output.replace(new RegExp(`<meta\\s+name=["']${name}["'][^>]*>\\s*`, 'gi'), '');
  for (const property of metaProperties) output = output.replace(new RegExp(`<meta\\s+property=["']${property}["'][^>]*>\\s*`, 'gi'), '');
  return output
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*data-business-store-jsonld[^>]*>[\s\S]*?<\/script>\s*/gi, '');
}

function pageHtml(template, meta, fallbackHtml) {
  const jsonLd = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`,
    '<meta property="og:locale" content="vi_VN" />',
    `<meta property="og:type" content="${meta.type}" />`,
    '<meta property="og:site_name" content="Bubble Memories" />',
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`,
    `<meta name="twitter:card" content="${meta.imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ];
  if (meta.imageUrl) {
    tags.push(
      `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt ?? meta.title)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`,
    );
  }
  tags.push(`<script type="application/ld+json" data-business-store-jsonld>${jsonLd}</script>`);
  return stripMeta(template)
    .replace('</head>', `  ${tags.join('\n  ')}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${fallbackHtml}</div>`);
}

function productMeta(product) {
  const canonicalUrl = absolute(`/tranh/${encodeURIComponent(product.slug)}`);
  const image = imageOf(product);
  const imageUrl = image ? absolute(image) : null;
  const description = text(product.description, `${product.name} thuộc danh mục ${product.categoryName} tại Bubble Memories.`);
  const available = Number(product.effectiveStockQuantity ?? product.stockQuantity ?? 0) > 0;
  return {
    title: `${product.name} | Bubble Memories`, description, canonicalUrl, type: 'product', imageUrl, imageAlt: product.name,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name, description,
      image: imageUrl ? [imageUrl] : undefined, sku: product.id, category: product.categoryName, url: canonicalUrl,
      offers: { '@type': 'Offer', priceCurrency: 'VND', price: product.price, availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: canonicalUrl },
    },
  };
}

function categoryMeta(category, products) {
  const first = products.find((product) => product.categoryId === category.id);
  const canonicalUrl = absolute(`/danh-muc/${encodeURIComponent(category.slug)}`);
  const image = first ? imageOf(first) : null;
  return {
    title: `${category.name} | Bubble Memories`,
    description: text(category.description, `Khám phá ${category.name} tại Bubble Memories.`),
    canonicalUrl, type: 'website', imageUrl: image ? absolute(image) : null, imageAlt: category.name,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: category.name, url: canonicalUrl },
  };
}

function fallbackProduct(product, meta) {
  const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(product.price);
  const image = meta.imageUrl ? `<img src="${escapeHtml(meta.imageUrl)}" alt="${escapeHtml(product.name)}" />` : '';
  return `<main><article><h1>${escapeHtml(product.name)}</h1>${image}<p>${escapeHtml(meta.description)}</p><p>Giá từ ${escapeHtml(price)}.</p><p><a href="${escapeHtml(meta.canonicalUrl)}">Xem ${escapeHtml(product.name)} tại Bubble Memories</a></p></article></main>`;
}

function fallbackCategory(category, meta, products) {
  const links = products.filter((product) => product.categoryId === category.id).slice(0, 24)
    .map((product) => `<li><a href="${escapeHtml(absolute(`/tranh/${encodeURIComponent(product.slug)}`))}">${escapeHtml(product.name)}</a></li>`).join('');
  return `<main><section><h1>${escapeHtml(category.name)}</h1><p>${escapeHtml(meta.description)}</p>${links ? `<ul>${links}</ul>` : ''}</section></main>`;
}

function fallbackPage(title, description) {
  return `<main><section><h1>${escapeHtml(title.replace(' | Bubble Memories', ''))}</h1><p>${escapeHtml(description)}</p></section></main>`;
}

function sitemapEntry(loc, updatedAt, imageUrl) {
  return `<url><loc>${escapeXml(loc)}</loc>${updatedAt ? `<lastmod>${escapeXml(updatedAt)}</lastmod>` : ''}${imageUrl ? `<image:image><image:loc>${escapeXml(imageUrl)}</image:loc></image:image>` : ''}</url>`;
}

async function writePage(path, html) {
  const directory = resolve(dist, path);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), html, 'utf8');
}

const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const [products, categories] = await Promise.all([fetchProducts(), request('/categories')]);

const staticPages = [
  { path: '', title: 'Bubble Memories | Tranh canvas & photobook', description: 'Bubble Memories — xưởng in tranh canvas và làm photobook theo yêu cầu.' },
  { path: 'photobook', title: 'Photobook | Bubble Memories', description: 'Làm photobook theo yêu cầu để giữ khoảnh khắc trong từng trang giấy.' },
  { path: 'kho-va-gia', title: 'Khổ & giá | Bubble Memories', description: 'Tìm hiểu khổ tranh, chất liệu, khung và cách xem giá chính xác tại Bubble Memories.' },
  { path: 'gioi-thieu', title: 'Về chúng tôi | Bubble Memories', description: 'Tìm hiểu Bubble Memories, xưởng in tranh canvas và làm photobook theo yêu cầu.' },
  { path: 'lien-he', title: 'Liên hệ | Bubble Memories', description: 'Liên hệ Bubble Memories để được hỗ trợ về đơn hàng, tranh canvas và photobook.' },
  { path: 'dat-in', title: 'Đặt in theo yêu cầu | Bubble Memories', description: 'Gửi ảnh và kích thước để Bubble Memories tư vấn, báo giá và thực hiện đơn đặt in theo yêu cầu.' },
  { path: 'chinh-sach-doi-tra', title: 'Chính sách đổi trả | Bubble Memories', description: 'Chính sách hỗ trợ đổi trả khi sản phẩm gặp vấn đề trong quá trình giao nhận.' },
  { path: 'chinh-sach-van-chuyen', title: 'Chính sách vận chuyển | Bubble Memories', description: 'Thông tin hoàn thiện, giao hàng và theo dõi đơn tại Bubble Memories.' },
  { path: 'chinh-sach-thanh-toan', title: 'Chính sách thanh toán | Bubble Memories', description: 'Thông tin thanh toán cho đơn hàng tại Bubble Memories.' },
  { path: 'chinh-sach-bao-mat', title: 'Chính sách bảo mật | Bubble Memories', description: 'Cách Bubble Memories sử dụng thông tin đơn hàng và ảnh đặt in của bạn.' },
];

await Promise.all(products.map((product) => {
  const meta = productMeta(product);
  return writePage(`tranh/${encodeURIComponent(product.slug)}`, pageHtml(template, meta, fallbackProduct(product, meta)));
}));
await Promise.all(categories.map((category) => {
  const meta = categoryMeta(category, products);
  return writePage(`danh-muc/${encodeURIComponent(category.slug)}`, pageHtml(template, meta, fallbackCategory(category, meta, products)));
}));
await Promise.all(staticPages.map((page) => {
  const canonicalUrl = absolute(`/${page.path}`);
  const meta = {
    title: page.title, description: page.description, canonicalUrl, type: 'website', imageUrl: null, imageAlt: null,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, url: canonicalUrl },
  };
  return writePage(page.path, pageHtml(template, meta, fallbackPage(page.title, page.description)));
}));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...staticPages.map((page) => sitemapEntry(absolute(`/${page.path}`))),
  ...categories.map((category) => sitemapEntry(absolute(`/danh-muc/${encodeURIComponent(category.slug)}`), category.updatedAt, imageOf(products.find((product) => product.categoryId === category.id) ?? {}) ? absolute(imageOf(products.find((product) => product.categoryId === category.id) ?? {})) : null)),
  ...products.map((product) => { const image = imageOf(product); return sitemapEntry(absolute(`/tranh/${encodeURIComponent(product.slug)}`), product.updatedAt, image ? absolute(image) : null); }),
  '</urlset>',
].join('\n');
await writeFile(resolve(dist, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account\nDisallow: /gio-hang\nDisallow: /thanh-toan\nDisallow: /don-hang-cua-toi\nDisallow: /yeu-thich\nDisallow: /thong-bao\nDisallow: /tim-kiem\nDisallow: /auth\n\nSitemap: ${absolute('/sitemap.xml')}\n`, 'utf8');

console.log(`Prerendered ${products.length} product pages, ${categories.length} category pages, sitemap.xml and robots.txt.`);

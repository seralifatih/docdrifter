// Static 1200x630 SVG served at /og-image.svg, referenced by every page's
// og:image tag. Hand-authored (brand color, book mark, headline) rather
// than generated at request time -- avoids pulling in a rendering library
// (Satori/resvg) for a single image that never changes per-post. SVG isn't
// universally accepted by every social platform's link-preview scraper
// (older Facebook crawlers in particular expect a raster format), but
// Twitter, Slack, LinkedIn, and Discord all render it -- a real card beats
// no card, and this can be swapped for a generated PNG later without
// touching any of the pages that reference it.
export function ogImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1a1025"/>
      <stop offset="1" stop-color="#2a1745"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="120" cy="510" r="3" fill="#ffffff" opacity="0.14"/>
  <circle cx="1080" cy="120" r="3" fill="#ffffff" opacity="0.14"/>
  <circle cx="1000" cy="540" r="3" fill="#ffffff" opacity="0.1"/>
  <circle cx="80" cy="90" r="3" fill="#ffffff" opacity="0.1"/>

  <g transform="translate(96, 96)">
    <path d="M32 17C26 12 17 11 8 12v36c9-1 18 0 24 5 6-5 15-6 24-5V12c-9-1-18 0-24 5Z" fill="#c9a8f0" opacity="0.35"/>
    <path d="M32 17C26 12 17 11 8 12v36c9-1 18 0 24 5 6-5 15-6 24-5V12c-9-1-18 0-24 5Z" stroke="#c9a8f0" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 17v40" stroke="#c9a8f0" stroke-width="3"/>
  </g>
  <text x="176" y="140" font-family="Georgia, 'Source Serif 4', serif" font-weight="600" font-size="34" fill="#f4f0fa">DocDrifter</text>

  <text x="96" y="290" font-family="Georgia, 'Source Serif 4', serif" font-weight="600" font-size="62" fill="#ffffff">Docs don't break loudly.</text>
  <text x="96" y="366" font-family="Georgia, 'Source Serif 4', serif" font-weight="600" font-size="62" fill="#ffffff">They quietly stop being true.</text>

  <text x="96" y="440" font-family="-apple-system, 'Segoe UI', sans-serif" font-size="24" fill="#d8c8ec">A GitHub Action that catches documentation drift before it ships.</text>

  <text x="96" y="546" font-family="ui-monospace, Menlo, monospace" font-size="18" letter-spacing="2" fill="#a688cc">DOCDRIFTER.COM</text>
</svg>`;
}

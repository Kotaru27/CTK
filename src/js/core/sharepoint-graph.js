/*
 * SharePoint native download URL resolver. No Microsoft Graph, Entra registration,
 * credentials, preview HTML parsing, extension, or cross-origin fetch.
 * The download takes place through SharePoint in a top-level browser navigation.
 * This does NOT bypass SharePoint permissions or guarantee an automatic filename.
 */
const CTKSharePoint = (() => {
  const isSharePoint = (raw) => {
    try {
      const u = new URL(raw);
      return u.protocol === 'https:' && (u.hostname.endsWith('.sharepoint.com') || u.hostname.endsWith('.my.sharepoint.com'));
    } catch { return false; }
  };
  function decodePath(raw) {
    if (typeof raw !== 'string' || !raw || raw.length > 8192) return null;
    let path = raw;
    try { path = decodeURIComponent(path); } catch { return null; }
    if (path.includes('\u0000') || path.includes('\\') || path.includes('?')) return null;
    // Reject traversal and SharePoint UI/player URLs: only a real library path is downloadable.
    if (!/^\/(?:sites|teams)\/[^/]+\/.+/i.test(path) ||
        path.split('/').some(s => s === '.' || s === '..') ||
        /\/_layouts\/|\/(?:_forms|forms)\//i.test(path) ||
        !/\.[a-z0-9]{2,8}$/i.test(path)) return null;
    return path;
  }
  function directUrl(raw) {
    if (!isSharePoint(raw)) return null;
    // URL() normalizes dot segments; reject encoded traversal before parsing.
    if (/(?:\/|%2f)(?:\.|%2e){2}(?:\/|%2f)/i.test(raw)) return null;
    const u = new URL(raw);
    const pathname = u.pathname;
    let filePath = u.searchParams.get('id') || u.searchParams.get('SourceUrl');
    if (!filePath) {
      const link = pathname.match(/^\/:[a-z]:\/r(\/(?:sites|teams)\/.*)$/i);
      filePath = link ? link[1] : pathname;
    }
    const path = decodePath(filePath);
    if (!path) return null;
    const site = path.match(/^\/(sites|teams)\/([^/]+)\//i);
    if (!site) return null;
    const sitePrefix = `/${site[1]}/${encodeURIComponent(site[2])}`;
    const result = new URL(sitePrefix + '/_layouts/15/download.aspx',u.origin);
    result.searchParams.set('SourceUrl',path);
    return result.href;
  }
  return {isSharePoint,directUrl};
})();

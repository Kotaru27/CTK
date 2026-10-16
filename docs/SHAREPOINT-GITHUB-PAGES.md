# Extension-free SharePoint media downloads via GitHub Pages

## Why an extensionless static site requires Microsoft Graph

SharePoint `stream.aspx` is a **preview/player**, not the underlying MP4, audio or image bytes. Following the player link through Chrome downloads HTML (the reported `.htm` failure). GitHub Pages cannot act as an authenticated server-side proxy, and a cross-origin HTML `download` attribute cannot force a filename. Do **not** add cookies, temporary `tempauth` URLs, or organization secrets to this repository.

This implementation downloads the real file via Microsoft Graph under each user's **delegated access**. The frontend never scrapes the preview HTML or falls back to falsely saving an HTML page. It uses the Microsoft Entra SPA authorization-code flow with PKCE, exchanges the short-lived authorization code in-browser, and requests `@microsoft.graph.downloadUrl` for an actual drive item. The media response is validated before saving using a local blob URL and formatted filename.

## Site owner setup (one time, not per employee)

1. Get approval from your Microsoft 365 / SharePoint administrator before enabling an application to read organization media.
2. Create a Microsoft Entra application registration **in the same tenant where employees hold SharePoint access**. Supported account type: single organization. Do not create any client secret; this is a public SPA.
3. Authentication -> Add a platform -> **Single-page application**. Register exact redirect URI for the GitHub Pages frontend, e.g. `https://kotaru27.github.io/CTK/` (the trailing slash matters). For local testing register `http://localhost:4173/` separately. If serving `/CTK/index.html`, register that too or use the canonical `/CTK/` URL.
4. API permissions -> Microsoft Graph -> Delegated -> `Files.Read.All`, `Sites.Read.All`. Obtain tenant admin consent if required by company policy. These are **read-only scopes**, but broad; use the least permissions that support your deployment and ensure users already have permission to the respective files. If tenant forbids third-party app consent, the administrator must explicitly authorize this registered application or provide a managed backend.
5. Set `clientId` (Application/client ID) and `tenantId` (Directory/tenant ID) in `config/sharepoint.json`. These IDs are not secrets and may be present in the built public JavaScript; never commit client secrets, user credentials, tokens, personal file links, or signed download URLs.
6. `npm test && npm run build`. Commit `config/sharepoint.json`, `index.html`, and `dist/` to your chosen GitHub Pages publishing branch. In GitHub -> Settings -> Pages, configure the site to serve that branch at **/(root)** (or deploy an equivalent built artifact through Actions). The repository's `.nojekyll` suppresses unnecessary Jekyll processing.
7. Ask each employee to visit the GitHub Pages URL, select **Ad Downloader -> Connect Microsoft**, sign in using their authorized Microsoft account, then import Excel and download. Sign-in currently requires a page redirect once per page load; employees should connect **before** importing an Excel workbook so the upload does not disappear on reload.

**No extension or installation** is required for individual users. GitHub Pages hosts the same JS for everyone, but a valid Microsoft sign-in and SharePoint authorization are unavoidable for private company files.

## Supported input links

- Graph-resolvable SharePoint sharing links (`:v:/s/`, `:v:/r/` etc.) are tried using `/shares/{encodedSharingUrl}/driveItem`.
- SharePoint `stream.aspx?id=%2Fsites%2F...` links are resolved as a site + document-library drive path. The Graph site lookup needs `Sites.Read.All` delegated permission. Links with `stream.aspx?UniqueId=<GUID>` are also attempted across document libraries in the authorized site. Other opaque URLs with no sharing-link access/path may need the source spreadsheet to contain an actual sharing URL or document path instead.
- Ordinary public HTTPS media links still use direct CORS fetch. When the provider blocks cross-origin access, a GitHub Pages frontend alone **cannot force a renamed download**.
- If Graph returns an HTML/JSON error or player page, the download **fails** and the item is not marked successful.
- Single files above 350 MB are refused to prevent excessive browser memory use; batch ZIP limit is 350 MB total. Files with restricted download policies cannot be downloaded.

## Verification gate

`npm test` runs mocked Graph sharing/path resolution, PKCE signin/callback, media type checks, and unchanged tool logic. These are not proof of actual tenant success. Before production deploy, test in Chrome with authorized Microsoft credentials, an image, an MP4, an audio file and a multi-file ZIP. Confirm exact filenames, binary signatures, no HTML downloads, and error states for expired permissions and CORS.

## Relevant documentation

- [Graph: Download driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)
- [Graph: Access shared items](https://learn.microsoft.com/en-us/graph/api/shares-get?view=graph-rest-1.0)
- [Graph: Get SharePoint site by path](https://learn.microsoft.com/en-us/graph/api/site-getbypath?view=graph-rest-1.0)
- [Microsoft Entra SPA configuration](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-app-configuration)
- [MDN: HTML download attribute limitations](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)

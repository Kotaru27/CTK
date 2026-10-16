# SharePoint native download on GitHub Pages — no Microsoft app registration

CTK does not use Microsoft Graph, Entra app registration, a Chrome extension,
background popup, or a remote proxy for SharePoint. It converts **direct file
paths** embedded in a `stream.aspx?id=` or `/:v:/r/...` URL into the SharePoint
`/_layouts/15/download.aspx?SourceUrl=...` endpoint. A browser navigation then
uses its existing authorized SharePoint session. This is **not a CORS fetch**.

## Supported links

- File-path-backed `stream.aspx?id=%2Fsites%2F...%2Fvideo.mp4` media links.
- The equivalent `:v:/r/sites/.../video.mp4` and `:i:/r/...` document links.
- Direct `https://tenant.sharepoint.com/sites/.../file.ext` paths.
- Other public CORS-enabled URLs use the existing blob+formatted filename path.

The path must unambiguously identify a file, with an extension. Opaque sharing
codes (`:v:/s/...`), GUID-only `stream.aspx` URLs, and unrecognized viewer links
are **not automatically resolved**. They are rejected with an explanation.
CTK never downloads a SharePoint player HTML page as an MP4.

## Important limitations

- No new user sign-in inside CTK. A user must already have permission to
  download the media in their existing browser SharePoint session. SharePoint
  and browser policies may still show sign-in or block downloads.
- The cross-origin download filename comes from the SharePoint server, **not**
  CTK's formatted ad name. Use the existing Copy button if renaming is needed.
- A cross-origin navigation does not expose download completion to the website.
  CTK says **download requested**, not **downloaded**, and leaves the row usable.
- ZIP bundling of protected files is not possible in a static GitHub Pages site
  without permission to read cross-origin bytes. Individual native downloads
  are available; client-side ZIP remains only for other CORS-readable media.
- Browsers may interrupt repeated automatic downloads or open a sign-in/error
  page instead of saving; do not bypass the organization's download policy.
- Never publish SharePoint HTML response files or signed URLs into a public repo.

## Deployment

Run `npm test` then publish `index.html`, `dist/`, and the source changes to
GitHub Pages. No client ID, tenant ID, credentials, user list, or extension is
needed. Users access the public frontend, but media access is enforced by
SharePoint.

## Verification

Unit tests verify URL conversion and refusal of opaque viewer links. They do
**not** prove that a corporate session, browser cookie policy, SharePoint
attachment headers, or actual download rights work. Test at least one MP4,
image and audio link while logged in to SharePoint; inspect the final saved
media, not just the browser download-start indicator.

References:
- [MDN: a download attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)
- [Microsoft Q&A: native SharePoint download.aspx path](https://learn.microsoft.com/en-us/answers/questions/5886960/how-to-stop-sharepoint-from-changing-urls-and-brea)

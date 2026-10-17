# SharePoint download workspace and filename stability (guarded review)

The prior version used `target="_self"` for SharePoint downloads. SharePoint sometimes returned a web page instead of a file, replacing CTK and clearing the workspace. The updated version uses a separate protected top-level tab (`target="_blank" rel="noopener noreferrer"`), preserving CTK even if SharePoint responds with HTML or login. Attachment downloads generally do not leave an extra tab, but this behavior is browser/server-controlled.

The filename matcher now tolerates common SharePoint separator/case variations, still requires the same file extension and strong name similarity, avoids handling multiple concurrent naming jobs, and refuses existing destination filenames. An `AD1_...` name can be applied **only after** the native SharePoint file appears in the directory explicitly granted to CTK. Chrome's own Save As dialog still uses SharePoint's filename. Pick exactly the same folder in CTK and Chrome, preferably a dedicated `CTK Downloads` folder. CTK never collects company credentials or SharePoint media bytes for this feature.

The native download path continues to work without folder access. Genuine automatic naming is **not guaranteed** by a static GitHub Pages app: cross-origin Content-Disposition filenames and browser download history cannot be controlled. Tests cover safe navigation, filename variants, conflicts, and wrong file extensions; a signed-in Chrome + SharePoint manual test is still required. No other CTK tools or UI styling were modified.

## Renamed-copy fallback (2026-10-17)

Each SharePoint row now reveals **Save named copy** immediately after its native Download is requested. Wait until the native media finishes, click **Save named copy**, and select the downloaded file. CTK reads that explicitly chosen local `File` and issues a same-origin Blob download with the exact spreadsheet-derived name and the selected file's media extension. This is an explicit fallback when Chrome does not save in the optional watched folder or SharePoint supplies an unexpected filename. It does not require an extension, SharePoint API access, Entra configuration, or changed browser download settings.

**Limit:** a copy is saved; the original remains. This fallback involves an extra file selection; automatic naming of cross-origin protected downloads cannot be guaranteed on GitHub Pages without privileged browser integration. Chrome may add a collision suffix and must allow the download. No claim is made that the copied file reached disk until the browser confirms it.

The existing folder-based automatic renamer now compares **every byte** of any fallback copy against its original before deleting the original, not just the first/last 64 KiB. No related-file or existing destination overwrite is permitted.

## Existing-download repair

The row's **Fix downloaded name** action can be used even when SharePoint has already downloaded an originally named file (such as `ALDI Frische Social LT3 OLV Social Pick me 22s (1).mp4`) before selecting an Auto-name folder. Click the action, approve access to the **actual folder containing the completed file**, and select the relevant source if multiple copies match. CTK verifies the original filename and extension, refuses partial downloads, avoids overwriting destinations, and renames the selected file in its original folder. On browsers without direct filesystem rename support, CTK streams a copy, checks the complete file content, then deletes the original only after verification.

A prior **Save named copy** action remains as fallback when the folder cannot be granted, but it deliberately leaves the first file behind. This fix does not change SharePoint's initial `Content-Disposition` filename; GitHub Pages alone cannot control that response. Automatic in-place renaming without any folder permission, extension or authorized proxy remains impossible.

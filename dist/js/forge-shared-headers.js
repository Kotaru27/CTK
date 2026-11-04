/* Shared eight-tool header composition. No tool DOM nodes are replaced.
   The original hidden header remains the sole owner of the Home action. */
(() => {
  const homeAction = document.querySelector('body > .header .brand-title');
  if (!homeAction) return;
  const sections = [...document.querySelectorAll('#view-app > .tool-section')];
  sections.forEach(section => {
    const header = section.id === 'section-yt-helper'
      ? section.querySelector(':scope > .forge-compressor-surface > .tool-header')
      : section.querySelector(':scope > .tool-header');
    const title = header?.querySelector(':scope > h2');
    const icon = header?.querySelector(':scope > .tool-icon');
    if (!header || !title || !icon) return;
    header.classList.add('forge-unified-tool-header');
    let home = header.querySelector(':scope > .forge-logo-home, :scope > .forge-tool-home');
    if (!home) {
      home = document.createElement('button');
      home.type = 'button';
      home.className = 'forge-tool-home';
      home.textContent = 'The Forge';
      home.setAttribute('aria-label','Return to The Forge home');
      home.addEventListener('click', () => homeAction.click());
      title.before(home);
    } else {
      // Logo Resizer already owns this exact control and its original listener.
      home.classList.add('forge-tool-home');
    }
  });
})();

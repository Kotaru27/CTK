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

  // Reuse the EXACT Storyboard SVG already rendered on its homepage card.
  // Do not substitute a screenshot-derived raster image or new artwork.
  const homepageStoryboardSvg = document.querySelector(
    '#homeContent > .home-card.tool-story .forge-home-icon svg'
  );
  const storyHeaderIcon = document.getElementById('stillsToolIcon');
  if (homepageStoryboardSvg && storyHeaderIcon &&
      !storyHeaderIcon.querySelector('.forge-storyboard-header-svg')) {
    const sharedSvg = homepageStoryboardSvg.cloneNode(true);
    sharedSvg.classList.add('forge-storyboard-header-svg');
    sharedSvg.setAttribute('aria-hidden','true');
    sharedSvg.setAttribute('focusable','false');
    storyHeaderIcon.append(sharedSvg);
  }

  // Keep the ORIGINAL Storyboard name control visible in Grid Board mode.
  // The Storyboard controller owns the input, its oninput handler, and board
  // persistence. This repair never clones or replaces that input.
  const storySection = document.getElementById('section-stills-boards');
  const storyHeader = storySection?.querySelector(':scope > .forge-unified-tool-header');
  const storyPanel = document.getElementById('stillsTabContentStory');
  const storyTitle = document.getElementById('stillsToolTitle');
  const storyNameInput = document.getElementById('storyNameInput');
  if (storyHeader && storyPanel && storyTitle && storyNameInput) {
    const restoreName = () => {
      let label = document.getElementById('storyHeaderName');
      if (!label) {
        label = document.createElement('label');
        label.id = 'storyHeaderName';
        label.className = 'story-header-name';
        label.htmlFor = 'storyNameInput';
        const caption = document.createElement('span');
        caption.textContent = 'BOARD NAME';
        label.append(caption, storyNameInput);
        storyTitle.insertAdjacentElement('afterend', label);
      }
      const inGrid = storySection.classList.contains('active') &&
        storyPanel.style.display !== 'none' &&
        document.getElementById('subModeBtnBoard')?.classList.contains('active-mode');
      if (label.hidden === inGrid) label.hidden = !inGrid;
      return label;
    };
    const nameLabel = restoreName();
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(restoreName);
      observer.observe(storySection,{attributes:true,attributeFilter:['class']});
      observer.observe(storyPanel,{attributes:true,attributeFilter:['style']});
      observer.observe(nameLabel,{attributes:true,attributeFilter:['hidden']});
      const boardMode = document.getElementById('subModeBtnBoard');
      if (boardMode) observer.observe(boardMode,{attributes:true,attributeFilter:['class']});
    }
  }
})();

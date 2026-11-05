// The historical baseline remains immutable; remove the retired Filmstrip
// workspace from every generated release while keeping Storyboard and Fit.
export function stripFilmstripUI(html) {
  const replaceOne=(before,after,label)=>{
    if(html.split(before).length!==2)throw Error('Filmstrip removal anchor missing: '+label);
    html=html.replace(before,after);
  };
  const removeButton=(pattern,label)=>{
    if(!pattern.test(html))throw Error('Filmstrip removal button missing: '+label);
    html=html.replace(pattern,'');
  };
  const removePanel=(start,end,label)=>{
    const from=html.indexOf(start),to=html.indexOf(end,from+start.length);
    if(from<0||to<=from)throw Error('Filmstrip removal panel missing: '+label);
    html=html.slice(0,from)+html.slice(to);
  };
  replaceOne('title="Storyboard &amp; Filmstrip"','title="Storyboard"','sidebar name');
  replaceOne('<p class="home-card-desc">Boards &amp; filmstrips.</p>','<p class="home-card-desc">Arrange images into storyboards.</p>','home copy');
  replaceOne('Switches to Storyboard to arrange images into boards or filmstrips.','Switches to Storyboard to arrange images into boards.','tab help');
  removeButton(/<button\b[^>]*id="subModeBtnFilmstrip"[^>]*>[\s\S]*?<\/button>\s*/,'mode switch');
  removeButton(/<button\b[^>]*onclick="UI\.sendStoryToFilmstrip\(\)"[^>]*>[\s\S]*?<\/button>\s*/,'board action');
  removePanel('<div id="filmstripHeaderControls"','<div id="fitHeaderControls"','header actions');
  removePanel('<div aria-labelledby="stillsTabFilmstrip" id="stillsTabContentFilmstrip"','<div aria-label="Fit to Platform preset" id="stillsTabContentFit"','editor');
  return html;
}


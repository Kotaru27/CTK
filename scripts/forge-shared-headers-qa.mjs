/* Visual and behavioral verification for all eight shared Forge tool headers.
   The processing engines, modes, actions and original routes must remain intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const routes=[
  {key:'logo',section:'section-logo',mode:null,title:'Logo Resizer'},
  {key:'pdf',section:'section-pdf',mode:'convert',title:'PDF to Image'},
  {key:'split',section:'section-pdf',mode:'split',title:'Image Splitter'},
  {key:'stills',section:'section-stills-boards',mode:'video',title:'Video Stills'},
  {key:'story',section:'section-stills-boards',mode:'story',title:'Storyboard'},
  {key:'links',section:'section-adlinks',mode:'gen',title:'Link Gen'},
  {key:'downloader',section:'section-adlinks',mode:'downloader',title:'Ad Downloader'},
  {key:'compressor',section:'section-yt-helper',mode:null,title:'Video Compressor'}
];
const dir='artifacts/forge-browser';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  for(const viewport of [{width:1366,height:768},{width:1440,height:900},
                          {width:1920,height:1080},{width:2560,height:1440}]){
    const context=await browser.newContext({viewport});
    await context.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
      window.__forgeDisableSharedHandoff=true;
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof UI==='object' && document.querySelectorAll('.forge-unified-tool-header').length===5);
    for(const route of routes){
      await page.evaluate(({section,mode})=>UI.openTool(section,mode),route);
      await page.waitForFunction(({section,title})=>{
        const active=document.querySelector('#view-app .tool-section.active');
        if(!active||active.id!==section)return false;
        const header=active.querySelector('.forge-unified-tool-header');
        return header && header.querySelector(':scope > h2')?.textContent.trim()===title &&
          !document.documentElement.classList.contains('forge-route-running');
      },route,{timeout:12000});
      await page.waitForTimeout(100);
      const data=await page.evaluate(()=>{
        const header=document.querySelector('#view-app .tool-section.active .forge-unified-tool-header');
        const brand=header.querySelector(':scope > .forge-tool-home');
        const title=header.querySelector(':scope > h2');
        const icon=header.querySelector(':scope > .tool-icon');
        const getRect=el=>{const r=el.getBoundingClientRect();return {
          left:r.left,right:r.right,top:r.top,bottom:r.bottom,
          centerX:r.left+r.width/2,centerY:r.top+r.height/2,
          width:r.width,height:r.height
        };};
        const actions=[...header.children].filter(el=>![brand,title,icon].includes(el)&&
          getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>2).map(getRect);
        const headingStyle=getComputedStyle(title);
        const brandStyle=getComputedStyle(brand);
        const homeHeadingStyle=getComputedStyle(document.querySelector('#homeContent .tool-logo .home-card-title'));
        const heroStyle=getComputedStyle(document.querySelector('#forgeHeroName'));
        return {
          route:document.querySelector('#view-app .tool-section.active').id,
          header:getRect(header),brand:getRect(brand),title:getRect(title),icon:getRect(icon),
          actions,oldHeader:getComputedStyle(document.querySelector('body > .header')).display,
          brandFont:brandStyle.fontFamily,heroFont:heroStyle.fontFamily,
          headingFont:headingStyle.fontFamily,homeTitleFont:homeHeadingStyle.fontFamily,
          headingWeight:headingStyle.fontWeight,homeTitleWeight:homeHeadingStyle.fontWeight,
          headingText:title.textContent.trim(),
          activeSections:document.querySelectorAll('#view-app .tool-section.active').length,
          pageOverflow:document.documentElement.scrollWidth>innerWidth+4
        };
      });
      console.log('FORGE_HEADER_GEOMETRY '+JSON.stringify({viewport:viewport.width,tool:route.key,title:data.title,brand:data.brand,brandFont:data.brandFont,actions:data.actions}));
      assert.equal(data.activeSections,1,route.key+': multiple active workspaces');
      assert.equal(data.oldHeader,'none',route.key+': duplicate global white header visible');
      assert.equal(data.headingText,route.title,route.key+': title changed');
      assert.ok(Math.abs(data.header.height-68)<3,route.key+': incorrect compact header height');
      assert.ok(Math.abs(data.title.centerX-data.header.centerX)<4,
        route.key+': tool title not horizontally centered '+JSON.stringify(data));
      assert.ok(Math.abs(data.title.centerY-data.header.centerY)<4,
        route.key+': tool title not vertically centered '+JSON.stringify(data));
      assert.ok(data.icon.right+5<=data.brand.left,route.key+': brand collides with icon');
      assert.ok(data.brand.right+12<=data.title.left,route.key+': brand collides with centered title');
      assert.ok(data.actions.every(action=>
        action.left>=data.title.right+8 || action.right+8<=data.title.left ||
        action.top>=data.title.bottom+5 || action.bottom+5<=data.title.top),
        route.key+': original actions collide with centered title '+JSON.stringify(data));
      assert.ok(data.actions.every(action=>action.right<=data.header.right+4),
        route.key+': original actions clipped off right side '+JSON.stringify(data));
      assert.ok(data.brandFont.includes('Kola')&&data.heroFont.includes('Kola'),
        route.key+': The Forge must use the homepage wordmark font');
      assert.equal(data.headingFont,data.homeTitleFont,
        route.key+': tool title must use the homepage card font');
      assert.equal(data.headingWeight,data.homeTitleWeight,
        route.key+': tool title must use homepage card weight');
      if(route.key==='story'){
        const boardName=await page.locator('#storyHeaderName').evaluate(el=>{
          const input=el.querySelector('#storyNameInput'),r=el.getBoundingClientRect();
          const mode=document.getElementById('storySubModeToggle').getBoundingClientRect();
          const icon=document.getElementById('stillsToolIcon');
          const headerSvg=icon.querySelector('.forge-storyboard-header-svg');
          const homeSvg=document.querySelector('#homeContent > .home-card.tool-story .forge-home-icon svg') ||
            document.querySelector('#forgeIntro .forge-cine-piece[title="Storyboard"] svg');
          const svgVisible=headerSvg && getComputedStyle(headerSvg).display!=='none';
          const image=getComputedStyle(icon).backgroundImage;
          return {visible:!el.hidden&&getComputedStyle(el).display!=='none',
            width:r.width,top:r.top,right:r.right,modeLeft:mode.left,
            sourceInputIsOriginal:input===document.getElementById('storyNameInput'),
            matchesHomepageIcon:!!headerSvg&&
              (homeSvg
                ? headerSvg.innerHTML===homeSvg.innerHTML&&
                    headerSvg.getAttribute('viewBox')===homeSvg.getAttribute('viewBox')
                : headerSvg.getAttribute('viewBox')==='0 0 24 24' &&
                  headerSvg.querySelector('rect')?.getAttribute('width')==='18' &&
                  headerSvg.querySelector('rect')?.getAttribute('height')==='16' &&
                  headerSvg.querySelector('path')?.getAttribute('d')==='M3 9h18M10 9v11M3 15h7M10 15h11'),
            logoVisible:svgVisible,hasScreenshotImage:image.includes('data:image/png;base64,'),
            headerSvgFound:!!headerSvg,homeSvgFound:!!homeSvg,
            headerSvgMarkup:headerSvg?.outerHTML?.slice(0,380),
            homeSvgMarkup:homeSvg?.outerHTML?.slice(0,380),
            iconMarkup:icon?.outerHTML?.slice(0,550),
            introPresent:!!document.getElementById('forgeIntro'),
            homeIconPresent:!!document.querySelector('#homeContent > .home-card.tool-story .forge-home-icon svg')};
        });
        assert.ok(boardName.visible && boardName.width>=160,
          'Existing board name field is missing: '+JSON.stringify(boardName));
        assert.ok(boardName.sourceInputIsOriginal,
          'Board rename must retain the ORIGINAL storyNameInput and its handler');
        assert.ok(boardName.right+6<=boardName.modeLeft,
          'Board name collides with mode choices: '+JSON.stringify(boardName));
        assert.ok(boardName.matchesHomepageIcon&&boardName.logoVisible,
          'Header must display the exact SVG already used on the Storyboard homepage card: '+JSON.stringify(boardName));
        assert.equal(boardName.hasScreenshotImage,false,'Screenshot-derived PNG must not be used');

        assert.ok(data.actions.length>=2,'Storyboard must retain name/mode/export actions');
        assert.ok(data.actions.every(action=>action.top>=data.header.bottom+2),
          'Storyboard contextual actions must sit below centered header: '+JSON.stringify(data));
      }
      assert.equal(data.pageOverflow,false,route.key+': horizontal page overflow');
      if(viewport.width===1440||viewport.width===1920)
        await page.screenshot({path:dir+'/shared-header-'+route.key+'-'+viewport.width+'.png'});
      // Verify navigation from each route through the existing Home handler.
      if(route.key==='story' && viewport.width===1440){
        const input=page.locator('#storyNameInput');
        const before=await input.inputValue();
        await input.fill('Storyboard Header Check');
        assert.equal(await input.inputValue(),'Storyboard_Header_Check',
          'Existing Storyboard filename sanitizer must remain unchanged');
        assert.ok(await page.locator('#storyHeaderName').isVisible(),
          'Editing a board name must not hide its original field');
        await input.fill(before);
        await page.evaluate(()=>UI.switchStorySubMode('filmstrip'));
        await page.waitForTimeout(80);
        assert.ok(!(await page.locator('#storyHeaderName').isVisible()),
          'Board name must not overlay Filmstrip mode');
        await page.evaluate(()=>UI.switchStorySubMode('story'));
        await page.waitForTimeout(80);
        assert.ok(await page.locator('#storyHeaderName').isVisible(),
          'Board name must reappear when Grid Board is restored');
        await page.waitForFunction(()=>{
          const icon=document.querySelector('#stillsToolIcon .forge-storyboard-header-svg');
          return icon && getComputedStyle(icon).display!=='none';
        },null,{timeout:3000});
        const iconState=await page.locator('#stillsToolIcon').evaluate(el=>
          [...el.querySelectorAll(':scope > svg')]
            .filter(svg=>getComputedStyle(svg).display!=='none')
            .map(svg=>svg.classList.contains('forge-storyboard-header-svg')));
        assert.deepEqual(iconState,[true],
          'Grid Board must show exactly the homepage SVG after returning from Filmstrip');
      }
      if(viewport.width===1440){
        await page.locator('#view-app .tool-section.active .forge-tool-home').click();
        await page.waitForFunction(()=>!document.body.classList.contains('tool-active')&&
          !document.querySelector('#view-home').classList.contains('hidden'),null,{timeout:10000});
      }
      console.log('FORGE_SHARED_HEADER '+JSON.stringify({width:viewport.width,tool:route.key,
        title:data.headingText,actions:data.actions.length,centerX:data.title.centerX}));
    }
    assert.deepEqual(errors,[],viewport.width+': unhandled browser errors');
    await context.close();
  }
  console.log('FORGE_SHARED_HEADERS_OK 8 routes x 4 desktop widths');
}finally{await browser.close();}

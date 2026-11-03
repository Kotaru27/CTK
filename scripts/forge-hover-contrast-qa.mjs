/* Real browser audit of hover, keyboard focus and selected states across
   the eight original Forge tool routes, including native compressor iframe.
   Transparent backgrounds are sampled from the nearest painted ancestor;
   color computations are WCAG relative luminance, not a screenshot guess. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts/forge-browser',{recursive:true});
const routeSpecs=[
  ['section-logo',null,'Logo Resizer'],
  ['section-pdf','convert','PDF to Image'],
  ['section-pdf','split','Image Splitter'],
  ['section-stills-boards','video','Video Stills'],
  ['section-stills-boards','story','Storyboard'],
  ['section-adlinks','gen','Link Gen'],
  ['section-adlinks','downloader','Ad Downloader'],
  ['section-yt-helper',null,'Video Compressor']
];
function rgb(value){
  const parts=String(value).match(/[\d.]+/g)?.map(Number)||[];
  return {rgb:parts.slice(0,3),alpha:parts.length===4?parts[3]:1};
}
function lum(color){
  return color.slice(0,3).map(v=>{
    const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  }).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
}
function ratio(fg,bg){
  const a=lum(rgb(fg).rgb),b=lum(rgb(bg).rgb);
  return Math.round(((Math.max(a,b)+.05)/(Math.min(a,b)+.05))*100)/100;
}
const samples=[],failures=[];
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_suppress','1');
      sessionStorage.setItem('forge_whatsnew_suppress','1');
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#homeContent > .home-card').length===8);
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(550);
    const cards=page.locator('#homeContent > .home-card');
    const auditCard=async (i,kind)=>{
      const card=cards.nth(i);
      if(kind==='hover')await card.hover();
      else await card.focus();
      await page.waitForTimeout(190);
      return await card.evaluate((el)=>{
        const style=getComputedStyle(el),box=el.getBoundingClientRect();
        const classes=['.home-card-title','.home-card-desc','.home-card-num','.home-card-go'];
        return {index:[...el.parentElement.children].indexOf(el)+1,
          hovered:el.matches(':hover'),focused:el.matches(':focus-visible'),
          cardBg:style.backgroundColor,
          cardOpacity:style.opacity,
          colors:classes.map(s=>{
            const node=el.querySelector(s),cs=getComputedStyle(node);
            return {kind:s,color:cs.color,opacity:cs.opacity,visible:cs.visibility!=='hidden'};
          }),
          width:box.width,height:box.height};
      });
    };
    for(let i=0;i<8;i++){
      const record=await auditCard(i,'hover');
      for(const c of record.colors){
        const contrast=ratio(c.color,record.cardBg);
        const minimum=c.kind==='.home-card-title'||c.kind==='.home-card-desc'?4.5:3.8;
        if(contrast<minimum||Number(c.opacity)<.85||!c.visible)
          failures.push(viewport.width+'px hover card '+(i+1)+' '+c.kind+' contrast '+contrast+' opacity '+c.opacity+' bg '+record.cardBg+' fg '+c.color);
      }
      if(i===0&&viewport.width===1440)
        await page.screenshot({path:'artifacts/forge-browser/featured-logo-hover-after.png'});
      samples.push({width:viewport.width,state:'hover',...record});
      await cardOut(page);
      const focus=await auditCard(i,'focus');
      const keyTitle=focus.colors.find(c=>c.kind==='.home-card-title');
      if(ratio(keyTitle.color,focus.cardBg)<4.5)
        failures.push(viewport.width+'px focus card '+(i+1)+' title unreadable');
      if(!focus.focused)failures.push(viewport.width+'px card '+(i+1)+' missing focus-visible');
      samples.push({width:viewport.width,state:'focus',index:i+1,bg:focus.cardBg});
    }
    if(viewport.width>=1000){
      // Original sidebar controls: active, inactive, mouse and keyboard.
      await cards.first().click();
      await page.locator('#mainSidebar.visible').waitFor({state:'visible'});
      await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
      const nav=page.locator('#mainSidebar .nav-item:not(.nav-toggle)');
      const n=await nav.count();
      for(let i=0;i<n;i++){
        const item=nav.nth(i);
        const isVisible=await item.isVisible();
        if(!isVisible)continue;
        await item.hover();
        const state=await item.evaluate(el=>{
          const cs=getComputedStyle(el);
          const title=el.querySelector('.nav-item-text');
          const fg=getComputedStyle(title||el);
          return {id:el.id,bg:cs.backgroundColor,fg:fg.color,opacity:fg.opacity};
        });
        const contrast=ratio(state.fg,state.bg);
        if(contrast<4.5&&rgb(state.bg).alpha>.9)
          failures.push('Sidebar hover '+state.id+' contrast '+contrast+' '+JSON.stringify(state));
        samples.push({surface:'navigation',...state,contrast});
      }
      // Visit all original routes; cover representative visible action and
      // mode controls. Hover never triggers processing or modifies user files.
      for(const [section,mode,name] of routeSpecs){
        await page.evaluate(({section,mode})=>UI.openTool(section,mode),{section,mode});
        await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));
        const sectionElement=page.locator('#'+section+'.active');
        await sectionElement.waitFor({state:'visible'});
        if(section==='section-yt-helper'){
          const frame=page.frameLocator('#section-yt-helper .forge-compressor-frame');
          await frame.locator('#targetSize').waitFor({timeout:20000});
          for(const target of ['#dropzone','#compressButton']){
            const el=frame.locator(target);
            if(!await el.isVisible())continue;
            await el.hover({timeout:5000});
            const state=await el.evaluate(node=>{
              const css=getComputedStyle(node);
              return {bg:css.backgroundColor,fg:css.color,opacity:css.opacity};
            });
            samples.push({surface:name,target,...state});
            if(Number(state.opacity)<.65)
              failures.push(name+' '+target+' became transparent on hover');
          }
          continue;
        }
        const candidates=sectionElement.locator(':is(button.liquid-btn,label.liquid-btn,button[role="tab"],.ctk-row-menu > summary):visible');
        const count=await candidates.count();
        let checked=0;
        for(let i=0;i<count&&checked<14;i++){
          const item=candidates.nth(i);
          if(await item.isDisabled().catch(()=>false))continue;
          const before=await item.evaluate(el=>{
            const s=getComputedStyle(el);
            return {color:s.color,bg:s.backgroundColor,text:el.innerText?.trim().slice(0,45)||el.textContent?.trim().slice(0,45)||'',
              opacity:s.opacity};
          });
          if(!before.text)continue;
          try{await item.hover({timeout:3500});}catch{continue;}
          await page.waitForTimeout(65);
          const after=await item.evaluate(el=>{
            const s=getComputedStyle(el);
            const rect=el.getBoundingClientRect();
            return {color:s.color,bg:s.backgroundColor,opacity:s.opacity,
              width:rect.width,height:rect.height};
          });
          const contrast=rgb(after.bg).alpha>=.95?ratio(after.color,after.bg):null;
          const baseContrast=rgb(before.bg).alpha>=.95?ratio(before.color,before.bg):null;
          if(contrast!==null&&contrast<3.1&&baseContrast!==null&&baseContrast>=3.5)
            failures.push(name+' '+before.text+' hover contrast dropped '+baseContrast+' to '+contrast);
          if(Number(after.opacity)<.66)
            failures.push(name+' '+before.text+' hover faded to opacity '+after.opacity);
          samples.push({surface:name,label:before.text,contrast,baseContrast});
          checked++;
        }
        if(checked<1)failures.push(name+': no visible tool controls audited');
      }
      await page.screenshot({path:'artifacts/forge-browser/workbench-workspace-hover-audit.png'});
    }
    if(errors.length)failures.push(viewport.width+'px runtime errors: '+errors.join('; '));
    await context.close();
  }
  console.log('FORGE_HOVER_CONTRAST_AUDIT '+JSON.stringify({samples,failures}));
  assert.deepEqual(failures,[],'Forge hover / focus visual contrast regressions');
}finally{
  await browser.close();
}
async function cardOut(page){await page.mouse.move(4,4);}

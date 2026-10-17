import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('artifacts/ad-palette',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
const base='http://127.0.0.1:4173/';
try{
 for(const viewport of [{width:1440,height:900},{width:2560,height:1440}]){
  const ctx=await browser.newContext({viewport});
  await ctx.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  const home=await page.evaluate(()=>{
    const card=document.querySelector('button.tool-ads');
    const style=getComputedStyle(card);
    const name=card.querySelector('.home-card-title').textContent.trim();
    return {card:style.backgroundColor,name,body:document.body.classList.contains('light-mode')};
  });
  check(home.body,'Light mode absent at '+viewport.width+'px');
  check(home.name==='Ad Downloader','Ad Downloader card label changed');
  check(home.card==='rgb(231, 238, 231)','Ad Downloader card is not sage: '+home.card);
  await page.locator('button.home-card.tool-logo').click();
  await page.locator('#section-logo.active').waitFor({state:'visible'});
  const logo=await page.evaluate(()=>{
    const color=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
    return {header:color('.header'),toolHeader:color('#section-logo .tool-header'),
      navigation:color('.nav-sidebar'),body:document.body.classList.contains('light-mode')};
  });
  await page.locator('.header .brand-title').click();
  await page.locator('button.home-card.tool-ads').click();
  await page.locator('#section-adlinks.active').waitFor({state:'visible'});
  await page.waitForTimeout(130);
  const ad=await page.evaluate(()=>{
    const color=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
    const section=document.querySelector('#section-adlinks');
    const root=document.querySelector('#adlinksTabContentDownloader');
    const styles=getComputedStyle(root);
    return {header:color('.header'),toolHeader:color('#section-adlinks .tool-header'),
      navigation:color('.nav-sidebar'),tabRow:color('#tabRowAdlinks'),
      stage:color('#adlinksTabContentDownloader'),empty:color('#adDlEmptyState'),
      panel:styles.getPropertyValue('--studio-panel').trim(),
      main:styles.getPropertyValue('--studio-main').trim(),
      accent:styles.getPropertyValue('--studio-accent').trim(),
      primary:getComputedStyle(section).getPropertyValue('--ad-primary').trim(),
      body:document.body.classList.contains('light-mode'),
      selectedTab:document.querySelector('#adlinksTabDownloader')?.getAttribute('aria-selected')
    };
  });
  check(logo.body&&ad.body,'Light mode not maintained across tool switch');
  check(ad.header===logo.header,'Ad Downloader forces a different global header: '+ad.header+' vs '+logo.header);
  check(ad.navigation===logo.navigation,'Ad Downloader forces a different navigation rail color');
  check(ad.toolHeader===logo.toolHeader,'Tool header differs from Logo Resizer: '+ad.toolHeader+' vs '+logo.toolHeader);
  check(ad.stage==='rgb(245, 244, 239)','Downloader stage differs from shared main: '+ad.stage);
  check(ad.empty==='rgb(251, 250, 246)','Downloader empty panel differs from shared panel: '+ad.empty);
  check(ad.primary==='rgb(40, 84, 61)'||ad.primary==='#28543d',
    'Downloader primary differs from forest green: '+ad.primary);
  check(ad.selectedTab==='true','Downloader tab did not activate');
  check(errors.length===0,'Browser errors: '+errors.join('; '));
  await page.screenshot({path:'artifacts/ad-palette/ad-'+viewport.width+'.png',animations:'disabled'});
  console.log('AD_PALETTE_QA',JSON.stringify({viewport,home,logo,ad,errors,failures}));
  await ctx.close();
 }
 assert.deepEqual(failures,[],'Ad Downloader color parity regression');
}finally{await browser.close();}

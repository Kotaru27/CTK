import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts/forge-review',{recursive:true});
const scenarios=[
 {name:'qhd-native',width:2560,height:1440},
 {name:'qhd-125-scaling',width:2048,height:1152},
 {name:'desktop-1440',width:1440,height:900}
];
try{
 for(const q of scenarios){
  const context=await browser.newContext({viewport:{width:q.width,height:q.height},deviceScaleFactor:1});
  await context.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v4','1'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:65000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(650);
  const metrics=await page.evaluate(()=>{
    const sels=['.header','.header .brand-title','#brandText','#themeToggleBtn','.header::after','.nav-sidebar','.nav-sidebar .nav-toggle','#view-home','.combined-home-layout','.forge-hero','.forge-hero-top','.forge-hero-edition','.forge-hero-counter','.forge-hero-middle','#forgeHeroName','.forge-hero-aside','.forge-hero-aside-label','.forge-hero-aside p','.forge-hero-bottom','.forge-hero-lineup','.forge-hero-manifesto','.forge-after-hero','.forge-after-hero strong','.forge-after-hero span','#homeContent','button.home-card','button.home-card .home-card-num','button.home-card .home-card-go','button.home-card .home-card-title','button.home-card .home-card-desc','button.home-card .home-card-art'];
    const results={};
    for(const sel of sels){
      if(sel.includes('::'))continue;
      const el=document.querySelector(sel);if(!el){results[sel]=null;continue;}
      const r=el.getBoundingClientRect(),c=getComputedStyle(el);
      results[sel]={x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),display:c.display,opacity:c.opacity,
         fs:c.fontSize,weight:c.fontWeight,color:c.color,bg:c.backgroundColor,letter:c.letterSpacing,
         lineHeight:c.lineHeight,visible:r.width>0&&r.height>0&&c.display!=='none'};
    }
    const cards=[...document.querySelectorAll('button.home-card')].map((el,i)=>({i:i+1,label:el.getAttribute('aria-label'),name:el.querySelector('h2')?.textContent.trim(),description:el.querySelector('p')?.textContent.trim(),art:!!el.querySelector('.home-card-art'),title:el.title}));
    return {viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},kola:document.fonts.check('400 120px "Kola"'),theme:document.body.classList.contains('light-mode')?'light':'dark',elements:results,cards};
  });
  const fname='artifacts/forge-review/'+q.name+'.jpg';
  await page.screenshot({path:fname,type:'jpeg',quality:70,fullPage:false,animations:'disabled'});
  console.log('FORGE_REVIEW_METRICS_'+q.name+' '+JSON.stringify({metrics,errors}));
  console.log('FORGE_REVIEW_IMAGE_'+q.name+'_BEGIN '+fs.readFileSync(fname).toString('base64')+' FORGE_REVIEW_IMAGE_'+q.name+'_END');
  await context.close();
 }
} finally { await browser.close(); }

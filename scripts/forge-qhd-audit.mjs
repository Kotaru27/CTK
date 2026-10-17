import {chromium} from 'playwright';
import fs from 'node:fs';

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('artifacts/forge-qhd',{recursive:true});
const scenarios=[
 {name:'qhd-100-percent',width:2560,height:1440},
 {name:'qhd-125-percent-equivalent',width:2048,height:1152}
];
try{
for (const scenario of scenarios) {
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},deviceScaleFactor:1});
  await context.addInitScript(()=>sessionStorage.setItem('forge_intro_seen_v3','1'));
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:55000});
  await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.evaluate(()=>{
    const $=sel=>document.querySelector(sel);
    const rect=sel=>{
      const e=$(sel);if(!e)return null;
      const r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return {left:Math.round(r.left),top:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height),
        right:Math.round(r.right),bottom:Math.round(r.bottom),fontSize:c.fontSize,lineHeight:c.lineHeight,
        color:c.color,background:c.backgroundColor,font:c.fontFamily};
    };
    return {innerWidth,innerHeight,devicePixelRatio,
      documentWidth:document.documentElement.scrollWidth,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,
      header:rect('.header'),view:rect('#view-home'),layout:rect('.combined-home-layout'),
      hero:rect('.forge-hero'),title:rect('.forge-hero-name'),
      top:rect('.forge-hero-top'),aside:rect('.forge-hero-aside'),
      bottom:rect('.forge-hero-bottom'),after:rect('.forge-after-hero'),
      cards:rect('.combined-home-grid'),
      cardsCount:document.querySelectorAll('button.home-card').length,
      kolaLoaded:document.fonts.check('400 120px "Kola"')
    };
  });
  const filename='artifacts/forge-qhd/'+scenario.name+'.jpg';
  await page.screenshot({path:filename,type:'jpeg',quality:69,fullPage:false,animations:'disabled'});
  const b64=fs.readFileSync(filename).toString('base64');
  console.log('QHD_AUDIT_METRICS_'+scenario.name+' '+JSON.stringify({metrics,errors}));
  console.log('QHD_AUDIT_IMAGE_'+scenario.name+'_BEGIN '+b64+' QHD_AUDIT_IMAGE_'+scenario.name+'_END');
  await context.close();
}
}finally{await browser.close();}

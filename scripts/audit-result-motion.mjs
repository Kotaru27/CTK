/* Verify physics-based result entrances under real Chromium, without
   modifying tool state or relying on previously populated user data. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
  for(const reduced of [false,true]){
    const ctx=await browser.newContext({
      viewport:{width:1920,height:1080},
      reducedMotion:reduced?'reduce':'no-preference'
    });
    await ctx.addInitScript(()=>{
      sessionStorage.setItem('forge_intro_seen_v4','1');
      sessionStorage.setItem('forge_whatsnew_seen_session_2026_v1','1');
    });
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof UI==='object' && window.ForgeWorkspaceRoute);
    await page.evaluate(()=>UI.openTool('section-logo'));
    await page.waitForFunction(()=>!document.documentElement.classList.contains('forge-route-running'));

    const single=await page.evaluate(async()=>{
      const parent=document.getElementById('logoGrid');
      const element=document.createElement('div');
      element.className='logo-card-item';
      element.textContent='Motion QA placeholder';
      parent.appendChild(element);
      await Promise.resolve(); // flush MutationObserver
      const flights=document.getAnimations({subtree:true})
        .filter(a=>a.playState==='running'&&a.effect?.target===element);
      const frames=flights[0]?.effect?.getKeyframes()||[];
      const sample={animated:flights.length>0,frames:frames.length,
        first:frames[0],last:frames.at(-1),duration:flights[0]?.effect?.getTiming().duration||0};
      element.remove();
      flights.forEach(a=>a.cancel());
      return sample;
    });
    assert.equal(single.animated,!reduced,
      'Result arrival '+(reduced?'must be disabled with reduced motion':'must animate a new card'));
    if(!reduced){
      assert.equal(single.duration,300,'Generated card uses only the short bounded spring');
      assert.equal(single.frames,21);
      assert.match(single.first.transform,/translate3d\(0,5\.000px,0\)/);
      assert.match(single.last.transform,/translate3d\(0,0\.000px,0\)/);
    }

    const batch=await page.evaluate(async()=>{
      const parent=document.getElementById('logoGrid');
      const frag=document.createDocumentFragment();
      const nodes=Array.from({length:12},()=>{
        const element=document.createElement('div');
        element.className='logo-card-item';
        element.textContent='Batch test';
        frag.appendChild(element);
        return element;
      });
      parent.appendChild(frag);
      await Promise.resolve();
      const count=document.getAnimations({subtree:true})
        .filter(a=>nodes.includes(a.effect?.target)&&a.playState==='running').length;
      nodes.forEach(el=>el.remove());
      return count;
    });
    assert.equal(batch,0,'Large imports must never start many card animations');
    assert.deepEqual(errors,[],'Unexpected page errors during result motion QA');
    console.log('FORGE_RESULT_ARRIVAL '+JSON.stringify({reduced,single,batch,errors}));
    await ctx.close();
  }
}finally{
  await browser.close();
}

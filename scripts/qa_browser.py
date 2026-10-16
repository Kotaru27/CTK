from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import os, json
from pathlib import Path
OUTPUT = Path(__file__).resolve().parents[1] / "qa"
OUTPUT.mkdir(exist_ok=True)
ROOT='http://127.0.0.1:4173/'
TOOLS=[('Logo','section-logo',None),('PDF','section-pdf','convert'),('Splitter','section-pdf','split'),('Stills','section-stills-boards','video'),('Storyboard','section-stills-boards','story'),('Links','section-adlinks','gen'),('Downloader','section-adlinks','downloader'),('Video Downloads','section-yt-helper',None)]
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [1440,1024]:
  for theme in ['dark','light']:
   images=[]
   for page_name in ['source/baseline.html','index.html']:
    page=b.new_page(viewport={'width':width,'height':900},device_scale_factor=1,reduced_motion='reduce')
    page.route('https://**',lambda r:r.abort())
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.goto(ROOT+page_name,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_timeout(650)
    if theme=='light':
     page.evaluate('document.body.classList.add("light-mode")')
     page.wait_for_timeout(220)
    imagepath=str(OUTPUT / f'qa-{width}-{theme}-{page_name.replace("/","-")}.png')
    page.screenshot(path=imagepath)
    images.append(Image.open(imagepath).convert('RGB'))
    results.append(dict(type='render',viewport=width,theme=theme,page=page_name,errors=errors))
    if page_name=='index.html' and width==1440 and theme=='dark':
     for label,section,mode in TOOLS:
      try:
       page.evaluate('([s,m])=>UI.openTool(s,m)',[section,mode])
       page.wait_for_timeout(480)
       expected=page.locator('#'+section).get_attribute('class')
       isactive='active' in (expected or '')
       results.append(dict(type='navigation',tool=label,passed=isactive,errors=errors[-3:]))
      except Exception as e:
       results.append(dict(type='navigation',tool=label,passed=False,error=str(e)[:240]))
    page.close()
   diff=ImageChops.difference(*images)
   bbox=diff.getbbox()
   results.append(dict(type='pixels',viewport=width,theme=theme,exact=bbox is None,bbox=bbox))
 b.close()
(OUTPUT / 'results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2)[:11000])

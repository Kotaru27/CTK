/*
 * SharePoint media downloader for static hosting (including GitHub Pages).
 * Microsoft Entra SPA authorization code + PKCE; no service secret and no extension.
 * The site owner must configure the public app and tenant IDs in config/sharepoint.json.
 * We never fetch a SharePoint preview page and pretend it is the media file.
 */
const CTKSharePoint = (() => {
  const options = CTK_PUBLIC_SHAREPOINT_CONFIG;
  const pendingKey = 'ctk:sharepoint:pkce';
  const scopes = (Array.isArray(options.scopes) && options.scopes.length ? options.scopes : ['Files.Read.All', 'Sites.Read.All']);
  let accessToken = null;
  let expiresAt = 0;
  let startupMessage = '';

  const configured = () => /^[0-9a-f-]{36}$/i.test(options.clientId || '') &&
    /^[0-9a-f-]{36}$/i.test(options.tenantId || '');
  const isSharePoint = (url) => {
    try { const host = new URL(url).hostname.toLowerCase(); return host.endsWith('.sharepoint.com') || host.endsWith('.my.sharepoint.com'); }
    catch { return false; }
  };
  const redirectUri = () => location.origin + location.pathname;
  const authHost = () => `https://login.microsoftonline.com/${options.tenantId}/oauth2/v2.0`;
  const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedShareUrl = url => 'u!' + base64url(new TextEncoder().encode(url));
  function filePathFromLink(input) {
    const u = new URL(input);
    let path = u.searchParams.get('id') || u.searchParams.get('SourceUrl') || u.searchParams.get('sourceurl') || '';
    // Standard :v:/r/sites/... and :i:/r/sites/... SharePoint link forms.
    if (!path) {
      const p = decodeURIComponent(u.pathname);
      const match = p.match(/^\/:\w:\/r(\/(?:sites|teams)\/.*)$/i);
      path = match ? match[1] : p;
    }
    try { path = decodeURIComponent(path); } catch {}
    if (/\/_layouts\/|\/(?:_forms|forms)\//i.test(path) || !/^\/(?:sites|teams)\/[^/]+\/[^?#]+/i.test(path)) return null;
    return path.split('?')[0];
  }
  function mimeFromName(name) {
    const match = String(name || '').match(/\.([a-z0-9]{2,5})$/i);
    return match ? '.' + match[1].toLowerCase() : '';
  }
  async function signIn() {
    if (!configured()) throw Error('Site owner has not configured Microsoft Entra for CTK.');
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') throw Error('Microsoft sign-in requires HTTPS (GitHub Pages or localhost).');
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
    sessionStorage.setItem(pendingKey, JSON.stringify({verifier, state, created:Date.now(), origin:redirectUri()}));
    const url = new URL(authHost() + '/authorize');
    url.searchParams.set('client_id',options.clientId);
    url.searchParams.set('response_type','code');
    url.searchParams.set('redirect_uri',redirectUri());
    url.searchParams.set('response_mode','query');
    url.searchParams.set('scope',['openid','profile', ...scopes].join(' '));
    url.searchParams.set('code_challenge',challenge);
    url.searchParams.set('code_challenge_method','S256');
    url.searchParams.set('state',state);
    location.assign(url.toString());
  }
  async function finishSignIn() {
    const url = new URL(location.href);
    if (!url.searchParams.has('code') && !url.searchParams.has('error')) return false;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const loginError = url.searchParams.get('error_description') || url.searchParams.get('error');
    const rawPending = sessionStorage.getItem(pendingKey);
    sessionStorage.removeItem(pendingKey);
    // Remove OAuth codes/errors immediately from URL and history.
    ['code','state','session_state','error','error_description','error_uri'].forEach(key=>url.searchParams.delete(key));
    history.replaceState(null,'',url.pathname + url.search + url.hash);
    if (loginError) { startupMessage = 'Microsoft sign-in was not completed.'; return false; }
    let pending;
    try { pending = JSON.parse(rawPending); } catch { pending = null; }
    if (!code || !pending || pending.state !== state || Date.now()-pending.created > 600000 || pending.origin !== redirectUri()) {
      startupMessage = 'Microsoft sign-in expired. Select Connect Microsoft again.'; return false;
    }
    try {
      const form = new URLSearchParams({client_id:options.clientId,grant_type:'authorization_code',
        code,redirect_uri:redirectUri(),code_verifier:pending.verifier,scope:['openid','profile', ...scopes].join(' ')});
      const response = await fetch(authHost()+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
      const json = await response.json();
      if (!response.ok || !json.access_token) throw Error('Microsoft authorization was denied. Check the Entra redirect URI, requested permissions and tenant consent.');
      accessToken=json.access_token;
      expiresAt=Date.now()+Math.max(0,(Number(json.expires_in)||3600)-120)*1000;
      startupMessage='Connected to Microsoft. Import the Excel file to download SharePoint media.';
      return true;
    } catch (error) { startupMessage=error.message; return false; }
  }
  const authenticated = () => Boolean(accessToken) && expiresAt>Date.now();
  async function graph(path) {
    if (!authenticated()) throw Error('Connect Microsoft before downloading SharePoint assets.');
    const url = new URL(path,'https://graph.microsoft.com/v1.0/');
    if (url.origin !== 'https://graph.microsoft.com') throw Error('Unexpected Graph origin');
    const response=await fetch(url,{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},redirect:'follow'});
    if (!response.ok) {
      if (response.status===401) { accessToken=null; expiresAt=0; }
      if ([401,403].includes(response.status)) throw Error('Microsoft Graph denied access. Check your SharePoint access and administrator-approved permissions ('+response.status+').');
      if (response.status===404) throw Error('Media not found in Microsoft Graph (404).');
      throw Error('Microsoft Graph request failed ('+response.status+').');
    }
    return response.json();
  }
  async function resolveByPath(rawUrl) {
    const u = new URL(rawUrl), p=filePathFromLink(rawUrl);
    const guid=(u.searchParams.get('UniqueId')||u.searchParams.get('uniqueid')||'').replace(/[{}]/g,'');
    const guidOnly=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(guid) ? guid : null;
    const siteSource=p || decodeURIComponent(u.pathname);
    const siteMatch=siteSource.match(/^\/(sites|teams)\/([^/]+)/i);
    if (!siteMatch || (!p && !guidOnly)) throw Error('The preview link does not identify a file. Provide a SharePoint sharing URL, a file path, or its UniqueId.');
    const sitePath='/'+[siteMatch[1],siteMatch[2]].map(encodeURIComponent).join('/');
    const site=await graph(`sites/${u.hostname}:${sitePath}?$select=id,webUrl`);
    const rootPath=p ? p.replace(/\/+$/,'') : null;
    let cursor=`sites/${encodeURIComponent(site.id)}/drives?$select=id,name,webUrl&$top=100`;
    let best=null;
    const candidateDrives=[];
    for(let page=0;page<5 && cursor;page++){
      const response=await graph(cursor);
      for(const drive of response.value||[]){
        if (!drive.webUrl) continue;
        let drivePath;
        try {drivePath=decodeURI(new URL(drive.webUrl).pathname).replace(/\/+$/,'');}catch{continue;}
        if (rootPath && rootPath.toLowerCase().startsWith((drivePath+'/').toLowerCase()) && (!best || drivePath.length>best.path.length)) best={drive,path:drivePath};
        if (guidOnly) candidateDrives.push(drive);
      }
      const next=response['@odata.nextLink'];
      cursor=next && next.startsWith('https://graph.microsoft.com/v1.0/') ? next : null;
    }
    if (!best && guidOnly) {
      // Graph permits a SharePoint list-item UniqueId as the driveItem identifier.
      // Try only the bounded list of drives that belong to this authorized site.
      for (const drive of candidateDrives.slice(0,30)) {
        try {
          const item=await graph(`drives/${encodeURIComponent(drive.id)}/items/${guidOnly}?$select=id,name,size,file,@microsoft.graph.downloadUrl`);
          if (item?.file) return item;
        } catch (error) {
          if (/Graph denied access|Connect Microsoft/i.test(error.message)) throw error;
        }
      }
    }
    if(!best) throw Error('Unable to match the file to a SharePoint document library. Use a real sharing link or file path instead.');
    const relative=rootPath.slice(best.path.length+1).split('/').map(encodeURIComponent).join('/');
    return graph(`drives/${encodeURIComponent(best.drive.id)}/root:/${relative}?$select=id,name,size,file,@microsoft.graph.downloadUrl`);
  }
  async function resolveMedia(rawUrl) {
    if (!isSharePoint(rawUrl)) throw Error('Not a SharePoint address.');
    // A sharing URL can point to a library outside the default drive.
    try {
      const share=await graph('shares/'+encodedShareUrl(rawUrl)+'/driveItem?$select=id,name,size,file,@microsoft.graph.downloadUrl');
      if (share?.file) return share;
    } catch (error) {
      if (/Graph denied access|Connect Microsoft/i.test(error.message)) throw error;
    } // Some preview URLs are not sharing links; use their document path.
    const item=await resolveByPath(rawUrl);
    if (!item?.file) throw Error('The source is not a downloadable file.');
    return item;
  }
  async function getAsset(entry,maxBytes=350*1024*1024) {
    if (!configured()) throw Error('Site owner must configure Microsoft Entra before SharePoint downloading.');
    if (!authenticated()) throw Error('Connect Microsoft before downloading SharePoint assets.');
    const item=await resolveMedia(entry.url);
    const downloadUrl=item['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) throw Error('Microsoft Graph did not provide a media download URL.');
    const signed=new URL(downloadUrl);
    if(signed.protocol!=='https:') throw Error('Unexpected media download URL.');
    const advertised=Number(item.size)||0;
    if(advertised>maxBytes) throw Error('This media file is too large for in-browser saving ('+Math.ceil(advertised/1048576)+' MB).');
    const response=await fetch(signed.href,{credentials:'omit',redirect:'follow'});
    if(!response.ok) throw Error('Media download failed ('+response.status+').');
    const size=Number(response.headers.get('content-length'))||0;
    if(size>maxBytes) throw Error('Media exceeds browser memory safety limit.');
    const blob=await response.blob();
    if(!blob.size||blob.size>maxBytes) throw Error('Media is empty or exceeds browser memory limit.');
    const prefix=new TextDecoder().decode(await blob.slice(0,180).arrayBuffer()).trimStart().toLowerCase();
    if (/^(?:<!doctype html|<html\b|<\?xml[^>]*?><html\b|\{\s*"(?:error|code)"\s*:)/.test(prefix) || /(?:text\/html|application\/json)/i.test(blob.type))
      throw Error('The server returned a web page instead of the media file.');
    const name=item.name||'';
    return {blob, ext:mimeFromName(name), sourceName:name};
  }
  return {configured,isSharePoint,redirectUri,signIn,finishSignIn,authenticated,getAsset,
    filePathFromLink,encodedShareUrl,get startupMessage(){return startupMessage;}};
})();

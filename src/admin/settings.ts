// src/admin/settings.ts — settings admin page body (site + AI guidelines + MCP token).

export function settingsBody(): string {
  return `<div class="page-head">
<div>
<h1>Settings</h1>
<div class="sub">Site identity, AI writing guidelines, and the MCP access token.</div>
</div>
</div>
<form id="settingsForm" class="max-w">
<div class="form-group"><label for="siteName">Site Name</label><input type="text" id="siteName" required /></div>
<div class="form-group"><label for="seoDescription">Site Description <span class="hint">(meta description)</span></label><input type="text" id="seoDescription" /></div>
<div class="form-group">
<label for="logoFile">Site Logo</label>
<div id="logoPreview" style="margin-bottom:0.5rem"></div>
<input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp" />
<p class="dim" style="font-size:0.8rem;margin-top:0.4rem">Recommended: a wide, short logo (about <strong>600×200px</strong>, PNG with transparency). Shrunk to 600px wide and re-encoded to lossless PNG if larger; logos already ≤600px are stored as-is.</p>
</div>
<div class="form-group"><label class="check"><input type="checkbox" id="shortcuts" /> Enable single-key shortcuts (g, n, t, ?)</label><p class="dim" style="font-size:0.8rem;margin-top:0.3rem">Single-key shortcuts trigger actions without a modifier. Turn off for screen-reader or keyboard-only use.</p></div>
<h2 style="font-size:1.05rem;font-weight:600;letter-spacing:-0.02em;margin:2rem 0 1rem">AI Writing Assistant</h2>
<p class="muted" style="font-size:0.85rem;margin-bottom:1rem">The in-editor AI uses these guidelines as its house style for Continue, Summarize, Rewrite, and SEO meta. Free tier: ~1,000+ AI calls per day at no cost.</p>
<div class="form-group"><label for="aiGuidelines">Content guidelines</label><textarea id="aiGuidelines" rows="6" placeholder="e.g. Second person, short sentences, no jargon, active voice, 60–80 words per section."></textarea></div>
<h2 style="font-size:1.05rem;font-weight:600;letter-spacing:-0.02em;margin:2rem 0 1rem">MCP Access</h2>
<p class="muted" style="font-size:0.85rem;margin-bottom:1rem">Bearer token for the Model Context Protocol endpoint at <code>/api/mcp</code> — lets AI agents and tools read and publish content on your behalf.</p>
<div class="row">
<div class="form-group" style="flex:1"><label for="mcpToken">Access token</label>
<div class="flex">
<input type="text" id="mcpToken" placeholder="Leave empty to disable MCP" />
<button type="button" class="btn" onclick="genToken()">Generate</button>
</div>
</div>
</div>
<button type="submit" class="btn btn-primary mt-2">Save Settings</button>
<div id="status" class="mt-1" aria-live="polite" role="status"></div>
</form>

<div class="card mt-3" style="border-color:var(--warn);background:var(--warn-soft)">
<div style="padding:1.25rem">
<h3 style="color:var(--warn);margin-bottom:0.5rem;font-weight:600">Reset Site</h3>
<p class="muted" style="font-size:0.9rem;margin-bottom:1rem">Erases all posts, pages, tags, images, settings, and admin accounts, then returns you to the setup wizard. This cannot be undone.</p>
<button type="button" id="resetBtn" class="btn" style="background:var(--danger);color:#fff">Reset & Start Over</button>
<span id="resetStatus" style="margin-left:0.75rem;font-size:0.9rem" role="status" aria-live="polite"></span>
</div>
</div>
<script>
function genToken(){var a=new Uint8Array(24);crypto.getRandomValues(a);var s='';var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';for(var i=0;i<a.length;i++)s+=chars[a[i]%chars.length];document.getElementById('mcpToken').value='ph_'+s;toast('Token generated — save to apply','ok')}
(function(){var sc=document.getElementById('shortcuts');try{sc.checked=localStorage.getItem('phcloud-shortcuts')!=='off'}catch(e){sc.checked=true}sc.addEventListener('change',function(){try{localStorage.setItem('phcloud-shortcuts',sc.checked?'on':'off')}catch(e){}toast('Shortcuts '+(sc.checked?'enabled':'disabled'),'ok')})})();
fetch('/api/admin/settings').then(function(r){return r.json()}).then(function(s){
document.getElementById('siteName').value=s.site_name||'';
document.getElementById('seoDescription').value=s.seo_description||'';
document.getElementById('aiGuidelines').value=s.ai_guidelines||'';
document.getElementById('mcpToken').value=s.mcp_token||'';
if(s.site_logo){var img=document.createElement('img');img.style.cssText='max-width:120px;max-height:60px;border:1px solid var(--border-2);border-radius:4px;display:block';document.getElementById('logoPreview').appendChild(img);
function probe(label){fetch(img.src,{cache:'no-store'}).then(function(r){return r.arrayBuffer().then(function(b){var u=new Uint8Array(b),h='';for(var i=0;i<Math.min(16,u.length);i++)h+=(u[i]<16?'0':'')+u[i].toString(16)+' ';return r.status+' '+(r.headers.get('content-type')||'?')+' '+b.byteLength+'B ['+h.trim()+']'})}).then(function(t){var d=document.createElement('div');d.style.cssText='color:var(--danger);font-size:0.72rem;word-break:break-all;margin-top:0.4rem';d.textContent=label+' → '+t;document.getElementById('logoPreview').appendChild(d)}).catch(function(e){var d=document.createElement('div');d.style.cssText='color:var(--danger);font-size:0.72rem';d.textContent=label+' (probe error: '+e+')';document.getElementById('logoPreview').appendChild(d)})};
img.onload=function(){probe('LOGO decoded '+img.naturalWidth+'x'+img.naturalHeight+' '+img.src)};
img.onerror=function(){probe('LOGO BROKEN '+img.src)};
img.src=s.site_logo}});
document.getElementById('settingsForm').addEventListener('submit',function(e){
e.preventDefault();
var status=document.getElementById('status');
status.style.color='var(--accent)';
status.textContent='Saving…';
var data={site_name:document.getElementById('siteName').value,seo_description:document.getElementById('seoDescription').value,ai_guidelines:document.getElementById('aiGuidelines').value,mcp_token:document.getElementById('mcpToken').value};
var logoFile=document.getElementById('logoFile').files[0];
if(logoFile){
var reader=new FileReader();
reader.onerror=function(){status.style.color='var(--danger)';status.textContent='Could not read this file — try a different one.'};
reader.onload=function(ev){
var img=new Image();
img.onerror=function(){status.style.color='var(--danger)';status.textContent='Could not decode this image. Re-save it as a PNG or JPEG with a set pixel size and re-upload.'};
img.onload=function(){
var MAX_W=600,w=img.width,h=img.height;
if(!w||!h){status.style.color='var(--danger)';status.textContent='That file has no readable pixel dimensions (SVGs without an embedded width/height do this). Re-save it as a PNG or JPEG with a set size and re-upload.';return}
function post(durl,ext){fetch('/api/admin/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:durl,filename:'logo.'+ext})}).then(function(r){if(!r.ok){throw new Error('POST /api/admin/images → '+r.status+' '+(r.statusText||''))}return r.json()}).then(function(res){if(res.url){data.site_logo=res.url;saveSettings(data,status)}else{status.style.color='var(--danger)';status.textContent='Logo upload failed'}}).catch(function(e){status.style.color='var(--danger)';status.textContent='Logo upload failed: '+(e&&e.message||e)})}
if(w<=MAX_W){post(ev.target.result,(logoFile.type||'image/png').split('/')[1]||'png');return}
h=Math.round(h*MAX_W/w);w=MAX_W;
var c=document.createElement('canvas');c.width=w;c.height=h;
c.getContext('2d').drawImage(img,0,0,w,h);
c.toBlob(function(b){if(!b){status.style.color='var(--danger)';status.textContent='Could not encode this image — try a different file.';return}var r2=new FileReader();r2.onerror=function(){status.style.color='var(--danger)';status.textContent='Could not encode this image — try a different file.'};r2.onload=function(e2){post(e2.target.result,'png')};r2.readAsDataURL(b)},'image/png')};
img.src=ev.target.result};
reader.readAsDataURL(logoFile)}
else{saveSettings(data,status)}});
function saveSettings(data,status){
fetch('/api/admin/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){
if(r.ok){status.style.color='var(--ok)';status.textContent='Saved!';location.reload()}
else{status.style.color='var(--danger)';status.textContent='Error saving settings'}}).catch(function(){status.style.color='var(--danger)';status.textContent='Save failed — check your connection.'})}
document.getElementById('resetBtn').addEventListener('click',function(){
var s=document.getElementById('resetStatus');
var typed=prompt('This will permanently erase ALL posts, pages, tags, images, settings, and admin accounts. Type RESET to confirm.');
if(typed!=='RESET'){if(typed!==null){s.style.color='var(--danger)';s.textContent='Cancelled — typed text did not match.'}return;}
s.style.color='var(--accent)';s.textContent='Resetting…';
fetch('/api/admin/wipe',{method:'POST'}).then(function(r){
if(r.ok){s.style.color='var(--ok)';s.textContent='Reset complete. Loading setup wizard…';window.location.href='/';}
else{s.style.color='var(--danger)';s.textContent='Reset failed (are you still logged in?).';}}).catch(function(){s.style.color='var(--danger)';s.textContent='Reset failed — check your connection.';})});
</script>`;
}
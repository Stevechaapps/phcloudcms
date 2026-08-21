// src/admin/editor-body.ts — the post editor page (new + edit): split main/aside
// layout, live theme preview, version history, SEO panel, autosave, shortcuts.
// The fragile editor JS lives in exported consts so check-inline-js.mjs parses
// it; the body template only injects them via ${SCRIPT} substitution sites.

import { esc } from "../cms/escape.js";
import { sanitizePostHtml } from "../cms/sanitize.js";
import {
  SCHEDULE_TOGGLE_SCRIPT,
  SCHEDULER_SCRIPT,
  EDITOR_FORMAT_SCRIPTS,
  PASTE_IMAGE_SCRIPT,
  DROP_IMAGE_SCRIPT,
  RTE_TOOLBAR,
} from "./editor.js";

// ── Editor page CSS (page-local; the shell CSS stays generic) ──────
const EDITOR_CSS = `
.editor-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:1.25rem;align-items:start}
.editor-main{min-width:0}
.aside{display:flex;flex-direction:column;gap:1rem;position:sticky;top:72px}
.aside-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem}
.aside-card h3{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);font-weight:600;margin-bottom:0.75rem}
.title-input{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;padding:0.65rem 0.75rem;border:none;background:transparent;border-bottom:1px solid var(--input-border);border-radius:0;color:var(--text)}
.title-input:focus{box-shadow:none;border-bottom-color:var(--accent)}
.slug-row{display:flex;align-items:center;gap:0.4rem;margin:0.6rem 0 1.25rem;color:var(--text-3);font-size:0.85rem}
.slug-row span{font-family:var(--mono)}
.autosave-banner{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.6rem 0.9rem;margin-bottom:1rem;background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius-sm);font-size:0.85rem;color:var(--accent)}
.autosave-banner[hidden]{display:none}
.seo-counter{font-size:0.72rem;color:var(--text-3);font-variant-numeric:tabular-nums}
.seo-counter.warn{color:var(--warn)}.seo-counter.danger{color:var(--danger)}
.snippet{border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem 0.9rem;background:var(--bg-soft)}
.snippet .s-title{color:#8ab4f8;font-size:1rem;line-height:1.3;margin-bottom:0.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.snippet .s-url{color:var(--ok);font-size:0.75rem;margin-bottom:0.15rem}
.snippet .s-desc{color:var(--text-2);font-size:0.82rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.snippet-empty{border:1px dashed var(--border-2);border-radius:var(--radius-sm);padding:0.75rem 0.9rem;color:var(--text-3);font-size:0.82rem}
.version-item{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid var(--border)}
.version-item:last-child{border-bottom:none}
.version-item .v-title{font-size:0.82rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.version-item .v-date{font-size:0.72rem;color:var(--text-3);font-variant-numeric:tabular-nums}
.preview-overlay{position:fixed;inset:0;z-index:80;background:rgba(5,6,10,.7);backdrop-filter:blur(6px);display:flex;flex-direction:column;padding:1.5rem;gap:0.75rem}
.preview-overlay[hidden]{display:none}
.preview-bar{display:flex;align-items:center;gap:0.75rem;justify-content:space-between;color:var(--text-2);font-size:0.85rem}
.preview-frame{flex:1;background:#fff;border:none;border-radius:var(--radius);box-shadow:var(--shadow);width:100%;max-width:100%;margin:0 auto;display:block;transition:max-width .25s cubic-bezier(.4,0,.2,1)}
.preview-frame.tablet{max-width:768px}.preview-frame.mobile{max-width:390px}
.pv-btn.active{background:var(--accent);color:var(--accent-ink)}
.ai-wrap{position:relative}
.ai-btn{color:var(--accent)}
.ai-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:60;min-width:230px;background:var(--surface);border:1px solid var(--input-border);border-radius:var(--radius-sm);box-shadow:var(--shadow);padding:0.35rem;display:flex;flex-direction:column;gap:2px}
.ai-menu[hidden]{display:none}
.ai-menu button{background:none;border:none;text-align:left;padding:0.5rem 0.65rem;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-2);cursor:pointer;font-weight:500;display:flex;justify-content:space-between;gap:0.75rem;align-items:center;width:100%}
.ai-menu button:hover{background:var(--surface-2);color:var(--text)}
.ai-menu button[disabled]{opacity:.5;pointer-events:none}
.ai-menu .ai-tone-row{display:flex;gap:0.35rem;padding:0.35rem 0.35rem 0}
.ai-menu .ai-tone-row select{width:auto;flex:1;padding:0.3rem 1.6rem 0.3rem 0.5rem;font-size:0.78rem}
.ai-menu .ai-tone-row button{flex:1}
.ai-suggest{display:flex;flex-direction:column;gap:2px;padding:0.35rem;border-top:1px solid var(--border);margin-top:0.35rem}
.ai-suggest button{font-size:0.78rem}
.ai-meter{display:flex;align-items:center;justify-content:space-between;font-size:0.75rem;color:var(--text-3);margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--border)}
.ai-meter .bar{flex:1;height:4px;background:var(--surface-2);border-radius:2px;margin:0 0.5rem;overflow:hidden}
.ai-meter .bar i{display:block;height:100%;background:var(--accent);border-radius:2px;transition:width .3s cubic-bezier(.4,0,.2,1)}
@media(max-width:900px){.editor-grid{grid-template-columns:1fr}.aside{position:static;order:2}}
@media(prefers-reduced-motion:reduce){.preview-frame{transition:none}}
`.trim();

// ── Editor page JS (checked by check-inline-js.mjs; avoid ${ }) ────
export const EDITOR_JS = `var $=function(id){return document.getElementById(id)};
var editorState={id:null,initial:null,savedDraft:null,draftKey:'',saveTimer:null,previewTimer:null};
var contentEl=$('content');
function ea2(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function setStatus(msg,color){var s=$('status');s.style.color=color||'var(--text-2)';s.textContent=msg}
// ── slug auto-gen ──
var titleEl=$('title'),slugEl=$('slug');
slugEl.addEventListener('input',function(){this.dataset.touched='1'});
titleEl.addEventListener('input',function(){if(!slugEl.dataset.touched)slugEl.value=titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});
// ── tags ──
function loadTags(){fetch('/api/admin/tags').then(function(r){return r.json()}).then(function(cats){
var html='';for(var i=0;i<cats.length;i++){html+='<label class="check" style="justify-content:space-between"><span>'+ea2(cats[i].name)+'</span><input type="checkbox" value="'+ea2(cats[i].id)+'" class="tag-cb" /></label>'}
$('tagCheckboxes').innerHTML=html||'<div class="dim" style="font-size:0.8rem">No tags yet.</div>'})}
function getTagIds(){var ids=[];[].forEach.call(document.querySelectorAll('.tag-cb:checked'),function(cb){ids.push(Number(cb.value))});return ids}
// ── SEO panel: counters + Google-style snippet ──
function seoSnippet(){var t=$('metaTitle').value.trim()||titleEl.value.trim();var d=$('metaDesc').value.trim();var url='https://'+location.hostname+'/'+slugEl.value;
$('sCounter').textContent=t.length+' / 60';$('sCounter').className='seo-counter'+(t.length>60?' danger':t.length>50?' warn':'');
$('dCounter').textContent=d.length+' / 160';$('dCounter').className='seo-counter'+(d.length>160?' danger':d.length>140?' warn':'');
var box=$('snippetBox');if(!t&&!d){box.className='snippet-empty';box.textContent='Set a meta title or description to preview the Google result.';return}
box.className='snippet';box.innerHTML='<div class="s-title">'+ea2(t||'Untitled')+'</div><div class="s-url">'+ea2(url)+'</div><div class="s-desc">'+ea2(d||'Add a meta description — it is the first thing readers see under the title.')+'</div>'}
$('metaTitle').addEventListener('input',seoSnippet);$('metaDesc').addEventListener('input',seoSnippet);
// ── live preview (debounced, renders through the real theme) ──
function buildPreview(force){var body={title:titleEl.value,content:contentEl.innerHTML};
clearTimeout(editorState.previewTimer);var go=function(){fetch('/api/admin/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.text()}).then(function(html){$('previewFrame').srcdoc=html;$('previewFrame').onload=function(){setStatus('')}}).catch(function(){setStatus('Preview failed','var(--danger)')})};
if(force){go()}else{editorState.previewTimer=setTimeout(go,300)}}
$('previewBtn').addEventListener('click',function(){var p=$('previewPane');if(p.hidden){p.hidden=false;document.body.style.overflow='hidden';buildPreview(true);var c=$('previewClose');if(c)c.focus()}else{closePreview()}});
$('previewClose').addEventListener('click',closePreview);
function closePreview(){$('previewPane').hidden=true;document.body.style.overflow='';var pb=$('previewBtn');if(pb)pb.focus()}
// ── preview viewport switcher (desktop / tablet / mobile) + refresh ──
var pvBtns=document.querySelectorAll('.pv-btn');for(var i=0;i<pvBtns.length;i++){(function(b){b.addEventListener('click',function(){for(var j=0;j<pvBtns.length;j++)pvBtns[j].classList.remove('active');b.classList.add('active');var m=b.getAttribute('data-mode');var f=$('previewFrame');f.classList.toggle('tablet',m==='tablet');f.classList.toggle('mobile',m==='mobile')})})(pvBtns[i])}
$('pvRefresh').addEventListener('click',function(){buildPreview(true);setStatus('Refreshing preview…','var(--accent)')});
contentEl.addEventListener('input',function(){buildPreview();scheduleSave()});
titleEl.addEventListener('input',scheduleSave);slugEl.addEventListener('input',scheduleSave);$('excerpt').addEventListener('input',scheduleSave);$('metaTitle').addEventListener('input',scheduleSave);$('metaDesc').addEventListener('input',scheduleSave);
// ── autosave draft (localStorage) ──
function draftData(){return {title:titleEl.value,slug:slugEl.value,content:contentEl.innerHTML,excerpt:$('excerpt').value,metaTitle:$('metaTitle').value,metaDesc:$('metaDesc').value}}
function scheduleSave(){clearTimeout(editorState.saveTimer);editorState.saveTimer=setTimeout(saveDraft,1000)}
function saveDraft(){if(!editorState.draftKey)return;try{var d=draftData();if(JSON.stringify(d)===editorState.initial)return;localStorage.setItem(editorState.draftKey,JSON.stringify(d))}catch(e){}}
function clearDraft(){try{localStorage.removeItem(editorState.draftKey)}catch(e){}}
function restoreDraft(d){titleEl.value=d.title||'';if(d.slug){slugEl.value=d.slug;slugEl.dataset.touched='1'}contentEl.innerHTML=d.content||'';if(d.excerpt!=null)$('excerpt').value=d.excerpt;if(d.metaTitle!=null)$('metaTitle').value=d.metaTitle;if(d.metaDesc!=null)$('metaDesc').value=d.metaDesc;seoSnippet();buildPreview(true);toast('Draft restored','ok')}
function checkDraft(){if(!editorState.draftKey)return;var raw=null;try{raw=localStorage.getItem(editorState.draftKey)}catch(e){}if(!raw)return;var d=null;try{d=JSON.parse(raw)}catch(e){return}
var cur=JSON.stringify(draftData());if(JSON.stringify(d)===cur||JSON.stringify(d)===editorState.initial)return;
$('autosave').hidden=false;$('autosaveTitle').textContent='Unsaved draft found from your last session.';$('autosaveRestore').onclick=function(){restoreDraft(d);$('autosave').hidden=true};$('autosaveDiscard').onclick=function(){clearDraft();$('autosave').hidden=true};$('autosaveRestore').focus()}
// ── version history ──
function loadVersions(){if(!editorState.id)return;fetch('/api/admin/posts/'+editorState.id+'/versions').then(function(r){return r.json()}).then(function(vs){
var box=$('versionList');if(!vs.length){box.innerHTML='<div class="dim" style="font-size:0.8rem">No versions yet — each save records one.</div>';return}
box.innerHTML=vs.map(function(v){return '<div class="version-item"><div style="min-width:0"><div class="v-title">'+ea2(v.title||'Untitled')+'</div><div class="v-date">'+new Date(v.saved_at).toLocaleString()+'</div></div><button class="btn btn-sm" onclick="restoreVersion('+v.id+')">Restore</button></div>'}).join('')})}
function restoreVersion(vid){if(!confirm('Restore this version? Current content is saved as a new version first.'))return;
fetch('/api/admin/posts/'+editorState.id+'/versions/'+vid+'/restore',{method:'POST'}).then(function(r){return r.json()}).then(function(res){
if(res.ok){titleEl.value=res.post.title;contentEl.innerHTML=res.post.content;$('excerpt').value=res.post.excerpt;slugEl.value=$('slug').value;seoSnippet();buildPreview(true);loadVersions();toast('Version restored','ok')}else{toast('Restore failed','err')}}).catch(function(){toast('Restore failed','err')})}
// ── AI writing assistant (Phase 3b) ──
function aiToggle(){var m=$('aiMenu');var b=$('aiBtn');if(m.hidden){m.hidden=false;if(b)b.setAttribute('aria-expanded','true');var first=m.querySelector('button');if(first&&!first.disabled)first.focus()}else{m.hidden=true;if(b){b.setAttribute('aria-expanded','false');b.focus()}}}
function aiClose(){var m=$('aiMenu');if(m)m.hidden=true;var b=$('aiBtn');if(b)b.setAttribute('aria-expanded','false')}
function aiBusy(on){var bs=document.querySelectorAll('#aiMenu button');for(var i=0;i<bs.length;i++)bs[i].disabled=on;var b=$('aiBtn');if(b)b.disabled=on}
function refreshUsage(){fetch('/api/admin/ai/usage').then(function(r){return r.json()}).then(function(u){
var el=$('aiMeter');if(!el)return;var pct=Math.round(100*u.remaining/u.limit);
el.innerHTML='<span>AI budget</span><span class="bar"><i style="width:'+pct+'%"></i></span><span>'+(u.remaining>=1000?(Math.round(u.remaining/100)/10)+'k':u.remaining)+' left</span>'})}
function aiErr(res){var msg='AI request failed';try{msg=res.error||msg}catch(e){}toast(msg,'err')}
function aiAct(kind){
var sel=window.getSelection();var hasSel=sel&&!sel.isCollapsed;
if(kind==='rewrite'&&!hasSel){toast('Select the text to rewrite first','err');return}
var payload={};
if(kind==='continue')payload.text=contentEl.textContent.trim();
if(kind==='summarize')payload.text=contentEl.textContent.trim();
if(kind==='rewrite'){payload.text=String(sel).trim();payload.tone=$('aiTone')?$('aiTone').value:'clear'}
if(kind==='titles')payload.content=contentEl.textContent.trim();
if(kind==='meta'){payload.title=titleEl.value;payload.content=contentEl.textContent.trim()}
aiBusy(true);setStatus('AI thinking…','var(--accent)');aiClose();
fetch('/api/admin/ai/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json().catch(function(){return {}}).then(function(d){return {r:r,d:d}})}).then(function(t){
aiBusy(false);refreshUsage();
if(!t.r.ok){aiErr(t.d);setStatus('');return}
var d=t.d;
if(kind==='continue'){var p=document.createElement('p');p.textContent=d.text;contentEl.appendChild(p);contentEl.scrollTop=contentEl.scrollHeight;buildPreview();setStatus('Continued — save to keep','var(--ok)')}
if(kind==='summarize'){$('excerpt').value=d.text.slice(0,255);setStatus('Excerpt generated','var(--ok)')}
if(kind==='rewrite'){document.execCommand('insertText',false,d.text);buildPreview();setStatus('Rewritten — save to keep','var(--ok)')}
if(kind==='titles'){var box=$('aiSuggest');box.innerHTML='';var ts=d.titles||[];if(!ts.length){box.innerHTML='<div class="dim" style="font-size:0.78rem">No titles returned.</div>';return}
for(var i=0;i<ts.length;i++){(function(t){var b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=function(){titleEl.value=t;slugEl.value='';slugEl.dataset.touched='';box.innerHTML='';aiClose();toast('Title set — slug auto-generated','ok')};box.appendChild(b)})(ts[i])}
var sb=box.querySelector('button');if(sb)sb.focus()}
if(kind==='meta'){if(d.meta_title)$('metaTitle').value=d.meta_title;if(d.meta_description)$('metaDesc').value=d.meta_description;seoSnippet();setStatus('SEO meta generated','var(--ok)')}
}).catch(function(){aiBusy(false);setStatus('AI request failed','var(--danger)')})}
document.addEventListener('click',function(e){if($('aiMenu')&&!e.target.closest('.ai-wrap'))aiClose()});
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var ai=$('aiMenu');if(ai&&!ai.hidden){e.preventDefault();aiClose();var b=$('aiBtn');if(b)b.focus();return}var pv=$('previewPane');if(pv&&!pv.hidden){e.preventDefault();closePreview()}});
// ── submit ──
$('form').addEventListener('submit',function(e){
e.preventDefault();
var fd=new FormData(e.target);
if(!contentEl.textContent.trim()&&!contentEl.querySelector('img')){setStatus('Content is required','var(--danger)');return}
setStatus('Saving…','var(--accent)');
var payload={title:String(fd.get('title')||''),slug:String(fd.get('slug')||''),content:contentEl.innerHTML,excerpt:String(fd.get('excerpt')||''),meta_title:$('metaTitle').value.trim(),meta_description:$('metaDesc').value.trim(),published:$('published').checked,publish_at:phIso($('publish_date').value,$('publish_hour').value,$('publish_minute').value,$('publish_ampm').value),tag_ids:getTagIds()};
var url=editorState.id?'/api/admin/posts/'+editorState.id:'/api/admin/posts';var method=editorState.id?'PATCH':'POST';
fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(res){return res.json().catch(function(){return {}}).then(function(data){return {res:res,data:data}})}).then(function(t){
if(!t.res.ok){setStatus(t.data.error||'Error saving post','var(--danger)');return}
clearDraft();setStatus('Saved!','var(--ok)');
if(editorState.id){loadVersions();setTimeout(function(){setStatus('')},2000)}
else{setTimeout(function(){location.href='/admin/edit/'+t.data.id},600)}}).catch(function(){setStatus('Save failed — check your connection.','var(--danger)')})});
// ── boot ──
loadTags();loadVersions();checkDraft();seoSnippet();refreshUsage();`;

type EditorPost = {
  id: string | number | null;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: string | number;
  publish_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  preview_token?: string | null;
  updated_at: string;
};

function editorPage(
  title: string,
  mode: "new" | "edit",
  p: EditorPost,
): string {
  const id = p.id === null ? "" : String(p.id);
  const checked = p.published == 1 || p.published === "1" ? "checked" : "";
  const hasSchedule = !!p.publish_at;
  const scheduleChecked = hasSchedule ? "checked" : "";
  const previewLink =
    mode === "edit" && p.preview_token
      ? "/" + p.slug + "?preview=" + p.preview_token
      : "";
  const hourOpts = Array.from(
    { length: 12 },
    (_, i) => '<option value="' + (i + 1) + '">' + (i + 1) + "</option>",
  ).join("");
  const minOpts = Array.from(
    { length: 60 },
    (_, i) =>
      '<option value="' + i + '">' + (i < 10 ? "0" : "") + i + "</option>",
  ).join("");
  const dt = p.publish_at
    ? "var dt=phLocalFromUtc(" +
      JSON.stringify(p.publish_at) +
      ");if(dt){$('publish_date').value=dt.date;$('publish_hour').value=dt.hour;$('publish_minute').value=dt.minute;$('publish_ampm').value=dt.ampm}"
    : "";

  return `<div class="page-head">
<div>
<h1>${esc(title)}</h1>
<div class="sub">${mode === "edit" ? "Saved on every save — preview renders through your live theme." : "Drafts autosave locally while you write."}</div>
</div>
<div class="flex">
<button type="button" class="btn btn-ghost" id="previewBtn">Preview</button>
<button type="submit" form="form" class="btn btn-primary">Save Post</button>
</div>
</div>
<div class="autosave-banner" id="autosave" hidden role="status" aria-live="polite">
<span id="autosaveTitle"></span>
<div class="flex">
<button type="button" class="btn btn-sm btn-primary" id="autosaveRestore">Restore</button>
<button type="button" class="btn btn-sm btn-ghost" id="autosaveDiscard">Discard</button>
</div>
</div>
<form id="form" autocomplete="off">
<div class="editor-grid">
<div class="editor-main">
<input type="text" id="title" class="title-input" placeholder="Post title" aria-label="Post title" value="${esc(p.title)}" required />
<div class="slug-row"><span aria-hidden="true">/</span><input type="text" id="slug" name="slug" placeholder="my-slug" aria-label="Slug" value="${esc(p.slug)}" style="flex:1" required /></div>
<div class="form-group"><label for="excerpt">Excerpt <span class="hint">(optional, max 255 chars — shows in post lists)</span></label><textarea id="excerpt" name="excerpt" rows="3" maxlength="255" style="min-height:0;resize:none">${esc(p.excerpt ?? "")}</textarea></div>
<div class="form-group" style="margin-bottom:0">
<div class="toolbar">
${RTE_TOOLBAR}
<span class="sep"></span>
<div class="ai-wrap">
<button type="button" id="aiBtn" class="ai-btn" onmousedown="event.preventDefault()" onclick="aiToggle()" title="AI writing assistant" aria-haspopup="menu" aria-expanded="false" aria-controls="aiMenu">✦ AI</button>
<div class="ai-menu" id="aiMenu" hidden>
<button type="button" onclick="aiAct('continue')">Continue writing</button>
<button type="button" onclick="aiAct('summarize')">Summarize for excerpt</button>
<div class="ai-tone-row"><select id="aiTone" aria-label="Rewrite tone"><option value="clear">Clear</option><option value="professional">Professional</option><option value="concise">Concise</option><option value="engaging">Engaging</option></select><button type="button" onclick="aiAct('rewrite')">Rewrite</button></div>
<button type="button" onclick="aiAct('titles')">Suggest titles</button>
<button type="button" onclick="aiAct('meta')">Generate SEO meta</button>
<div id="aiSuggest" class="ai-suggest"></div>
</div>
</div>
</div>
<div id="editor-wrap" style="min-height:340px">
<div id="content" class="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Post content" aria-describedby="status" data-ph="Write your post…">${sanitizePostHtml(p.content)}</div>
</div>
</div>
<div id="status" style="margin-top:1rem;font-size:0.9rem" aria-live="polite" role="status"></div>
</div>
<aside class="aside">
<div class="aside-card">
<h3>Publish</h3>
<label class="check" style="margin-bottom:0.75rem"><input type="checkbox" id="published" name="published" ${checked} /> Published</label>
<label class="check"><input type="checkbox" id="schedule" onchange="scheduleToggle()" ${scheduleChecked} /> Schedule for later</label>
<div style="margin-top:0.6rem;display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap">
<input type="date" id="publish_date" name="publish_date" aria-label="Publish date" style="${hasSchedule ? "display:inline-block" : "display:none"}" />
<select id="publish_hour" name="publish_hour" aria-label="Publish hour" style="${hasSchedule ? "display:inline-block" : "display:none"};width:auto"><option value="">HH</option>${hourOpts}</select>
<select id="publish_minute" name="publish_minute" aria-label="Publish minute" style="${hasSchedule ? "display:inline-block" : "display:none"};width:auto"><option value="">MM</option>${minOpts}</select>
<select id="publish_ampm" name="publish_ampm" aria-label="AM or PM" style="${hasSchedule ? "display:inline-block" : "display:none"};width:auto"><option value="AM">AM</option><option value="PM">PM</option></select>
</div>
${previewLink ? '<div class="mt-2" style="font-size:0.82rem"><a href="' + esc(previewLink) + '" target="_blank" rel="noopener">Preview unpublished post ↗</a></div>' : ""}
${mode === "edit" ? '<div class="dim" style="font-size:0.75rem;margin-top:0.75rem">Updated: ' + esc(p.updated_at) + "</div>" : ""}
<div class="ai-meter" id="aiMeter" title="Workers AI free-tier budget (resets daily)"><span>AI budget</span><span class="bar"><i style="width:0%"></i></span><span>…</span></div>
</div>
<div class="aside-card">
<h3>Tags</h3>
<div id="tagCheckboxes" style="display:flex;flex-direction:column;gap:0.4rem"></div>
</div>
<div class="aside-card">
<h3>SEO</h3>
<div class="form-group" style="margin-bottom:0.6rem"><label for="metaTitle">Meta title</label><input type="text" id="metaTitle" maxlength="70" value="${esc(p.meta_title ?? "")}" placeholder="${esc(p.title.slice(0, 50))}" /><div class="seo-counter" id="sCounter"></div></div>
<div class="form-group" style="margin-bottom:0.75rem"><label for="metaDesc">Meta description</label><textarea id="metaDesc" rows="3" maxlength="200" style="min-height:0;resize:none">${esc(p.meta_description ?? "")}</textarea><div class="seo-counter" id="dCounter"></div></div>
<div id="snippetBox" class="snippet-empty"></div>
</div>
${mode === "edit" ? '<div class="aside-card"><h3>Version history</h3><div id="versionList"></div></div>' : ""}
</aside>
</div>
</form>
<div class="preview-overlay" id="previewPane" hidden role="dialog" aria-modal="true" aria-label="Live preview">
<div class="preview-bar"><span>Live preview — renders through your theme</span><div class="flex"><button type="button" class="btn btn-sm pv-btn active" data-mode="full">Desktop</button><button type="button" class="btn btn-sm pv-btn" data-mode="tablet">Tablet</button><button type="button" class="btn btn-sm pv-btn" data-mode="mobile">Mobile</button></div><div class="flex"><button type="button" class="btn btn-sm" id="pvRefresh" title="Refresh preview">↻</button><button type="button" class="btn btn-sm" id="previewClose">Close</button></div></div>
<iframe class="preview-frame" id="previewFrame" title="Live preview" sandbox="allow-same-origin allow-scripts" csp="default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"></iframe>
</div>
<style>${EDITOR_CSS}</style>
<script>${SCHEDULE_TOGGLE_SCRIPT}</script>
<script>${SCHEDULER_SCRIPT}</script>
<script>${EDITOR_FORMAT_SCRIPTS}</script>
<script>${PASTE_IMAGE_SCRIPT}</script>
<script>${DROP_IMAGE_SCRIPT}</script>
<script>
${EDITOR_JS}
// Init MUST run after EDITOR_JS: draftData()/slugEl/titleEl don't exist until
// its assignments execute. Running init first threw a TypeError that aborted
// this whole script block — killing save, AI, tags, and autosave while the
// hoisted toolbar functions kept working (why the bug looked partial).
editorState.id=${id === "" ? "null" : JSON.stringify(Number(id))};
editorState.draftKey='phcloud:draft:'+(editorState.id?'post-'+editorState.id:'new-untitled');
editorState.initial=JSON.stringify(draftData());
${dt}
</script>`;
}

export function newPostBody(): string {
  return editorPage("New Post", "new", {
    id: null,
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    published: "0",
    publish_at: null,
    meta_title: null,
    meta_description: null,
    updated_at: new Date().toISOString(),
  });
}

export function editBody(post: {
  id: string | number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: string | number;
  publish_at?: string | null;
  preview_token?: string | null;
  updated_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
}): string {
  return editorPage("Edit Post", "edit", {
    ...post,
    id: post.id,
    meta_title: post.meta_title ?? null,
    meta_description: post.meta_description ?? null,
  });
}

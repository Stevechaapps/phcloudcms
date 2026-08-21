// src/admin/pages.ts — pages admin: list, new-page form, edit-page form.

import { esc } from "../cms/escape.js";
import { sanitizePostHtml } from "../cms/sanitize.js";
import { EDITOR_FORMAT_SCRIPTS, PASTE_IMAGE_SCRIPT, DROP_IMAGE_SCRIPT, RTE_TOOLBAR } from "./editor.js";

export function pagesBody(): string {
  return `<div class="page-head">
<div>
<h1>Pages</h1>
<div class="sub">Standalone pages like About, Contact, and Privacy.</div>
</div>
<a href="/admin/pages/new" class="btn btn-primary">+ New Page</a>
</div>
<div class="card">
<table><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="pages"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
</table></div>
<script>
fetch('/api/admin/pages').then(function(r){return r.json()}).then(function(pages){
function ea(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var tbody=document.getElementById('pages');
if(!pages.length){tbody.innerHTML='<tr><td colspan="5" class="empty">No pages yet. <a href="/admin/pages/new" class="btn btn-sm btn-primary mt-1">Create one</a></td></tr>';return}
tbody.innerHTML=pages.map(function(p){return '<tr>'
+'<td><span class="cell-title">'+ea(p.title)+'</span></td>'
+'<td><span class="cell-muted">/'+ea(p.slug)+'</span></td>'
+'<td><span class="badge '+(p.published?'badge-pub':'badge-draft')+'"><span class="dot"></span>'+(p.published?'Published':'Draft')+'</span></td>'
+'<td class="cell-dim">'+new Date(p.updated_at).toLocaleDateString()+'</td>'
+'<td><div class="row-actions"><a class="btn btn-sm" href="/admin/pages/edit/'+p.id+'">Edit</a><button class="btn btn-sm btn-danger" onclick="del('+p.id+')">Delete</button></div></td>'
+'</tr>'}).join('')});
function del(id){if(!confirm('Delete this page?'))return;fetch('/api/admin/pages/'+id,{method:'DELETE',credentials:'include'}).then(function(r){if(!r.ok)throw new Error('fail');location.reload()}).catch(function(){toast('Delete failed','err')})}
</script>`;
}

export function newPageBody(): string {
  return `<h1 style="margin-bottom:1.5rem">New Page</h1>
<form id="form" style="max-width:800px">
<div class="row">
<div class="form-group"><label for="title">Title</label><input type="text" id="title" name="title" required /></div>
<div class="form-group"><label for="slug">Slug</label><input type="text" id="slug" name="slug" required placeholder="about" /></div>
</div>
<div class="form-group"><label for="excerpt">Excerpt <span style="color:var(--text-2);font-weight:400">(optional, max 255 chars)</span></label><textarea id="excerpt" name="excerpt" rows="2" maxlength="255" style="min-height:0;resize:none"></textarea></div>
<div class="form-group"><label for="content">Content <span style="color:var(--text-2);font-weight:400">(Rich text)</span></label><div class="toolbar">${RTE_TOOLBAR}</div><div id="editor-wrap" style="min-height:320px"><div id="content" class="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Page content" aria-describedby="status" data-ph="Write your page…"></div></div></div>
<div class="form-group"><label for="metaTitle">SEO meta title <span style="color:var(--text-2);font-weight:400">(max 60 chars)</span></label><input type="text" id="metaTitle" maxlength="60" placeholder="Page title" /><div class="seo-counter" id="sCounter" style="font-size:.72rem;color:var(--text-3);font-variant-numeric:tabular-nums"></div></div>
<div class="form-group"><label for="metaDesc">SEO meta description <span style="color:var(--text-2);font-weight:400">(max 160 chars)</span></label><textarea id="metaDesc" rows="3" maxlength="160" style="min-height:0;resize:none" placeholder="1-2 sentences describing this page"></textarea><div class="seo-counter" id="dCounter" style="font-size:.72rem;color:var(--text-3);font-variant-numeric:tabular-nums"></div></div>
<div class="form-group"><label><input type="checkbox" id="published" name="published" checked /> Published</label></div>
<div style="display:flex;gap:0.75rem">
<button type="submit" class="btn btn-primary">Save Page</button>
<a href="/admin/pages" class="btn btn-ghost">Cancel</a>
</div>
<div id="status" style="margin-top:1rem;font-size:0.9rem" aria-live="polite" role="status"></div>
</form>
<script>
var titleEl=document.getElementById('title');
var slugEl=document.getElementById('slug');
slugEl.addEventListener('input',function(){this.dataset.touched='1'});
titleEl.addEventListener('input',function(){if(slugEl.dataset.touched)return;slugEl.value=titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});
document.getElementById('form').addEventListener('submit',function(e){
e.preventDefault();
var status=document.getElementById('status');
status.style.color='var(--accent)';
status.textContent='Saving…';
var fd=new FormData(e.target);
var contentEl=document.getElementById('content');
  if(!contentEl.textContent.trim()&&!contentEl.querySelector('img')){status.style.color='var(--danger)';status.textContent='Content is required';return}
fetch('/api/admin/pages',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
  title:String(fd.get('title')||''),
  slug:String(fd.get('slug')||''),
  content:contentEl.innerHTML,
  excerpt:String(fd.get('excerpt')||''),
  meta_title:document.getElementById('metaTitle').value.trim(),
  meta_description:document.getElementById('metaDesc').value.trim(),
  published:document.getElementById('published').checked
  })}).then(function(res){
  if(res.ok){
  status.style.color='var(--ok)';
  status.textContent='Saved!';setTimeout(function(){location.href='/admin/pages'},500)}
  else{status.style.color='var(--danger)';status.textContent='Error saving page'}})});
  (function(){
  var mt=document.getElementById('metaTitle'),md=document.getElementById('metaDesc'),sc=document.getElementById('sCounter'),dc=document.getElementById('dCounter');
  function up(){if(sc)sc.textContent=mt.value.length+' / 60';if(dc)dc.textContent=md.value.length+' / 160'}
  if(mt)mt.addEventListener('input',up);if(md)md.addEventListener('input',up);up()
  })();
  </script>
  <script>${EDITOR_FORMAT_SCRIPTS}</script>
<script>${PASTE_IMAGE_SCRIPT}</script>
<script>${DROP_IMAGE_SCRIPT}</script>`;
}

export function editPageBody(page: {
  id: string | number;
  title: string;
  slug: string;
  content: string;
  published: string | number;
  updated_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  excerpt?: string | null;
}): string {
  var id = String(page.id);
  var checked = page.published == 1 || page.published === "1" ? "checked" : "";
  return `<h1 style="margin-bottom:1.5rem">Edit Page</h1>
<form id="form" style="max-width:800px">
<div class="row">
<div class="form-group"><label for="title">Title</label><input type="text" id="title" name="title" required value="${esc(page.title)}" /></div>
<div class="form-group"><label for="slug">Slug</label><input type="text" id="slug" name="slug" required value="${esc(page.slug)}" /></div>
</div>
<div class="form-group"><label for="excerpt">Excerpt <span style="color:var(--text-2);font-weight:400">(optional, max 255 chars)</span></label><textarea id="excerpt" name="excerpt" rows="2" maxlength="255" style="min-height:0;resize:none">${esc(page.excerpt ?? "")}</textarea></div>
<div class="form-group"><label for="content">Content <span style="color:var(--text-2);font-weight:400">(Rich text)</span></label><div class="toolbar">${RTE_TOOLBAR}</div><div id="editor-wrap" style="min-height:320px"><div id="content" class="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Page content" aria-describedby="status" data-ph="Write your page…">${sanitizePostHtml(page.content)}</div></div></div>
<div class="form-group"><label for="metaTitle">SEO meta title <span style="color:var(--text-2);font-weight:400">(max 60 chars)</span></label><input type="text" id="metaTitle" maxlength="60" value="${esc(page.meta_title ?? "")}" placeholder="${esc(page.title.slice(0, 50))}" /><div class="seo-counter" id="sCounter" style="font-size:.72rem;color:var(--text-3);font-variant-numeric:tabular-nums"></div></div>
<div class="form-group"><label for="metaDesc">SEO meta description <span style="color:var(--text-2);font-weight:400">(max 160 chars)</span></label><textarea id="metaDesc" rows="3" maxlength="160" style="min-height:0;resize:none">${esc(page.meta_description ?? "")}</textarea><div class="seo-counter" id="dCounter" style="font-size:.72rem;color:var(--text-3);font-variant-numeric:tabular-nums"></div></div>
<div class="form-group"><label><input type="checkbox" id="published" name="published" ${checked} /> Published</label></div>
<div style="font-size:0.8rem;color:var(--text-2);margin-bottom:1rem">Last updated: ${esc(page.updated_at)}</div>
<div style="display:flex;gap:0.75rem">
<button type="submit" class="btn btn-primary">Update Page</button>
<a href="/admin/pages" class="btn btn-ghost">Cancel</a>
</div>
<div id="status" style="margin-top:1rem;font-size:0.9rem" aria-live="polite" role="status"></div>
</form>
<script>
var titleEl=document.getElementById('title');
var slugEl=document.getElementById('slug');
slugEl.addEventListener('input',function(){this.dataset.touched='1'});
titleEl.addEventListener('input',function(){if(slugEl.dataset.touched)return;slugEl.value=titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});
document.getElementById('form').addEventListener('submit',function(e){
e.preventDefault();
var status=document.getElementById('status');
status.style.color='var(--accent)';
status.textContent='Saving…';
var fd=new FormData(e.target);
var contentEl=document.getElementById('content');
if(!contentEl.textContent.trim()&&!contentEl.querySelector('img')){status.style.color='var(--danger)';status.textContent='Content is required';return}
fetch('/api/admin/pages/${id}',{
method:'PATCH',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
  title:String(fd.get('title')||''),
  slug:String(fd.get('slug')||''),
  content:contentEl.innerHTML,
  excerpt:String(fd.get('excerpt')||''),
  meta_title:document.getElementById('metaTitle').value.trim(),
  meta_description:document.getElementById('metaDesc').value.trim(),
  published:document.getElementById('published').checked
  })}).then(function(res){
if(res.ok){status.style.color='var(--ok)';status.textContent='Updated!';setTimeout(function(){location.href='/admin/pages'},500)}
  else{status.style.color='var(--danger)';status.textContent='Error updating page'}})});
  (function(){
  var mt=document.getElementById('metaTitle'),md=document.getElementById('metaDesc'),sc=document.getElementById('sCounter'),dc=document.getElementById('dCounter');
  function up(){if(sc)sc.textContent=mt.value.length+' / 60';if(dc)dc.textContent=md.value.length+' / 160'}
  if(mt)mt.addEventListener('input',up);if(md)md.addEventListener('input',up);up()
  })();
  </script>
<script>${EDITOR_FORMAT_SCRIPTS}</script>
<script>${PASTE_IMAGE_SCRIPT}</script>
<script>${DROP_IMAGE_SCRIPT}</script>`;
}

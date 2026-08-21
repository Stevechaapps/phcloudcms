// src/admin/tags.ts — tags admin page body.

export function tagsBody(): string {
  return `<div class="page-head">
<div>
<h1>Tags</h1>
<div class="sub">Organize posts by topic — tags appear on post pages.</div>
</div>
</div>
<form id="tagForm" class="row mb-3" style="max-width:560px">
<div class="form-group"><label for="name">Tag name</label><input type="text" id="name" required /></div>
<div class="form-group"><label for="slug">Slug</label><input type="text" id="slug" required placeholder="auto" /></div>
<div class="form-group" style="display:flex;align-items:flex-end"><button type="submit" class="btn btn-primary">Add</button></div>
</form>
<div id="status" class="mb-2 muted" aria-live="polite" role="status"></div>
<div class="card">
<table>
<thead><tr><th>Name</th><th>Slug</th><th>Post count</th><th></th></tr></thead>
<tbody id="tags"></tbody>
</table>
</div>
<script>
var nameEl=document.getElementById('name');
var slugEl=document.getElementById('slug');
nameEl.addEventListener('input',function(){
slugEl.value=nameEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
});
function load(){fetch('/api/admin/tags').then(function(r){return r.json()}).then(function(tags){
function ea(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var tbody=document.getElementById('tags');
if(!tags.length){tbody.innerHTML='<tr><td colspan="4" class="empty">No tags yet. Create your first above.</td></tr>';return}
tbody.innerHTML=tags.map(function(t){return '<tr>'
+'<td><span class="cell-title">'+ea(t.name)+'</span></td>'
+'<td><span class="cell-muted">'+ea(t.slug)+'</span></td>'
+'<td class="cell-dim">'+(t.post_count||0)+'</td>'
+'<td><div class="row-actions"><button class="btn btn-sm btn-danger" onclick="del('+t.id+')">Delete</button></div></td></tr>'}).join('')})}
document.getElementById('tagForm').addEventListener('submit',function(e){
e.preventDefault();
var status=document.getElementById('status');
var slug=slugEl.value||nameEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
fetch('/api/admin/tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameEl.value,slug:slug})}).then(function(res){
if(res.ok){status.style.color='var(--ok)';status.textContent='Added!';nameEl.value='';slugEl.value='';load()}
else{status.style.color='var(--danger)';status.textContent='Error adding tag'}})});
function del(id){if(!confirm('Delete tag?'))return;fetch('/api/admin/tags/'+id,{method:'DELETE',credentials:'include'}).then(function(r){if(!r.ok)throw new Error('fail');load()}).catch(function(){toast('Delete failed','err')})}
load();
</script>`;
}
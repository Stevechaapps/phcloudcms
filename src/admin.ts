// src/admin.ts — Admin panel HTML pages
// Uses multi-line template strings to stay within TS parser limits.

// ── Layout shell (sidebar + topbar + content slot) ──────────────────

export function adminShell(title: string, bodyHtml: string): string {
const styles = [
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:system-ui,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.5}',
  '.topbar{background:#0f172a;color:white;padding:0 2rem;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
  '.topbar a{color:rgba(255,255,255,0.7);text-decoration:none;font-size:0.85rem;transition:color 0.15s}',
  '.topbar a:hover{color:white}',
  '.layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}',
  '.sidebar{background:white;border-right:1px solid #e5e7eb;padding:1.5rem 0}',
  '.sidebar a{display:block;padding:0.5rem 1.5rem;color:#475569;text-decoration:none;font-size:0.875rem;transition:background 0.1s}',
  '.sidebar a:hover{background:#f1f5f9;color:#1e293b}',
  '.content{padding:2rem;max-width:960px}',
  'table{width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04)}',
  'th,td{text-align:left;padding:0.65rem 0.75rem;border-bottom:1px solid #f1f5f9;font-size:0.875rem}',
  'th{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;background:#f8fafc}',
  'tr:last-child td{border-bottom:none}',
  'tr:hover td{background:#f8fafc}',
  '.badge{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.7rem;font-weight:600}',
  '.badge-pub{background:#dcfce7;color:#166534}',
  '.badge-draft{background:#fef3c7;color:#92400e}',
  '.badge-info{background:#dbeafe;color:#1e40af}',
  '.btn{display:inline-flex;align-items:center;gap:0.35rem;padding:0.5rem 0.9rem;border-radius:5px;font-size:0.8rem;text-decoration:none;cursor:pointer;border:none;font-weight:500;transition:all 0.12s}',
  '.btn-primary{background:#0f172a;color:white}.btn-primary:hover{background:#1e293b}',
  '.btn-secondary{background:#e5e7eb;color:#1e293b}.btn-secondary:hover{background:#d1d5db}',
  '.btn-sm{padding:0.3rem 0.6rem;border-radius:4px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-size:0.8rem;color:#475569;transition:all 0.12s}',
  '.btn-sm:hover{background:#f1f5f9;border-color:#cbd5e1}',
  '.btn-danger{color:#dc2626;background:none;border:none}.btn-danger:hover{color:#b91c1c}',
  '.card{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)}',
  '.form-group{margin-bottom:1.25rem}',
  'label{display:block;font-weight:500;margin-bottom:0.35rem;font-size:0.85rem;color:#374151}',
  'input[type="text"],input[type="url"],textarea,select{width:100%;padding:0.6rem 0.75rem;border:1px solid #d1d5db;border-radius:5px;font-size:0.9rem;font-family:inherit;background:white;transition:border-color 0.12s}',
  'input:focus,textarea:focus,select:focus{outline:none;border-color:#f97316;box-shadow:0 0 0 2px rgba(249,115,22,0.12)}',
  'textarea{min-height:360px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:0.875rem;line-height:1.6;resize:vertical}',
  '.row{display:flex;gap:1rem}',
  '.row .form-group{flex:1}',
  'h2{font-size:1.3rem;font-weight:700;margin-bottom:1.25rem;letter-spacing:-0.01em}',
  'h3{font-size:1rem;font-weight:600;margin-bottom:0.75rem;color:#374151}',
  '.toast{position:fixed;bottom:1.5rem;right:1.5rem;padding:0.75rem 1.25rem;border-radius:6px;font-size:0.875rem;color:white;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:999;opacity:0;transform:translateY(8px);transition:all 0.2s}',
  '.toast.show{opacity:1;transform:translateY(0)}',
  '.toast-success{background:#16a34a}.toast-error{background:#dc2626}.toast-info{background:#2563eb}',
  '.toolbar{display:flex;gap:2px;padding:0.5rem;background:#f8fafc;border:1px solid #d1d5db;border-bottom:none;border-radius:5px 5px 0 0;flex-wrap:wrap}',
  '.toolbar button{background:none;border:none;padding:0.3rem 0.55rem;border-radius:3px;cursor:pointer;font-size:0.8rem;color:#475569;font-weight:500;transition:all 0.1s;line-height:1}',
  '.toolbar button:hover{background:#e2e8f0;color:#1e293b}',
  '.toolbar .sep{width:1px;background:#e2e8f0;margin:0 0.25rem}',
  '.preview-box{background:white;border:1px solid #d1d5db;border-radius:0 0 5px 5px;padding:1rem;min-height:200px;font-size:0.9rem;line-height:1.7;display:none;overflow-y:auto}',
  '.preview-box h1{font-size:1.4rem;margin-bottom:0.5rem}.preview-box h2{font-size:1.2rem;margin-bottom:0.4rem}.preview-box h3{font-size:1.05rem;margin-bottom:0.3rem}.preview-box p{margin-bottom:0.75rem}.preview-box code{background:#f1f5f9;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.85em}.preview-box img{max-width:100%;border-radius:4px;margin:0.5rem 0}',
  '.page-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem}',
  '.page-head h2{margin-bottom:0}',
  '.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem}',
  '.stat-card{background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;box-shadow:0 1px 2px rgba(0,0,0,0.04)}',
  '.stat-num{font-size:1.8rem;font-weight:700;margin-top:0.2rem;color:#0f172a}',
  '.stat-label{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b}',
  '@media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}.content{padding:1rem}.row{flex-direction:column}.row .form-group{flex:1 1 auto}.stat-grid{grid-template-columns:1fr 1fr}}',
].join(' ');

return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · Admin</title>
<style>${styles}</style>
</head>
<body>
<div class="topbar">
<strong>PHCloud CMS</strong>
<nav>
<a href="/admin">Dashboard</a>
<a href="/admin/posts">Posts</a>
<a href="/admin/pages">Pages</a>
<a href="/admin/new">New Post</a>
<a href="/admin/plugins">Plugins</a>
<a href="/admin/categories">Categories</a>
<a href="/admin/nav">Navigation</a>
<a href="/admin/settings">Settings</a>
<a href="/" style="margin-left:1rem">View Site</a>
<a href="#" onclick="logout(event)" style="margin-left:1rem;color:#f87171">Logout</a>
</nav>
</div>
<div class="layout">
<aside class="sidebar">
<a href="/admin">Dashboard</a>
<a href="/admin/posts">All Posts</a>
<a href="/admin/pages">Pages</a>
<a href="/admin/new">New Post</a>
<a href="/admin/categories">Categories</a>
<a href="/admin/nav">Navigation</a>
<a href="/admin/plugins">Plugins</a>
<a href="/admin/settings">Settings</a>
</aside>
<main class="content">${bodyHtml}</main>
</div>
<script>
async function logout(e){e.preventDefault();await fetch('/api/auth/logout',{method:'POST'});window.location.href='/'}
</script>
</body>
</html>`;
}

// ── Dashboard ──────────────────────────────────────────────────────

export function dashboardBody(): string {
return `<h2>Dashboard</h2>
<div class="stat-grid">
<div class="stat-card">
<div class="stat-label">Total Posts</div>
<div id="total" class="stat-num">—</div>
</div>
<div class="stat-card">
<div class="stat-label">Published</div>
<div id="pub" class="stat-num">—</div>
</div>
<div class="stat-card">
<div class="stat-label">Setup</div>
<div style="font-size:0.85rem;color:#16a34a;margin-top:0.5rem">✓ Configured</div>
</div>
</div>
<div class="page-head">
<h3 style="margin:0">Recent Posts</h3>
<a href="/admin/new" class="btn btn-primary">+ New Post</a>
</div>
<div class="card" style="padding:0;overflow:hidden">
<table><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="posts"><tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:1.5rem">Loading…</td></tr></tbody>
</table></div>
<script>
fetch('/api/admin/posts').then(function(r){return r.json()}).then(function(posts){
function ea(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
document.getElementById('total').textContent=posts.length;
document.getElementById('pub').textContent=posts.filter(function(p){return p.published}).length;
var tbody=document.getElementById('posts');
if(!posts.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#64748b">No posts yet. <a href="/admin/new">Create one</a>.</td></tr>';return}
tbody.innerHTML=posts.map(function(p){
var badge=p.published?'badge-pub':(p.publish_at?'badge-info':'badge-draft');
var label=p.published?'Published':(p.publish_at?'Scheduled':'Draft');
return '<tr>'
+'<td><strong>'+ea(p.title)+'</strong></td>'
+'<td style="color:#64748b">/'+ea(p.slug)+'</td>'
+'<td><span class="badge '+badge+'">'+label+'</span></td>'
+'<td style="color:#64748b;font-size:0.85rem">'+new Date(p.updated_at).toLocaleDateString()+'</td>'
+'<td style="display:flex;gap:0.4rem">'
+'<a class="btn btn-sm" href="/admin/edit/'+p.id+'">Edit</a>'
+'<button class="btn btn-sm btn-danger" onclick="del('+p.id+')">Delete</button>'
+'</td></tr>'}).join('')});
function del(id){if(!confirm('Delete?'))return;fetch('/api/admin/posts/'+id,{method:'DELETE'}).then(function(){location.reload()})}
</script>`;
}

// ── Posts list ─────────────────────────────────────────────────────

export function postsBody(): string {
return `<h2 style="margin-bottom:1rem">All Posts</h2>
<a href="/admin/new" class="btn btn-primary" style="margin-bottom:1rem">+ New Post</a>
<div style="background:white;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
<table><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="posts"><tr><td colspan="5" style="text-align:center;color:#64748b">Loading…</td></tr></tbody>
</table></div>
<script>
fetch('/api/admin/posts').then(function(r){return r.json()}).then(function(posts){
function ea(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var tbody=document.getElementById('posts');
if(!posts.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#64748b">No posts yet.</td></tr>';return}
tbody.innerHTML=posts.map(function(p){
var badge=p.published?'badge-pub':(p.publish_at?'badge-info':'badge-draft');
var label=p.published?'Published':(p.publish_at?'Scheduled':'Draft');
return '<tr>'
+'<td><strong>'+ea(p.title)+'</strong></td>'
+'<td style="color:#64748b">/'+ea(p.slug)+'</td>'
+'<td><span class="badge '+badge+'">'+label+'</span></td>'
+'<td style="color:#64748b;font-size:0.85rem">'+new Date(p.updated_at).toLocaleDateString()+'</td>'
+'<td style="display:flex;gap:0.4rem">'
+'<a class="btn btn-sm" href="/admin/edit/'+p.id+'">Edit</a>'
+'<button class="btn btn-sm btn-danger" onclick="del('+p.id+')">Delete</button>'
+'</td></tr>'}).join('')});
function del(id){if(!confirm('Delete?'))return;fetch('/api/admin/posts/'+id,{method:'DELETE'}).then(function(){location.reload()})}
</script>`;
}

// ── New post form ──────────────────────────────────────────────────

export function newPostBody(): string {
return `<h2>New Post</h2>
<form id="form" style="max-width:800px">
<div class="card">
<div class="row">
<div class="form-group"><label for="title">Title</label><input type="text" id="title" name="title" required /></div>
<div class="form-group"><label for="slug">Slug</label><input type="text" id="slug" name="slug" required /></div>
</div>
<div class="form-group"><label for="excerpt">Excerpt <span style="color:#94a3b8;font-weight:400">(optional)</span></label><input type="text" id="excerpt" name="excerpt" /></div>
<div class="form-group"><label for="content">Content <span style="color:#94a3b8;font-weight:400">(Markdown)</span></label>
<div class="toolbar">
<button onclick="mdWrap(event,'**','bold text')" title="Bold"><strong>B</strong></button>
<button onclick="mdWrap(event,'*','italic text')" title="Italic"><em>I</em></button>
<span class="sep"></span>
<button onclick="mdLine(event,'## ')" title="Heading 2">H2</button>
<button onclick="mdLine(event,'### ')" title="Heading 3">H3</button>
<span class="sep"></span>
<button onclick="mdLink(event)" title="Link">Link</button>
<button onclick="mdImage(event)" title="Image">Img</button>
<span class="sep"></span>
<button onclick="mdLine(event,'> ')" title="Blockquote">"</button>
<button onclick="mdWrap(event,'\`','code')" title="Inline code">&lt;/&gt;</button>
<button onclick="mdLine(event,'- ')" title="List item">&#8226;</button>
<span class="sep"></span>
<button onclick="togglePreview(event)" title="Preview">Preview</button>
</div>
<textarea id="content" name="content" required></textarea>
<div class="preview-box" id="preview"></div>
</div>
<div class="card" style="margin-top:1.25rem">
<div class="form-group">
<label>Categories</label>
<div id="catCheckboxes" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.3rem"></div>
</div>
<div class="form-group"><label><input type="checkbox" id="published" name="published" /> Publish immediately</label></div>
<div class="form-group"><label><input type="checkbox" id="schedule" onchange="scheduleToggle()" /> Schedule for later</label>
<input type="datetime-local" id="publish_at" style="display:none;margin-top:0.4rem" /></div>
<script>
function scheduleToggle(){var s=document.getElementById('schedule'),p=document.getElementById('publish_at'),c=document.getElementById('published');if(s.checked){p.style.display='block';c.checked=false}else{p.style.display='none';p.value=''}}
</script>
<div style="display:flex;gap:0.75rem">
<button type="submit" class="btn btn-primary">Save Post</button>
<a href="/admin/posts" class="btn btn-secondary">Cancel</a>
</div>
<div id="status" style="margin-top:0.75rem;font-size:0.875rem"></div>
</div>
</form>
<script>
function mdWrap(e,c,ph){e.preventDefault();var ta=document.getElementById('content'),s=ta.selectionStart,en=ta.selectionEnd,val=ta.value,sel=val.substring(s,en)||ph||'text';ta.value=val.substring(0,s)+c+sel+c+val.substring(en);ta.selectionStart=s+c.length;ta.selectionEnd=s+c.length+sel.length;ta.focus()}
function mdLine(e,p){e.preventDefault();var ta=document.getElementById('content'),s=ta.selectionStart;var ls=ta.value.lastIndexOf('\n',s-1)+1;ta.value=ta.value.substring(0,ls)+p+ta.value.substring(ls);ta.selectionStart=ta.selectionEnd=s+p.length;ta.focus()}
function mdLink(e){e.preventDefault();var ta=document.getElementById('content'),s=ta.selectionStart,en=ta.selectionEnd,val=ta.value,sel=val.substring(s,en)||'link text';ta.value=val.substring(0,s)+'['+sel+'](url)'+val.substring(en);ta.selectionStart=s+sel.length+2;ta.selectionEnd=s+sel.length+2+3;ta.focus()}
function mdImage(e){e.preventDefault();var ta=document.getElementById('content'),s=ta.selectionStart,en=ta.selectionEnd,val=ta.value,sel=val.substring(s,en)||'alt';ta.value=val.substring(0,s)+'!['+sel+'](url)'+val.substring(en);ta.selectionStart=s+sel.length+3;ta.selectionEnd=s+sel.length+3+3;ta.focus()}
function togglePreview(e){e.preventDefault();var ta=document.getElementById('content'),pre=document.getElementById('preview');if(pre.style.display=='block'){pre.style.display='none';ta.style.display='block';return}ta.style.display='none';pre.style.display='block';pre.innerHTML=renderMd(ta.value)}
function renderMd(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/^#{3}\s+(.+)$/gm,'<h3>$1</h3>').replace(/^#{2}\s+(.+)$/gm,'<h2>$1</h2>').replace(/^#{1}\s+(.+)$/gm,'<h1>$1</h1>').replace(/^>\s+(.+)$/gm,'<blockquote>$1</blockquote>').replace(/^-{3,}$/gm,'<hr>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/\u0060(.+?)\u0060/g,'<code>$1</code>').replace(/!\[(.+?)\]\((.+?)\)/g,'<img src="$2" alt="$1">').replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2">$1</a>').split('\n\n').map(function(b){return b.trim()?'<p>'+b.replace(/\n/g,'<br>')+'</p>':''}).join('')}
var titleEl=document.getElementById('title');
var slugEl=document.getElementById('slug');
titleEl.addEventListener('input',function(){
slugEl.value=titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
});
var catDiv=document.getElementById('catCheckboxes');
fetch('/api/admin/categories').then(function(r){return r.json()}).then(function(cats){
var html='';
for(var i=0;i<cats.length;i++){
html+='<label style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.85rem;cursor:pointer;padding:0.2rem 0"><input type="checkbox" value="'+cats[i].id+'" class="cat-cb" /> '+cats[i].name+'</label>'}
catDiv.innerHTML=html||'<span style="color:#94a3b8;font-size:0.85rem">No categories yet. <a href="/admin/categories">Create one</a>.</span>'});
function getCatIds(){var ids=[];[].forEach.call(document.querySelectorAll('.cat-cb:checked'),function(cb){ids.push(Number(cb.value))});return ids}
document.getElementById('form').addEventListener('submit',function(e){
e.preventDefault();
var status=document.getElementById('status');
status.style.color='#2563eb';
status.textContent='Saving…';
var fd=new FormData(e.target);
fetch('/api/admin/posts',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
title:String(fd.get('title')||''),
slug:String(fd.get('slug')||''),
content:String(fd.get('content')||''),
excerpt:String(fd.get('excerpt')||''),
published:document.getElementById('published').checked,
publish_at:document.getElementById('publish_at').value||null,
category_ids:getCatIds()
})}).then(function(res){
if(res.ok){
res.json().then(function(p){
status.style.color='#16a34a';
status.textContent='Saved! Redirecting…';
setTimeout(function(){location.href='/admin/edit/'+p.id},500)})}
 else{status.style.color='#dc2626';status.textContent='Error saving post'}})});
</script>
<script>


// src/admin/posts.ts — posts admin list page. The new/edit post editor lives
// in src/admin/editor-body.ts (split main/aside layout, preview, versions, SEO,
// autosave); the shared editor widget JS is in src/admin/editor.ts.

export function postsBody(): string {
  return `<div class="page-head">
<div>
<h1>All Posts</h1>
<div class="sub">Drafts, published, and scheduled — 20 per page.</div>
</div>
<a href="/admin/new" class="btn btn-primary">+ New Post</a>
</div>
<div class="card">
<table>
<thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="posts"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody>
</table>
</div>
<div id="pagination" style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;align-items:center"></div>
<script>
function renderAdminPage(page,totalPages){var nav=document.getElementById('pagination');if(totalPages<=1){nav.innerHTML='';return}
var h='';if(page>1)h+='<a href="?page='+(page-1)+'" class="btn btn-sm btn-ghost">← Prev</a>';
for(var i=1;i<=totalPages;i++){if(i===page)h+='<span class="btn btn-sm btn-primary" style="pointer-events:none">'+i+'</span>';else h+='<a href="?page='+i+'" class="btn btn-sm btn-ghost">'+i+'</a>'}
if(page<totalPages)h+='<a href="?page='+(page+1)+'" class="btn btn-sm btn-ghost">Next →</a>';nav.innerHTML=h}
function loadPosts(){var m=location.search.match(/[?&]page=(\d+)/);var page=m?parseInt(m[1],10):1;if(!page||page<1)page=1;
fetch('/api/admin/posts?page='+page).then(function(r){if(r.status===401){window.location.href='/admin/login';return null;}if(!r.ok){document.getElementById('posts').innerHTML='<tr><td colspan="5" class="empty">Failed to load posts. Reload to retry.</td></tr>';return null;}return r.json();}).then(function(data){if(!data)return;
function ea(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var tbody=document.getElementById('posts');
if(!data.results.length){tbody.innerHTML='<tr><td colspan="5" class="empty">No posts yet. <a href="/admin/new" class="btn btn-sm btn-primary mt-1">Create one</a></td></tr>';return}
tbody.innerHTML=data.results.map(function(p){return '<tr>'
+'<td><span class="cell-title">'+ea(p.title)+'</span></td>'
+'<td><span class="cell-muted">/'+ea(p.slug)+'</span></td>'
+'<td><span class="badge '+(p.published?'badge-pub':'badge-draft')+'"><span class="dot"></span>'+(p.published?'Published':'Draft')+'</span></td>'
+'<td class="cell-dim">'+new Date(p.updated_at).toLocaleDateString()+'</td>'
+'<td><div class="row-actions"><a class="btn btn-sm" href="/admin/edit/'+p.id+'">Edit</a><button class="btn btn-sm btn-danger" data-id="'+p.id+'">Delete</button></div></td>'
+'</tr>'}).join('');renderAdminPage(data.page,data.totalPages)}).catch(function(e){console.error('loadPosts failed',e);document.getElementById('posts').innerHTML='<tr><td colspan="5" class="empty">Failed to load posts.</td></tr>';})
function del(id){if(!confirm('Delete this post? This cannot be undone.'))return;fetch('/api/admin/posts/'+id,{method:'DELETE',credentials:'include'}).then(function(r){if(!r.ok)throw new Error('fail');location.reload()}).catch(function(){toast('Delete failed','err')})}
document.getElementById('posts').addEventListener('click',function(e){var b=e.target.closest('.btn-danger');if(!b||!b.dataset.id)return;del(Number(b.dataset.id))});
}
loadPosts();</script>`;
}

// src/admin/dashboard.ts — dashboard page body (stats cards, sparkline, top pages, recent posts).
// Data comes from /api/admin/stats (30-day rollup) + /api/admin/posts (recent list).

export function dashboardBody(): string {
  return `<div class="page-head">
<div>
<h1>Dashboard</h1>
<div class="sub">Site overview — views tracked per post per day.</div>
</div>
<a href="/admin/new" class="btn btn-primary">+ New Post</a>
</div>

<div class="grid stats mb-2">
<div class="stat"><div class="label">Total Posts</div><div class="value" id="total">—</div><div class="delta" id="total-delta">loading…</div></div>
<div class="stat"><div class="label">Published</div><div class="value" id="pub">—</div><div class="delta">live on site</div></div>
<div class="stat"><div class="label">Drafts</div><div class="value" id="drafts">—</div><div class="delta">not yet published</div></div>
<div class="stat"><div class="label">Total Views</div><div class="value" id="views">—</div><div class="delta" id="views-delta">last 30 days</div></div>
</div>

<div class="card mb-2">
<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">
<div>
<div style="font-weight:600;letter-spacing:-0.01em">Traffic</div>
<div style="font-size:0.78rem;color:var(--text-3)">Daily views, last 30 days</div>
</div>
<span class="badge badge-info"><span class="dot"></span>Live</span>
</div>
<div id="spark" style="padding:0.75rem 0.5rem 0.25rem">loading…</div>
</div>

<div class="card mb-2">
<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">
<div style="font-weight:600;letter-spacing:-0.01em">Top Pages</div>
<div style="font-size:0.78rem;color:var(--text-3)">by views, last 30 days</div>
</div>
<table>
<thead><tr><th>Page</th><th>Type</th><th style="text-align:right">Views</th></tr></thead>
<tbody id="top"><tr><td colspan="3" class="empty">Loading…</td></tr></tbody>
</table>
</div>

<div style="display:flex;align-items:center;justify-content:space-between;margin:1.5rem 0 1rem">
<h2 style="font-size:1.05rem;font-weight:600;letter-spacing:-0.02em">Recent Posts</h2>
<a href="/admin/posts" class="btn btn-sm btn-ghost">View all</a>
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
function ea(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function spark(daily){if(!daily.length)return '<div class="empty" style="padding:2rem">No traffic yet — views appear here as visitors hit your posts.</div>';
var w=600,h=140,pad=6,max=1;for(var i=0;i<daily.length;i++){if(daily[i].views>max)max=daily[i].views}
var n=daily.length;var pts=daily.map(function(d,i){return ((i*(w-2*pad)/(n-1))+pad).toFixed(1)+','+(h-pad-((d.views/max)*(h-2*pad))).toFixed(1)}).join(' ');
var area=pts+' '+ (w-pad)+','+(h)+' '+pad+','+(h);
var last=daily[daily.length-1].date;var first=daily[0].date;
return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="width:100%;height:160px;display:block" role="img" aria-label="Traffic sparkline '+first+' to '+last+'">'
+'<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'
+'<polygon points="'+area+'" fill="url(#sg)"/>'
+'<polyline points="'+pts+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
+'</svg>'}
function fmt(n){return n==null?0:n.toLocaleString()}
function loadPosts(){var m=location.search.match(/[?&]page=(\d+)/);var page=m?parseInt(m[1],10):1;if(!page||page<1)page=1;
fetch('/api/admin/posts?page='+page).then(function(r){if(r.status===401){window.location.href='/admin/login';return null;}if(!r.ok)throw new Error('posts');return r.json();}).then(function(data){if(!data)return;
document.getElementById('total').textContent=data.total;
var results=data.results||[];var pub=0,drafts=0;for(var i=0;i<results.length;i++){if(results[i].published)pub++;else drafts++}
document.getElementById('pub').textContent=pub;
document.getElementById('drafts').textContent=drafts;
document.getElementById('total-delta').textContent=data.totalPages>1?('page '+data.page+' of '+data.totalPages):(data.total+' total');
var tbody=document.getElementById('posts');
if(!results.length){tbody.innerHTML='<tr><td colspan="5" class="empty">No posts yet. <a href="/admin/new" class="btn btn-sm btn-primary mt-1">Create one</a></td></tr>';return}
tbody.innerHTML=results.map(function(p){
return '<tr>'
+'<td><span class="cell-title">'+ea(p.title)+'</span></td>'
+'<td><span class="cell-muted">/'+ea(p.slug)+'</span></td>'
+'<td><span class="badge '+(p.published?'badge-pub':'badge-draft')+'"><span class="dot"></span>'+(p.published?'Published':'Draft')+'</span></td>'
+'<td class="cell-dim">'+new Date(p.updated_at).toLocaleDateString()+'</td>'
+'<td><div class="row-actions"><a class="btn btn-sm" href="/admin/edit/'+p.id+'">Edit</a><button class="btn btn-sm btn-danger" onclick="del('+p.id+')">Delete</button></div></td>'
+'</tr>'}).join('');renderAdminPage(data.page,data.totalPages)}).catch(function(e){console.error('loadPosts failed',e);document.getElementById('posts').innerHTML='<tr><td colspan="5" class="empty">Failed to load posts.</td></tr>';})
}
function del(id){if(!confirm('Delete this post? This cannot be undone.'))return;fetch('/api/admin/posts/'+id,{method:'DELETE'}).then(function(r){if(!r.ok)throw new Error('fail');location.reload()}).catch(function(){toast('Delete failed','err')})}
function loadStats(){fetch('/api/admin/stats').then(function(r){if(r.status===401){window.location.href='/admin/login';return null;}if(!r.ok)throw new Error('stats');return r.json();}).then(function(d){if(!d)return;
document.getElementById('views').textContent=fmt(d.totals.views);
document.getElementById('views-delta').textContent=(d.totals.days||0)+' days tracked';
document.getElementById('spark').innerHTML=spark(d.daily||[]);
var top=document.getElementById('top');
if(!(d.top||[]).length){top.innerHTML='<tr><td colspan="3" class="empty">No views recorded yet.</td></tr>';return}
top.innerHTML=d.top.map(function(p,i){return '<tr><td><span class="cell-title">'+ea(p.title||p.slug)+'</span><div class="cell-dim">/'+ea(p.slug)+'</div></td><td><span class="badge badge-info">'+ea(p.type)+'</span></td><td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600">'+fmt(p.views)+'</td></tr>'}).join('')}).catch(function(e){console.error('loadStats failed',e);document.getElementById('spark').innerHTML='<div class="empty" style="padding:2rem">Could not load traffic stats.</div>';})}
loadPosts();loadStats();
</script>`;
}
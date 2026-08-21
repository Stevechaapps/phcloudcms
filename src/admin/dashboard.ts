// src/admin/dashboard.ts — dashboard page body.
// Stats cards, quick actions, an interactive 7/30/90-day traffic chart, top
// pages, and recent posts. Data comes from /api/admin/stats?days=N +
// /api/admin/posts. The range toggle refetches without a page reload.

export function dashboardBody(): string {
  return `<div class="page-head">
<div>
<h1>Dashboard</h1>
<div class="sub">Site overview — views tracked per post per day, stored in D1.</div>
</div>
<a href="/admin/new" class="btn btn-primary">+ New Post</a>
</div>

<div class="grid quick mb-2">
<a class="qa" href="/admin/new"><span class="q-ic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg></span><span><strong>New Post</strong><small>Write something great</small></span></a>
<a class="qa" href="/admin/pages"><span class="q-ic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v5h5"/></svg></span><span><strong>New Page</strong><small>About, contact, landing…</small></span></a>
<a class="qa" href="/admin/images"><span class="q-ic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></span><span><strong>Images</strong><small>Media library</small></span></a>
<a class="qa" href="/" target="_blank" rel="noopener"><span class="q-ic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span><span><strong>View Site</strong><small>Open the public site</small></span></a>
</div>

<div class="grid stats mb-2">
<div class="stat"><div class="label">Total Posts</div><div class="value" id="total"><span class="skel" style="display:inline-block;width:56px;height:26px;vertical-align:middle"></span></div><div class="delta" id="total-delta">loading…</div></div>
<div class="stat"><div class="label">Published</div><div class="value" id="pub"><span class="skel" style="display:inline-block;width:40px;height:26px;vertical-align:middle"></span></div><div class="delta">live on site</div></div>
<div class="stat"><div class="label">Drafts</div><div class="value" id="drafts"><span class="skel" style="display:inline-block;width:40px;height:26px;vertical-align:middle"></span></div><div class="delta">not yet published</div></div>
<div class="stat"><div class="label">Views <span class="seg" id="range" role="group" aria-label="Traffic range" style="margin-left:0.4rem"><button class="seg-btn" data-days="7" aria-pressed="false">7d</button><button class="seg-btn active" data-days="30" aria-pressed="true">30d</button><button class="seg-btn" data-days="90" aria-pressed="false">90d</button></span></div><div class="value" id="views"><span class="skel" style="display:inline-block;width:56px;height:26px;vertical-align:middle"></span></div><div class="delta" id="views-delta">loading…</div></div>
</div>

<div class="card mb-2">
<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">
<div>
<div style="font-weight:600;letter-spacing:-0.01em">Traffic</div>
<div style="font-size:0.78rem;color:var(--text-3)">Daily views — pick a range above</div>
</div>
<span class="badge badge-info"><span class="dot"></span>Live</span>
</div>
<div id="spark" style="padding:0.75rem 0.5rem 0.25rem"><div class="skel" style="height:150px"></div></div>
</div>

<div class="card mb-2">
<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.1rem;border-bottom:1px solid var(--border)">
<div style="font-weight:600;letter-spacing:-0.01em">Top Pages</div>
<div style="font-size:0.78rem;color:var(--text-3)">by views, current range</div>
</div>
<table>
<thead><tr><th>Page</th><th>Type</th><th style="text-align:right">Views</th></tr></thead>
<tbody id="top"><tr><td colspan="3"><div class="skel" style="height:14px;margin:0.4rem 0"></div><div class="skel" style="height:14px;margin:0.4rem 0;width:70%"></div><div class="skel" style="height:14px;margin:0.4rem 0;width:40%"></div></td></tr></tbody>
</table>
</div>

<div style="display:flex;align-items:center;justify-content:space-between;margin:1.5rem 0 1rem">
<h2 style="font-size:1.05rem;font-weight:600;letter-spacing:-0.02em">Recent Posts</h2>
<a href="/admin/posts" class="btn btn-sm btn-ghost">View all</a>
</div>
<div class="card">
<table>
<thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="posts"><tr><td colspan="5"><div class="skel" style="height:14px;margin:0.4rem 0"></div><div class="skel" style="height:14px;margin:0.4rem 0;width:60%"></div><div class="skel" style="height:14px;margin:0.4rem 0;width:80%"></div></td></tr></tbody>
</table>
</div>
<div id="pagination" style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;align-items:center"></div>
<script>
function renderAdminPage(page,totalPages){var nav=document.getElementById('pagination');if(totalPages<=1){nav.innerHTML='';return}
var h='';if(page>1)h+='<a href="?page='+(page-1)+'" class="btn btn-sm btn-ghost">← Prev</a>';
for(var i=1;i<=totalPages;i++){if(i===page)h+='<span class="btn btn-sm btn-primary" style="pointer-events:none" aria-current="page">'+i+'</span>';else h+='<a href="?page='+i+'" class="btn btn-sm btn-ghost">'+i+'</a>'}
if(page<totalPages)h+='<a href="?page='+(page+1)+'" class="btn btn-sm btn-ghost">Next →</a>';nav.innerHTML=h}
function ea(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function fmt(n){return n==null?0:Number(n).toLocaleString()}
function fmtK(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n)}
// ── smooth curve through the midpoints, ending on the last data point ──
function smoothPath(pts){if(pts.length===1)return'M'+pts[0][0]+','+pts[0][1];var d='M'+pts[0][0]+','+pts[0][1];for(var i=0;i<pts.length-1;i++){var mx=(pts[i][0]+pts[i+1][0])/2;var my=(pts[i][1]+pts[i+1][1])/2;d+=' Q'+pts[i][0]+','+pts[i][1]+' '+mx+','+my}d+=' L'+pts[pts.length-1][0]+','+pts[pts.length-1][1];return d}
function spark(daily){if(!daily.length)return '<div class="empty" style="padding:2rem">No traffic yet — views appear here as visitors hit your posts.</div>';
var w=640,h=170,padR=34,padL=4,padT=10,padB=22;var max=1;for(var i=0;i<daily.length;i++){if(daily[i].views>max)max=daily[i].views}
var iw=w-padL-padR,ih=h-padT-padB;var n=daily.length;
var pts=daily.map(function(d,i){var x=padL+(n===1?0:(i*iw/(n-1)));var y=padT+ih-(d.views/max)*ih;return [x.toFixed(1),y.toFixed(1)]});
var grid='';for(var g=1;g<=3;g++){var gy=(padT+ih*(g/4)).toFixed(1);var gv=Math.round(max*(1-g/4));grid+='<line x1="'+padL+'" y1="'+gy+'" x2="'+(w-padR)+'" y2="'+gy+'" stroke="var(--border)" stroke-dasharray="3 4"/><text x="'+(w-padR+6)+'" y="'+(+gy+3)+'" fill="var(--text-3)" font-size="9">'+fmtK(gv)+'</text>'}
var line=smoothPath(pts.map(function(p){return [Number(p[0]),Number(p[1])]}));
var area=line+' L'+(w-padR)+','+h+' L'+padL+','+h+' Z';
var last=daily[daily.length-1];var mid=daily[Math.floor(n/2)];var first=daily[0];
var lp=pts[pts.length-1];var lastDot=((lp[1]-12)>padT)?(lp[1]-12):(lp[1]+16);
var labels='<text x="'+padL+'" y="'+(h-6)+'" fill="var(--text-3)" font-size="9">'+ea(first.date)+'</text><text x="'+(w-padR)/2+'" y="'+(h-6)+'" fill="var(--text-3)" font-size="9" text-anchor="middle">'+ea(mid.date)+'</text><text x="'+(w-padR)+'" y="'+(h-6)+'" fill="var(--text-3)" font-size="9" text-anchor="end">'+ea(last.date)+'</text>';
return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto;display:block" role="img" aria-label="Traffic sparkline '+first.date+' to '+last.date+'">'
+'<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.32"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'
+grid+'<path d="'+area+'" fill="url(#sg)" opacity="0" class="spark-fill"/><path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" class="spark-line" pathLength="1"/><circle cx="'+lp[0]+'" cy="'+lp[1]+'" r="3.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><text x="'+lp[0]+'" y="'+lastDot+'" text-anchor="middle" fill="var(--accent)" font-size="10" font-weight="700" font-variant-numeric="tabular-nums">'+fmt(last.views)+'</text>'+labels+'</svg>'}
function deltaPct(cur,prev){if(!prev||prev<=0)return {txt:'no prior data',cls:''};var p=((cur-prev)/prev)*100;var up=p>=0;return {txt:(up?'▲ +':'▼ ')+Math.abs(p).toFixed(1)+'% vs prev',cls:up?'var(--ok)':'var(--danger)'}}
// ── range toggle (7/30/90) — refetch without reloading the page ──
function loadStats(days){days=days||30;
var sEl=document.getElementById('spark');sEl.innerHTML='<div class="skel" style="height:150px"></div>';
var tEl=document.getElementById('top');tEl.innerHTML='<tr><td colspan="3"><div class="skel" style="height:14px;margin:0.4rem 0"></div></td></tr>';
Promise.all([fetch('/api/admin/stats?days='+days),fetch('/api/admin/stats?days='+(days*2))]).then(function(rs){return Promise.all(rs.map(function(r){if(r.status===401){window.location.href='/admin/login';return null}return r.ok?r.json():null}))}).then(function(res){if(!res[0]||!res[1])return;var d=res[0],prev=res[1];
document.getElementById('views').textContent=fmt(d.totals.views);
document.getElementById('views-delta').textContent=(d.totals.days||0)+' days tracked';
var cur=0,pv=0;var dl=d.daily||[];var pl=prev.daily||[];for(var i=0;i<dl.length;i++)cur+=dl[i].views;
var prevW=pl.length>days?pl.slice(0,pl.length-days):[];for(var i=0;i<prevW.length;i++)pv+=prevW[i].views;
var dta=deltaPct(cur,pv);document.getElementById('views-delta').innerHTML='<span style="color:'+dta.cls+'">'+dta.txt+'</span> · <span style="color:var(--text-3)">'+fmt(cur)+' views</span>';
document.getElementById('spark').innerHTML=spark(dl);
var svgEl=document.getElementById('spark').querySelector('svg');if(svgEl){requestAnimationFrame(function(){requestAnimationFrame(function(){svgEl.classList.add('loaded')})})}
var top=document.getElementById('top');
if(!(d.top||[]).length){top.innerHTML='<tr><td colspan="3" class="empty">No views recorded yet.</td></tr>';return}
top.innerHTML=d.top.map(function(p){return '<tr><td><span class="cell-title">'+ea(p.title||p.slug)+'</span><div class="cell-dim">/'+ea(p.slug)+'</div></td><td><span class="badge badge-info">'+ea(p.type)+'</span></td><td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600">'+fmt(p.views)+'</td></tr>'}).join('')}).catch(function(e){console.error('loadStats failed',e);document.getElementById('spark').innerHTML='<div class="empty" style="padding:2rem">Could not load traffic stats.</div>';})}
document.getElementById('range').addEventListener('click',function(e){var b=e.target.closest?e.target.closest('.seg-btn'):null;if(!b)return;var btns=this.querySelectorAll('.seg-btn');for(var i=0;i<btns.length;i++){btns[i].classList.remove('active');btns[i].setAttribute('aria-pressed','false')}b.classList.add('active');b.setAttribute('aria-pressed','true');loadStats(Number(b.getAttribute('data-days')))});
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
+'<td><div class="row-actions"><a class="btn btn-sm" href="/admin/edit/'+p.id+'">Edit</a><button class="btn btn-sm btn-danger" data-id="'+p.id+'">Delete</button></div></td>'
+'</tr>'}).join('');renderAdminPage(data.page,data.totalPages)}).catch(function(e){console.error('loadPosts failed',e);document.getElementById('posts').innerHTML='<tr><td colspan="5" class="empty">Failed to load posts.</td></tr>';})
}
function del(id){if(!confirm('Delete this post? This cannot be undone.'))return;fetch('/api/admin/posts/'+id,{method:'DELETE',credentials:'include'}).then(function(r){if(!r.ok)throw new Error('fail');location.reload()}).catch(function(){toast('Delete failed','err')})}
document.getElementById('posts').addEventListener('click',function(e){var b=e.target.closest('.btn-danger');if(!b||!b.dataset.id)return;del(Number(b.dataset.id))});
loadPosts();loadStats(30);
</script>
<style>
.spark-line{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)}
.spark-fill{transition:opacity .6s ease .3s}
#spark svg.loaded .spark-line{stroke-dashoffset:0}
#spark svg.loaded .spark-fill{opacity:1}
@media(prefers-reduced-motion:reduce){.spark-line{transition:none;stroke-dashoffset:0}.spark-fill{transition:none;opacity:1}}
</style>`;
}
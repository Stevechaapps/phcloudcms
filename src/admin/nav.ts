// src/admin/nav.ts — navigation editor admin page body.

export function navBody(): string {
  return `<div class="page-head">
<div>
<h1>Navigation</h1>
<div class="sub">Links appear in the header of your public site. To reach this admin, use the small Manage link in your site footer.</div>
</div>
</div>
<div id="items"></div>
<div class="mt-2 mb-2"><button class="btn btn-sm" onclick="addItem()">+ Add Link</button></div>
<div class="flex between">
<button class="btn btn-primary" onclick="save()">Save Navigation</button>
<div id="status" class="muted" aria-live="polite" role="status"></div>
</div>
<script>
var items=[];
function render(){
var html='<div class="card">';
for(var i=0;i<items.length;i++){
html+='<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border-bottom:1px solid var(--border)">';
html+='<input type="text" placeholder="Label" aria-label="Link label" value="'+ea(items[i].label)+'" onchange="items['+i+'].label=this.value" style="flex:1" />';
html+='<input type="text" placeholder="URL" aria-label="Link URL" value="'+ea(items[i].url)+'" onchange="items['+i+'].url=this.value" style="flex:1" />';
html+='<button class="btn btn-sm btn-danger" onclick="removeItem('+i+')" aria-label="Remove link">✕</button></div>'}
html+='</div>';
document.getElementById('items').innerHTML=html||'<div class="empty card">No navigation links yet.<p>Add one above.</p></div>'}
function ea(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function addItem(){items.push({label:'',url:''});render()}
function removeItem(i){items.splice(i,1);render()}
function save(){
var status=document.getElementById('status');
[].forEach.call(document.querySelectorAll('#items input'),function(el,i){if(i%2===0)items[i/2].label=el.value;else items[(i-1)/2].url=el.value});
status.style.color='var(--accent)';status.textContent='Saving…';
fetch('/api/admin/nav',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items})}).then(function(res){
if(res.ok){status.style.color='var(--ok)';status.textContent='Saved!';setTimeout(function(){status.textContent=''},2500)}else{status.style.color='var(--danger)';status.textContent='Error saving'}})}
fetch('/api/admin/nav').then(function(r){return r.json()}).then(function(data){items=data;render()});
</script>`;
}
// src/admin/shell.ts — admin layout shell (topbar + sidebar + content slot).
// Dark-first design system: tokens, components, command palette, toasts.
// The admin follows a manual light/dark toggle (localStorage 'phcloud-admin-theme',
// applied pre-paint like the public site) and defaults to dark.

import { esc } from "../cms/escape.js";

// ── Pre-paint theme bootstrap ──────────────────────────────────────
const THEME_INIT = `<script>(function(){try{var t=localStorage.getItem('phcloud-admin-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})();</script>`;

// ── Shared admin JS: toasts, theme toggle, command palette, shortcuts ──
const ADMIN_JS = `function toast(msg,kind){kind=kind||'info';var wrap=document.getElementById('toasts');if(!wrap){wrap=document.createElement('div');wrap.id='toasts';wrap.setAttribute('role','status');wrap.setAttribute('aria-live','polite');document.body.appendChild(wrap)}var t=document.createElement('div');t.className='toast toast-'+kind;t.textContent=msg;wrap.appendChild(t);requestAnimationFrame(function(){t.classList.add('show')});setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove()},200)},2600)}
function setAdminTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('phcloud-admin-theme',t)}catch(e){}var b=document.getElementById('theme-toggle');if(b){b.setAttribute('aria-label',t==='dark'?'Switch to light mode':'Switch to dark mode');b.setAttribute('aria-pressed',t==='dark'?'true':'false')}}
function adminTheme(){var t=document.documentElement.getAttribute('data-theme');if(t==='dark'||t==='light')return t;return (window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches)?'light':'dark'}
function toggleAdminTheme(){setAdminTheme(adminTheme()==='dark'?'light':'dark')}
// ── command palette: links + actions, subsequence fuzzy search, keyboard nav ──
function fuzzy(q,s){s=s.toLowerCase();var i=0;for(var j=0;j<s.length&&i<q.length;j++){if(q[i]===s[j])i++}return i===q.length}
function paletteOpen(){var p=document.getElementById('palette');if(p.classList.contains('open'))return;p.classList.add('open');window.__paletteAnchor=document.activeElement;var b=document.getElementById('palette-btn');if(b)b.setAttribute('aria-expanded','true');var i=document.getElementById('palette-input');i.value='';renderPalette('');i.focus()}
function paletteClose(){var p=document.getElementById('palette');if(!p.classList.contains('open'))return;p.classList.remove('open');var b=document.getElementById('palette-btn');if(b)b.setAttribute('aria-expanded','false');var a=window.__paletteAnchor;if(a&&a.focus)a.focus();window.__paletteAnchor=null}
function renderPalette(q){q=(q||'').toLowerCase();var list=document.getElementById('palette-list');var items=window.__palette||[];var h='';for(var i=0;i<items.length;i++){var it=items[i];var hay=(it.label+' '+(it.hint||'')+' '+(it.kbd||'')).toLowerCase();if(q&&hay.indexOf(q)<0&&!fuzzy(q,it.label))continue;if(it.action){h+='<button type="button" class="palette-item" data-action="'+it.action+'" tabindex="-1"><span>'+it.icon+'</span><span class="pi-label">'+it.label+'</span>'+(it.hint?'<span class="pi-hint">'+it.hint+'</span>':'')+(it.kbd?'<kbd>'+it.kbd+'</kbd>':'')+'</button>'}else{h+='<a href="'+it.href+'" class="palette-item" tabindex="-1"><span>'+it.icon+'</span><span class="pi-label">'+it.label+'</span>'+(it.hint?'<span class="pi-hint">'+it.hint+'</span>':'')+(it.kbd?'<kbd>'+it.kbd+'</kbd>':'')+'</a>'}}list.innerHTML=h||'<div class="palette-empty">No matches</div>'}
function paletteAction(a){if(a==='theme'){paletteClose();toggleAdminTheme()}else if(a==='logout'){logout()}else if(a==='help'){paletteClose();toast('Shortcuts: Ctrl+K palette · g then d/p/n/t/i/s navigate · n new post · t theme · Ctrl+S save','info')}}
document.addEventListener('keydown',function(e){var pal=document.getElementById('palette');var isOpen=pal.classList.contains('open');
var scs=(function(){try{return localStorage.getItem('phcloud-shortcuts')!=='off'}catch(e){return true}})();
// ── palette is open: own every key (filter via input event) ──
if(isOpen){if(e.key==='Escape'){e.preventDefault();paletteClose();return}
var items=document.querySelectorAll('#palette-list .palette-item');
if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Tab'){e.preventDefault();if(!items.length){var pin=document.getElementById('palette-input');if(pin)pin.focus();return}var idx=0;for(var j=0;j<items.length;j++){if(items[j].classList.contains('focused')){items[j].classList.remove('focused');idx=j;break}}idx+=e.key==='ArrowUp'?(-1):(e.key==='Tab'?(e.shiftKey?-1:1):1);if(idx<0)idx=items.length-1;if(idx>=items.length)idx=0;items[idx].classList.add('focused');items[idx].focus();return}
if(e.key==='Enter'){var foc=document.activeElement;if(foc&&foc.classList&&foc.classList.contains('palette-item')){if(foc.getAttribute('data-action')){paletteAction(foc.getAttribute('data-action'))}else{window.location.href=foc.getAttribute('href')}}return}
return}
var k=(e.key||'').toLowerCase();var tag=(e.target.tagName||'').toLowerCase();var typing=(tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable);
if((e.ctrlKey||e.metaKey)&&k==='k'){e.preventDefault();paletteOpen();return}
if((e.ctrlKey||e.metaKey)&&k==='s'&&(tag==='body'||e.target.isContentEditable)){e.preventDefault();var f=document.getElementById('form');if(f)f.requestSubmit?f.requestSubmit():f.submit();return}
if(typing)return;
if(!scs)return;
var prevG=window.__gk||false;window.__gk=false;
if(k==='g'){window.__gk=true;e.preventDefault();return}
if(prevG){var map={d:'/admin',p:'/admin/posts',n:'/admin/new',t:'/admin/tags',i:'/admin/images',s:'/admin/settings'};if(map[k]){window.location.href=map[k];e.preventDefault()}return}
if(k==='?'){e.preventDefault();paletteOpen();return}
if(k==='n'){window.location.href='/admin/new';e.preventDefault();return}
if(k==='t'){toggleAdminTheme();e.preventDefault();return}});
document.getElementById('palette-list').addEventListener('click',function(e){var b=e.target.closest?e.target.closest('.palette-item'):null;if(b&&b.getAttribute('data-action')){paletteAction(b.getAttribute('data-action'))}});`;

// ── Nav ─────────────────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: keyof typeof I; kbd?: string };

const I = {
  dash: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  posts: '<path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h6"/>',
  pages: '<path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v5h5"/>',
  new: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  tag: '<path d="M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1"/>',
  nav: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
};

function icon(name: keyof typeof I, cls = ""): string {
  return '<svg class="ic ' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] ?? "") + "</svg>";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dash", kbd: "g d" },
  { href: "/admin/posts", label: "All Posts", icon: "posts" },
  { href: "/admin/pages", label: "Pages", icon: "pages" },
  { href: "/admin/new", label: "New Post", icon: "new" },
  { href: "/admin/images", label: "Images", icon: "img" },
  { href: "/admin/tags", label: "Tags", icon: "tag" },
  { href: "/admin/nav", label: "Navigation", icon: "nav" },
  { href: "/admin/plugins", label: "Plugins", icon: "bolt" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function paletteItems(): string {
  const items: { href?: string; action?: string; label: string; icon: string; kbd: string }[] = NAV.map((n) => ({
    href: n.href,
    label: n.label,
    icon: icon(n.icon, "ic-sm"),
    kbd: n.kbd ?? "",
  }));
  items.push(
    { href: "/", label: "View Site", icon: icon("ext", "ic-sm"), kbd: "g g" },
    { action: "theme", label: "Toggle color theme", icon: icon("sun", "ic-sm"), kbd: "t" },
    { action: "help", label: "Keyboard shortcuts", icon: icon("bolt", "ic-sm"), kbd: "?" },
    { action: "logout", label: "Log out", icon: icon("out", "ic-sm"), kbd: "" },
  );
  return JSON.stringify(items);
}

// ── CSS ──────────────────────────────────────────────────────────────
const STYLES = [
  "*{margin:0;padding:0;box-sizing:border-box}",
  // Tokens — dark first. Light mode overrides via [data-theme="light"].
  ":root{color-scheme:dark;--bg:#0b0d12;--bg-soft:#0f1117;--surface:#141720;--surface-2:#1a1e29;--surface-3:#212636;--border:rgba(255,255,255,.08);--border-2:rgba(255,255,255,.14);--text:#e8eaee;--text-2:#a6adba;--text-3:#7c8494;--accent:#5f66e8;--accent-2:#8a97f7;--accent-ink:#fff;--accent-soft:rgba(95,102,232,.14);--ok:#34d399;--ok-soft:rgba(52,211,153,.14);--warn:#fbbf24;--warn-soft:rgba(251,191,36,.14);--danger:#f87171;--danger-soft:rgba(248,113,113,.14);--radius:10px;--radius-sm:7px;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px -8px rgba(0,0,0,.5);--ring:0 0 0 2px #8a97f7;--input-border:#5f667c;--font:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--dur:150ms;--ease:cubic-bezier(.4,0,.2,1)}",
  ':root[data-theme="light"]{color-scheme:light;--bg:#f6f7f9;--bg-soft:#eef0f4;--surface:#ffffff;--surface-2:#f3f4f7;--surface-3:#e7e9ef;--border:rgba(15,17,23,.1);--border-2:rgba(15,17,23,.18);--text:#17191f;--text-2:#4b5563;--text-3:#5f6572;--accent:#5b66f0;--accent-2:#4c56d4;--accent-ink:#fff;--accent-soft:rgba(91,102,240,.1);--ok:#0b7a55;--ok-soft:rgba(13,159,110,.1);--warn:#9a3c06;--warn-soft:rgba(180,83,9,.1);--danger:#b91c1c;--danger-soft:rgba(220,38,38,.08);--shadow:0 1px 2px rgba(15,17,23,.05),0 8px 24px -8px rgba(15,17,23,.12);--ring:0 0 0 2px #4c56d4;--input-border:#8b93a5}',
  "body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;font-feature-settings:'ss03','tnum' 0}",
  "::selection{background:var(--accent-soft)}",
  "a{color:var(--accent);text-decoration:none}a:hover{color:var(--accent-2)}",
  "button{font-family:inherit}",
  ":focus-visible{outline:none;box-shadow:var(--ring);border-radius:var(--radius-sm)}",
  // Scrollbars
  "*::-webkit-scrollbar{width:10px;height:10px}*::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:8px;border:2px solid transparent;background-clip:padding-box}*::-webkit-scrollbar-track{background:transparent}",
  // Layout
  ".layout{display:grid;grid-template-columns:236px 1fr;min-height:100vh}",
  ".topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:1rem;height:56px;padding:0 1.25rem;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}",
  ".brand{display:flex;align-items:center;gap:0.6rem;font-weight:700;letter-spacing:-0.01em;font-size:0.95rem;color:var(--text)}.brand .mark{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#7c8cff,#5b66f0);display:grid;place-items:center;color:#fff;box-shadow:0 2px 8px rgba(91,102,240,.4)}",
  ".page-title{font-size:0.8rem;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".topbar .spacer{flex:1}",
  ".topbar .actions{display:flex;align-items:center;gap:0.35rem}",
  ".topbar .actions .ic{width:16px;height:16px}",
  ".icon-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;background:transparent;color:var(--text-2);border-radius:var(--radius-sm);cursor:pointer;transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}.icon-btn:hover{background:var(--surface-2);color:var(--text)}",
  // Theme icon swap: light mode shows the sun, dark shows the moon
  "#theme-toggle{position:relative}#theme-toggle svg{position:absolute;inset:0;margin:auto;width:16px;height:16px;opacity:0;transition:opacity var(--dur) var(--ease)}html[data-theme='dark'] #theme-toggle .i-moon{opacity:1}html[data-theme='light'] #theme-toggle .i-sun{opacity:1}",
  // Sidebar
  ".sidebar{display:flex;flex-direction:column;gap:2px;padding:0.75rem 0.75rem 1rem;border-right:1px solid var(--border);background:var(--bg-soft);position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto}",
  ".side-label{font-size:0.65rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3);padding:0.75rem 0.65rem 0.35rem}",
  ".side-link{display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.65rem;border-radius:var(--radius-sm);color:var(--text-2);font-size:0.85rem;font-weight:500;transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}.side-link .ic{width:16px;height:16px;flex-shrink:0}.side-link:hover{background:var(--surface-2);color:var(--text)}.side-link.active{background:var(--accent-soft);color:var(--accent)}.side-link .hint{margin-left:auto;font-size:0.7rem;color:var(--text-3);font-family:var(--mono)}",
  ".side-foot{margin-top:auto;padding:0.75rem 0.65rem 0;border-top:1px solid var(--border)}",
  // Content
  ".content{padding:2rem 2.25rem;max-width:1080px;width:100%}",
  ".page-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.page-head h1{font-size:1.35rem;font-weight:600;letter-spacing:-0.03em}.page-head .sub{color:var(--text-2);font-size:0.85rem;margin-top:0.2rem}",
  // Buttons
  ".btn{display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.95rem;border-radius:var(--radius-sm);font-size:0.85rem;font-weight:500;letter-spacing:-0.01em;cursor:pointer;border:1px solid transparent;text-decoration:none;color:var(--text);background:var(--surface-2);transition:background var(--dur) var(--ease),border-color var(--dur) var(--ease),transform var(--dur) var(--ease)}.btn:hover{background:var(--surface-3);color:var(--text)}.btn:active{transform:translateY(1px)}",
  ".btn-primary{background:var(--accent);color:var(--accent-ink)}.btn-primary:hover{background:var(--accent-2);color:var(--accent-ink)}",
  ".btn-ghost{background:transparent;color:var(--text-2)}.btn-ghost:hover{background:var(--surface-2);color:var(--text)}",
  ".btn-danger{color:var(--danger)}.btn-danger:hover{background:var(--danger-soft);color:var(--danger)}",
  ".btn-sm{padding:0.3rem 0.6rem;font-size:0.78rem}",
  ".btn[disabled]{opacity:.5;pointer-events:none}",
  // Badges
  ".badge{display:inline-flex;align-items:center;gap:0.3rem;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.72rem;font-weight:600;line-height:1.5}.badge .dot{width:5px;height:5px;border-radius:50%;background:currentColor}",
  ".badge-pub{background:var(--ok-soft);color:var(--ok)}.badge-draft{background:var(--warn-soft);color:var(--warn)}.badge-info{background:var(--accent-soft);color:var(--accent)}.badge-sched{background:var(--accent-soft);color:var(--accent)}",
  // Tables
  ".card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}",
  ".card + .card{margin-top:1rem}",
  "table{width:100%;border-collapse:collapse}",
  "th,td{text-align:left;padding:0.7rem 1rem;border-bottom:1px solid var(--border);font-size:0.85rem;vertical-align:middle}",
  "tr:last-child td{border-bottom:none}",
  "tbody tr{transition:background var(--dur) var(--ease)}tbody tr:hover{background:var(--surface-2)}",
  "th{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);font-weight:600;background:var(--bg-soft)}",
  ".cell-title{font-weight:600;color:var(--text)}.cell-muted{color:var(--text-2)}.cell-dim{color:var(--text-3);font-size:0.8rem;font-variant-numeric:tabular-nums}",
  ".row-actions{display:flex;gap:0.4rem;justify-content:flex-end}",
  // Forms
  ".form-group{margin-bottom:1.25rem}.form-group > label{display:block;font-weight:600;margin-bottom:0.4rem;font-size:0.82rem;color:var(--text-2)}.form-group .hint{color:var(--text-3);font-weight:400}",
  "input[type='text'],input[type='password'],input[type='search'],input[type='email'],input[type='number'],input[type='url'],input[type='date'],input[type='datetime-local'],select,textarea{width:100%;padding:0.55rem 0.7rem;background:var(--surface);border:1px solid var(--input-border);border-radius:var(--radius-sm);color:var(--text);font-size:0.9rem;font-family:inherit;transition:border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}",
  "input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:var(--ring)}",
  "select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--text-2) 50%),linear-gradient(135deg,var(--text-2) 50%,transparent 50%);background-position:calc(100% - 16px) 55%,calc(100% - 11px) 55%;background-size:5px 5px;background-repeat:no-repeat;padding-right:2rem}",
  "textarea{min-height:120px;resize:vertical;line-height:1.6}",
  "input[type='checkbox']{accent-color:var(--accent);width:15px;height:15px;cursor:pointer}",
  "label.check{display:flex;align-items:center;gap:0.5rem;font-weight:500;font-size:0.85rem;color:var(--text);cursor:pointer}",
  ".row{display:flex;gap:1rem}.row .form-group{flex:1}",
  // Editor
  ".toolbar{display:flex;gap:2px;padding:0.4rem;background:var(--surface);border:1px solid var(--input-border);border-bottom:none;border-radius:var(--radius) var(--radius) 0 0;flex-wrap:wrap;align-items:center}",
  ".toolbar button{background:none;border:none;padding:0.32rem 0.6rem;border-radius:var(--radius-sm);cursor:pointer;font-size:0.8rem;color:var(--text-2);font-weight:600;transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}",
  ".toolbar button:hover{background:var(--surface-2);color:var(--text)}",
  '.toolbar button[aria-pressed="true"]{background:var(--accent);color:#fff}',
  ".toolbar .sep{width:1px;height:18px;background:var(--border-2);margin:0 0.35rem;align-self:center}",
  ".toolbar .ai-btn{color:var(--accent)}",
  ".rte{min-height:320px;padding:0.85rem 1rem;background:var(--surface);border:1px solid var(--input-border);border-radius:0 0 var(--radius) var(--radius);font-size:0.95rem;line-height:1.7;overflow-y:auto;outline:none;color:var(--text)}",
  ".rte:focus{border-color:var(--accent);box-shadow:var(--ring)}",
  ".rte:empty:before{content:attr(data-ph);color:var(--text-3)}",
  ".rte h1{font-size:1.6rem;margin:0.6rem 0}.rte h2{font-size:1.35rem;margin:0.5rem 0}.rte h3{font-size:1.15rem;margin:0.4rem 0}.rte p{margin:0.6rem 0}.rte ul,.rte ol{margin:0.6rem 1.6rem}.rte blockquote{border-left:3px solid var(--accent);padding-left:0.9rem;color:var(--text-2);margin:0.6rem 0}.rte code{background:var(--surface-3);padding:0.1rem 0.35rem;border-radius:4px;font-size:0.85em;font-family:var(--mono)}.rte pre{background:var(--bg-soft);border:1px solid var(--border);color:var(--text);padding:0.85rem;border-radius:var(--radius-sm);overflow-x:auto}.rte pre code{background:none;padding:0}.rte img{max-width:100%;border-radius:var(--radius-sm);margin:0.6rem 0}.rte a{color:var(--accent)}",
  // Kbd / misc
  "kbd{display:inline-block;padding:0.15rem 0.4rem;background:var(--surface-2);border:1px solid var(--border-2);border-bottom-width:2px;border-radius:5px;font-family:var(--mono);font-size:0.7rem;color:var(--text-2);line-height:1.2}",
  ".hint-inline{color:var(--text-3);font-size:0.8rem}",
  ".grid{display:grid;gap:1rem}",
  ".grid.stats{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}",
  ".stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.1rem;transition:border-color var(--dur) var(--ease),transform var(--dur) var(--ease)}.stat:hover{border-color:var(--border-2);transform:translateY(-1px)}",
  ".stat .label{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);font-weight:600}.stat .value{font-size:1.8rem;font-weight:700;letter-spacing:-0.02em;margin-top:0.3rem;font-variant-numeric:tabular-nums}.stat .delta{font-size:0.78rem;color:var(--text-2);margin-top:0.15rem}",
  ".empty{text-align:center;padding:3rem 1.5rem;color:var(--text-3)}.empty .e-icon{opacity:.6;margin-bottom:0.75rem}.empty h3{color:var(--text-2);font-size:1rem;margin-bottom:0.25rem}.empty p{font-size:0.85rem;margin-bottom:1rem}",
  ".muted{color:var(--text-2)}.dim{color:var(--text-3)}",
  ".flex{display:flex;align-items:center;gap:0.5rem}.between{justify-content:space-between}.wrap{flex-wrap:wrap}",
  ".mt-1{margin-top:0.5rem}.mt-2{margin-top:1rem}.mt-3{margin-top:1.5rem}.mb-1{margin-bottom:0.5rem}.mb-2{margin-bottom:1rem}",
  ".max-w{max-width:820px}",
  // Toasts
  "#toasts{position:fixed;bottom:1.25rem;right:1.25rem;z-index:90;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none}",
  ".toast{background:var(--surface-3);color:var(--text);border:1px solid var(--border-2);border-radius:var(--radius-sm);padding:0.6rem 0.9rem;font-size:0.85rem;font-weight:500;box-shadow:var(--shadow);opacity:0;transform:translateY(6px);transition:opacity 180ms var(--ease),transform 180ms var(--ease);max-width:320px}",
  ".toast.show{opacity:1;transform:translateY(0)}.toast-ok{border-color:var(--ok);color:var(--ok)}.toast-err{border-color:var(--danger);color:var(--danger)}",
  ".sr-only{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  ".sr-only:focus{position:fixed;left:0.75rem;top:0.75rem;width:auto;height:auto;clip:auto;z-index:100;background:var(--surface-3);color:var(--text);border:1px solid var(--input-border);border-radius:var(--radius-sm);padding:0.55rem 0.95rem;font-size:0.85rem;font-weight:600;box-shadow:var(--shadow)}",
  ".content:focus{outline:none}",
  // Command palette
  ".overlay{position:fixed;inset:0;background:rgba(5,6,10,.55);backdrop-filter:blur(4px);z-index:70;display:none;align-items:flex-start;justify-content:center;padding-top:12vh}",
  ".overlay.open{display:flex}",
  ".palette{width:100%;max-width:560px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--radius);box-shadow:0 24px 80px rgba(0,0,0,.5);overflow:hidden}",
  ".palette-search{display:flex;align-items:center;gap:0.6rem;padding:0.85rem 1rem;border-bottom:1px solid var(--border)}.palette-search .ic{width:18px;height:18px;color:var(--text-3)}.palette-search input{border:none;background:none;box-shadow:none;font-size:1rem;padding:0}.palette-search input:focus{box-shadow:none}",
  ".palette-list{max-height:320px;overflow-y:auto;padding:0.35rem}",
  ".palette-item{display:flex;align-items:center;gap:0.7rem;padding:0.55rem 0.7rem;border-radius:var(--radius-sm);color:var(--text-2);font-size:0.9rem}.palette-item .ic{width:17px;height:17px;color:var(--text-3)}.palette-item .pi-label{flex:1;font-weight:500}.palette-item .pi-hint{font-size:0.78rem;color:var(--text-3)}.palette-item:hover,.palette-item.focused{background:var(--surface-2);color:var(--text)}.palette-item.focused{outline:none;box-shadow:inset 0 0 0 1px var(--accent)}",
  ".palette-empty{padding:1.5rem;text-align:center;color:var(--text-3);font-size:0.9rem}",
  ".palette-foot{padding:0.6rem 1rem;border-top:1px solid var(--border);display:flex;gap:1rem;font-size:0.72rem;color:var(--text-3)}",
  "button.palette-item{font-family:inherit;font-size:0.9rem;width:100%;cursor:pointer}",
  // Segmented control (dashboard ranges)
  ".seg{display:inline-flex;background:var(--surface);border:1px solid var(--input-border);border-radius:var(--radius-sm);padding:2px;gap:2px}.seg-btn{border:none;background:none;color:var(--text-2);font-size:0.78rem;font-weight:600;padding:0.25rem 0.7rem;border-radius:5px;cursor:pointer;transition:background var(--dur) var(--ease),color var(--dur) var(--ease)}.seg-btn:hover{color:var(--text)}.seg-btn.active{background:var(--accent-soft);color:var(--accent)}",
  // Skeleton shimmer
  ".skel{background:linear-gradient(90deg,var(--surface) 25%,var(--surface-3) 37%,var(--surface) 63%);background-size:400% 100%;border-radius:var(--radius-sm);animation:skel 1.4s ease infinite}",
  "@keyframes skel{0%{background-position:100% 0}100%{background-position:0 0}}",
  // Quick-action cards (dashboard)
  ".quick{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.qa{display:flex;align-items:center;gap:0.75rem;padding:0.9rem 1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);transition:border-color var(--dur) var(--ease),transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}.qa:hover{border-color:var(--accent);transform:translateY(-1px);box-shadow:var(--shadow);color:var(--text)}.qa .q-ic{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0}.qa .q-ic .ic{width:17px;height:17px}.qa strong{display:block;font-size:0.88rem;font-weight:600;letter-spacing:-0.01em}.qa small{color:var(--text-3);font-size:0.75rem}",
  // Cross-document View Transitions (Chrome 126+, Safari 18.2+; self-gates elsewhere)
  "@view-transition{navigation:auto}",
  "::view-transition-old(root){animation:vt-old .18s var(--ease) both}::view-transition-new(root){animation:vt-new .24s var(--ease) both}",
  "@keyframes vt-old{to{opacity:0}}@keyframes vt-new{from{opacity:0;transform:translateY(3px)}}",
  // Gentle theme-switch cross-fade on chrome surfaces
  ".topbar,.sidebar{transition:background-color var(--dur) var(--ease),border-color var(--dur) var(--ease)}",
  // Animations
  "@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}::view-transition-old(root),::view-transition-new(root){animation:none!important}}",
  // Mobile
  "@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}.topbar{flex-wrap:wrap;height:auto;padding:0.5rem 0.75rem}.toplinks{display:flex!important;flex-wrap:nowrap;gap:0.25rem;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;font-size:0.75rem;white-space:nowrap;padding:0.25rem 0}.toplinks a{display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.55rem;border-radius:var(--radius-sm);color:var(--text-2);font-size:0.78rem}.toplinks a.active{background:var(--accent-soft);color:var(--accent)}.content{padding:1.25rem 1rem}.page-head{flex-direction:column;align-items:flex-start}.page-title{display:none}th:nth-child(2),td:nth-child(2),th:nth-child(4),td:nth-child(4){display:none}}",
  ".toplinks{display:none}",
  "@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}",
  ".content > *{animation:fadeIn 200ms var(--ease)}",
].join(" ");

// ── Shell ────────────────────────────────────────────────────────────
export function adminShell(
  title: string,
  bodyHtml: string,
  active?: string,
): string {
  const sideLinks = NAV.map(
    (n) =>
      '<a href="' +
      n.href +
      '" class="side-link' +
      (active === n.href ? " active" : "") +
      '">' +
      icon(n.icon) +
      "<span>" +
      n.label +
      "</span>" +
      (n.kbd ? '<span class="hint">' + n.kbd + "</span>" : "") +
      "</a>",
  ).join("");
  const topLinks = NAV.map(
    (n) =>
      '<a href="' +
      n.href +
      '"' +
      (active === n.href ? ' class="active"' : "") +
      ">" +
      n.label +
      "</a>",
  ).join("");

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · PHCloud</title>
<style>${STYLES}</style>
${THEME_INIT}
</head>
<body>
<a class="sr-only" href="#admin-main">Skip to content</a>
<div class="layout">
<aside class="sidebar" aria-label="Admin sidebar">
<div class="side-label">Workspace</div>
${sideLinks}
<div class="side-foot"><a href="/" target="_blank" rel="noopener" class="side-link">${icon("ext")}<span>View Site</span><span class="hint">↗</span></a></div>
</aside>
<div style="min-width:0">
<header class="topbar">
<a href="/admin" class="brand" aria-label="PHCloud CMS"><span class="mark">${icon("bolt", "ic-sm")}</span><span>PHCloud</span></a>
<span class="page-title">${esc(title)}</span>
<div class="spacer"></div>
<div class="actions">
<button type="button" class="icon-btn" id="palette-btn" onclick="paletteOpen()" aria-label="Command palette (Ctrl+K)" aria-haspopup="dialog" aria-expanded="false" title="Command palette"><span style="display:inline-flex">${icon("search")}</span></button>
<button type="button" class="icon-btn theme-toggle" id="theme-toggle" onclick="toggleAdminTheme()" aria-label="Toggle color theme" aria-pressed="true">${icon("sun")}${icon("moon")}</button>
<a href="/" target="_blank" rel="noopener" class="icon-btn" aria-label="View site" title="View site">${icon("ext")}</a>
<button type="button" class="icon-btn" onclick="logout()" aria-label="Logout" title="Logout" style="color:var(--danger)">${icon("out")}</button>
</div>
<nav class="toplinks" aria-label="Admin navigation">${topLinks}</nav>
</header>
<main class="content" id="admin-main" tabindex="-1">${bodyHtml}</main>
</div>
</div>
<div class="overlay" id="palette" role="dialog" aria-modal="true" aria-label="Command palette">
<div class="palette">
<div class="palette-search">${icon("search")}<input id="palette-input" type="text" placeholder="Jump to a page or action…" oninput="renderPalette(this.value)" aria-label="Search" /></div>
<div class="palette-list" id="palette-list"></div>
<div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
</div>
</div>
<script>
window.__palette=${paletteItems()};
document.getElementById('palette').addEventListener('click',function(e){if(e.target.id==='palette')paletteClose()});
async function logout(){await fetch('/api/auth/logout',{method:'POST'});window.location.href='/'}
${ADMIN_JS}
setAdminTheme(document.documentElement.getAttribute('data-theme')==='light'?'light':'dark');
</script>
</body>
</html>`;
}
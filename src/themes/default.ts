export const css = `@font-face{font-family:'Fraunces Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('/fonts/fraunces.woff2') format('woff2-variations')}
@font-face{font-family:'Geist Mono Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('/fonts/geist-mono.woff2') format('woff2-variations')}
:root{--bg:#f6f4ef;--surface:#fdfcf9;--surface-2:#efede6;--ink:#1c1a17;--ink-2:#55504a;--ink-3:#8a847a;--accent:#a13d24;--accent-2:#c65a35;--border:rgba(28,26,23,.12);--border-strong:rgba(28,26,23,.24);--radius:10px;--font-display:'Fraunces Variable',Georgia,'Times New Roman',serif;--font-mono:'Geist Mono Variable',ui-monospace,'SF Mono',Menlo,monospace;color-scheme:light}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--font-display);background:var(--bg);color:var(--ink);line-height:1.7;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:'liga' 1,'kern' 1}
::selection{background:color-mix(in srgb,var(--accent) 22%,transparent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
a{color:inherit;text-decoration:none;transition:color .15s ease}
header{background:color-mix(in srgb,var(--bg) 82%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
header .inner{max-width:1120px;margin:0 auto;padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;gap:1.25rem}
.brand{display:flex;align-items:center;gap:.6rem;font-size:1.2rem;font-weight:560;letter-spacing:-0.02em;color:var(--ink)}
.brand::before{content:'';width:9px;height:9px;background:var(--accent);border-radius:2px;flex:none}
header nav{display:flex;gap:1.5rem;align-items:center}
header nav a{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);padding:.35rem 0;border-bottom:1px solid transparent;background-image:linear-gradient(var(--accent),var(--accent));background-size:0 1px;background-position:0 100%;background-repeat:no-repeat;transition:background-size .25s ease,color .15s ease}
header nav a:hover{color:var(--ink);background-size:100% 1px}
.search-wrap{position:relative;display:flex;align-items:center}
.search-wrap svg{position:absolute;left:.65rem;color:var(--ink-3);pointer-events:none}
.search-wrap input{padding:.45rem .75rem .45rem 2rem;border:1px solid var(--border);border-radius:99px;font-family:var(--font-mono);font-size:.78rem;background:var(--surface-2);color:var(--ink);width:150px;transition:width .25s ease,border-color .15s ease,box-shadow .15s ease}
.search-wrap input::placeholder{color:var(--ink-3)}
.search-wrap input:focus{outline:none;width:210px;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
main{max-width:1120px;margin:0 auto;padding:0 1.5rem;min-height:72vh}
footer{border-top:1px solid var(--border);margin-top:6rem;padding:3.5rem 1.5rem 2.5rem}
footer .inner{max-width:1120px;margin:0 auto;text-align:center}
.wordmark{font-size:clamp(2.5rem,9vw,5.5rem);font-weight:480;letter-spacing:-0.03em;line-height:1;color:transparent;-webkit-text-stroke:1px var(--border-strong);margin-bottom:1.75rem}
.colophon{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em;color:var(--ink-3)}
.colophon a{color:var(--ink-3);border-bottom:1px solid var(--border-strong);transition:color .15s ease}
.colophon a:hover{color:var(--accent)}
.hero{position:relative;padding:7rem 0 4rem;text-align:center;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(58% 70% at 50% -10%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 72%);pointer-events:none}
.hero>*{position:relative}
.kicker{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-bottom:1.75rem}
.kicker::before{content:'● ';color:var(--accent)}
.hero h1{font-size:clamp(2.9rem,8.5vw,6.2rem);font-weight:460;letter-spacing:-0.025em;line-height:1.02;color:var(--ink);text-wrap:balance;margin-bottom:1.5rem}
.lede{font-size:clamp(1.05rem,2vw,1.3rem);color:var(--ink-2);max-width:52ch;margin:0 auto 2rem;text-wrap:balance}
.meta-row{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;align-items:center}
.meta-row a{color:var(--ink-3);border-bottom:1px solid var(--border-strong);transition:color .15s ease}
.meta-row a:hover{color:var(--accent)}
.meta-row .dot{color:var(--border-strong)}
.list-head{display:flex;align-items:baseline;justify-content:space-between;border-top:1px solid var(--border-strong);padding-top:1.5rem;margin-bottom:1.25rem}
.list-head h2{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);font-weight:500}
.list-head span{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.1em;color:var(--ink-3)}
.post-featured{padding:2.25rem 0;border-bottom:1px solid var(--border);display:block}
.f-meta{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:.75rem;align-items:center;margin-bottom:1rem}
.f-title{font-size:clamp(1.9rem,4.5vw,3rem);font-weight:440;letter-spacing:-0.02em;line-height:1.06;color:var(--ink);text-wrap:balance;margin-bottom:1rem;transition:color .15s ease}
.post-featured:hover .f-title{color:var(--accent)}
.f-excerpt{font-size:1.15rem;font-style:italic;color:var(--ink-2);max-width:62ch;margin-bottom:1.25rem;text-wrap:balance}
.f-link{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:.4rem}
.f-link::after{content:'→';transition:transform .2s ease}
.post-featured:hover .f-link::after{transform:translateX(4px)}
.post-list{padding-bottom:1rem}
.post-row{display:block}
.post-row a{display:grid;grid-template-columns:4.5rem 1fr auto;gap:1.25rem;align-items:baseline;padding:1.35rem 0;border-bottom:1px solid var(--border)}
.idx{font-family:var(--font-display);font-style:italic;font-weight:420;font-size:1.15rem;color:var(--accent);transition:color .15s ease}
.row-title{font-size:1.3rem;font-weight:520;letter-spacing:-0.015em;color:var(--ink);line-height:1.25;transition:color .15s ease}
.row-excerpt{display:block;font-size:.95rem;font-style:italic;color:var(--ink-3);margin-top:.35rem;max-width:60ch;text-wrap:balance}
.row-date{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);white-space:nowrap}
.post-row a:hover .row-title{color:var(--accent)}
.post-row a:hover .idx{color:var(--ink)}
.post{max-width:760px;margin:0 auto}
.back-link{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:2.5rem 0 2.5rem;transition:color .15s ease}
.back-link a{display:inline-flex;align-items:center;gap:.4rem}
.back-link a::before{content:'←'}
.back-link a:hover{color:var(--accent)}
.post-title{font-size:clamp(2rem,6vw,3.4rem);font-weight:460;letter-spacing:-0.02em;line-height:1.05;color:var(--ink);text-wrap:balance;margin-bottom:1.25rem}
.post-meta{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:1rem;flex-wrap:wrap;align-items:center;margin-bottom:3rem;font-variant-numeric:tabular-nums}
.tags{display:inline-flex;gap:.4rem;flex-wrap:wrap}
.tag-pill{display:inline-block;padding:.25rem .6rem;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--border);border-radius:99px;color:var(--ink-2);transition:border-color .15s ease,color .15s ease}
.tag-pill:hover{border-color:var(--accent);color:var(--accent)}
.post-content{font-size:1.125rem;line-height:1.8;color:var(--ink);max-width:680px}
.post-content p{margin:1.6rem 0}
.post-content>p:first-of-type::first-letter{font-size:3.6em;float:left;line-height:.78;padding-right:.14em;padding-top:.06em;font-weight:460;color:var(--accent)}
.post-content h2,.post-content h3,.post-content h4{color:var(--ink);scroll-margin-top:5rem;letter-spacing:-0.015em;text-wrap:balance}
.post-content h2{font-size:1.65rem;font-weight:520;margin:2.75rem 0 1rem;line-height:1.2}
.post-content h3{font-size:1.3rem;font-weight:520;margin:2.25rem 0 .75rem;line-height:1.25}
.post-content a{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 55%,transparent);text-underline-offset:3px;text-decoration-thickness:1px;transition:text-decoration-color .15s ease}
.post-content a:hover{text-decoration-color:var(--accent)}
.post-content img{max-width:100%;height:auto;border-radius:var(--radius);margin:2.25rem 0;border:1px solid var(--border)}
.post-content code{font-family:var(--font-mono);font-size:.85em;background:var(--surface-2);border:1px solid var(--border);padding:.15rem .4rem;border-radius:5px;color:var(--ink)}
.post-content pre{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;overflow-x:auto;margin:2rem 0;font-size:.85rem;line-height:1.7}
.post-content pre code{background:none;border:none;padding:0;color:inherit;font-size:inherit}
.post-content blockquote{border-left:3px solid var(--accent);padding:.4rem 0 .4rem 1.5rem;margin:2rem 0;color:var(--ink-2);font-style:italic;font-size:1.2rem;line-height:1.6}
.post-content blockquote p{margin:.6rem 0}
.post-content blockquote p:last-child{margin-bottom:0}
.post-content ul,.post-content ol{padding-left:1.6rem;margin:1.6rem 0;color:var(--ink)}
.post-content li{margin-bottom:.5rem}
.post-content li::marker{color:var(--accent)}
.post-content hr{border:none;height:1px;background:linear-gradient(90deg,transparent,var(--border-strong),transparent);margin:3rem 0}
.post-content table{width:100%;border-collapse:collapse;margin:2rem 0;font-size:.95rem}
.post-content th,.post-content td{border:1px solid var(--border);padding:.6rem .9rem;text-align:left}
.post-content th{background:var(--surface-2);color:var(--ink);font-weight:560;font-size:.8rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em}
.post-content tr:nth-child(even) td{background:color-mix(in srgb,var(--border) 30%,transparent)}
.post-content details{border:1px solid var(--border);border-radius:var(--radius);padding:.9rem 1.1rem;margin:1.5rem 0;background:var(--surface)}
.post-content summary{cursor:pointer;font-weight:520;color:var(--ink);font-family:var(--font-mono);font-size:.82rem;text-transform:uppercase;letter-spacing:.08em}
.post-content mark{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--ink);border-radius:3px;padding:0 .15em}
.empty{padding:3rem 0;border-top:1px solid var(--border);font-style:italic;color:var(--ink-3);font-size:1.1rem}
.search-form{margin-bottom:3rem;display:flex;gap:.75rem;flex-wrap:wrap}
.search-form label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.search-form input{flex:1;min-width:220px;padding:.85rem 1.1rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-display);font-size:1.05rem;background:var(--surface);color:var(--ink);transition:border-color .15s ease,box-shadow .15s ease}
.search-form input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.search-form button{padding:.85rem 1.6rem;border:none;border-radius:var(--radius);background:var(--accent);color:#fdfcf9;font-family:var(--font-mono);font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:background .15s ease}
.search-form button:hover{background:var(--accent-2)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.theme-toggle{background:none;border:1px solid var(--border);border-radius:8px;color:var(--ink-2);font-size:.85rem;padding:.3rem .55rem;cursor:pointer;line-height:1;transition:all .15s ease;flex:none}
.theme-toggle:hover{color:var(--ink);border-color:var(--border-strong);background:var(--surface-2)}
#read-progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--accent),var(--accent-2));z-index:200;pointer-events:none}
@view-transition{navigation:auto}
::view-transition-old(root){animation:vt-out .18s ease both}
::view-transition-new(root){animation:vt-in .26s ease both}
@keyframes vt-out{to{opacity:0}}
@keyframes vt-in{from{opacity:0}}
@media(max-width:768px){header .inner{padding:0 1rem}header nav{display:none}main{padding:0 1rem}.hero{padding:4.5rem 0 3rem}.post-row a{grid-template-columns:2.75rem 1fr;gap:.75rem}.row-date{display:none}.post{max-width:100%}.post-meta{gap:.75rem}}
@media(prefers-color-scheme:dark){:root:not([data-theme='light']){--bg:#121110;--surface:#1a1816;--surface-2:#221f1c;--ink:#ece8e0;--ink-2:#a8a29a;--ink-3:#78726a;--accent:#e0784f;--accent-2:#f09268;--border:rgba(236,232,224,.12);--border-strong:rgba(236,232,224,.24);color-scheme:dark}.search-form button{color:#121110}}
:root[data-theme='dark']{--bg:#121110;--surface:#1a1816;--surface-2:#221f1c;--ink:#ece8e0;--ink-2:#a8a29a;--ink-3:#78726a;--accent:#e0784f;--accent-2:#f09268;--border:rgba(236,232,224,.12);--border-strong:rgba(236,232,224,.24);color-scheme:dark}
:root[data-theme='dark'] .search-form button{color:#121110}
@media print{header,footer,nav,.theme-toggle,#read-progress,.back-link{display:none!important}main{max-width:100%;margin:0;padding:0}.hero{padding:0;text-align:left}.post-content>p:first-of-type::first-letter{float:none;font-size:inherit;line-height:inherit;padding:0}a{color:var(--ink);text-decoration:underline}.post-content a::after{content:' (' attr(href) ')';font-size:.8em;color:var(--ink-3)}.post-content pre{background:#f4f2ec;border:1px solid #ccc}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}html{scroll-behavior:auto}::view-transition-old(root),::view-transition-new(root){animation:none!important}}`;
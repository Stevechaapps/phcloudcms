// src/admin/login.ts — admin login form (standalone page, matches the admin design system).

export function loginForm(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Login · PHCloud CMS</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#0b0d12;color:#e8eaee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
.card{background:#141720;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:2.25rem;width:100%;max-width:380px;box-shadow:0 8px 30px rgba(0,0,0,.5)}
.mark{width:38px;height:38px;border-radius:9px;background:linear-gradient(135deg,#7c8cff,#5b66f0);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1rem;font-weight:700;margin-bottom:1.25rem;box-shadow:0 4px 14px rgba(91,102,240,.4)}
h1{font-size:1.25rem;font-weight:600;letter-spacing:-0.03em;margin-bottom:0.25rem}
p{color:#a6adba;font-size:0.85rem;margin-bottom:1.5rem}
label{display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.4rem;color:#a6adba}
input[type="text"],input[type="password"]{width:100%;padding:0.65rem 0.75rem;border:1px solid #5f667c;border-radius:7px;font-size:0.95rem;background:#141720;color:#e8eaee;margin-bottom:1rem;outline:none;transition:border-color .15s cubic-bezier(.4,0,.2,1),box-shadow .15s cubic-bezier(.4,0,.2,1)}
input:focus{border-color:#5f66e8;box-shadow:0 0 0 2px #8a97f7}
button{width:100%;padding:0.7rem;background:#5f66e8;color:#fff;border:none;border-radius:7px;font-size:0.95rem;font-weight:600;cursor:pointer;transition:background .15s}
button:hover{background:#8a97f7}
button:disabled{opacity:0.5;cursor:not-allowed}
.err{color:#f87171;font-size:0.85rem;margin-bottom:1rem;display:none}
</style>
<script>(function(){try{var t=localStorage.getItem('phcloud-admin-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.head.insertAdjacentHTML('beforeend','<style>body{background:#f6f7f9;color:#17191f}.card{background:#ffffff;border-color:rgba(15,17,23,.1)}.mark{background:linear-gradient(135deg,#7c8cff,#4c56d4)}label{color:#4b5563}input{background:#ffffff;border-color:#8b93a5;color:#17191f}p{color:#4b5563}</style>')}}catch(e){}})();</script>
</head>
<body>
<div class="card">
<div class="mark">PH</div>
<h1>Admin Login</h1>
<p>Sign in to manage PHCloud</p>
<form id="loginForm">
<div class="err" id="err" role="alert" aria-live="assertive"></div>
<label for="username">Username</label>
<input type="text" id="username" name="username" autofocus autocomplete="username" />
<label for="password">Password</label>
<input type="password" id="password" name="password" autocomplete="current-password" />
<button type="submit" id="btn">Sign in</button>
</form>
</div>
<script>
var form=document.getElementById('loginForm');
var errEl=document.getElementById('err');
var btn=document.getElementById('btn');
form.addEventListener('submit',function(e){
e.preventDefault();
errEl.style.display='none';
btn.disabled=true;
btn.textContent='Signing in…';
var u=document.getElementById('username').value;
var p=document.getElementById('password').value;
fetch('/api/auth/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({username:u,password:p})}).then(function(r){return r.json()}).then(function(data){
if(!data.ok){errEl.textContent=data.error||'Login failed';errEl.style.display='block';btn.disabled=false;btn.textContent='Sign in'}
else{window.location.href='/admin'}})});
</script>
</body>
</html>`;
}
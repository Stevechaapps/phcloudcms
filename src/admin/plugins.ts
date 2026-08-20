// src/admin/plugins.ts — plugin manager admin page body.

import { esc } from "../cms/escape.js";

var PLUGIN_CATEGORIES = [
  { key: "seo", label: "SEO" },
  { key: "security", label: "Security" },
  { key: "forms", label: "Forms" },
  { key: "analytics", label: "Analytics" },
  { key: "backup", label: "Backup & Export" },
  { key: "ecommerce", label: "E-Commerce" },
  { key: "social", label: "Social" },
  { key: "media", label: "Media" },
  { key: "custom", label: "Custom" },
];

export function pluginsBody(
  availablePlugins: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    author: string;
    hooks: string[];
  }>,
  activePluginIds: Set<string>,
): string {
  var byCategory: Record<string, typeof availablePlugins> = {};
  for (var i = 0; i < availablePlugins.length; i++) {
    var p = availablePlugins[i];
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  var html = '<div class="page-head"><div><h1>Plugins</h1><div class="sub">Toggle plugins on or off — changes take effect immediately.</div></div></div>';

  for (var c = 0; c < PLUGIN_CATEGORIES.length; c++) {
    var cat = PLUGIN_CATEGORIES[c];
    var plugins = byCategory[cat.key];
    if (!plugins || !plugins.length) continue;

    html +=
      '<h3 class="side-label" style="padding-left:0;padding-top:1rem">';
    html += esc(cat.label) + "</h3>";
    html += '<div class="card mb-2">';

    for (var j = 0; j < plugins.length; j++) {
      var pl = plugins[j];
      var isActive = activePluginIds.has(pl.id);
      html +=
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;';
      html += 'border-bottom:1px solid var(--border)">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-weight:600;font-size:0.95rem;letter-spacing:-0.01em">' + esc(pl.name);
      html +=
        ' <span class="badge badge-info" style="margin-left:0.4rem;vertical-align:2px">v' +
        esc(pl.version) +
        "</span></div>";
      html +=
        '<div class="muted" style="font-size:0.85rem;margin-top:0.2rem">' +
        esc(pl.description) +
        "</div>";
      html +=
        '<div class="dim" style="font-size:0.75rem;margin-top:0.3rem">by ' +
        esc(pl.author);
      html += " · hooks: " + esc(pl.hooks.join(", ")) + "</div>";
      html += "</div>";
      html += '<div style="margin-left:1.5rem;flex-shrink:0">';
      html += '<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">';
      html +=
        '<input type="checkbox" class="plugin-toggle" data-plugin="' +
        esc(pl.id) +
        '" aria-label="Toggle ' +
        esc(pl.name) +
        ' plugin"';
      html += isActive ? " checked" : "";
      html += " />";
      html +=
        '<span style="font-size:0.85rem" class="' +
        (isActive ? "muted" : "dim") +
        '">' +
        (isActive ? "Active" : "Inactive") +
        "</span>";
      html += "</label></div></div>";
    }

    html += "</div>";
  }

  if (!availablePlugins.length) {
    html +=
      '<div class="empty card"><h3>No plugins available</h3><p>Add files to <code>src/plugins/</code> and list them in <code>src/plugins/index.ts</code>.</p></div>';
  }

  html += "<script>";
  html +=
    'document.querySelectorAll(".plugin-toggle").forEach(function(cb){cb.addEventListener("change",function(){';
  html += "var id=cb.dataset.plugin;cb.disabled=true;";
  html +=
    'fetch("/api/admin/plugins/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},';
  html +=
    "body:JSON.stringify({active:cb.checked})}).then(function(res){cb.disabled=false;";
  html += 'if(!res.ok){cb.checked=!cb.checked;toast("Failed to save","err")}';
  html += 'var span=cb.closest("label").querySelector("span");';
  html += 'if(span){span.className=cb.checked?"muted":"dim";span.textContent=cb.checked?"Active":"Inactive"}})})});';
  html += "</script>";

  return html;
}
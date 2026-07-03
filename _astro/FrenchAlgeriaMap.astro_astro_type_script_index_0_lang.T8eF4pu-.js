import{L as a}from"./leaflet.1gjqEWEI.js";/* empty css                   */(()=>{const i=document.getElementById("french-algeria-map");if(!i)return;const n=a.map(i,{center:[32.5,3.5],zoom:6,minZoom:5,maxZoom:10,zoomControl:!0,attributionControl:!0,maxBounds:[[18,-10],[40,15]],maxBoundsViscosity:1});a.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(n);const l=[{id:"alger",nom:"Alger",prefecture:"Alger",pop:28e5,color:"#2563eb",coords:[[36.5,1.5],[36.5,3.2],[37,4],[36.2,5.5],[34.5,5],[34,3.5],[34.5,2],[35.5,1.5]]},{id:"oran",nom:"Oran",prefecture:"Oran",pop:19e5,color:"#dc2626",coords:[[35.5,1.5],[34.5,2],[34,3.5],[32,2],[32,-1],[33.5,-1],[35,-.5],[35.5,0]]},{id:"constantine",nom:"Constantine",prefecture:"Constantine",pop:32e5,color:"#16a34a",coords:[[36.2,5.5],[37,4],[36.5,3.2],[35.5,4.5],[34.5,5],[32,5],[31,9],[35,8.5],[36.5,7],[36.5,5.5]]}];l.forEach(e=>{const t=a.polygon(e.coords,{color:e.color,weight:2,fillColor:e.color,fillOpacity:.25}).addTo(n);t.bindTooltip(`
        <div class="algeria-tooltip">
          <strong>Département de ${e.nom}</strong><br>
          <span style="font-size:0.85em;opacity:0.8">Préfecture&nbsp;: ${e.prefecture}</span><br>
          <span style="font-size:0.85em;opacity:0.8">Population~${(e.pop/1e6).toFixed(1)}&nbsp;M</span>
        </div>
      `,{sticky:!0,direction:"top",className:"algeria-tooltip-leaflet"}),t.on("mouseover",()=>{t.setStyle({fillOpacity:.45,weight:3})}),t.on("mouseout",()=>{t.setStyle({fillOpacity:.25,weight:2})})});const o=a.polygon([[34,3.5],[34.5,5],[32,5],[31,9],[26,11],[22,9],[20.5,5],[22,2],[26,-1],[32,-1],[32,2]],{color:"#b7950b",weight:1.5,fillColor:"#b7950b",fillOpacity:.12,dashArray:"6, 4"}).addTo(n);o.bindTooltip(`
      <div class="algeria-tooltip">
        <strong>Territoires du Sud</strong><br>
        <span style="font-size:0.85em;opacity:0.8">Départements sahariens (Aïn Séfra, Ghardaïa, Touggourt, El Oued)</span><br>
        <span style="font-size:0.85em;opacity:0.8">Créés en 1902, administrés directement par l'armée</span>
      </div>
    `,{sticky:!0,direction:"top",className:"algeria-tooltip-leaflet"}),o.on("mouseover",()=>{o.setStyle({fillOpacity:.25,dashArray:"4, 3"})}),o.on("mouseout",()=>{o.setStyle({fillOpacity:.12,dashArray:"6, 4"})}),[{name:"Alger",lat:36.7538,lng:3.0588,desc:"Capitale de l'Algérie française — Préfecture d'Alger",dept:"alger"},{name:"Oran",lat:35.6971,lng:-.6308,desc:"Préfecture d'Oran — deuxième ville d'Algérie",dept:"oran"},{name:"Constantine",lat:36.365,lng:6.6147,desc:"Préfecture de Constantine — troisième ville",dept:"constantine"},{name:"Bône (Annaba)",lat:36.9,lng:7.7667,desc:"Port et centre industriel du département de Constantine",dept:"constantine"},{name:"Tizi Ouzou",lat:36.7117,lng:4.0456,desc:"Centre de la Kabylie, département d'Alger",dept:"alger"},{name:"Sétif",lat:36.1917,lng:5.4136,desc:"Haut-plateaux, département de Constantine",dept:"constantine"},{name:"Tlemcen",lat:34.8867,lng:-1.3167,desc:"Ouest algérien, département d'Oran",dept:"oran"},{name:"Béchar",lat:31.6167,lng:-2.2167,desc:"Territoires du Sud — oasis saharien",dept:"sud"},{name:"Ghardaïa",lat:32.4833,lng:3.6667,desc:"Territoires du Sud — vallée du M'zab",dept:"sud"}].forEach(e=>{const t=l.find(d=>d.id===e.dept),p=t?t.color:"#b7950b",r=a.circleMarker([e.lat,e.lng],{radius:8,fillColor:p,color:"#111827",weight:2,fillOpacity:.8}).addTo(n);r.bindTooltip(`
        <div class="algeria-tooltip">
          <strong>${e.name}</strong><br>
          <span style="font-size:0.85em;opacity:0.8">${e.desc}</span>
        </div>
      `,{sticky:!0,direction:"top",className:"algeria-tooltip-leaflet"}),r.on("mouseover",()=>{r.setRadius(11)}),r.on("mouseout",()=>{r.setRadius(8)})});const s=a.control({position:"bottomleft"});s.onAdd=()=>{const e=a.DomUtil.create("div","algeria-legend");return e.innerHTML=`
        <p style="font-weight:700;margin:0 0 6px;font-size:13px">Algérie française — Départements (1954)</p>
        <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
          <span><span style="display:inline-block;width:12px;height:12px;background:#2563eb;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Département d'Alger</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#dc2626;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Département d'Oran</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#16a34a;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Département de Constantine</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#b7950b;border-radius:2px;margin-right:4px;vertical-align:middle;opacity:0.5"></span>Territoires du Sud</span>
        </div>
        <p style="margin:6px 0 0;font-size:10px;opacity:0.6">Survolez les zones pour plus d'informations</p>
      `,e},s.addTo(n)})();

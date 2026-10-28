const { leafletJs, leafletCss } = require('../vendor/leafletBundle');
const { STORE_LOCATION } = require('../config/deliveryArea');
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');

function createMapDocument(initial = {}) {
  const fallback = { latitude: Number(STORE_LOCATION.lat), longitude: Number(STORE_LOCATION.lng) };
  const rawCenter = initial.center || initial.selected || fallback;
  const centerLat = Number(rawCenter?.latitude ?? rawCenter?.lat);
  const centerLng = Number(rawCenter?.longitude ?? rawCenter?.lng);
  const center = (Number.isFinite(centerLat) && Number.isFinite(centerLng) && centerLat !== 0 && centerLng !== 0)
    ? { latitude: centerLat, longitude: centerLng }
    : fallback;
  const state = { mode: 'tracking', zoom: 14, ...initial, center };

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${leafletCss}
html,body,#map{height:100%;width:100%;padding:0;margin:0;background:#e8eee4;overflow:hidden} .leaflet-tile-pane{filter:saturate(.42) brightness(1.05)} .leaflet-control-attribution{font:9px/1.4 system-ui!important;background:rgba(255,255,255,.88)!important}.leaflet-container{font-family:system-ui;background:#e8eee4}.leaflet-div-icon{border:0;background:none}.store-tooltip{border:0;box-shadow:none;color:#087e49;font-weight:800;background:rgba(255,255,255,.92);padding:2px 5px}.delivery-tooltip{background:#101c14;color:white;border:0;border-radius:12px;font-size:11px;font-weight:700;padding:10px;box-shadow:0 4px 12px #0002;white-space:nowrap;text-align:center;min-width:155px}.delivery-tooltip:before{border-top-color:#101c14!important}.leaflet-control-zoom{display:none}
</style></head><body><div id="map" role="application" aria-label="Interactive delivery location map"></div><script>${leafletJs.replace(/<\/script/gi, '<\\/script')}</script><script>
(function(){
const initial=${safeJson(state)};
const send=(type,data={})=>{const message=JSON.stringify({channel:'ms-traders-map',type,...data});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else if(window.parent!==window)window.parent.postMessage(message,'*');};
const num=n=>typeof n==='number'?n:Number(n);
const valid=p=>{
  if(!p)return false;
  const lat=num(p.latitude!==undefined?p.latitude:p.lat);
  const lng=num(p.longitude!==undefined?p.longitude:p.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0);
};
const ll=p=>[num(p.latitude!==undefined?p.latitude:p.lat),num(p.longitude!==undefined?p.longitude:p.lng)];
const map=L.map('map',{zoomControl:false,attributionControl:true,minZoom:8,maxZoom:19,worldCopyJump:false}).setView(ll(initial.center),initial.zoom);
window.__mapInstance=map;
const tileUrl=typeof initial.tileUrl==='string'&&initial.tileUrl.startsWith('https://')?initial.tileUrl:${safeJson(TILE_URL)};
const tiles=L.tileLayer(tileUrl,{subdomains:['a','b','c'],maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',keepBuffer:3,updateWhenIdle:false}).addTo(map);
window.__tileLayer=tiles;
let loaded=0;tiles.on('loading',()=>{loaded=0;});tiles.on('tileload',()=>{loaded++;if(loaded===1)send('tilesReady');});tiles.on('load',()=>{if(!loaded)send('tileError');});
const pinIcon=L.divIcon({className:'delivery-pin',iconSize:[38,50],iconAnchor:[19,48],html:'<svg width="38" height="50" viewBox="0 0 38 50"><ellipse cx="19" cy="46" rx="9" ry="3" fill="#087e4944"/><path d="M19 1C9 1 3 8 3 17c0 11 16 27 16 27s16-16 16-27C35 8 29 1 19 1" fill="#087e49"/><circle cx="19" cy="16" r="6" fill="white"/></svg>'});
const storeIcon=L.divIcon({iconSize:[42,42],iconAnchor:[21,21],html:'<div style="width:36px;height:36px;background:#087e49;border:3px solid white;border-radius:50%;box-shadow:0 2px 5px #0002;display:grid;place-items:center"><svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M5 8h14l-1 13H6L5 8zM9 8V5a3 3 0 0 1 6 0v3"/></svg></div>'});
const riderIcon=L.divIcon({className:'rider-pin',iconSize:[36,36],iconAnchor:[18,18],html:'<div style="width:32px;height:32px;background:#059669;border:2.5px solid white;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h4"/></svg></div>'});
const store=L.marker([${Number(STORE_LOCATION.lat)},${Number(STORE_LOCATION.lng)}],{icon:storeIcon}).addTo(map).bindTooltip('MS Traders store',{permanent:true,direction:'bottom',offset:[0,18],className:'store-tooltip'});
let boundary=null,pin=null,userDot=null,userAccuracy=null,rider=null,route=null,state=initial,hasSelection=!!initial.selected,selectionRequested=false,programmatic=false,draggingPin=false;
function select(point){if(!valid(point))return;hasSelection=true;state.selected=point;if(pin)pin.setLatLng(ll(point));else pin=L.marker(ll(point),{icon:pinIcon,draggable:initial.mode==='picker',zIndexOffset:1000}).addTo(map);if(initial.mode==='picker')pin.bindTooltip('Your order will be delivered here',{permanent:true,direction:'top',offset:[0,-46],className:'delivery-tooltip'});pin.off('dragstart').on('dragstart',()=>{draggingPin=true;send('moving');});pin.off('dragend').on('dragend',()=>{draggingPin=false;const p=pin.getLatLng();send('pick',{coordinate:{latitude:p.lat,longitude:p.lng}});programmatic=true;map.panTo(p);});}
function update(next){state={...state,...next};if(state.showBoundary&&!boundary)boundary=L.circle([${Number(STORE_LOCATION.lat)},${Number(STORE_LOCATION.lng)}],{radius:5000,color:'#6ab48e',weight:1.5,dashArray:'8 7',fillColor:'#087e49',fillOpacity:.035,interactive:false}).addTo(map);if(!state.showBoundary&&boundary){boundary.remove();boundary=null;}if(valid(state.selected))select(state.selected);if(valid(state.userLocation)){if(userDot)userDot.setLatLng(ll(state.userLocation));else userDot=L.circleMarker(ll(state.userLocation),{radius:7,color:'white',weight:3,fillColor:'#2586f4',fillOpacity:1}).addTo(map);if(userAccuracy)userAccuracy.remove();userAccuracy=L.circle(ll(state.userLocation),{radius:Math.min(150,Math.max(10,state.userLocation.accuracy||20)),color:'#2586f4',stroke:false,fillOpacity:.12}).addTo(map);}if(valid(state.rider)){if(rider)rider.setLatLng(ll(state.rider));else rider=L.marker(ll(state.rider),{icon:riderIcon,zIndexOffset:1500}).addTo(map);}else if(rider){rider.remove();rider=null;}if(route){route.remove();route=null;}if(Array.isArray(state.route)&&state.route.length>1){const isRoad=state.route.length>5;route=L.polyline(state.route.filter(valid).map(ll),{color:'#059669',weight:isRoad?4:3,dashArray:isRoad?undefined:'6 6',opacity:.85}).addTo(map);}map.invalidateSize();}
let lastPreview=0;map.on('dragstart',()=>{if(initial.mode==='picker'){programmatic=false;selectionRequested=true;send('moving');}});
map.on('move',()=>{if(initial.mode!=='picker'||!selectionRequested||draggingPin)return;const p=map.getCenter();if(pin)pin.setLatLng([p.lat,p.lng]);if(Date.now()-lastPreview>150){lastPreview=Date.now();send('preview',{coordinate:{latitude:p.lat,longitude:p.lng}});}});
map.on('moveend',()=>{if(initial.mode!=='picker'||draggingPin)return;if(programmatic){programmatic=false;return;}if(selectionRequested){selectionRequested=false;const p=map.getCenter();select({latitude:p.lat,longitude:p.lng});send('pick',{coordinate:{latitude:p.lat,longitude:p.lng}});}});
map.on('click',event=>{if(initial.mode!=='picker')return;select({latitude:event.latlng.lat,longitude:event.latlng.lng});send('pick',{coordinate:{latitude:event.latlng.lat,longitude:event.latlng.lng}});programmatic=true;map.panTo(event.latlng);});
function redrawMap(){setTimeout(function(){if(map){map.invalidateSize();if(tiles)tiles.redraw();}},100);}
document.addEventListener('visibilitychange',function(){if(!document.hidden)redrawMap();});
window.addEventListener('focus',redrawMap);
window.addEventListener('pageshow',redrawMap);
window.__MSMap={command:function(command){
  if(command.type==='update')update(command.data);
  if(command.type==='center'&&valid(command.coordinate)){programmatic=true;map.setView(ll(command.coordinate),command.zoom||map.getZoom(),{animate:true});if(initial.mode==='picker'&&command.select!==false)select(command.coordinate);}
  if(command.type==='fit'){const points=(command.points||[]).filter(valid).map(ll);if(points.length){programmatic=true;map.fitBounds(L.latLngBounds(points),{padding:[45,55],maxZoom:16,animate:false});}map.invalidateSize();}
  if(command.type==='retry'||command.type==='refresh'){loaded=0;map.invalidateSize();tiles.redraw();}
  if(command.type==='resize'||command.type==='invalidate'){map.invalidateSize();tiles.redraw();}
}};
update(initial);send('ready');
if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize()).observe(document.getElementById('map'));else window.addEventListener('resize',()=>map.invalidateSize());
setTimeout(redrawMap,60);
setTimeout(redrawMap,250);
})();
</script></body></html>`;
}
module.exports = { createMapDocument, TILE_URL };

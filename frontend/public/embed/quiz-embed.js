/*!
 * Squarespell Quiz Embed v1.0.0
 * Usage: <script src="https://squarespell.com/embed/quiz-embed.js" data-quiz="YOUR_SLUG" async></script>
 */
(function(){
'use strict';
var BASE_URL='https://app.squarespell.com';
var scripts=document.querySelectorAll('script[data-quiz]');
var currentScript=scripts[scripts.length-1];
if(!currentScript){console.warn('[Squarespell] Missing data-quiz attribute.');return;}
var slug=currentScript.getAttribute('data-quiz');
var fixedHeight=currentScript.getAttribute('data-height');
if(!slug){console.warn('[Squarespell] data-quiz is required.');return;}
if(document.getElementById('squarespell-embed-'+slug))return;
function detectHostBrand(){
  try{var s=window.getComputedStyle(document.body);var links=document.querySelectorAll('a');var accent='';
  if(links.length>0)accent=window.getComputedStyle(links[0]).color||'';
  return{bg:rgbToHex(s.backgroundColor),text:rgbToHex(s.color),accent:rgbToHex(accent),font:cleanFont(s.fontFamily)};}
  catch(e){return{bg:'',text:'',accent:'',font:''};}}
function rgbToHex(rgb){if(!rgb)return'';if(rgb.charAt(0)==='#')return rgb;var m=rgb.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);if(!m)return'';return'#'+[m[1],m[2],m[3]].map(function(n){return('0'+parseInt(n,10).toString(16)).slice(-2);}).join('');}
function cleanFont(f){if(!f)return'';return f.split(',')[0].replace(/['"]/g,'').trim();}
function buildUrl(brand){var p=['embed=1'];if(brand.bg)p.push('bg='+encodeURIComponent(brand.bg));if(brand.text)p.push('fg='+encodeURIComponent(brand.text));if(brand.accent)p.push('accent='+encodeURIComponent(brand.accent));if(brand.font)p.push('font='+encodeURIComponent(brand.font));return BASE_URL+'/quiz/'+encodeURIComponent(slug)+'?'+p.join('&');}
function injectStyles(){if(document.getElementById('squarespell-styles'))return;var css=document.createElement('style');css.id='squarespell-styles';css.textContent='.squarespell-wrapper{width:100%;max-width:640px;margin:0 auto;display:block}.squarespell-wrapper iframe{width:100%;border:none;border-radius:16px;display:block;transition:height 0.3s ease}.squarespell-fallback{display:none;text-align:center;padding:20px;font-size:14px}.squarespell-fallback a{display:inline-block;padding:12px 24px;background:#D2FF1D;color:#0a0f05;border-radius:20px;font-weight:700;text-decoration:none}';document.head.appendChild(css);}
function buildWidget(url){var w=document.createElement('div');w.className='squarespell-wrapper';w.id='squarespell-embed-'+slug;var iframe=document.createElement('iframe');iframe.src=url;iframe.title='Squarespell Quiz';iframe.loading='lazy';iframe.style.height=(fixedHeight&&fixedHeight!=='auto'?fixedHeight+'px':'600px');var fallback=document.createElement('div');fallback.className='squarespell-fallback';fallback.innerHTML='<p style="margin-bottom:12px">Having trouble loading?</p><a href="'+BASE_URL+'/quiz/'+encodeURIComponent(slug)+'" target="_blank" rel="noopener">Open quiz in new tab</a>';iframe.onerror=function(){fallback.style.display='block';};w.appendChild(iframe);w.appendChild(fallback);return{wrapper:w,iframe:iframe};}
function listenForMessages(iframe){window.addEventListener('message',function(e){if(e.origin!==BASE_URL)return;var d=e.data;if(!d||d.source!=='squarespell')return;if(d.type==='resize'&&typeof d.height==='number'&&(!fixedHeight||fixedHeight==='auto'))iframe.style.height=(d.height+32)+'px';if(d.type==='complete'){document.dispatchEvent(new CustomEvent('squarespell:complete',{bubbles:true,detail:{slug:slug,outcome_id:d.outcome_id}}));if(window.dataLayer)window.dataLayer.push({event:'squarespell_complete',quiz_slug:slug,outcome_id:d.outcome_id});}if(d.type==='start'){var rect=iframe.getBoundingClientRect();if(rect.top<0||rect.top>window.innerHeight*0.3)iframe.scrollIntoView({behavior:'smooth',block:'start'});}});}
function init(){injectStyles();var brand=detectHostBrand();var url=buildUrl(brand);var el=buildWidget(url);currentScript.parentNode.insertBefore(el.wrapper,currentScript.nextSibling);listenForMessages(el.iframe);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

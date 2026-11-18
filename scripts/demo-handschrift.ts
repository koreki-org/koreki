/**
 * Erzeugt die Blaetter der Handschrift-Demo aus `src/lib/demo/handschrift-seiten.ts`.
 * Aufruf: `npm run demo:handschrift` — schreibt nach `public/demo/handschrift/`.
 *
 * Braucht Internet: Die Handschrift-Schriften kommen beim Erzeugen von Google
 * Fonts. Die App selbst laedt sie nie, sie liefert nur die fertigen Bilder aus.
 *
 * Gleiche Vorlage ergibt dasselbe Bild (fester Startwert je Blatt). Nach jeder
 * Aenderung an der Vorlage laufen lassen und die Bilder mitcommitten.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { HANDSCHRIFT_SEITEN, vorlageSchluessel, type HandschriftSeite } from '../src/lib/demo/handschrift-seiten';

const ZIEL = join(__dirname, '..', 'public', 'demo', 'handschrift');
/** A4 bei 150 dpi; gerendert wird doppelt so fein. */
const BREITE = 1240, HOEHE = 1754, ZEILE = 59;

const papier = (art: HandschriftSeite['stil']['papier']): string => art === 'karo'
    ? `background-image:linear-gradient(to right, rgba(120,150,190,.33) 1px, transparent 1px),
         linear-gradient(to bottom, rgba(120,150,190,.33) 1px, transparent 1px);
       background-size:29.5px 29.5px;background-position:12px 18px;`
    : `background-image:linear-gradient(to bottom, transparent ${ZEILE - 1}px, rgba(120,150,190,.45) ${ZEILE - 1}px);
       background-size:100% ${ZEILE}px;background-position:0 57px;`;

/** Die Seite als HTML. Das Verwackeln passiert im Browser, nach dem Laden der Schrift. */
function seitenHtml(seite: HandschriftSeite): string {
    const s = seite.stil;
    const schrift = `font-family:'${s.schrift}';font-size:${s.groesse}px;color:${s.tinte};-webkit-text-stroke:${s.druck}px ${s.tinte}`;
    return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${s.schrift.replace(/ /g, '+')}&display=block" rel="stylesheet">
<style>
  html,body{margin:0}
  .blatt{position:relative;width:${BREITE}px;height:${HOEHE}px;background-color:#fdfdfb;overflow:hidden;${papier(s.papier)}}
  .rand{position:absolute;top:0;bottom:0;left:1066px;width:2px;background:rgba(214,90,90,.55)}
  .text{position:absolute;left:96px;top:130px;width:930px;line-height:${ZEILE}px;${schrift}}
  .kopf{position:absolute;left:96px;top:${130 - ZEILE}px;width:930px;line-height:${ZEILE}px;display:flex;justify-content:space-between;${schrift}}
  .w{display:inline-block;white-space:nowrap;position:relative}
  .c{display:inline-block}
  .abs{height:${ZEILE}px}
  .h{display:inline-block;position:relative}
  .ins{position:relative;display:inline-block;width:22px;height:1em}
  .ins .ueber{position:absolute;left:-22px;top:-27px;font-size:.82em;white-space:nowrap}
</style></head><body><div class="blatt"><div class="rand"></div>
<div class="kopf"><span id="k1"></span><span id="k2"></span></div><div class="text" id="text"></div></div>
<script>
const VORLAGE=${JSON.stringify(seite.text.trim())}, KOPF=${JSON.stringify(seite.kopf)};
const INK=${JSON.stringify(s.tinte)}, NEIGUNG=${s.neigung}, WACKELN=${s.wackeln}, V=${s.vielfalt ?? 0}, DRUCK=${s.druck};
let z=${s.startwert};
// Eigener Zufall fuer die Vielfalt: Ein Blatt ohne sie bleibt Pixel fuer Pixel, wie es war.
let z2=${s.startwert * 31 + 1};
const r2=()=>{z2|=0;z2=z2+0x6D2B79F5|0;let t=Math.imul(z2^z2>>>15,1|z2);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g2=(a)=>(r2()*2-1)*a;
const r=()=>{z|=0;z=z+0x6D2B79F5|0;let t=Math.imul(z^z>>>15,1|z);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const g=(a)=>(r()*2-1)*a;
const esc=(c)=>c==='&'?'&amp;':c==='<'?'&lt;':c;
// η fehlt in allen Handschrift-Schriften — von Hand gezeichnet.
const eta='<svg class="c" viewBox="0 0 20 30" style="width:.5em;height:.75em;vertical-align:-.28em;overflow:visible"><path d="M2,9 C3,4 6,4 6.5,9 L6.5,19 M6.5,11 C8,4 15,2.5 15,10 L14.5,29" fill="none" stroke="'+INK+'" stroke-width="2.1" stroke-linecap="round"/></svg>';
const zeichen=(c)=>c==='η'?eta:c===' '?'<span class="c" style="width:.32em"></span>':'<span class="c">'+esc(c)+'</span>';
const wort=(w,k='w')=>'<span class="'+k+'">'+[...w].map(zeichen).join('')+'</span>';
const strich=(pfad,breite)=>'<svg style="position:absolute;'+pfad[0]+'overflow:visible" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="'+pfad[1]+'" stroke="'+INK+'" stroke-width="'+breite+'" fill="none" vector-effect="non-scaling-stroke"/></svg>';
document.getElementById('k1').innerHTML=wort(KOPF[0]);
document.getElementById('k2').innerHTML=wort(KOPF[1]);
let h='';
for(const zeile of VORLAGE.split('\\n')){
  if(!zeile.trim()){h+='<div class="abs"></div>';continue}
  if(zeile.startsWith('# ')){h+='<div><span class="h">'+wort(zeile.slice(2))+strich(['left:-4px;bottom:2px;width:110%;height:10px;','M0,5 C25,3 50,8 100,4'],1.6)+'</span></div>';continue}
  let inhalt='';
  for(const t of zeile.split(/(~~[^~]+~~|\\{\\^[^}]+\\})/).filter(Boolean)){
    if(t.startsWith('~~')){inhalt+='<span class="w">'+[...t.slice(2,-2)].map(zeichen).join('')+strich(['left:-4px;top:30%;width:108%;height:40%;','M0,12 C30,9 60,13 100,8 M2,16 C35,12 70,15 98,11'],2.2)+'</span>';continue}
    if(t.startsWith('{^')){inhalt+='<span class="ins"><svg style="position:absolute;left:3px;bottom:-4px;width:16px;height:18px;overflow:visible" viewBox="0 0 16 18"><path d="M1,17 L8,3 L15,16" stroke="'+INK+'" stroke-width="2" fill="none" stroke-linecap="round"/></svg><span class="ueber">'+wort(t.slice(2,-1))+'</span></span>';continue}
    inhalt+=t.split(/( +)/).map(x=>/^ +$/.test(x)?' ':x?wort(x):'').join('');
  }
  h+='<div>'+inhalt+'</div>';
}
document.getElementById('text').innerHTML=h;
document.fonts.ready.then(()=>{
  // Vielfalt: Jedes Wort mit eigenem Stiftdruck und eigener Groesse
  if(V) document.querySelectorAll('#text .w').forEach(w=>{
    w.dataset.s=(1+g2(.05*V)).toFixed(3); // per transform — eine echte Schriftgroesse schoebe die Zeile von der Linie
    w.style.webkitTextStrokeWidth=Math.max(0,DRUCK*(1+g2(.6*V))).toFixed(2)+'px';
  });
  // Buchstaben einzeln verwackeln — mit Vielfalt auch in Neigung und Breite,
  // sonst sieht jedes „a“ aus wie das andere.
  document.querySelectorAll('.c').forEach(c=>{
    const extra=V?' skewX('+g2(7*V).toFixed(2)+'deg) scaleX('+(1+g2(.09*V)).toFixed(3)+')':'';
    c.style.transform='translateY('+g(1.3*WACKELN).toFixed(2)+'px) rotate('+(NEIGUNG+g(4*WACKELN)).toFixed(2)+'deg) scale('+(1+g(.06*WACKELN)).toFixed(3)+')'+extra;
    c.style.marginRight=g(.8*WACKELN).toFixed(2)+'px';
    c.style.opacity=(0.86+r()*.14).toFixed(2);
  });
  // Jede Zeile laeuft leicht schraeg, der Zeilenanfang wandert
  const lauf={};
  document.querySelectorAll('.w,.h,.ins').forEach(w=>{
    if(w.closest('.ueber')||w.closest('.h')!==null&&!w.classList.contains('h')) return;
    const top=Math.round(w.offsetTop/10)+'-'+w.offsetParent.id;
    if(!(top in lauf)) lauf[top]={neig:g(.012*WACKELN)+g2(.01*V),ver:g(3*WACKELN)-Math.abs(g2(5*V)),dx:g(5*WACKELN)+g2(8*V)};
    const L=lauf[top];
    w.style.transform='translate('+(L.dx+g(1.5*WACKELN)).toFixed(1)+'px,'+(L.ver+L.neig*w.offsetLeft+g(WACKELN)).toFixed(1)+'px)'+(w.dataset.s?' scale('+w.dataset.s+')':'');
  });
  document.body.dataset.fertig='1';
});
</script></body></html>`;
}

/** Scan-Look: leicht gedreht, Papierton, Rauschen, Schatten am Rand, 200 dpi. */
async function alsScan(roh: Buffer, startwert: number, drehung: number): Promise<Buffer> {
    const W = BREITE * 2, H = HOEHE * 2;
    let n = startwert * 7919;
    const zufall = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
    const rauschen = Buffer.alloc(W * H);
    for (let i = 0; i < rauschen.length; i++) rauschen[i] = 128 + Math.round((zufall() - .5) * 46);
    const rauschBild = await sharp(rauschen, { raw: { width: W, height: H, channels: 1 } }).blur(0.6).toColourspace('srgb').png().toBuffer();
    const schatten = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-opacity=".16"/><stop offset=".07" stop-opacity="0"/><stop offset=".94" stop-opacity="0"/><stop offset="1" stop-opacity=".07"/></linearGradient>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".05"/><stop offset=".5" stop-opacity="0"/><stop offset="1" stop-opacity=".09"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#l)"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`);
    const gedreht = await sharp(roh).rotate(drehung, { background: '#e9e7e1' }).resize(W, H, { fit: 'cover' }).toBuffer();
    const gemischt = await sharp(gedreht).composite([
        { input: rauschBild, blend: 'overlay' },
        { input: schatten, blend: 'multiply' },
        { input: { create: { width: W, height: H, channels: 3, background: '#f6f2e9' } }, blend: 'multiply' },
    ]).png().toBuffer();
    return sharp(gemischt).blur(0.7).resize(1654).jpeg({ quality: 78 }).toBuffer();
}

async function main(): Promise<void> {
    mkdirSync(ZIEL, { recursive: true });
    const browser = await chromium.launch();
    try {
        // Zaehlschleife statt `.entries()`: Das Skript wird nach ES5 uebersetzt,
        // dort laeuft eine for-of-Schleife ueber einen Iterator wortlos null Mal.
        for (let i = 0; i < HANDSCHRIFT_SEITEN.length; i++) {
            const seite = HANDSCHRIFT_SEITEN[i];
            const tab = await browser.newPage({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 2 });
            await tab.setContent(seitenHtml(seite));
            await tab.waitForSelector('body[data-fertig="1"]');
            const roh = await tab.locator('.blatt').screenshot();
            await tab.close();
            await sharp(await alsScan(roh, seite.stil.startwert, i % 2 ? 0.7 : -0.5)).toFile(join(ZIEL, seite.datei));
            process.stdout.write(`${seite.datei} geschrieben\n`);
        }
    } finally {
        await browser.close();
    }
    const stand: Record<string, string> = {};
    for (const seite of HANDSCHRIFT_SEITEN) stand[seite.datei] = createHash('sha256').update(vorlageSchluessel(seite)).digest('hex');
    writeFileSync(join(ZIEL, 'stand.json'), `${JSON.stringify(stand, null, 2)}\n`);
}

void main();

// ===== État =====
let sexe = 'F';

// ===== Sélecteurs sexe =====
document.getElementById('btn-f').addEventListener('click', () => setSex('F'));
document.getElementById('btn-m').addEventListener('click', () => setSex('M'));

function setSex(s){
  sexe = s;
  document.getElementById('btn-f').className = 'tog-btn' + (s === 'F' ? ' active' : '');
  document.getElementById('btn-m').className = 'tog-btn' + (s === 'M' ? ' active' : '');
}

// ===== Indication automatique de la position de mesure =====
document.getElementById('age-mois').addEventListener('input', onAgeChange);

function onAgeChange(){
  const mois = parseInt(document.getElementById('age-mois').value);
  const lbl = document.getElementById('taille-mode-label');
  const hint = document.getElementById('taille-hint');
  const hintTxt = document.getElementById('taille-hint-text');

  if (isNaN(mois) || mois < 0 || mois > 60) {
    lbl.textContent = '';
    hint.className = 'taille-hint';
    return;
  }
  if (mois < 24) {
    lbl.textContent = '— couchée (longueur)';
    hintTxt.textContent = 'Enfant < 2 ans : mesurer couché avec une toise horizontale';
  } else {
    lbl.textContent = '— debout (hauteur)';
    hintTxt.textContent = 'Enfant ≥ 2 ans : mesurer debout avec une toise verticale';
  }
  hint.className = 'taille-hint show';
}

// ===== Interpolation et calcul de Z-score =====
function interpTable(val, tbl, sx){
  const keys = Object.keys(tbl[sx]).map(Number).sort((a,b) => a - b);
  let lo = keys[0], hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++){
    if (val >= keys[i] && val <= keys[i+1]) { lo = keys[i]; hi = keys[i+1]; break; }
  }
  const f = hi === lo ? 0 : (val - lo) / (hi - lo);
  return tbl[sx][lo].map((v,i) => v + (tbl[sx][hi][i] - v) * f);
}

function calcZ(val, refs){
  const med = refs[3];
  if (val <= med) {
    const sd = med - refs[2];
    return sd > 0 ? (val - med) / sd : 0;
  } else {
    const sd = refs[4] - med;
    return sd > 0 ? (val - med) / sd : 0;
  }
}

function zGrade(z){
  if (z < -3) return { label: 'Sévère (MAS)', cls: 'mas', short: 'MAS' };
  if (z < -2) return { label: 'Modéré (MAM)', cls: 'mam', short: 'MAM' };
  if (z > 2)  return { label: 'Surpoids', cls: 'surp', short: 'Surpoids' };
  return { label: 'Normal', cls: 'normal', short: 'Normal' };
}

function zColor(z){
  if (z < -2) return '#E24B4A';
  if (z < -1) return '#EF9F27';
  if (z > 2)  return '#378ADD';
  return '#1D9E75';
}

function zPct(z){ return Math.max(4, Math.min(96, ((z + 4) / 8) * 100)); }

function muacGrade(pb){
  if (pb < 120) return { label: 'MAS', cls: 'mas' };
  if (pb < 130) return { label: 'MAM', cls: 'mam' };
  return { label: 'Normal', cls: 'normal' };
}

// ===== Construction des badges de diagnostic =====
function diagBadges(grade, type){
  if (grade.short === 'Normal') return `<span class="badge normal">Normal</span>`;
  const nature  = type === 'Émaciation' ? 'Aiguë'
                : type === 'Retard de croissance' ? 'Chronique'
                : 'Mixte (aiguë + chronique)';
  const natCls  = type === 'Retard de croissance' ? 'chronique' : 'aigue';
  const deg     = grade.short === 'MAS' ? 'Sévère' : 'Modéré';
  return `<span class="badge ${grade.cls}">${type} ${deg}</span><span class="badge ${natCls}">${nature}</span>`;
}

function makeIndicatorHTML(title, valHtml, sub, z, grade, diagHtml){
  return `<div class="indicator">
    <div class="ind-top">
      <div>
        <div class="ind-name">${title}</div>
        <div class="ind-val">${valHtml}</div>
        ${sub ? `<div class="ind-sub">${sub}</div>` : ''}
      </div>
      <div class="ind-badges"><span class="badge ${grade.cls}">${grade.label}</span></div>
    </div>
    <div class="zscore-row">
      <div class="zbar"><div class="zbar-fill" style="width:${zPct(z)}%;background:${zColor(z)}"></div></div>
      <div class="zscore-val">Z = ${z.toFixed(2)}</div>
    </div>
    <div class="diag-block"><span class="diag-label">Diagnostic :</span>${diagHtml}</div>
  </div>`;
}

// ===== Erreurs =====
function showError(msg){
  const e = document.getElementById('err-msg');
  document.getElementById('err-text').textContent = msg;
  e.style.display = 'flex';
  setTimeout(() => { e.style.display = 'none'; }, 4000);
}

// ===== Calcul principal =====
document.getElementById('calc-btn').addEventListener('click', calculer);
document.getElementById('reset-btn').addEventListener('click', resetForm);

function calculer(){
  const mois     = parseInt(document.getElementById('age-mois').value);
  const poids    = parseFloat(document.getElementById('poids').value);
  const taille   = parseFloat(document.getElementById('taille').value);
  const muacRaw  = document.getElementById('muac').value;

  if (isNaN(mois) || mois < 0 || mois > 60) { showError('Âge invalide (0–60 mois)'); return; }
  if (isNaN(poids) || poids < 0.5 || poids > 30) { showError('Poids invalide'); return; }
  if (isNaN(taille) || taille < 40 || taille > 125) { showError('Taille invalide'); return; }

  const couche   = mois < 24;
  const posLabel = couche ? 'couchée' : 'debout';

  const refsWA = interpTable(mois, WFA, sexe);
  const refsHA = interpTable(mois, HFA, sexe);
  const refsWH = interpTable(taille, WFH, sexe);

  const zWA = calcZ(poids, refsWA);
  const zHA = calcZ(taille, refsHA);
  const zWH = calcZ(poids, refsWH);

  const gWA = zGrade(zWA);
  const gHA = zGrade(zHA);
  const gWH = zGrade(zWH);

  let html = '';
  html += makeIndicatorHTML(
    'Poids / Taille — Émaciation',
    `${poids.toFixed(1)}<span class="ind-unit">kg</span>`,
    `Pour taille ${posLabel} de ${taille.toFixed(1)} cm`,
    zWH, gWH, diagBadges(gWH, 'Émaciation')
  );
  html += makeIndicatorHTML(
    'Taille / Âge — Retard de croissance',
    `${taille.toFixed(1)}<span class="ind-unit">cm</span>`,
    `Mesure ${posLabel} · ${mois} mois`,
    zHA, gHA, diagBadges(gHA, 'Retard de croissance')
  );
  html += makeIndicatorHTML(
    'Poids / Âge — Insuffisance pondérale',
    `${poids.toFixed(1)}<span class="ind-unit">kg</span>`,
    `${mois} mois`,
    zWA, gWA, diagBadges(gWA, 'Insuffisance pondérale')
  );

  let muacGradeObj = null;
  if (muacRaw !== '' && mois >= 6) {
    const pb = parseInt(muacRaw);
    muacGradeObj = muacGrade(pb);
    const muacDesc = pb < 120 ? '< 120 mm — MAS' : pb < 130 ? '120–129 mm — MAM' : '≥ 130 mm — Normal';
    const natCls = muacGradeObj.cls === 'mas' ? 'aigue' : muacGradeObj.cls === 'mam' ? 'chronique' : 'normal';
    html += `<div class="indicator">
      <div class="ind-top">
        <div>
          <div class="ind-name">Périmètre brachial (MUAC)</div>
          <div class="ind-val">${pb}<span class="ind-unit">mm</span></div>
        </div>
        <div class="ind-badges"><span class="badge ${muacGradeObj.cls}">${muacGradeObj.label}</span></div>
      </div>
      <div class="diag-block" style="margin-top:10px">
        <span class="diag-label">Seuil OMS :</span>
        <span class="badge ${natCls}">${muacDesc}</span>
      </div>
    </div>`;
  } else if (muacRaw !== '' && mois < 6) {
    html += `<div class="indicator"><div class="ind-name">MUAC</div><div style="font-size:13px;color:var(--text-tertiary);padding:4px 0;font-style:italic">Non applicable avant 6 mois</div></div>`;
  }

  document.getElementById('indicators').innerHTML = html;

  const hasMAS  = [gWH, gHA, gWA].some(g => g.short === 'MAS') || (muacGradeObj && muacGradeObj.label === 'MAS');
  const hasMAM  = !hasMAS && ([gWH, gHA, gWA].some(g => g.short === 'MAM') || (muacGradeObj && muacGradeObj.label === 'MAM'));
  const hasSurp = !hasMAS && !hasMAM && [gWH, gHA, gWA].some(g => g.short === 'Surpoids');

  let interpCls, interpTitle, interpText;

  if (hasMAS) {
    interpCls = 'mas'; interpTitle = 'Malnutrition aiguë sévère (MAS)';
    const t = [];
    if (gWH.short === 'MAS') t.push('émaciation sévère, aiguë (P/T Z < −3)');
    if (gHA.short === 'MAS') t.push('retard de croissance sévère, chronique (T/A Z < −3)');
    if (gWA.short === 'MAS') t.push('insuffisance pondérale sévère (P/A Z < −3)');
    if (muacGradeObj && muacGradeObj.label === 'MAS') t.push('MUAC < 120 mm');
    interpText = `${t.join(' ; ')}.`;
  } else if (hasMAM) {
    interpCls = 'mam'; interpTitle = 'Malnutrition aiguë modérée (MAM)';
    const t = [];
    if (gWH.short === 'MAM') t.push('émaciation modérée, aiguë (P/T Z entre −3 et −2)');
    if (gHA.short === 'MAM') t.push('retard de croissance modéré, chronique (T/A Z entre −3 et −2)');
    if (gWA.short === 'MAM') t.push('insuffisance pondérale modérée (P/A Z entre −3 et −2)');
    if (muacGradeObj && muacGradeObj.label === 'MAM') t.push('MUAC 120–129 mm');
    interpText = `${t.join(' ; ')}.`;
  } else if (hasSurp) {
    interpCls = 'normal'; interpTitle = 'Surpoids / Obésité';
    interpText = 'Un indicateur dépasse +2 DS (surpoids).';
  } else {
    interpCls = 'normal'; interpTitle = 'Normal';
    interpText = 'Tous les indicateurs sont dans les limites OMS (Z entre −2 et +2).';
  }

  const interpCard = document.getElementById('interp-card');
  interpCard.className = `interp-card ${interpCls}`;

  const iconCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>';
  const iconWarn  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
  const icon = interpCls === 'normal' ? iconCheck : iconWarn;

  document.getElementById('interp-title').innerHTML = `${icon} ${interpTitle}`;
  document.getElementById('interp-text').textContent = interpText;

  document.getElementById('res-patient').textContent =
    `${mois} mois · ${sexe === 'F' ? 'Fille' : 'Garçon'} · Taille ${posLabel}`;
  document.getElementById('res-summary').textContent =
    hasMAS ? 'MAS détectée' : hasMAM ? 'MAM détectée' : hasSurp ? 'Surpoids détecté' : 'Normal';

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm(){
  document.getElementById('results').style.display = 'none';
  ['age-mois','poids','taille','muac'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('taille-mode-label').textContent = '';
  document.getElementById('taille-hint').className = 'taille-hint';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== PWA : enregistrement du service worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ===== PWA : invite d'installation =====
let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.add('show');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBanner.classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  installBanner.classList.remove('show');
});

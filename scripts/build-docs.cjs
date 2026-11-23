const fs = require('node:fs');
const path = require('node:path');
const { Marp } = require('@marp-team/marp-core');

const docs = path.join(__dirname, '..', 'docs');
const marp = new Marp({ html: true, inlineSVG: false });
const chapitres = [
  {
    id: '01_besoin_metier',
    titre: 'Le besoin métier',
    repere: 'Jour 1 · Transport et logistique',
    objectif: 'Cadrer la décision, comprendre l’entrepôt et prendre en main l’atelier SQL.',
  },
  {
    id: '02_modeliser',
    titre: 'Le schéma en étoile',
    repere: 'Modélisation dimensionnelle',
    objectif: 'Organiser les faits et les dimensions autour d’une ligne par livraison.',
  },
  {
    id: '03_preparer_donnees',
    titre: 'Nettoyer et préparer les données',
    repere: 'Préparation des données',
    objectif: 'Transformer un lot multisource en livraisons préparées et en rejets justifiés.',
  },
];

function escapeHtml(texte) {
  return texte.replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]);
}

function genererChapitre(chapitre, suivant) {
  const source = `supports/${chapitre.id}.md`;
  const document = marp.render(fs.readFileSync(path.join(docs, source), 'utf8'));
  const sections = Array.from(document.html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g), match => match[1]);
  if (!sections.length) throw new Error(`Aucune slide dans ${source}`);

  const titres = sections.map((section, index) => {
    const titre = section.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/)?.[1];
    return titre ? titre.replace(/<[^>]*>/g, '') : `Slide ${index + 1}`;
  });
  const nombre = sections.length;
  const titre = escapeHtml(chapitre.titre);
  const repere = escapeHtml(chapitre.repere);
  const titreSuivant = suivant ? escapeHtml(suivant.titre) : 'Revenir au parcours';
  const lienSuivant = suivant ? `${suivant.id}.html` : 'index.html';

  const sommaire = titres.map((titreSlide, index) => {
    const numero = index + 1;
    const actif = index === 0 ? ' aria-current="step"' : '';
    return `              <a class="slide-link" href="#slide-${numero}" data-slide-link="${numero}"${actif}><small>${String(numero).padStart(2, '0')}</small><span>${titreSlide}</span></a>`;
  }).join('\n');

  const slides = sections.map((section, index) => {
    const numero = index + 1;
    const exercice = /^Exercice\b/.test(titres[index]) ? ' exercise' : '';
    const contenu = section
      .replace(/\b(href|src)="([^"]+)"/g, (attribut, nom, url) => {
        if (/^(?:[a-z][a-z\d+.-]*:|[\/#])/i.test(url)) return attribut;
        return `${nom}="${path.posix.join(path.posix.dirname(source), url)}"`;
      })
      .replace(/<pre>/g, '<pre tabindex="0">')
      .replace(/<table>/g, '<div class="table-wrap" tabindex="0"><table>')
      .replace(/<\/table>/g, '</table></div>');
    const suite = numero === nombre ? `
            <div class="chapter-end"><a class="button primary" href="${lienSuivant}">${titreSuivant} →</a></div>` : '';
    return `          <article class="slide-card${exercice}" id="slide-${numero}" aria-labelledby="slide-label-${numero}"${index > 0 ? ' hidden' : ''}>
            <p class="question-kicker" id="slide-label-${numero}">${repere} <span class="pill">${numero} / ${nombre}</span></p>
            <div class="prose">
${contenu.trim()}
            </div>${suite}
          </article>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f8f2">
  <title>${titre} · Data Warehouse</title>
  <link rel="stylesheet" href="assets/site.css">
  <link rel="stylesheet" href="assets/slides.css">
  <link rel="stylesheet" href="assets/diagrams.css">
  <noscript><style>
    .slide-card[hidden]{display:block!important}.slide-card{margin-bottom:24px}
    .card-controls,.deck-toolbar,.progress-line,#progress{display:none!important}
  </style></noscript>
</head>
<body class="deck-page" data-deck="${chapitre.id}">
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header">
    <a class="brand" href="index.html"><span class="brand-icon" aria-hidden="true">dw.</span> Data Warehouse</a>
    <nav class="header-actions" aria-label="Navigation principale">
      <a class="back-link" href="index.html#parcours">Le cours</a>
      <a class="back-link" href="index.html#atelier">Bac à sable</a>
    </nav>
  </header>
  <main class="learning-main" id="contenu">
    <div class="page-heading">
      <div><p class="eyebrow">${repere}</p><h1>${titre}</h1><p>${escapeHtml(chapitre.objectif)}</p></div>
      <span class="chapter-count">${nombre} slides</span>
    </div>
    <div class="deck-toolbar">
      <div class="mode-switch" role="group" aria-label="Mode d’affichage">
        <button id="mode-slides" aria-pressed="true">Slides</button>
        <button id="mode-reading" aria-pressed="false">Lecture continue</button>
      </div>
      <div class="toolbar-actions">
        <button class="text-button mobile-only" id="toggle-outline" aria-expanded="false" aria-controls="outline">Sommaire</button>
        <button class="text-button" id="fullscreen">Plein écran</button>
        <button class="text-button" id="print">Imprimer / PDF</button>
      </div>
    </div>
    <div class="progress-line"><span id="position" role="status" aria-live="polite">Slide 1 sur ${nombre}</span><span id="progress-label">${Math.round(100 / nombre)} %</span></div>
    <progress id="progress" max="${nombre}" value="1" aria-label="Progression du chapitre"></progress>
    <div class="learning-layout">
      <aside class="sidebar" id="outline">
        <p class="sidebar-title">DANS CE CHAPITRE</p>
        <nav class="slide-list" aria-label="Sommaire des slides">
${sommaire}
        </nav>
        <a class="source-link" href="${source}" download>Support Markdown ↓</a>
      </aside>
      <div class="content-column">
        <div id="slides">
${slides}
        </div>
        <nav class="card-controls" aria-label="Navigation des slides">
          <button class="button" id="previous" disabled>← Précédente</button>
          <span class="page-number" id="page-number" aria-hidden="true">01 / ${nombre}</span>
          <button class="button primary" id="next">Suivante →</button>
        </nav>
      </div>
    </div>
  </main>
  <footer class="site-footer"><span>Data Warehouse · Satom IT &amp; Learning Solutions</span></footer>
  <script src="assets/slides.js" defer></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(docs, `${chapitre.id}.html`), html);
  console.log(`${chapitre.titre} — ${nombre} slides`);
}

chapitres.forEach((chapitre, index) => genererChapitre(chapitre, chapitres[index + 1]));

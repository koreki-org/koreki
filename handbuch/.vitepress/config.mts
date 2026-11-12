import { defineConfig } from 'vitepress'

// Das Handbuch für Lehrkräfte, veröffentlicht unter https://hilfe.koreki.org.
// Koreki ist hell und hat keinen Dark Mode (koreki-design-system) — deshalb
// `appearance: false`: kein Umschalter, keine dunkle Variante.
export default defineConfig({
  lang: 'de-DE',
  title: 'Koreki Hilfe',
  description: 'Das Handbuch zu Koreki, deinem KI-Korrektur Assistenten.',
  cleanUrls: true,
  appearance: false,
  lastUpdated: true,
  srcExclude: ['README.md'],

  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
    ['link', { rel: 'preload', href: '/fonts/geist-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }],
    ['link', { rel: 'preload', href: '/fonts/outfit-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }],
  ],

  sitemap: { hostname: 'https://hilfe.koreki.org' },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Koreki',

    nav: [
      { text: 'Handbuch', link: '/erste-schritte/' },
      { text: 'Webseite', link: 'https://koreki.org' },
      { text: 'Herunterladen', link: 'https://github.com/koreki-org/koreki/releases' },
    ],

    sidebar: [
      {
        text: 'Erste Schritte',
        items: [
          { text: 'Was Koreki ist', link: '/erste-schritte/' },
          { text: 'Koreki installieren', link: '/erste-schritte/installieren' },
          { text: 'KI verbinden', link: '/erste-schritte/ki-verbinden' },
        ],
      },
      {
        text: 'Korrigieren',
        items: [
          { text: 'Eine Korrektur Schritt für Schritt', link: '/korrigieren/ablauf' },
          { text: 'Vorschläge prüfen', link: '/korrigieren/vorschlaege-pruefen' },
        ],
      },
      {
        text: 'Bewertung anpassen',
        items: [
          { text: 'Expertise, Skills, Erfahrungsschatz', link: '/bewertung/' },
        ],
      },
      {
        text: 'Datenschutz',
        items: [
          { text: 'Namen auf dem Blatt', link: '/datenschutz/namen' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/koreki-org/koreki' }],

    editLink: {
      pattern: 'https://github.com/koreki-org/koreki/edit/main/handbuch/:path',
      text: 'Diese Seite auf GitHub verbessern',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Suchen', buttonAriaLabel: 'Suchen' },
          modal: {
            displayDetails: 'Details anzeigen',
            resetButtonTitle: 'Suche zurücksetzen',
            backButtonTitle: 'Suche schließen',
            noResultsText: 'Nichts gefunden für',
            footer: {
              selectText: 'öffnen',
              navigateText: 'wechseln',
              closeText: 'schließen',
            },
          },
        },
      },
    },

    outline: { level: [2, 3], label: 'Auf dieser Seite' },
    docFooter: { prev: 'Zurück', next: 'Weiter' },
    lastUpdated: { text: 'Zuletzt geändert', formatOptions: { dateStyle: 'medium' } },
    returnToTopLabel: 'Nach oben',
    sidebarMenuLabel: 'Inhalt',
    notFound: {
      title: 'Seite nicht gefunden',
      quote: 'Diese Seite gibt es nicht (mehr).',
      linkLabel: 'Zur Startseite',
      linkText: 'Zur Startseite',
    },

    footer: {
      message: 'Koreki macht Vorschläge. Die Bewertung triffst du.',
      copyright: '<a href="https://koreki.org/impressum">Impressum</a> · <a href="https://koreki.org/privacy">Datenschutz</a>',
    },
  },
})

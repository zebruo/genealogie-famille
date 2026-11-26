import js from '@eslint/js'
import html from 'eslint-plugin-html'
import globals from 'globals'

// Mêmes règles que BoxGenerator et CNCStream : recommandées, plus prefer-const et eqeqeq (== null reste permis).
// Ici, pas de modules : les scripts sont chargés par <script> et partagent la portée globale.
const partages = [
  // js/*.js
  'CONFIG', 'FamilyMember', 'getFirstNameWithInitials', 'FamilyTreeApp', 'getFullName', 'familyTreeApp',
  'updateQuickViewButtonClip', 'formatNotes', 'formatPersonDates', 'showTemporaryInfo', 'showConfirm',
  'showConfirmDelete', 'initBurgerMenu', 'loadDarkModeScript', 'openPhotoModal', 'UniversalSearchEngine',
  'TreeVisualizer', 'UIManager',
  // js/person-quick-view.js
  'QUICK_VIEW_CONFIG', 'quickViewState', 'openPersonQuickView', 'loadMemberInfoForQuickView',
  'loadDocumentCountsForQuickView', 'loadPersonDocumentsForQuickView', 'renderAllDocumentsList',
  'viewNoteSimpleFromButton', 'openPhotoModalFromButton', 'viewNoteSimple', 'closeDocumentsModal',
  'formatDateDisplayTab', 'escapeHtml', 'stripHtml', 'showQuickViewNotification',
  // Définis sur window
  'AuthManager', 'SearchEngine', 'AddPersonSearchEngine'
]

export default [
  js.configs.recommended,
  {
    files: ['js/**/*.js', '**/*.html'],
    plugins: { html },
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        d3: 'readonly', // chargé depuis cdnjs
        ...Object.fromEntries(partages.map(nom => [nom, 'readonly']))
      }
    },
    rules: {
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // Les fonctions globales sont appelées depuis d'autres fichiers ou des attributs onclick
      'no-unused-vars': ['error', { vars: 'local' }],
      // Le fichier qui définit un nom partagé ne le « redéclare » pas
      'no-redeclare': ['error', { builtinGlobals: false }]
    }
  }
]

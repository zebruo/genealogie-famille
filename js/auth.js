/**
 * Gestion de l'authentification côté client
 *
 * - Vérifie la session via admin/auth.php?action=check
 * - Redirige vers login.html si non connecté
 * - Ajoute la classe 'read-only' sur <html> pour les visiteurs
 * - Expose window.userRole ('viewer' | 'admin')
 *
 * Inclure CE script EN PREMIER dans chaque page protégée,
 * avant menu-loader.js et les autres scripts.
 */

(function () {
  'use strict';

  // Masquer la page le temps de la vérification (évite le flash de contenu)
  document.documentElement.style.visibility = 'hidden';

  // Chemin relatif vers auth.php — fonctionne depuis la racine du site
  const AUTH_URL  = 'admin/auth.php?action=check';
  const LOGIN_URL = 'login.html';

  fetch(AUTH_URL, { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.role) {
        // Non connecté → redirection vers la page de connexion
        window.location.replace(LOGIN_URL);
        return;
      }

      window.userRole = data.role;

      if (data.role === 'viewer') {
        document.documentElement.classList.add('read-only');
      }

      // Révéler la page
      document.documentElement.style.visibility = '';
    })
    .catch(function () {
      // En cas d'erreur réseau, rediriger par sécurité
      window.location.replace(LOGIN_URL);
    });

  /**
   * Déconnexion — à appeler depuis n'importe quelle page
   * Usage : AuthManager.logout()
   */
  window.AuthManager = {
    logout: function () {
      fetch('admin/auth.php?action=logout', { credentials: 'same-origin' })
        .then(function () {
          window.location.replace(LOGIN_URL);
        })
        .catch(function () {
          window.location.replace(LOGIN_URL);
        });
    },

    isAdmin: function () {
      return window.userRole === 'admin';
    },

    isViewer: function () {
      return window.userRole === 'viewer';
    }
  };
})();

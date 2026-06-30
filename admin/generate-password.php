<?php
/**
 * Générateur de hash de mots de passe
 *
 * Ouvrir dans le navigateur : http://[nom-du-vhost]/admin/generate-password.php
 * Saisir les mots de passe visiteur et administrateur → générer les deux hashs bcrypt
 * → coller le snippet affiché dans admin/config.php
 */

require_once 'auth.php';
requireAdmin();

$hashViewer = null;
$hashAdmin  = null;
$errors     = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $viewerPwd     = $_POST['viewer_password'] ?? '';
    $viewerConfirm = $_POST['viewer_confirm']  ?? '';
    $adminPwd      = $_POST['admin_password']  ?? '';
    $adminConfirm  = $_POST['admin_confirm']   ?? '';

    if ($viewerPwd === '') {
        $errors[] = 'Le mot de passe visiteur ne peut pas être vide.';
    } elseif ($viewerPwd !== $viewerConfirm) {
        $errors[] = 'Les mots de passe visiteur ne correspondent pas.';
    } else {
        $_SESSION['hashViewer'] = password_hash($viewerPwd, PASSWORD_DEFAULT);
    }

    if ($adminPwd === '') {
        $errors[] = 'Le mot de passe administrateur ne peut pas être vide.';
    } elseif ($adminPwd !== $adminConfirm) {
        $errors[] = 'Les mots de passe administrateur ne correspondent pas.';
    } else {
        $_SESSION['hashAdmin'] = password_hash($adminPwd, PASSWORD_DEFAULT);
    }

    if (empty($errors)) {
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
}

// Récupérer les hashs depuis la session puis les effacer
$hashViewer = $_SESSION['hashViewer'] ?? null;
$hashAdmin  = $_SESSION['hashAdmin']  ?? null;
unset($_SESSION['hashViewer'], $_SESSION['hashAdmin']);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Générateur de hash — Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      font-family: system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      padding: 1rem;
    }

    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }

    h1 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 0.25rem;
    }

    .subtitle {
      font-size: 0.82rem;
      color: #64748b;
      margin-bottom: 1.75rem;
    }

    .form-group { margin-bottom: 1.1rem; }

    label {
      display: block;
      font-size: 0.82rem;
      color: #94a3b8;
      margin-bottom: 0.35rem;
      font-weight: 500;
    }

    input[type="password"], input[type="text"] {
      width: 100%;
      padding: 0.65rem 0.875rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus { border-color: #60a5fa; }

    button[type="submit"] {
      width: 100%;
      padding: 0.7rem;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.4rem;
    }

    button[type="submit"]:hover { background: #1d4ed8; }

    .result {
      margin-top: 1.5rem;
      background: #0f172a;
      border: 1px solid #1e3a5f;
      border-radius: 10px;
      padding: 1rem;
    }

    .result-label {
      font-size: 0.78rem;
      color: #60a5fa;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .hash-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .hash-value {
      font-family: monospace;
      font-size: 0.78rem;
      color: #a3e635;
      word-break: break-all;
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      line-height: 1.5;
    }

    .btn-copy {
      background: #334155;
      color: #94a3b8;
      border: none;
      border-radius: 6px;
      padding: 0.45rem 0.7rem;
      cursor: pointer;
      font-size: 0.82rem;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
    }

    .btn-copy:hover  { background: #475569; color: #e2e8f0; }
    .btn-copy.copied { background: #166534; color: #bbf7d0; }

    .config-snippet {
      margin-top: 1rem;
      font-size: 0.78rem;
      color: #64748b;
    }

    .config-snippet code {
      display: block;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      color: #94a3b8;
      font-family: monospace;
      margin-top: 0.35rem;
      word-break: break-all;
      line-height: 1.5;
    }

    .error {
      background: #450a0a;
      border: 1px solid #991b1b;
      color: #fca5a5;
      border-radius: 8px;
      padding: 0.65rem 0.875rem;
      font-size: 0.85rem;
      margin-top: 1rem;
    }

    .section-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 0.75rem;
    }

    .divider {
      border: none;
      border-top: 1px solid #334155;
      margin: 1.25rem 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔑 Générateur de hashs</h1>
    <p class="subtitle">Génère les hashs bcrypt à coller dans <code style="color:#60a5fa">admin/config.php</code></p>

    <form method="POST" autocomplete="off">
      <div class="section-title">👁 Mot de passe visiteur</div>
      <div class="form-group">
        <label for="viewer_password">Mot de passe</label>
        <input type="password" id="viewer_password" name="viewer_password"
               placeholder="Mot de passe visiteur" autofocus required />
      </div>
      <div class="form-group">
        <label for="viewer_confirm">Confirmation</label>
        <input type="password" id="viewer_confirm" name="viewer_confirm"
               placeholder="Répéter le mot de passe" required />
      </div>

      <hr class="divider" />

      <div class="section-title">🔑 Mot de passe administrateur</div>
      <div class="form-group">
        <label for="admin_password">Mot de passe</label>
        <input type="password" id="admin_password" name="admin_password"
               placeholder="Mot de passe administrateur" required />
      </div>
      <div class="form-group">
        <label for="admin_confirm">Confirmation</label>
        <input type="password" id="admin_confirm" name="admin_confirm"
               placeholder="Répéter le mot de passe" required />
      </div>
      <button type="submit">Générer les hashs</button>
    </form>

    <?php foreach ($errors as $err): ?>
      <div class="error">⚠️ <?= htmlspecialchars($err) ?></div>
    <?php endforeach; ?>

    <?php if ($hashViewer && $hashAdmin): ?>
      <div class="result">
        <div class="result-label">Hash visiteur</div>
        <div class="hash-box">
          <span class="hash-value" id="hashViewer"><?= htmlspecialchars($hashViewer) ?></span>
          <button class="btn-copy" onclick="copyHash(this, 'hashViewer')">Copier</button>
        </div>

        <div class="result-label" style="margin-top:1rem">Hash administrateur</div>
        <div class="hash-box">
          <span class="hash-value" id="hashAdmin"><?= htmlspecialchars($hashAdmin) ?></span>
          <button class="btn-copy" onclick="copyHash(this, 'hashAdmin')">Copier</button>
        </div>

        <div class="config-snippet">
          À coller dans <strong>admin/config.php</strong> :
          <code>define('VIEWER_PASSWORD_HASH', '<?= htmlspecialchars($hashViewer) ?>');</code>
          <code style="margin-top:0.35rem">define('ADMIN_PASSWORD_HASH',  '<?= htmlspecialchars($hashAdmin) ?>');</code>
        </div>
      </div>
    <?php endif; ?>

  </div>

  <script>
    function copyHash(btn, id) {
      const hash = document.getElementById(id).textContent;
      navigator.clipboard.writeText(hash).then(function() {
        btn.textContent = '✓ Copié';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = 'Copier';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>

# Arbre Généalogique Familial

Une interface web interactive pour afficher et gérer un arbre généalogique.

## Fonctionnalités

- Affichage visuel de l'arbre généalogique avec connexions entre générations
- Design moderne et responsive
- Cartes interactives avec effet au survol
- Données gérées via un fichier JSON facilement modifiable
- Compatible mobile et desktop

## Structure du projet

```
├── index.html           # Interface web principale
├── family-data.json     # Données de l'arbre généalogique
└── README.md           # Documentation
```

## Utilisation

### Afficher l'arbre généalogique

1. Ouvrez le fichier `index.html` dans un navigateur web
2. Pour le développement local, utilisez un serveur local (ex: Live Server dans VS Code)

### Modifier l'arbre généalogique

Éditez le fichier `family-data.json` pour ajouter, modifier ou supprimer des membres de la famille.

**Structure d'une personne :**
```json
{
  "name": "Nom de la personne",
  "dates": "Année de naissance - Année de décès",
  "children": [
    {
      "name": "Enfant",
      "dates": "1990"
    }
  ]
}
```

## Technologies utilisées

- HTML5
- CSS3 (Flexbox, animations)
- JavaScript (Vanilla JS)
- JSON pour les données

## Licence

Usage personnel

---

Créé avec ❤️ pour préserver l'histoire familiale

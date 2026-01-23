# Intégration SpellBook dans une Extension CEP

Ce guide explique comment ajouter le support SpellBook (Excalibur/StreamDeck) à une extension Premiere Pro existante sans casser le support Node.js.

## 1. Pré-requis

Dans votre dossier `CSXS/manifest.xml`, assurez-vous d'utiliser **CEP 11.0** ou supérieur :
```xml
<RequiredRuntime Name="CSXS" Version="11.0"/>
```

## 2. Installation des Paquets

Dans le dossier `Source` de votre extension :
```bash
npm install @knights-of-the-editing-table/spell-book esm
```
*   `@knights...` : La librairie SpellBook
*   `esm` : Le "loader" magique pour la compatibilité (TRÈS IMPORTANT)

## 3. Configuration package.json

Assurez-vous que votre `package.json` est simple (pas de build scripts complexes) :
```json
{
  "dependencies": {
    "@knights-of-the-editing-table/spell-book": "^1.0.3",
    "esm": "^3.2.25"
  }
}
```

## 4. Intégration dans le JavaScript (`client/js/main.js`)

C'est ici que la magie opère. Au tout début de votre fichier JS principal :

```javascript
// ============================================================================
// SPELL BOOK INTEGRATION
// ============================================================================

// 1. Charger le module "esm" pour traduire les imports modernes à la volée
const esmRequire = require('esm')(module);

// 2. Charger SpellBook via ce loader spécial
const Spellbook = esmRequire('@knights-of-the-editing-table/spell-book').default;

// 3. Définir vos commandes
const commands = [
    {
        commandID: 'com.votre.extension.maFonction', // ID unique
        name: 'Nom de la Fonction',
        group: 'Actions',
        action: () => {
            console.log('Action déclenchée !');
            // Votre code ici...
            maFonctionJS(); 
        }
    }
];

// 4. Initialiser
const spellbook = new Spellbook('Nom Extension', 'com.votre.extension.id', commands);
```

## 5. Script d'installation (Mac/PC)

Pour que l'utilisateur n'ait rien à faire, votre script d'installation (`install.sh` ou `.bat`) doit exécuter `npm install` automatiquement.

**Dans install_macos.sh :**
```bash
echo "📦 Installing npm dependencies..."
if command -v npm &> /dev/null; then
    npm install --silent
else
    echo "⚠️ npm introuvable. Installez Node.js pour le support SpellBook."
fi

# Copier le dossier node_modules dans l'extension finale
cp -R "$SOURCE_DIR/node_modules" "$CEP_DIR/$EXTENSION_NAME/" 2>/dev/null || true
```

---

## 🚫 Pièges à éviter

1.  **Ne JAMAIS utiliser `import` natif** dans le balise `<script type="module">` pour SpellBook. Ça plantera car le navigateur ne sait pas charger les dépendances internes de Node (`events`).
2.  **Ne pas oublier de copier `node_modules`** dans le dossier final de l'extension. Contrairement à une extension Webpackée où tout est dans un seul fichier, ici on a besoin des dossiers physiques.

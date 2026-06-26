# Sainte Bible — David Martin (1744)

Lecteur de Bible **mono-fichier**, élégant et **100 % hors-ligne**. Les 66 livres
complets de la version française David Martin 1744 sont **embarqués dans
`index.html`** — aucune connexion réseau n'est requise pour lire le moindre
chapitre.

## Fonctionnalités

- **66 livres complets** (Ancien + Nouveau Testament), 1189 chapitres, 31 057 versets.
- **Hors-ligne intégral** : tout le texte est embarqué (îlot JSON inline). Ouvrez
  le fichier, lisez n'importe quel chapitre, sans réseau.
- **Recherche plein texte** sur toute la Bible, instantanée et hors-ligne
  (index normalisé, insensible aux accents et à la casse).
- **Palette de saut rapide** (`Ctrl/⌘+K` ou `/`) : tapez une référence
  (« Jean 3:16 »), un livre (« Psaumes ») ou un mot — navigation au clavier.
- **3 thèmes** : sombre, sépia (parchemin), clair — bascule persistée, transitions douces.
- **Lecture audio** du chapitre, verset surligné + avance automatique. Voix du
  navigateur hors-ligne ; **voix premium ElevenLabs (français)** quand en ligne
  avec une clé (voir ci-dessous).
- **Actions sur verset** au clic : copier, partager (Web Share), **surligner en
  5 couleurs**.
- **Panneau de surlignages** : tous les versets surlignés, par couleur, avec
  extrait, saut et suppression.
- **Verset du jour** (déterministe par date) et **plans de lecture** (Évangiles
  30 j, NT 90 j, Psaumes & sagesse 30 j, Bible entière 1 an) avec suivi de progression.
- **Export / impression PDF** du chapitre (mise en page d'impression dédiée).
- **Paroles de Jésus en rouge**, **paroles de Dieu en bleu**, fusionnées dans le
  texte intégral du chapitre.
- **Barre de progression de lecture**, police serif/sans réglable, taille de
  police, bascule des couleurs, navigation clavier (← →).
- Accessibilité (focus visible, rôles ARIA, `prefers-reduced-motion`).
- État persisté dans `localStorage` (livre/chapitre, thème, police, marque-pages).

## Utilisation

Ouvrez simplement `index.html` dans un navigateur — c'est tout. Pour un aperçu
servi en local :

```bash
python -m http.server 8913 --directory .
# puis ouvrir http://localhost:8913/index.html
```

Ajoutez `?test` à l'URL (`index.html?test`) pour exécuter les auto-tests
intégrés (résultats dans la console).

### Voix premium (ElevenLabs) — optionnel

La lecture audio fonctionne hors-ligne avec la voix du navigateur. Pour une voix
française **naturelle**, ouvrez **⚙ Réglages** et collez votre clé API ElevenLabs.

> 🔒 **Sécurité.** La clé est stockée **uniquement dans le `localStorage` de votre
> navigateur** — elle n'est **jamais** écrite dans le code ni publiée dans ce
> dépôt. Ne committez jamais une clé API dans un dépôt public : chaque
> utilisateur saisit la sienne dans les Réglages.

## Chaîne de génération des données

Le texte intégral provient de [getbible.net](https://getbible.net) (code
`martin` = authentique David Martin 1744). Pour **rafraîchir ou régénérer** les
données embarquées :

```bash
node build-embed.mjs    # récupère les 66 livres → data-martin.generated.json
node inject-embed.mjs   # injecte le dataset dans index.html (idempotent)
node selftest.mjs       # exécute les auto-tests du fichier (DOM minimal sous Node)
```

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète, autoportante (données embarquées incluses). |
| `build-embed.mjs` | Télécharge les 66 livres depuis getbible.net et produit le dataset. |
| `inject-embed.mjs` | Injecte/met à jour l'îlot JSON `#bible-embedded` dans `index.html`. |
| `data-martin.generated.json` | Dataset régénérable (source de la ré-injection). |
| `selftest.mjs` | Harnais de test exécutant les `runSelfTests()` du fichier sous Node. |

## Architecture (`index.html`)

`STATE · DATA · NETWORK · LOGIC (pur) · VIEW (rendu) · ACTIONS`.

Le rendu d'un chapitre suit l'ordre : **CURATED** (passages colorisés, fusionnés
avec le texte intégral) → **EMBEDDED** (texte intégral hors-ligne) → cache
`localStorage` → réseau (filet de secours uniquement si l'îlot de données n'a pas
pu être chargé).

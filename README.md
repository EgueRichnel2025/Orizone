# Orizone

**Résoudre. Comprendre. Aller plus loin.**

Orizone est une plateforme pédagogique consacrée à l'optimisation mathématique. Son objectif est de permettre aux étudiants et aux personnes intéressées par la recherche opérationnelle de résoudre des problèmes, de visualiser les calculs intermédiaires et de comprendre les méthodes utilisées.

Plutôt que de fournir uniquement un résultat numérique, Orizone ambitionne de présenter le raisonnement, les différentes étapes de calcul et les justifications mathématiques qui conduisent à une solution.

> La solution compte. Le chemin aussi.

## Objectifs du projet

Orizone a pour vocation de proposer un environnement dans lequel l'utilisateur pourra :

* Formuler des problèmes de maximisation et de minimisation.
* Définir une fonction objectif et un ensemble de contraintes.
* Choisir la nature de ses variables : réelles, entières ou binaires.
* Bénéficier d'une analyse du problème et d'une proposition de méthode de résolution adaptée.
* Suivre les calculs et comprendre les décisions prises à chaque étape.
* Visualiser les tableaux du Simplexe, les régions réalisables et les arbres de recherche.
* Comprendre les cas particuliers, notamment les problèmes irréalisables et les problèmes non bornés.
* Télécharger un rapport de résolution au format PDF ou LaTeX.

Ces fonctionnalités constituent les objectifs du projet. Elles seront développées et validées progressivement.

## État actuel du projet

Orizone est actuellement en phase de développement initial.

### Déjà en place

* Initialisation du projet avec React, TypeScript et Vite.
* Première identité visuelle : ivoire, vert profond et cuivre.
* Première page d'accueil.
* Navigation entre les principales sections.
* Fond neuronal animé, discret et adapté à l'identité visuelle.
* Première structure de la page de création d'un problème.
* Préparation des pages consacrées aux méthodes et à la documentation.

### En cours de développement

* Constructeur interactif de problèmes d'optimisation.
* Modèle de données commun pour représenter les problèmes.
* Validation mathématique des données saisies.
* Moteur de résolution du Simplexe.
* Algorithme de Branch & Bound.
* Visualisation détaillée des étapes de résolution.
* Génération des rapports PDF et LaTeX.

**Important :** les moteurs mathématiques et le formulaire interactif complet ne sont pas encore implémentés. La présence d'une page dans l'interface ne signifie pas que la fonctionnalité correspondante est déjà opérationnelle.

## Méthodes envisagées

Les méthodes seront intégrées progressivement, en prenant le cours d'optimisation mathématique comme référence.

### Programmation linéaire

* Méthode graphique.
* Méthode du Simplexe.
* Résolution par tableaux du Simplexe.
* Dualité des programmes linéaires.

### Programmation linéaire en nombres entiers

* Énumération binaire.
* Branch & Bound, également appelée méthode de séparation et d'évaluation.

### Optimisation continue et sous contraintes

* Étude de la convexité.
* Conditions d'optimalité.
* Conditions de Kuhn-Tucker.
* Théorie de la dualité et du Lagrangien.

La liste exacte des algorithmes automatisés sera définie à partir des méthodes effectivement étudiées et des fonctionnalités réalisables de manière fiable.

Les résultats devront être produits par des algorithmes mathématiques testables, et non par des réponses générées librement.

## Technologies

| Technologie   | Utilisation                                 |
| ------------- | ------------------------------------------- |
| React         | Construction de l'interface utilisateur     |
| TypeScript    | Structuration et fiabilité du code          |
| Vite          | Serveur de développement et compilation     |
| React Router  | Navigation entre les pages                  |
| Lucide React  | Icônes de l'interface                       |
| Canvas        | Animation du réseau neuronal                |
| Vitest        | Tests unitaires prévus pour les algorithmes |
| Git et GitHub | Gestion du code source                      |
| Vercel        | Déploiement prévu de l'application          |

Le projet est conçu pour pouvoir fonctionner sans backend dans un premier temps, lorsque les calculs peuvent être effectués efficacement dans le navigateur.

## Installation locale

### Prérequis

* Node.js compatible avec la version de Vite utilisée.
* npm.
* Git.

### 1. Cloner le dépôt

```bash
git clone https://github.com/EgueRichnel2025/Orizone.git
cd Orizone
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Démarrer le serveur de développement

```bash
npm run dev
```

Vite affichera l'adresse locale à ouvrir dans un navigateur, généralement :

`http://localhost:5173/`

### 4. Vérifier le projet

Compiler l'application :

```bash
npm run build
```

Vérifier les règles de qualité du code :

```bash
npm run lint
```

Prévisualiser la compilation de production :

```bash
npm run preview
```

## Organisation du code

L'organisation initiale sépare l'interface utilisateur des modules mathématiques.

```text
orizone/
├── public/
├── src/
│   ├── components/
│   │   └── background/
│   │       └── NeuralBackground.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SolvePage.tsx
│   │   └── PlaceholderPage.tsx
│   ├── styles/
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

Cette structure évoluera au fur et à mesure de l'intégration des fonctionnalités.

Les futurs modules de résolution seront séparés de l'interface afin de pouvoir les tester indépendamment et de réutiliser leurs résultats pour les visualisations et les rapports.

## Principes de développement

Orizone suivra les principes suivants :

1. **Exactitude mathématique :** chaque algorithme devra être vérifié avec des exemples dont les résultats sont connus.
2. **Traçabilité :** les étapes intermédiaires seront conservées pour expliquer les calculs.
3. **Clarté pédagogique :** chaque décision importante devra être accompagnée d'une explication compréhensible.
4. **Modularité :** les algorithmes seront indépendants des composants d'interface.
5. **Tests :** les fonctionnalités seront testées avant leur intégration définitive.
6. **Transparence :** le site distinguera une solution optimale, une solution réalisable, un problème irréalisable, un problème non borné et les cas où aucune conclusion fiable n'a pu être établie.

## Déploiement

Le déploiement public est prévu sur Vercel.

Le déploiement interviendra lorsque les fonctionnalités intégrées auront été testées et que le projet disposera d'une version de production vérifiée.

## Auteur et contribution

**Orizone** est un projet en cours de développement consacré à l'apprentissage et à la visualisation des méthodes d'optimisation mathématique.

Les contributions pourront être organisées autour des algorithmes, des tests, des visualisations et de l'amélioration de l'expérience pédagogique.

---

*Orizone — Résoudre. Comprendre. Aller plus loin.*

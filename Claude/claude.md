PROMPT MAÎTRE — REPRODUIRE FIDÈLEMENT LE SYSTÈME MURDOKU
0. Mission

Tu dois concevoir et programmer un jeu de logique inspiré très fidèlement du fonctionnement du Murdoku original, à partir des règles décrites ci-dessous.

L'objectif n'est pas de créer un simple puzzle de placement avec vérification de solution.

Le logiciel doit disposer d'un véritable moteur de contraintes logiques, capable de :

représenter précisément un plateau Murdoku ;
représenter les personnes, la victime, les objets, les zones et les fenêtres ;
calculer toutes les positions possibles et impossibles ;
propager les conséquences des contraintes ;
garantir l'existence d'une solution ;
garantir l'unicité de la solution pour chaque puzzle ;
déterminer si un puzzle est résoluble logiquement sans deviner ;
expliquer les déductions au joueur de façon humaine ;
fournir des aides à la résolution ;
permettre ultérieurement la génération automatique de nouveaux puzzles ;
permettre ultérieurement l'ajout de nouveaux types de mécanismes.

Ne mélange pas le moteur de règles, le moteur de résolution et l'interface graphique.

L'architecture doit être modulaire dès le départ.

1. Concept général

Le joueur reçoit une scène représentant un bâtiment découpé en plusieurs zones/pièces.

La scène est basée sur une grille rectangulaire.

Des personnes doivent être placées dans les cases disponibles en respectant les indices.

Parmi les personnes se trouvent :

plusieurs suspects ;
une victime.

Le but final est d'identifier le meurtrier.

Le meurtrier est la personne qui se trouve dans la même zone que la victime alors qu'elle est la seule autre personne dans cette zone.

Autrement dit :

victime + exactement un autre humain dans sa zone → cet humain est l'assassin.

2. Règle fondamentale : une personne par ligne et par colonne

C'est l'une des règles les plus importantes du jeu.

Chaque personne occupe une seule case.

Deux personnes différentes ne peuvent jamais être dans :

la même ligne ;
la même colonne.

Cette règle concerne tous les humains, y compris la victime.

Donc :

A = ligne 3, colonne 5

implique immédiatement :

aucune autre personne sur la ligne 3
aucune autre personne sur la colonne 5

Cette contrainte est globale au plateau.

Elle ne dépend pas des zones.

Deux personnes appartenant à deux pièces complètement différentes ne peuvent toujours pas partager une ligne ou une colonne.

Le moteur doit traiter cette règle comme une contrainte fondamentale et non comme une simple validation graphique.

3. Grille

Le plateau est composé de cellules.

Chaque cellule possède au minimum :

row
column
zoneId
occupancyStatus
objects

Exemple conceptuel :

{
  "row": 3,
  "column": 5,
  "zoneId": "bedroom",
  "occupancyStatus": "free",
  "objects": ["bed_01"]
}

Les coordonnées doivent être indépendantes de l'affichage.

Le système logique ne doit jamais dépendre des pixels ou des coordonnées graphiques.

4. Zones / pièces

Le plateau est découpé en zones.

Une zone est un ensemble de cases appartenant à la même pièce.

Les frontières des zones sont définies par la structure du plan.

Il n'y a pas, dans le modèle actuel, de système de portes permettant de modifier dynamiquement la définition d'une zone.

Une zone doit donc être directement identifiable par son zoneId.

Exemple :

SALON
SALON
SALON

CHAMBRE
CHAMBRE
CHAMBRE

Le système doit considérer deux cases comme appartenant à la même zone uniquement si elles possèdent le même zoneId.

5. Règle « à côté de »

La notion de proximité est volontairement stricte.

Deux positions sont « à côté » si elles sont :

immédiatement à gauche ;
immédiatement à droite ;
immédiatement au-dessus ;
immédiatement en dessous.

La diagonale ne compte jamais.

Exemple :

X A

→ X est à côté de A.

X
A

→ X est à côté de A.

Mais :

X .
. A

→ X n'est PAS à côté de A.

Condition supplémentaire essentielle

Deux éléments ne sont considérés comme « à côté » que s'ils appartiennent à la même zone.

Donc deux cases géométriquement adjacentes mais séparées par une frontière de zone ne satisfont pas la relation.

Le moteur doit appliquer cette condition systématiquement.

6. Les objets

Les objets sont des éléments graphiques présents dans la scène.

Ils sont classés en deux grandes catégories.

6.1 Objets pouvant être occupés

Exemples :

chaise ;
tapis ;
lit.

Une personne peut être placée sur une cellule associée à cet objet.

6.2 Objets ne pouvant pas être occupés

Exemples :

table ;
TV ;
plante ;
étagère ;
boîte.

Une personne ne peut jamais occuper une cellule correspondant à ces objets.

Important :

un objet non occupable reste parfaitement utilisable dans les indices.

Par exemple :

X était à côté d'une plante.

est parfaitement valide.

Une plante ne peut simplement pas recevoir une personne.

7. Objets occupant plusieurs cellules

C'est un mécanisme fondamental.

Un objet peut couvrir plusieurs cellules.

Par exemple :

[ LIT ][ LIT ]

Le lit est une seule entité, mais possède plusieurs cellules.

Le moteur ne doit jamais réduire automatiquement cet objet à une seule cellule.

Il doit conserver :

objectId = bed_01
occupiedCells = [
    (4,3),
    (5,3)
]
8. Personne sur un objet multi-cellules

Un indice tel que :

« X était sur le lit »

ne donne pas nécessairement une cellule précise.

Si le lit possède trois cellules :

A B C

alors la contrainte initiale peut être :

X ∈ {A,B,C}

et non :

X = A

Le moteur doit conserver cette incertitude.

C'est une caractéristique essentielle du jeu.

Les contraintes ultérieures peuvent ensuite réduire cette possibilité.

Exemple :

X ∈ {A,B,C}

puis :

B est sur une colonne déjà occupée

donne :

X ∈ {A,C}

Le solveur doit être capable de réaliser ce type de propagation.

9. Relation entre personne et objet multi-cellules

Lorsqu'une relation concerne un objet multi-cellules, elle doit être évaluée par rapport à chacune des cellules de l'objet.

Exemple :

X | LIT | LIT

X peut être considéré comme à gauche du lit si X est immédiatement à gauche d'au moins une cellule appartenant au lit.

Même logique pour :

à droite ;
au-dessus ;
au-dessous ;
à côté.

Ainsi, un objet multi-cellules doit être traité comme une géométrie, et non comme une simple cellule.

10. Fenêtres

La fenêtre est un objet spécial.

Elle est toujours située sur le bord extérieur d'une zone / du bâtiment.

Une fenêtre représente donc une ouverture vers l'extérieur.

Une fenêtre peut être :

positionnée à l'extrémité d'une cellule ;
placée entre deux cellules adjacentes ;
suffisamment grande pour correspondre à plusieurs positions possibles.

La notion :

« X était devant une fenêtre »

doit être modélisée comme une relation spatiale, pas comme une cellule codée en dur.

Une grande fenêtre peut donc avoir plusieurs cellules candidates.

Exemple conceptuel :

WINDOW
 ↓
[A]
[B]
[C]

alors :

X devant cette fenêtre

peut produire :

X ∈ {A,B,C}

Les autres indices détermineront éventuellement la position exacte.

Il s'agit volontairement d'une source de déduction indirecte.

11. « Même zone »

Une personne et un objet sont dans la même zone si :

person.zoneId == object.zoneId

Une personne et une autre personne sont dans la même zone si :

personA.zoneId == personB.zoneId

Cette notion est distincte de la proximité.

Deux personnes peuvent :

être dans la même zone ;
ne pas être adjacentes ;
voire être très éloignées.
12. « Avec »

Dans les indices standards du modèle actuel :

X était avec Y

signifie que X et Y se trouvaient dans la même zone.

Cela n'implique pas qu'ils soient côte à côte.

Cela n'annule jamais les contraintes globales de ligne et de colonne.

Donc :

X avec Y

implique :

zone(X) == zone(Y)

tout en conservant :

row(X) != row(Y)
column(X) != column(Y)
13. « Seul dans une zone »

Une personne est dite :

« seule »

dans une zone lorsque aucun autre humain ne se trouve dans cette même zone.

Les objets ne comptent évidemment pas comme des personnes.

Si une zone contient :

Austin

et aucun autre humain :

→ Austin est seul.

Si elle contient :

Austin
Brycen

→ Austin n'est pas seul.

Cette définition est globale à la zone.

14. Victime

La victime est un humain spécial.

Elle est soumise à toutes les contraintes générales de placement :

une seule case ;
une seule ligne ;
une seule colonne ;
position dans une case autorisée.

Mais sa position possède une règle particulière de résolution :

la victime occupe la dernière case disponible.

Dans la logique du puzzle, on place/résout d'abord les autres personnes.

Une fois les placements déterminés, la victime occupe l'unique position encore possible.

Cette règle doit être explicitement représentée dans le moteur.

Ne pas traiter la victime comme un suspect totalement indépendant lors de l'initialisation d'un puzzle.

15. Identification du meurtrier

Une fois toutes les personnes placées :

déterminer la zone de la victime ;
récupérer toutes les personnes de cette zone ;
vérifier qu'il existe exactement une autre personne ;
cette personne est le meurtrier.

Exemple :

SALON
- Vinny : victime
- Austin

→ Austin est l'assassin.

Mais :

SALON
- Vinny
- Austin
- Brycen

→ aucun des deux n'est « seul avec la victime ».

La logique d'identification doit donc être basée sur le contenu de la zone, pas simplement sur une relation individuelle.

16. Types de contraintes à supporter

Le moteur doit être conçu autour de contraintes génériques.

Ne pas coder chaque phrase d'indice comme une exception.

Créer par exemple une architecture de type :

Constraint
 ├── PositionConstraint
 ├── ZoneConstraint
 ├── ObjectConstraint
 ├── AdjacencyConstraint
 ├── RelativePositionConstraint
 ├── RowConstraint
 ├── ColumnConstraint
 ├── DistanceConstraint
 ├── GroupConstraint
 ├── ExclusivityConstraint
 ├── NegativeConstraint
 └── CompoundConstraint
17. Contraintes de zone

Exemples :

Austin est dans le salon.

Austin.zone == salon

Austin n'est pas dans le salon.

Austin.zone != salon
18. Contraintes d'objet

Exemple :

Brycen était sur un lit.

Brycen.position ∈ cells(bed)

Exemple :

Diana était sur une chaise.

Diana.position ∈ cells(all_chairs)

Si plusieurs chaises existent, toutes les cellules correspondantes constituent initialement les possibilités.

19. Contraintes d'objet avec ambiguïté

Une phrase comme :

« X était près d'une chaise »

ne doit pas choisir arbitrairement une chaise.

La contrainte signifie :

exists chair C
such that adjacent(X, C)
and sameZone(X, C)

Même logique pour :

plante ;
table ;
TV ;
lit ;
tapis ;
fenêtre ;
etc.
20. Contrainte d'adjacence

Formaliser :

adjacent(A,B)

comme :

abs(row(A)-row(B)) + abs(column(A)-column(B)) == 1

PLUS :

zone(A) == zone(B)

dans le cas des relations « à côté ».

Cette définition doit être utilisée partout de manière cohérente.

21. Direction nord / sud / est / ouest

Le moteur doit supporter des relations précises entre lignes et colonnes.

Exemples :

X est au nord de Y.

row(X) < row(Y)

X est au sud de Y.

row(X) > row(Y)

X est à gauche de Y.

column(X) < column(Y)

X est à droite de Y.

column(X) > column(Y)

Ces relations sont indépendantes des zones, sauf lorsqu'une contrainte précise explicitement une relation « à côté », qui doit respecter la règle de même zone.

22. Distances

Le moteur doit permettre des distances précises.

Exemple :

X est exactement deux lignes au nord de Y.

row(Y) - row(X) == 2

Et :

X est exactement trois colonnes à droite de Y.

column(X) - column(Y) == 3

Il faut distinguer clairement :

relation directionnelle
X est au nord de Y

→ simplement row(X) < row(Y).

relation métrique
X est exactement 2 lignes au nord de Y

→ différence exacte de 2.

Ne jamais confondre les deux.

23. Combinaisons de contraintes

Le moteur doit supporter les intersections.

Exemple :

X est dans la chambre et sur un lit.

signifie :

X.position ∈ bedroom
AND
X.position ∈ bedCells

Donc :

possiblePositions(X)
=
bedCells ∩ bedroomCells

Même principe pour toutes les autres combinaisons.

24. Contraintes négatives

Les négations doivent être supportées dans le moteur.

Exemples :

X n'est pas dans le salon.

X n'est pas à côté d'une plante.

X n'est pas sur une chaise.

X n'est pas dans la première colonne.

X n'est pas avec Y.

Les contraintes négatives deviennent importantes à partir des niveaux avancés.

L'architecture doit néanmoins les prendre en charge dès le départ.

25. Indices faisant référence à une personne définie par une propriété

Le moteur doit pouvoir représenter des concepts comme :

la seule personne assise sur une chaise.

la personne devant une fenêtre.

la personne qui est seule dans le salon.

Ces expressions ne désignent pas nécessairement une identité connue au départ.

Elles définissent un ensemble de candidats.

Exemple :

chairOccupants = {Austin, Brycen, Clara}

Une contrainte supplémentaire peut ensuite déterminer laquelle est concernée.

Il s'agit d'un mécanisme particulièrement important pour les puzzles avancés.

26. Global vs local

Le moteur doit distinguer les contraintes portant :

Sur tout le plateau

Exemple :

Il est la seule personne assise sur une chaise.

Cela signifie :

count(all humans occupying chairs) == 1
Sur une zone

Exemple :

Il est la seule personne assise sur une chaise dans le salon.

Cela signifie :

count(humans on chairs in salon) == 1

Ces deux concepts doivent être représentés différemment.

La portée d'un indice doit être explicite dans sa structure de données.

27. Aucune interprétation implicite

Très important.

Les humains peuvent tolérer des formulations ambiguës dans un livre pédagogique.

Une IA de programmation ne doit pas.

Chaque contrainte devra être représentée sous forme structurée.

Exemple :

{
  "type": "uniqueOccupant",
  "objectType": "chair",
  "scope": "board"
}

ou :

{
  "type": "uniqueOccupant",
  "objectType": "chair",
  "scope": {
    "type": "zone",
    "zoneId": "lounge"
  }
}
28. Moteur de possibilités

Pour chaque personne, le moteur doit maintenir l'ensemble des positions possibles.

Exemple :

Austin:
{R1C1, R1C3, R2C4, R3C2}

Après propagation :

Austin:
{R1C1, R3C2}

Puis :

Austin:
{R3C2}

À aucun moment il ne faut perdre l'information sur les possibilités précédentes tant qu'elle est utile au moteur pédagogique.

29. Propagation des contraintes

Le solveur doit fonctionner par propagation.

Exemple :

Austin ∈ {R2C3, R4C3}

Puis une autre personne est placée :

Brycen = R2C1

La ligne 2 devient interdite.

Donc :

Austin ∈ {R4C3}

Le solveur détecte automatiquement :

Austin = R4C3

Cette déduction doit être enregistrable comme une étape logique.

30. Historique des déductions

Chaque réduction importante doit pouvoir être enregistrée.

Exemple :

{
  "person": "Austin",
  "before": ["R2C3", "R4C3"],
  "after": ["R4C3"],
  "reason": {
    "type": "rowConflict",
    "causedBy": "Brycen",
    "blockedRow": 2
  }
}

Le moteur d'aide pourra ensuite transformer cette information technique en explication humaine.

31. Explications humaines

Le joueur ne doit pas seulement recevoir :

« Cette case est impossible. »

Le jeu doit pouvoir dire :

« Austin ne peut pas être ici parce que Brycen occupe déjà cette ligne. »

ou :

« Brycen doit être sur l'une des deux cases de ce lit. Ces deux cases sont dans la colonne 4, donc aucune autre personne ne peut être placée dans cette colonne. »

Le moteur doit donc distinguer :

preuve logique

et :

formulation pédagogique

Le texte présenté au joueur doit être généré à partir de la première.

32. Niveaux d'aides

Prévoir plusieurs niveaux d'aide.

Niveau 1

Donner une direction :

« Cherche d'abord la personne qui n'a plus qu'une seule case possible. »

Niveau 2

Révéler une déduction :

« Brycen ne peut être que dans ces deux cases. »

Niveau 3

Expliquer la raison :

« Les autres cases sont impossibles car elles sont sur des lignes déjà occupées. »

Niveau 4

Donner la déduction complète.

Niveau 5

Révéler une position.

Ne jamais être obligé de recalculer artificiellement une solution uniquement pour afficher un indice.

Le moteur de résolution est la source de vérité.

33. Déduction « intersections »

Le solveur doit notamment gérer les situations du type :

Austin ∈ {A,B}

et :

A et B sont toutes les deux dans la colonne 4

Alors :

aucune autre personne ne peut être dans la colonne 4.

Même si Austin n'est pas encore précisément localisé.

C'est une subtilité fondamentale des puzzles.

Le moteur doit donc raisonner sur des ensembles de possibilités, pas seulement sur les positions certaines.

34. « Une seule position dans une ligne/colonne »

Même logique pour les positions.

Si toutes les possibilités d'une personne dans une région donnée tombent sur la même colonne, cette colonne devient réservée à cette personne.

Le solveur doit rechercher ce type de structure.

Cette logique est analogue aux méthodes avancées de jeux de grille :

possibleCells(X) ⊆ column 4

donc :

other humans cannot occupy column 4
35. Unicité du puzzle

Chaque puzzle doit avoir une solution unique.

Il ne suffit pas d'avoir :

solutionCount >= 1

Il faut :

solutionCount == 1

Le générateur/éditeur doit pouvoir lancer un solveur indépendant afin de vérifier cette propriété.

36. Pas de devinette obligatoire

Un puzzle considéré comme correctement construit doit être résoluble par logique.

Le moteur doit pouvoir distinguer :

solution unique

de :

solution unique mais nécessitant un choix arbitraire

Un futur système de génération devra donc pouvoir mesurer les étapes de résolution utilisées.

37. Difficulté

La difficulté ne doit pas être calculée uniquement à partir du nombre de cellules ou du nombre de suspects.

Exemples :

Un puzzle 6×6 très simple peut être plus facile qu'un 4×4 utilisant plusieurs relations complexes.

La difficulté doit pouvoir prendre en compte :

nombre de déductions ;
profondeur des chaînes de déduction ;
dépendances entre indices ;
nombre de possibilités ambiguës ;
nombre de contraintes négatives ;
utilisation des objets multi-cellules ;
utilisation des fenêtres ambiguës ;
relations entre personnes ;
relations personne ↔ objet ;
contraintes globales ;
contraintes locales ;
nécessité de combiner plusieurs types de raisonnement ;
éventuellement raisonnement conditionnel dans des niveaux extrêmement avancés.
38. Catégories de difficulté initiales

Prévoir une architecture permettant au minimum :

Beginner
Intermediate
Advanced
Expert

Mais ne jamais réduire la difficulté à :

nombre de suspects

ou :

taille de grille

La difficulté doit être liée à la complexité logique réellement nécessaire pour résoudre le puzzle.

39. Générateur futur

Même si la V1 ne génère pas encore automatiquement des puzzles, l'architecture doit être compatible avec cette évolution.

Prévoir un système capable plus tard de :

générer une scène ;
positionner les objets ;
générer des personnes ;
générer une solution complète ;
produire des indices ;
vérifier que les indices correspondent à la solution ;
vérifier l'unicité ;
résoudre le puzzle ;
analyser la difficulté ;
rejeter les puzzles trop faciles ou trop difficiles ;
produire une progression cohérente.

Le générateur ne doit jamais être autorisé à produire un puzzle simplement parce qu'une solution existe.

Il faut vérifier :

validité
+
unicité
+
résolvabilité logique
+
niveau de difficulté
40. Architecture extensible

Créer une architecture dans laquelle on peut ajouter ultérieurement :

NewConstraintType
NewObjectType
NewSpatialRelation
NewHintStrategy
NewDifficultyMetric
NewPuzzleGeneratorRule

sans modifier profondément le cœur du système.

Par exemple, un futur mécanisme pourrait être :

« X était à exactement deux cases d'une plante. »

Il doit être possible de l'ajouter comme nouveau type de contrainte.

41. Séparation recommandée des modules

Architecture conceptuelle :

PuzzleModel
    ↓
ConstraintEngine
    ↓
PossibilityEngine
    ↓
Solver
    ↓
Proof / Deduction Engine
    ↓
Hint Engine

Et séparément :

UI

ainsi que :

PuzzleEditor
PuzzleGenerator
DifficultyAnalyzer
42. Modèle de données minimal

Prévoir des structures équivalentes à :

Puzzle
{
  "grid": {},
  "zones": [],
  "objects": [],
  "people": [],
  "victim": {},
  "constraints": [],
  "solution": {}
}
Personne
{
  "id": "austin",
  "name": "Austin",
  "role": "suspect"
}
Victime
{
  "id": "vinny",
  "name": "Vinny",
  "role": "victim"
}
Objet
{
  "id": "bed_01",
  "type": "bed",
  "occupiable": true,
  "cells": [
    [4,3],
    [5,3]
  ]
}
Fenêtre
{
  "id": "window_01",
  "type": "window",
  "occupiable": false,
  "cellsFacingWindow": [
    [1,5],
    [2,5],
    [3,5]
  ]
}
43. Représentation de la solution

La solution doit être indépendante du rendu.

Exemple :

{
  "placements": {
    "austin": [3,2],
    "brycen": [5,4],
    "charlene": [2,6],
    "vinny": [6,1]
  },
  "killer": "austin"
}
44. Vérificateur de solution

Créer une fonction du type :

validateSolution(puzzle, solution)

qui vérifie toutes les règles.

Elle doit notamment contrôler :

cases valides ;
objets occupables ;
une personne par cellule ;
une personne par ligne ;
une personne par colonne ;
contraintes de zones ;
contraintes d'objets ;
contraintes de voisinage ;
contraintes directionnelles ;
distances ;
négations ;
contraintes globales ;
règle de la victime ;
identification finale du meurtrier.
45. Solveur indépendant

Le solveur doit être capable de répondre :

solve(puzzle)

et produire :

0 solution
1 solution
plusieurs solutions

Il doit aussi produire un arbre ou historique des déductions.

46. Ne jamais coder les solutions en dur

Un puzzle ne doit pas être représenté simplement comme :

Austin = R3C2
Brycen = R5C4
...

puis afficher la solution lorsque le joueur termine.

La solution peut être stockée pour validation, mais le moteur doit pouvoir la retrouver à partir des contraintes.

47. Mode joueur

L'interface devra permettre progressivement :

placement d'une personne ;
retrait ;
marquage d'une case impossible ;
affichage des possibilités ;
annulation ;
refaire ;
demande d'indice ;
vérification ;
affichage éventuel des raisons.

Prévoir la possibilité d'une interaction proche du support papier.

48. Attention à l'incertitude

Le logiciel ne doit jamais transformer une possibilité en certitude simplement parce qu'elle semble probable.

Exemple :

Austin peut être sur les cases A ou B.

Le moteur doit conserver :

A OR B

et ne jamais choisir arbitrairement A.

C'est une règle fondamentale pour préserver l'intégrité logique du puzzle.

49. Attention aux objets multiples

Ne jamais implémenter :

bed = cell

mais :

bed = entity + set of cells

Même chose pour :

tapis ;
longues tables si le futur jeu en comporte ;
fenêtres ;
autres objets futurs.
50. Attention aux références multiples

Un indice :

« à côté d'une chaise »

doit rechercher toutes les chaises pertinentes.

Un indice :

« sur un lit »

doit rechercher tous les lits pertinents.

Un indice :

« devant une fenêtre »

doit rechercher toutes les positions valides face à cette fenêtre.

Ne jamais sélectionner arbitrairement le premier objet trouvé.

51. Fidélité avant innovation

Dans la première version :

ne pas inventer de nouvelles règles.

Le moteur doit reproduire le fonctionnement observé du Murdoku.

Les mécanismes supplémentaires devront être identifiés explicitement comme :

EXTENSION

et jamais introduits silencieusement.

L'objectif initial est :

reproduire fidèlement le jeu original.

L'objectif secondaire est :

construire une architecture assez propre pour permettre ensuite de créer de nouveaux Murdoku.

52. Gestion des phrases d'indices

Le système de données interne ne doit pas dépendre directement de phrases en langage naturel.

Exemple :

Phrase :

« Brycen était sur un lit. »

Doit devenir quelque chose comme :

{
  "type": "occupiesObjectType",
  "person": "brycen",
  "objectType": "bed"
}

Phrase :

« Charlene était devant une fenêtre. »

devient :

{
  "type": "inFrontOfObjectType",
  "person": "charlene",
  "objectType": "window"
}

Cette séparation permettra plus tard :

de traduire les indices ;
de reformuler les indices ;
de générer automatiquement des indices ;
d'analyser leur difficulté.
53. Moteur de preuve

Chaque déduction produite par le solveur doit idéalement avoir une justification structurée.

Exemple :

{
  "deductionType": "elimination",
  "subject": "austin",
  "eliminatedCell": [3,4],
  "reason": {
    "type": "columnOccupied",
    "by": "brycen",
    "column": 4
  }
}

Puis :

{
  "deductionType": "forcedPlacement",
  "subject": "austin",
  "cell": [3,2],
  "basedOn": [
    "deduction_17",
    "deduction_23"
  ]
}

L'objectif est de pouvoir reconstruire pourquoi le solveur sait quelque chose.

54. Différence entre solveur et joueur

Le solveur peut être beaucoup plus puissant que les techniques pédagogiques affichées au joueur.

Mais le mode aide ne doit pas nécessairement révéler immédiatement toute la puissance du solveur.

Il faut pouvoir classer les déductions :

basic
intermediate
advanced
expert

afin que les aides soient adaptées au niveau du puzzle.

55. Analyse automatique d'un puzzle

Créer une fonction conceptuelle :

analyzeDifficulty(puzzle)

qui retourne par exemple :

{
  "difficulty": "advanced",
  "score": 72,
  "deductionCount": 31,
  "maxReasoningDepth": 5,
  "negativeConstraints": 4,
  "multiCellObjectUsage": 3,
  "windowAmbiguity": 1
}

Les valeurs exactes restent à définir expérimentalement.

Le système doit être conçu pour pouvoir améliorer cet algorithme plus tard.

56. Validation d'un puzzle

Avant qu'un puzzle soit considéré comme valide :

1. scène valide
2. objets valides
3. personnes valides
4. contraintes cohérentes
5. au moins une solution
6. exactement une solution
7. solution cohérente avec la règle du meurtrier
8. résolution sans contradiction
9. niveau de difficulté compatible avec la catégorie annoncée
57. Extensibilité future : nouveaux mécanismes

Prévoir la possibilité d'ajouter ultérieurement des mécanismes comme :

distance
ordre
comptage
groupes
objets spéciaux
relations entre plusieurs objets
contraintes conditionnelles
contraintes logiques composées

sans réécrire :

grid engine
UI
solver core
hint engine
58. Philosophie générale du projet

Le Murdoku n'est pas simplement :

« trouver une case correcte ».

C'est un système de contraintes spatiales dans lequel :

une information
        ↓
réduit les possibilités
        ↓
ce qui bloque une ligne / colonne
        ↓
ce qui réduit d'autres possibilités
        ↓
ce qui permet une nouvelle déduction
        ↓
etc.

Le moteur doit reproduire cette cascade logique.

La qualité du projet sera jugée autant sur sa capacité à expliquer les raisonnements que sur sa capacité à trouver la solution.

59. Priorités de développement

Ordre recommandé :

Phase 1

Modèle de données.

Phase 2

Grille + zones + objets.

Phase 3

Règle ligne/colonne.

Phase 4

Personnes + victime.

Phase 5

Contraintes d'objets.

Phase 6

Contraintes spatiales.

Phase 7

Solveur.

Phase 8

Propagation des possibilités.

Phase 9

Historique des déductions.

Phase 10

Système d'indices.

Phase 11

Vérification d'unicité.

Phase 12

Analyse de difficulté.

Phase 13

Éditeur de puzzles.

Phase 14

Générateur automatique.

60. Exigence finale

Avant d'écrire du code, commence par produire :

l'architecture technique proposée ;
le modèle de données complet ;
la liste des types de contraintes ;
l'algorithme du solveur ;
la méthode de propagation des possibilités ;
le système de preuve/déduction ;
le système d'aide ;
le système de validation d'unicité ;
le système d'analyse de difficulté ;
les points de l'architecture préparés pour les futures extensions.

Ensuite seulement commencer l'implémentation.

À chaque étape, privilégier la généralité, la testabilité et la capacité d'explication plutôt qu'une solution rapide ou codée en dur.

CONTRAINTE ABSOLUE

Ne simplifie pas le fonctionnement du jeu pour faciliter son développement.

En particulier, ne transforme jamais :

un objet multi-cellules en cellule unique ;
une fenêtre en cellule unique ;
« à côté » en simple proximité géométrique ;
une zone en simple rectangle ;
« avec » en « à côté » ;
une possibilité en certitude ;
un indice global en indice local ;
une déduction en simple vérification de solution.

Le logiciel doit conserver les ambiguïtés intentionnelles du puzzle, car ces ambiguïtés sont précisément ce qui produit les déductions intéressantes.

Sources de cadrage

Les règles de base ci-dessus sont alignées avec les exemples et règles que tu m'as fournis en photo et avec les matériaux officiels Murdoku que j'ai vérifiés, notamment concernant l'unicité ligne/colonne, les objets occupables, les relations « à côté », les zones et les mécanismes de déduction.

Et franchement, il y a un truc que je trouve particulièrement intéressant dans ce cahier des charges : on ne construit pas simplement un jeu de Murdoku, on construit son “cerveau”. Le jour où on attaquera le générateur, ce même cerveau pourra nous dire non seulement « ce puzzle a une solution », mais aussi « il est trop facile, parce que la solution tombe en trois déductions » ou au contraire « celui-ci nécessite une cascade de raisonnement de niveau expert »
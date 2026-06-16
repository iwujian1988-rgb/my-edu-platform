// mock.ts — 数据注册中心（1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/data/mock.js）
// ESM 要求所有 import 在顶部；原 JS 把 import 散落在文件中，这里统一搬到顶部。
// 数据保持字面量形式，TS 推断类型；helper 函数加显式签名供外部使用。
import sefImport from '../sef-import.json'
import courseImport from '../course-import.json'
import { getManifestCourses } from './contentManifest'

// ─── Levels ────────────────────────────────────────────────────────
export const levels = [
  { code: 'A1', slug: 'a1-debutant', label: 'Débutant', color: 'green', tagline: 'Je découvre le français parlé.', count: 822 },
  { code: 'A2', slug: 'a2-elementaire', label: 'Élémentaire', color: 'blue', tagline: 'Je comprends des situations simples.', count: 1189 },
  { code: 'B1', slug: 'b1-intermediaire', label: 'Intermédiaire', color: 'orange', tagline: 'Je peux discuter de sujets variés.', count: 1384 },
  { code: 'B2', slug: 'b2-avance', label: 'Avancé', color: 'purple', tagline: "Je comprends l'essentiel de tout contenu.", count: 761 },
]

// ─── Themes ────────────────────────────────────────────────────────
export const themes = [
  { slug: 'actualite', label: 'Actualité', icon: '📰', fullLabel: 'Actualité, géopolitique', levels: ['A1','A2','B1','B2'], exerciseCount: 890 },
  { slug: 'culture', label: 'Culture', icon: '🎭', fullLabel: 'Culture et littérature', levels: ['A1','A2','B1','B2'], exerciseCount: 624 },
  { slug: 'droits-humains', label: 'Droits humains', icon: '⚖️', fullLabel: 'Droits humains', levels: ['B1','B2'], exerciseCount: 156 },
  { slug: 'education-medias', label: 'Éducation aux médias', icon: '📺', fullLabel: 'Éducation aux médias', levels: ['A2','B1','B2'], exerciseCount: 210 },
  { slug: 'histoire', label: 'Histoire', icon: '🏛️', fullLabel: 'Histoire', levels: ['A2','B1','B2'], exerciseCount: 320 },
  { slug: 'jeunesse', label: 'Jeunesse', icon: '🎒', fullLabel: 'Jeunesse', levels: ['A1','A2'], exerciseCount: 180 },
  { slug: 'langues', label: 'Langues', icon: '💬', fullLabel: 'Langues et francophonie', levels: ['A1','A2','B1','B2'], exerciseCount: 440 },
  { slug: 'sciences', label: 'Sciences', icon: '🔬', fullLabel: 'Sciences, innovation et environnement', levels: ['A2','B1','B2'], exerciseCount: 378 },
  { slug: 'vie-quotidienne', label: 'Vie quotidienne', icon: '🏠', fullLabel: 'Vie quotidienne, sport, tourisme', levels: ['A1','A2','B1','B2'], exerciseCount: 1351 },
]

// ─── Collections (publisher series) ────────────────────────────────
export const collections = [
  { id: 1, slug: 'agenda', title: 'Agenda', description: 'Des vidéos authentiques sur la vie quotidienne en France.', levels: ['A1','A2','B1'], exerciseCount: 236, featured: true },
  { id: 2, slug: 'interface', title: 'Interface', description: 'Des contenus interactifs pour apprendre le français.', levels: ['A1','A2'], exerciseCount: 124, featured: false },
  { id: 3, slug: 'alter-ego', title: 'Mon alter ego', description: 'Méthode de français basée sur des situations réelles.', levels: ['A1','A2','B1','B2'], exerciseCount: 312, featured: true },
  { id: 4, slug: 'saison', title: 'Saison', description: 'Exercices structurés par niveau et compétence.', levels: ['A1','A2','B1','B2'], exerciseCount: 198, featured: false },
  { id: 5, slug: 'cosmopolite', title: 'Cosmopolite', description: 'Voyagez à travers le monde francophone.', levels: ['A1','A2'], exerciseCount: 86, featured: true },
  { id: 6, slug: 'totem', title: 'Totem', description: 'Méthode communicative pour grands débutants.', levels: ['A1','A2','B1'], exerciseCount: 144, featured: false },
  { id: 7, slug: 'adomania', title: 'Adomania', description: 'Vies de collégiens — apprenez avec des adolescents français.', levels: ['A1'], exerciseCount: 68, featured: false },
  { id: 8, slug: 'super-easy-french', title: 'Super Easy French', description: 'Vidéos courtes et lentes pour débuter en français.', levels: ['A1','A2'], exerciseCount: 17, featured: true },
]

// ─── Exercises ─────────────────────────────────────────────────────
export const exercises = [
  {
    id: 1, title: 'À la boulangerie', level: 'A1', theme: 'Vie quotidienne',
    collectionId: 1, collection: 'Agenda', thumbnail: null,
    description: 'Apprenez à commander du pain dans une boulangerie française.',
    duration: 90, video: { url: '', duration: 90 },
    steps: [
      {
        type: 'fill_blank', videoSegment: { start: 0, end: 15 },
        instruction: 'Écoutez et complétez la phrase.',
        segments: [
          { type: 'text', content: 'Bonjour, je voudrais une baguette, s\'il vous ' },
          { type: 'blank', id: 1, answer: 'plaît' },
          { type: 'text', content: '.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 15, end: 30 },
        instruction: 'Que dit le boulanger ?',
        question: 'Le boulanger propose aussi...',
        options: [
          { id: 'a', text: 'des croissants' }, { id: 'b', text: 'un gâteau' },
          { id: 'c', text: 'du fromage' }, { id: 'd', text: 'du vin' },
        ],
        correct: 'a', explanation: 'Le boulanger dit : « Et avec ceci, des croissants ? »',
      },
      {
        type: 'true_false', videoSegment: { start: 30, end: 50 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'La baguette coûte un euro.', correct: true },
          { id: 2, text: 'La cliente achète trois baguettes.', correct: false },
          { id: 3, text: 'Le boulanger est aimable.', correct: true },
        ],
      },
      {
        type: 'reorder', videoSegment: { start: 50, end: 70 },
        instruction: 'Remettez les phrases dans l\'ordre chronologique.',
        items: [
          { id: 1, text: 'Merci beaucoup, au revoir !' },
          { id: 2, text: 'Bonjour madame !' },
          { id: 3, text: 'Ça fait un euro quatre-vingts.' },
          { id: 4, text: 'Je voudrais une baguette, s\'il vous plaît.' },
        ],
        correctOrder: [2, 4, 3, 1],
      },
    ],
  },
  {
    id: 2, title: 'Le métro parisien', level: 'A2', theme: 'Vie quotidienne',
    collectionId: 1, collection: 'Agenda', thumbnail: null,
    description: 'Découvrez comment prendre le métro à Paris.',
    duration: 120, video: { url: '', duration: 120 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 20 },
        instruction: 'Répondez à la question.',
        question: 'Combien de lignes compte le métro parisien ?',
        options: [
          { id: 'a', text: '10 lignes' }, { id: 'b', text: '14 lignes' },
          { id: 'c', text: '16 lignes' }, { id: 'd', text: '20 lignes' },
        ],
        correct: 'b', explanation: 'Le métro de Paris compte 14 lignes principales.',
      },
      {
        type: 'fill_blank', videoSegment: { start: 20, end: 40 },
        instruction: 'Complétez les phrases.',
        segments: [
          { type: 'text', content: 'Pour prendre le métro, il faut d\'abord acheter un ' },
          { type: 'blank', id: 1, answer: 'billet' },
          { type: 'text', content: ' au guichet ou dans un distributeur.' },
        ],
      },
      {
        type: 'match_pairs', videoSegment: { start: 40, end: 60 },
        instruction: 'Associez chaque mot à sa définition.',
        pairs: [
          { left: 'RER', right: 'Train express régional' },
          { left: 'Correspondance', right: 'Changement de ligne' },
          { left: 'Terminus', right: 'Fin de la ligne' },
          { left: 'Quai', right: 'Là où on attend le train' },
        ],
      },
      {
        type: 'true_false', videoSegment: { start: 60, end: 80 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'Le métro fonctionne 24h/24.', correct: false },
          { id: 2, text: 'Le ticket t+ permet de prendre le métro et le bus.', correct: true },
          { id: 3, text: 'La ligne 1 relie La Défense à Château de Vincennes.', correct: true },
        ],
      },
    ],
  },
  {
    id: 3, title: 'Recette de crêpes', level: 'A1', theme: 'Vie quotidienne',
    collectionId: 2, collection: 'Interface', thumbnail: null,
    description: 'Suivez une recette traditionnelle pour faire des crêpes.',
    duration: 100, video: { url: '', duration: 100 },
    steps: [
      {
        type: 'reorder', videoSegment: { start: 0, end: 20 },
        instruction: 'Remettez les ingrédients dans l\'ordre de la recette.',
        items: [
          { id: 1, text: 'Ajouter le lait petit à petit.' },
          { id: 2, text: 'Mettre la farine dans un saladier.' },
          { id: 3, text: 'Cuire les crêpes dans une poêle.' },
          { id: 4, text: 'Casser les œufs au centre.' },
        ],
        correctOrder: [2, 4, 1, 3],
      },
      {
        type: 'fill_blank', videoSegment: { start: 20, end: 40 },
        instruction: 'Complétez la recette.',
        segments: [
          { type: 'text', content: 'Il faut 250 grammes de ' },
          { type: 'blank', id: 1, answer: 'farine' },
          { type: 'text', content: ', 4 ' },
          { type: 'blank', id: 2, answer: 'œufs' },
          { type: 'text', content: ' et un demi-litre de lait.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 40, end: 60 },
        instruction: 'Choisissez la bonne réponse.',
        question: 'Quand mange-t-on traditionnellement des crêpes en France ?',
        options: [
          { id: 'a', text: 'Le 14 juillet' }, { id: 'b', text: 'Le jour de Noël' },
          { id: 'c', text: 'La Chandeleur (2 février)' }, { id: 'd', text: 'Le 1er janvier' },
        ],
        correct: 'c', explanation: 'La Chandeleur, le 2 février, est le jour traditionnel des crêpes en France.',
      },
      {
        type: 'true_false', videoSegment: { start: 60, end: 80 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'On utilise du beurre pour cuire les crêpes.', correct: true },
          { id: 2, text: 'Les crêpes bretonnes sont toujours sucrées.', correct: false },
        ],
      },
    ],
  },
  {
    id: 4, title: "Un entretien d'embauche", level: 'B1', theme: 'Vie quotidienne',
    collectionId: 3, collection: 'Alter Ego+', thumbnail: null,
    description: "Préparez-vous à un entretien d'embauche en français.",
    duration: 150, video: { url: '', duration: 150 },
    steps: [
      {
        type: 'match_pairs', videoSegment: { start: 0, end: 25 },
        instruction: 'Associez chaque question à la bonne réponse.',
        pairs: [
          { left: 'Parlez-moi de vous.', right: 'Je suis diplômé en marketing.' },
          { left: 'Quelle est votre expérience ?', right: "J'ai travaillé 3 ans chez Renault." },
          { left: 'Pourquoi ce poste ?', right: 'Il correspond à mes compétences.' },
          { left: 'Vos qualités ?', right: 'Je suis rigoureux et créatif.' },
        ],
      },
      {
        type: 'fill_blank', videoSegment: { start: 25, end: 50 },
        instruction: 'Complétez avec le mot correct.',
        segments: [
          { type: 'text', content: 'Je suis très ' },
          { type: 'blank', id: 1, answer: 'motivé' },
          { type: 'text', content: " par cette offre d'emploi car elle correspond à mon " },
          { type: 'blank', id: 2, answer: 'parcours' },
          { type: 'text', content: ' professionnel.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 50, end: 75 },
        instruction: 'Choisissez la formulation la plus polie.',
        question: 'Comment demander le salaire ?',
        options: [
          { id: 'a', text: 'Combien je vais gagner ?' },
          { id: 'b', text: 'Quel est le salaire proposé pour ce poste ?' },
          { id: 'c', text: 'Je veux savoir le salaire.' },
          { id: 'd', text: "L'argent, c'est combien ?" },
        ],
        correct: 'b', explanation: 'La formulation B est la plus professionnelle et polie.',
      },
      {
        type: 'reorder', videoSegment: { start: 75, end: 100 },
        instruction: "Remettez les étapes de l'entretien dans l'ordre.",
        items: [
          { id: 1, text: 'Poser des questions sur le poste.' },
          { id: 2, text: "Se présenter et s'asseoir." },
          { id: 3, text: 'Remercier le recruteur.' },
          { id: 4, text: "Frapper à la porte et entrer." },
        ],
        correctOrder: [4, 2, 1, 3],
      },
    ],
  },
  {
    id: 5, title: 'Les accents de France', level: 'B2', theme: 'Culture',
    collectionId: 4, collection: 'Saison', thumbnail: null,
    description: 'Explorez la diversité des accents régionaux en France.',
    duration: 180, video: { url: '', duration: 180 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 30 },
        instruction: 'Répondez à la question.',
        question: 'Quel accent est souvent considéré comme le plus « chantant » ?',
        options: [
          { id: 'a', text: "L'accent alsacien" }, { id: 'b', text: "L'accent provençal" },
          { id: 'c', text: "L'accent marseillais" }, { id: 'd', text: "L'accent breton" },
        ],
        correct: 'c', explanation: "L'accent marseillais du sud est connu pour sa musicalité.",
      },
      {
        type: 'fill_blank', videoSegment: { start: 30, end: 60 },
        instruction: 'Complétez.',
        segments: [
          { type: 'text', content: 'En France, il existe de nombreux ' },
          { type: 'blank', id: 1, answer: 'accents' },
          { type: 'text', content: ' régionaux qui reflètent la ' },
          { type: 'blank', id: 2, answer: 'diversité' },
          { type: 'text', content: ' culturelle du pays.' },
        ],
      },
      {
        type: 'true_false', videoSegment: { start: 60, end: 90 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: "L'accent parisien est considéré comme « neutre ».", correct: true },
          { id: 2, text: 'Tous les Français parlent avec un accent régional.', correct: false },
          { id: 3, text: "L'accent du Midi prononce le « e » muet.", correct: true },
        ],
      },
      {
        type: 'reorder', videoSegment: { start: 90, end: 120 },
        instruction: 'Classez ces régions du nord au sud.',
        items: [
          { id: 1, text: "Provence-Alpes-Côte d'Azur" },
          { id: 2, text: 'Bretagne' },
          { id: 3, text: 'Occitanie' },
          { id: 4, text: 'Hauts-de-France' },
        ],
        correctOrder: [4, 2, 3, 1],
      },
    ],
  },
  {
    id: 6, title: 'Faire les courses', level: 'A2', theme: 'Vie quotidienne',
    collectionId: 1, collection: 'Agenda', thumbnail: null,
    description: 'Apprenez le vocabulaire pour faire les courses au marché.',
    duration: 110, video: { url: '', duration: 110 },
    steps: [
      {
        type: 'match_pairs', videoSegment: { start: 0, end: 20 },
        instruction: 'Associez chaque produit à son rayon.',
        pairs: [
          { left: 'Poulet', right: 'Boucherie' },
          { left: 'Camembert', right: 'Crèmerie' },
          { left: 'Pommes', right: 'Fruits et légumes' },
          { left: 'Saumon', right: 'Poissonnerie' },
        ],
      },
      {
        type: 'fill_blank', videoSegment: { start: 20, end: 40 },
        instruction: 'Complétez le dialogue.',
        segments: [
          { type: 'text', content: '— Je vais prendre deux kilos de ' },
          { type: 'blank', id: 1, answer: 'tomates' },
          { type: 'text', content: ", s'il vous plaît.\n— Voilà, ça vous " },
          { type: 'blank', id: 2, answer: 'fait' },
          { type: 'text', content: ' quatre euros.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 40, end: 60 },
        instruction: 'Choisissez la bonne réponse.',
        question: 'Où peut-on acheter du pain en France ?',
        options: [
          { id: 'a', text: 'Au supermarché seulement' }, { id: 'b', text: 'À la boulangerie' },
          { id: 'c', text: 'À la pharmacie' }, { id: 'd', text: 'Au restaurant' },
        ],
        correct: 'b',
      },
      {
        type: 'reorder', videoSegment: { start: 60, end: 80 },
        instruction: 'Remettez le dialogue dans l\'ordre.',
        items: [
          { id: 1, text: 'Merci, bonne journée !' },
          { id: 2, text: 'Bonjour, je voudrais des tomates.' },
          { id: 3, text: 'Elles sont à combien le kilo ?' },
          { id: 4, text: 'Deux euros le kilo.' },
        ],
        correctOrder: [2, 3, 4, 1],
      },
    ],
  },
  {
    id: 7, title: 'Au restaurant', level: 'A1', theme: 'Vie quotidienne',
    collectionId: 7, collection: 'Adomania', thumbnail: null,
    description: 'Commandez un repas au restaurant en français.',
    duration: 85, video: { url: '', duration: 85 },
    steps: [
      {
        type: 'fill_blank', videoSegment: { start: 0, end: 15 },
        instruction: 'Complétez le dialogue.',
        segments: [
          { type: 'text', content: '— Bonsoir, une table pour ' },
          { type: 'blank', id: 1, answer: 'deux' },
          { type: 'text', content: ' personnes, s\'il vous plaît.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 15, end: 30 },
        instruction: 'Choisissez la bonne réponse.',
        question: 'Que signifie « l\'addition, s\'il vous plaît » ?',
        options: [
          { id: 'a', text: 'Je veux le menu' }, { id: 'b', text: 'Je veux payer' },
          { id: 'c', text: 'Je veux commander' }, { id: 'd', text: 'Je veux partir' },
        ],
        correct: 'b',
      },
      {
        type: 'match_pairs', videoSegment: { start: 30, end: 50 },
        instruction: 'Associez chaque plat à sa catégorie.',
        pairs: [
          { left: 'Escargots', right: 'Entrée' },
          { left: 'Steak-frites', right: 'Plat principal' },
          { left: 'Crème brûlée', right: 'Dessert' },
          { left: 'Fromage', right: 'Entre plat et dessert' },
        ],
      },
      {
        type: 'true_false', videoSegment: { start: 50, end: 70 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'En France, le pourboire est obligatoire.', correct: false },
          { id: 2, text: 'Le menu du jour est souvent moins cher.', correct: true },
        ],
      },
    ],
  },
  {
    id: 8, title: 'Le système éducatif', level: 'B1', theme: 'Actualité',
    collectionId: 5, collection: 'Cosmopolite', thumbnail: null,
    description: 'Découvrez comment fonctionne l\'école en France.',
    duration: 140, video: { url: '', duration: 140 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 25 },
        instruction: 'Répondez à la question.',
        question: 'À quel âge les enfants entrent-ils à l\'école primaire en France ?',
        options: [
          { id: 'a', text: '4 ans' }, { id: 'b', text: '5 ans' },
          { id: 'c', text: '6 ans' }, { id: 'd', text: '7 ans' },
        ],
        correct: 'c',
      },
      {
        type: 'fill_blank', videoSegment: { start: 25, end: 50 },
        instruction: 'Complétez.',
        segments: [
          { type: 'text', content: 'Le baccalauréat, souvent appelé le ' },
          { type: 'blank', id: 1, answer: 'bac' },
          { type: 'text', content: ', est l\'examen de fin d\'études ' },
          { type: 'blank', id: 2, answer: 'secondaires' },
          { type: 'text', content: ' en France.' },
        ],
      },
      {
        type: 'reorder', videoSegment: { start: 50, end: 75 },
        instruction: 'Remettez les niveaux dans l\'ordre.',
        items: [
          { id: 1, text: 'Lycée' },
          { id: 2, text: 'École maternelle' },
          { id: 3, text: 'Collège' },
          { id: 4, text: 'École primaire' },
        ],
        correctOrder: [2, 4, 3, 1],
      },
      {
        type: 'true_false', videoSegment: { start: 75, end: 100 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'L\'école est obligatoire de 3 à 16 ans.', correct: true },
          { id: 2, text: 'Le dimanche est un jour d\'école.', correct: false },
          { id: 3, text: 'Les élèves portent un uniforme.', correct: false },
        ],
      },
    ],
  },
  {
    id: 9, title: "L'environnement", level: 'B2', theme: 'Sciences',
    collectionId: 4, collection: 'Saison', thumbnail: null,
    description: "Comprenez les enjeux environnementaux actuels en français.",
    duration: 160, video: { url: '', duration: 160 },
    steps: [
      {
        type: 'fill_blank', videoSegment: { start: 0, end: 25 },
        instruction: 'Complétez avec le bon mot.',
        segments: [
          { type: 'text', content: 'Le changement ' },
          { type: 'blank', id: 1, answer: 'climatique' },
          { type: 'text', content: ' est l\'un des plus grands ' },
          { type: 'blank', id: 2, answer: 'défis' },
          { type: 'text', content: ' de notre époque.' },
        ],
      },
      {
        type: 'multiple_choice', videoSegment: { start: 25, end: 50 },
        instruction: 'Choisissez la bonne réponse.',
        question: 'Que signifie « développement durable » ?',
        options: [
          { id: 'a', text: 'Croissance rapide' }, { id: 'b', text: 'Développement économique sans limite' },
          { id: 'c', text: 'Répondre aux besoins du présent sans compromettre l\'avenir' }, { id: 'd', text: 'Construire des villes' },
        ],
        correct: 'c',
      },
      {
        type: 'match_pairs', videoSegment: { start: 50, end: 75 },
        instruction: 'Associez chaque action à son impact.',
        pairs: [
          { left: 'Recycler', right: 'Réduire les déchets' },
          { left: 'Utiliser les transports en commun', right: 'Moins de pollution' },
          { left: 'Manger local', right: 'Réduire les émissions de CO₂' },
          { left: 'Éteindre les lumières', right: 'Économiser l\'énergie' },
        ],
      },
      {
        type: 'true_false', videoSegment: { start: 75, end: 100 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'La France a signé l\'accord de Paris sur le climat.', correct: true },
          { id: 2, text: 'Le réchauffement de 2°C est sans conséquence.', correct: false },
          { id: 3, text: 'Les énergies renouvelables remplacent totalement les énergies fossiles en France.', correct: false },
        ],
      },
    ],
  },
  {
    id: 10, title: 'Le sport français', level: 'A2', theme: 'Vie quotidienne',
    collectionId: 2, collection: 'Interface', thumbnail: null,
    description: 'Découvrez les sports les plus populaires en France.',
    duration: 95, video: { url: '', duration: 95 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 20 },
        instruction: 'Quel est le sport le plus populaire en France ?',
        question: 'Quel sport est le plus regardé ?',
        options: [
          { id: 'a', text: 'Le rugby' }, { id: 'b', text: 'Le football' },
          { id: 'c', text: 'Le tennis' }, { id: 'd', text: 'Le basket' },
        ],
        correct: 'b',
      },
      {
        type: 'fill_blank', videoSegment: { start: 20, end: 40 },
        instruction: 'Complétez.',
        segments: [
          { type: 'text', content: 'Le Tour de ' },
          { type: 'blank', id: 1, answer: 'France' },
          { type: 'text', content: ' est une course cycliste célèbre dans le monde entier.' },
        ],
      },
      {
        type: 'reorder', videoSegment: { start: 40, end: 60 },
        instruction: 'Remettez les événements sportifs dans l\'ordre chronologique.',
        items: [
          { id: 1, text: 'Coupe du monde de football 2018' },
          { id: 2, text: 'Jeux Olympiques d\'hiver 1992 (Albertville)' },
          { id: 3, text: 'Coupe du monde de football 1998' },
        ],
        correctOrder: [2, 3, 1],
      },
      {
        type: 'true_false', videoSegment: { start: 60, end: 80 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'La France a gagné la coupe du monde de football en 2018.', correct: true },
          { id: 2, text: 'Le judo est peu pratiqué en France.', correct: false },
        ],
      },
    ],
  },
  {
    id: 11, title: 'Les droits des enfants', level: 'B1', theme: 'Droits humains',
    collectionId: 3, collection: 'Alter Ego+', thumbnail: null,
    description: 'Découvrez la Convention internationale des droits de l\'enfant.',
    duration: 130, video: { url: '', duration: 130 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 25 },
        instruction: 'Répondez à la question.',
        question: 'Quand a été adoptée la Convention des droits de l\'enfant ?',
        options: [
          { id: 'a', text: '1959' }, { id: 'b', text: '1989' },
          { id: 'c', text: '1999' }, { id: 'd', text: '2009' },
        ],
        correct: 'b',
      },
      {
        type: 'fill_blank', videoSegment: { start: 25, end: 50 },
        instruction: 'Complétez.',
        segments: [
          { type: 'text', content: 'Chaque enfant a le droit d\'aller à l\'' },
          { type: 'blank', id: 1, answer: 'école' },
          { type: 'text', content: ' et d\'être ' },
          { type: 'blank', id: 2, answer: 'protégé' },
          { type: 'text', content: ' contre toute forme de violence.' },
        ],
      },
      {
        type: 'match_pairs', videoSegment: { start: 50, end: 75 },
        instruction: 'Associez chaque droit à sa catégorie.',
        pairs: [
          { left: 'Aller à l\'école', right: 'Droit à l\'éducation' },
          { left: 'Être soigné', right: 'Droit à la santé' },
          { left: 'Jouer', right: 'Droit aux loisirs' },
          { left: 'Avoir un nom', right: 'Droit à l\'identité' },
        ],
      },
      {
        type: 'true_false', videoSegment: { start: 75, end: 100 },
        instruction: 'Vrai ou faux ?',
        statements: [
          { id: 1, text: 'La Convention des droits de l\'enfant a été signée par tous les pays du monde.', correct: false },
          { id: 2, text: 'Un enfant a le droit de donner son opinion.', correct: true },
        ],
      },
    ],
  },
  {
    id: 12, title: 'Une visite à Paris', level: 'A2', theme: 'Vie quotidienne',
    collectionId: 6, collection: 'Totem', thumbnail: null,
    description: 'Visitez les monuments les plus célèbres de Paris.',
    duration: 105, video: { url: '', duration: 105 },
    steps: [
      {
        type: 'multiple_choice', videoSegment: { start: 0, end: 20 },
        instruction: 'Choisissez la bonne réponse.',
        question: 'Quelle est la tour la plus haute de Paris ?',
        options: [
          { id: 'a', text: 'Tour Montparnasse' }, { id: 'b', text: 'Tour Eiffel' },
          { id: 'c', text: 'Tour de la Défense' }, { id: 'd', text: 'Notre-Dame' },
        ],
        correct: 'a', explanation: 'La tour Montparnasse (210m) est plus haute que la tour Eiffel (sans antennes).',
      },
      {
        type: 'fill_blank', videoSegment: { start: 20, end: 40 },
        instruction: 'Complétez.',
        segments: [
          { type: 'text', content: 'La tour Eiffel a été construite par Gustave ' },
          { type: 'blank', id: 1, answer: 'Eiffel' },
          { type: 'text', content: ' pour l\'Exposition universelle de ' },
          { type: 'blank', id: 2, answer: '1889' },
          { type: 'text', content: '.' },
        ],
      },
      {
        type: 'reorder', videoSegment: { start: 40, end: 60 },
        instruction: 'Remettez les monuments dans l\'ordre de leur construction.',
        items: [
          { id: 1, text: 'Tour Eiffel (1889)' },
          { id: 2, text: 'Cathédrale Notre-Dame (1163)' },
          { id: 3, text: 'Centre Pompidou (1977)' },
        ],
        correctOrder: [2, 1, 3],
      },
      {
        type: 'match_pairs', videoSegment: { start: 60, end: 80 },
        instruction: 'Associez chaque monument à son arrondissement.',
        pairs: [
          { left: 'Tour Eiffel', right: '7e arrondissement' },
          { left: 'Sacré-Cœur', right: '18e arrondissement' },
          { left: 'Musée du Louvre', right: '1er arrondissement' },
          { left: 'Arc de Triomphe', right: '8e arrondissement' },
        ],
      },
    ],
  },
]

// ─── Series (exercise groups within a theme/collection) ────────────
export const series = [
  {
    id: 1, slug: 'a-la-boulangerie', title: 'À la boulangerie', level: 'A1',
    theme: 'Vie quotidienne', collectionId: 1, description: 'Apprenez à commander du pain dans une boulangerie française.',
    exerciseIds: [1], thumbnail: null,
  },
  {
    id: 2, slug: 'le-metro-parisien', title: 'Le métro parisien', level: 'A2',
    theme: 'Vie quotidienne', collectionId: 1, description: 'Découvrez comment prendre le métro à Paris.',
    exerciseIds: [2], thumbnail: null,
  },
  {
    id: 3, slug: 'recette-de-crepes', title: 'Recette de crêpes', level: 'A1',
    theme: 'Vie quotidienne', collectionId: 2, description: 'Suivez une recette traditionnelle pour faire des crêpes.',
    exerciseIds: [3], thumbnail: null,
  },
  {
    id: 4, slug: 'entretien-embauche', title: "Un entretien d'embauche", level: 'B1',
    theme: 'Vie quotidienne', collectionId: 3, description: "Préparez-vous à un entretien d'embauche en français.",
    exerciseIds: [4], thumbnail: null,
  },
  {
    id: 5, slug: 'les-accents-de-france', title: 'Les accents de France', level: 'B2',
    theme: 'Culture', collectionId: 4, description: 'Explorez la diversité des accents régionaux en France.',
    exerciseIds: [5], thumbnail: null,
  },
  {
    id: 6, slug: 'faire-les-courses', title: 'Faire les courses', level: 'A2',
    theme: 'Vie quotidienne', collectionId: 1, description: 'Apprenez le vocabulaire pour faire les courses au marché.',
    exerciseIds: [6], thumbnail: null,
  },
  {
    id: 7, slug: 'au-restaurant', title: 'Au restaurant', level: 'A1',
    theme: 'Vie quotidienne', collectionId: 7, description: 'Commandez un repas au restaurant en français.',
    exerciseIds: [7], thumbnail: null,
  },
  {
    id: 8, slug: 'le-systeme-educatif', title: 'Le système éducatif', level: 'B1',
    theme: 'Actualité', collectionId: 5, description: "Découvrez comment fonctionne l'école en France.",
    exerciseIds: [8], thumbnail: null,
  },
  {
    id: 9, slug: 'lenvironnement', title: "L'environnement", level: 'B2',
    theme: 'Sciences', collectionId: 4, description: "Comprenez les enjeux environnementaux actuels en français.",
    exerciseIds: [9], thumbnail: null,
  },
  {
    id: 10, slug: 'le-sport-francais', title: 'Le sport français', level: 'A2',
    theme: 'Vie quotidienne', collectionId: 2, description: 'Découvrez les sports les plus populaires en France.',
    exerciseIds: [10], thumbnail: null,
  },
  {
    id: 11, slug: 'les-droits-des-enfants', title: 'Les droits des enfants', level: 'B1',
    theme: 'Droits humains', collectionId: 3, description: "Découvrez la Convention internationale des droits de l'enfant.",
    exerciseIds: [11], thumbnail: null,
  },
  {
    id: 12, slug: 'une-visite-a-paris', title: 'Une visite à Paris', level: 'A2',
    theme: 'Vie quotidienne', collectionId: 6, description: 'Visitez les monuments les plus célèbres de Paris.',
    exerciseIds: [12], thumbnail: null,
  },
]

// ─── Courses (Parcours) ────────────────────────────────────────────
export const courses = [
  {
    id: 1, slug: 'premiere-classe', title: 'Première classe', level: 'A1',
    description: 'Dire bonjour, parler de soi, trouver un logement, faire les courses... 500 exercices gratuits pour apprendre le français au niveau débutant à partir de vidéos.',
    thumbnail: null, exerciseCount: 480,
    tip: 'Organisez votre apprentissage. Pour compléter un module, nous vous conseillons de prévoir 20 minutes par jour pendant 3 semaines.',
    modules: [
      {
        id: 1, slug: 'les-salutations', title: 'Les salutations',
        description: 'Vous venez d\'arriver dans un pays francophone ? Avant tout, apprenez à vous présenter dans plusieurs situations, à parler de votre famille et de vos origines.',
        objectives: ['Se présenter', 'Saluer quelqu\'un', 'Demander comment on va', 'Prendre congé'],
        exerciseIds: [1, 7, 100, 102, 103, 104, 105, 107, 108, 109, 200],
        steps: [
          { id: 1, slug: 'donner-informations-etat-civil', title: 'Donner des informations sur son état civil', exerciseCount: 16, thumbnail: '🪪' },
          { id: 2, slug: 'se-presenter', title: 'Se présenter', exerciseCount: 17, thumbnail: '👋' },
          { id: 3, slug: 'parler-entourage-proche', title: 'Parler de son entourage proche', exerciseCount: 19, thumbnail: '👨‍👩‍👧' },
          { id: 4, slug: 'dire-son-origine', title: 'Dire son origine', exerciseCount: 16, thumbnail: '🌍' },
        ],
      },
      {
        id: 2, slug: 'les-loisirs', title: 'Les loisirs',
        description: 'Vous souhaitez partager vos loisirs avec vos amis ? Apprenez à dire ce que vous aimez faire, à donner des rendez-vous et à commander, c\'est toujours utile !',
        objectives: ['Parler de ses hobbies', 'Exprimer ses goûts', 'Proposer une activité', 'Accepter ou refuser'],
        exerciseIds: [10, 12, 201, 207],
        steps: [
          { id: 5, slug: 'parler-activites', title: 'Parler de ses activités', exerciseCount: 16, thumbnail: '🎬' },
          { id: 6, slug: 'proposer-sortie', title: 'Proposer une sortie', exerciseCount: 16, thumbnail: '🎟️' },
          { id: 7, slug: 'passer-commande', title: 'Passer commande', exerciseCount: 16, thumbnail: '☕' },
          { id: 8, slug: 'sinformer-evenement', title: 'S\'informer sur un événement', exerciseCount: 18, thumbnail: '📅' },
        ],
      },
      {
        id: 3, slug: 'le-logement', title: 'Le logement',
        description: 'Vous emménagez dans une nouvelle maison ? Apprenez à parler de votre logement. On vous donne aussi des conseils pour discuter avec vos nouveaux voisins et bien les recevoir.',
        objectives: ['Décrire son logement', 'Situer des objets', 'Exprimer une nécessité', 'Louer un appartement'],
        exerciseIds: [202, 209, 212],
        steps: [
          { id: 9, slug: 'decrire-logement', title: 'Décrire un logement', exerciseCount: 19, thumbnail: '🏠' },
          { id: 10, slug: 'dire-ce-qui-ne-va-pas', title: 'Dire ce qui ne va pas', exerciseCount: 17, thumbnail: '🔧' },
          { id: 11, slug: 'entrer-contact-voisins', title: 'Entrer en contact avec ses voisins', exerciseCount: 18, thumbnail: '🤝' },
          { id: 12, slug: 'inviter-chez-soi', title: 'Inviter quelqu\'un chez soi', exerciseCount: 16, thumbnail: '🍷' },
        ],
      },
      {
        id: 4, slug: 'les-repas', title: 'Les repas',
        description: 'Vous voulez cuisiner comme un francophone ? On vous aide à comprendre toutes les étapes : les courses, la préparation des plats et les repas.',
        objectives: ['Nommer les aliments', 'Commander au restaurant', 'Donner une recette', 'Parler de ses habitudes'],
        exerciseIds: [3, 6, 115, 116, 117, 118, 119, 120, 111, 112, 113, 203],
        steps: [
          { id: 13, slug: 'faire-les-courses', title: 'Faire les courses', exerciseCount: 17, thumbnail: '🛒' },
          { id: 14, slug: 'dire-comprendre-prix-poids', title: 'Dire et comprendre le prix, le poids', exerciseCount: 19, thumbnail: '⚖️' },
          { id: 15, slug: 'preparer-repas', title: 'Préparer le repas', exerciseCount: 17, thumbnail: '🍳' },
          { id: 16, slug: 'partager-repas', title: 'Partager le repas', exerciseCount: 18, thumbnail: '🍽️' },
        ],
      },
      {
        id: 5, slug: 'le-travail', title: 'Le travail',
        description: 'Vous êtes embauché dans une entreprise ? Apprenez à parler de votre métier, de votre trajet pour aller au travail et à échanger avec vos collègues.',
        objectives: ['Parler de son métier', 'Rédiger un CV', 'Passer un entretien', 'Comprendre une offre d\'emploi'],
        exerciseIds: [4, 204, 211],
        steps: [
          { id: 17, slug: 'parler-metier', title: 'Parler de son métier', exerciseCount: 17, thumbnail: '💼' },
          { id: 18, slug: 'aller-au-travail', title: 'Aller au travail', exerciseCount: 17, thumbnail: '🚇' },
          { id: 19, slug: 'parler-conditions-travail', title: 'Parler des conditions de travail', exerciseCount: 17, thumbnail: '📊' },
          { id: 20, slug: 'saluer-prendre-conge', title: 'Saluer, prendre congé', exerciseCount: 19, thumbnail: '👋' },
        ],
      },
      {
        id: 6, slug: 'la-sante', title: 'La santé',
        description: 'Vous êtes souffrant ? Pas de panique. Vous saurez bientôt prendre des rendez-vous chez un médecin, dire là où vous avez mal et comprendre les soins conseillés.',
        objectives: ['Décrire des symptômes', 'Prendre rendez-vous', 'Comprendre une ordonnance', 'Acheter des médicaments'],
        exerciseIds: [205, 210, 213],
        steps: [
          { id: 21, slug: 'parler-sante-moral', title: 'Parler de sa santé, de son moral', exerciseCount: 17, thumbnail: '💪' },
          { id: 22, slug: 'prendre-rdv-docteur', title: 'Prendre un rendez-vous chez le docteur', exerciseCount: 17, thumbnail: '🏥' },
          { id: 23, slug: 'exprimer-souffrance', title: 'Exprimer la souffrance physique', exerciseCount: 17, thumbnail: '🩹' },
          { id: 24, slug: 'se-soigner', title: 'Se soigner', exerciseCount: 16, thumbnail: '💊' },
        ],
      },
      {
        id: 7, slug: 'les-voyages', title: 'Les voyages',
        description: 'Vous partez en vacances dans un pays francophone ? Apprenez à parler de votre voyage : avant, pendant et après.',
        objectives: ['Acheter un billet', 'Demander son chemin', 'Réserver un hôtel', 'Comprendre les panneaux'],
        exerciseIds: [2, 206, 208],
        steps: [
          { id: 25, slug: 'choisir-destination', title: 'Choisir une destination', exerciseCount: 16, thumbnail: '🗺️' },
          { id: 26, slug: 'reserver-voyage', title: 'Réserver un voyage', exerciseCount: 17, thumbnail: '✈️' },
          { id: 27, slug: 'visiter', title: 'Visiter', exerciseCount: 18, thumbnail: '📸' },
          { id: 28, slug: 'raconter-voyage', title: 'Raconter son voyage', exerciseCount: 17, thumbnail: '✨' },
        ],
      },
    ],
  },
  {
    id: 2, slug: 'la-grammaire-en-a2', title: 'La grammaire en A2', level: 'A2',
    description: 'Maîtrisez les points de grammaire essentiels du niveau A2 avec des exercices progressifs.',
    thumbnail: null, exerciseCount: 200,
    modules: [
      {
        id: 8, slug: 'les-temps-du-passe', title: 'Les temps du passé', description: 'Passé composé, imparfait : quand les utiliser.',
        objectives: ['Conjuguer au passé composé', 'Conjuguer à l\'imparfait', 'Choisir entre les deux temps'],
        exerciseIds: [6, 10],
      },
      {
        id: 9, slug: 'les-pronoms', title: 'Les pronoms', description: 'Les pronoms personnels, relatifs et démonstratifs.',
        objectives: ['Utiliser les pronoms COD/COI', 'Les pronoms y et en', 'Les pronoms relatifs'],
        exerciseIds: [2],
      },
      {
        id: 10, slug: 'le-futur', title: 'Le futur', description: 'Futur simple et futur proche.',
        objectives: ['Former le futur simple', 'Exprimer une intention', 'Faire des prédictions'],
        exerciseIds: [12],
      },
    ],
  },
  {
    id: 3, slug: 'mieux-se-comprendre', title: 'Mieux se comprendre', level: 'B1',
    description: 'Améliorez votre compréhension orale et votre expression en situations réelles.',
    thumbnail: null, exerciseCount: 160,
    modules: [
      {
        id: 11, slug: 'comprendre-les-medias', title: 'Comprendre les médias', description: 'Analysez des reportages et des articles de presse.',
        objectives: ['Comprendre un reportage', 'Identifier les informations clés', 'Donner son opinion'],
        exerciseIds: [8],
      },
      {
        id: 12, slug: 'debattre', title: 'Débattre', description: 'Apprenez à argumenter et à débattre en français.',
        objectives: ['Exprimer un désaccord', 'Apporter des arguments', 'Conclure un débat'],
        exerciseIds: [11],
      },
      {
        id: 13, slug: 'comprendre-les-accents', title: 'Comprendre les accents', description: 'Reconnaître et comprendre différents accents francophones.',
        objectives: ['Identifier des accents', 'Comprendre des locuteurs variés', 'S\'adapter au registre de langue'],
        exerciseIds: [5, 9],
      },
    ],
  },
]

// ─── Vocabulary Lists ──────────────────────────────────────────────
export const vocabularyLists = [
  {
    id: 1, slug: 'nourriture', title: 'La nourriture', difficulty: 'easy', level: 'A1', theme: 'Vie quotidienne',
    words: [
      { id: 1, term: 'le pain', definition: 'Aliment de base fait de farine et d\'eau', partOfSpeech: 'Nom masculin', example: 'Je vais acheter du pain à la boulangerie.' },
      { id: 2, term: 'le fromage', definition: 'Produit laitier fermenté', partOfSpeech: 'Nom masculin', example: 'La France possède plus de 365 sortes de fromage.' },
      { id: 3, term: 'le beurre', definition: 'Matière grasse tirée du lait', partOfSpeech: 'Nom masculin', example: 'Mettez du beurre sur votre tartine.' },
      { id: 4, term: 'les œufs', definition: 'Œufs de poule utilisés en cuisine', partOfSpeech: 'Nom masculin pluriel', example: 'Il me faut quatre œufs pour la recette.' },
      { id: 5, term: 'le lait', definition: 'Liquide blanc produit par les mammifères', partOfSpeech: 'Nom masculin', example: 'Je prends du lait avec mon café.' },
      { id: 6, term: 'la pomme', definition: 'Fruit rond rouge ou vert', partOfSpeech: 'Nom féminin', example: 'Une pomme par jour éloigne le médecin.' },
    ],
  },
  {
    id: 2, slug: 'transports', title: 'Les transports', difficulty: 'easy', level: 'A1', theme: 'Vie quotidienne',
    words: [
      { id: 7, term: 'le train', definition: 'Véhicule ferroviaire', partOfSpeech: 'Nom masculin', example: 'Je prends le train pour aller à Lyon.' },
      { id: 8, term: 'le bus', definition: 'Véhicule de transport en commun routier', partOfSpeech: 'Nom masculin', example: 'Le bus passe toutes les 10 minutes.' },
      { id: 9, term: 'le métro', definition: 'Train souterrain urbain', partOfSpeech: 'Nom masculin', example: 'Prenez la ligne 1 du métro.' },
      { id: 10, term: 'le vélo', definition: 'Véhicule à deux roues propulsé par pédales', partOfSpeech: 'Nom masculin', example: 'Je vais au travail en vélo.' },
      { id: 11, term: 'l\'avion', definition: 'Appareil de transport aérien', partOfSpeech: 'Nom masculin', example: 'L\'avion décolle à 14h.' },
      { id: 12, term: 'le taxi', definition: 'Voiture de transport avec chauffeur', partOfSpeech: 'Nom masculin', example: 'Appelez un taxi, s\'il vous plaît.' },
    ],
  },
  {
    id: 3, slug: 'environnement', title: "L'environnement", difficulty: 'medium', level: 'B1', theme: 'Sciences',
    words: [
      { id: 13, term: 'la pollution', definition: 'Contamination de l\'environnement', partOfSpeech: 'Nom féminin', example: 'La pollution de l\'air est un problème grave.' },
      { id: 14, term: 'le recyclage', definition: 'Traitement des déchets pour réutilisation', partOfSpeech: 'Nom masculin', example: 'Le recyclage permet de réduire les déchets.' },
      { id: 15, term: 'les énergies renouvelables', definition: 'Sources d\'énergie inépuisables', partOfSpeech: 'Nom féminin pluriel', example: 'Le solaire et l\'éolien sont des énergies renouvelables.' },
      { id: 16, term: 'le réchauffement climatique', definition: 'Augmentation de la température moyenne', partOfSpeech: 'Nom masculin', example: 'Le réchauffement climatique menace la biodiversité.' },
      { id: 17, term: 'la biodiversité', definition: 'Variété des espèces vivantes', partOfSpeech: 'Nom féminin', example: 'Protéger la biodiversité est essentiel.' },
      { id: 18, term: 'le développement durable', definition: 'Développement respectueux de l\'environnement', partOfSpeech: 'Nom masculin', example: 'Le développement durable est un objectif mondial.' },
    ],
  },
  {
    id: 4, slug: 'droits', title: 'Les droits humains', difficulty: 'hard', level: 'B2', theme: 'Droits humains',
    words: [
      { id: 19, term: 'la liberté d\'expression', definition: 'Droit d\'exprimer librement ses opinions', partOfSpeech: 'Nom féminin', example: 'La liberté d\'expression est un droit fondamental.' },
      { id: 20, term: 'l\'égalité', definition: 'Principe de traitement identique pour tous', partOfSpeech: 'Nom féminin', example: 'L\'égalité entre les hommes et les femmes est un principe constitutionnel.' },
      { id: 21, term: 'la discrimination', definition: 'Traitement inégal basé sur des critères interdits', partOfSpeech: 'Nom féminin', example: 'La discrimination à l\'embauche est punie par la loi.' },
      { id: 22, term: 'le droit d\'asile', definition: 'Droit de chercher protection dans un autre pays', partOfSpeech: 'Nom masculin', example: 'Le droit d\'asile est garanti par la Convention de Genève.' },
      { id: 23, term: 'la Convention', definition: 'Traité international établissant des droits', partOfSpeech: 'Nom féminin', example: 'La Convention européenne des droits de l\'homme date de 1950.' },
      { id: 24, term: 'le réfugié', definition: 'Personne forcée de fuir son pays', partOfSpeech: 'Nom masculin', example: 'Un réfugié a le droit de demander une protection internationale.' },
    ],
  },
]

// ─── Memos (grammar/pronunciation reference) ───────────────────────
export const memos = [
  {
    id: 1, slug: 'articles-definis', title: 'Les articles définis', category: 'Grammaire', level: 'A1',
    content: `<h3>Les articles définis : le, la, l', les</h3>
<p>Les articles définis servent à désigner quelque chose de précis, déjà connu.</p>
<h4>Formes</h4>
<ul><li><strong>le</strong> → masculin singulier (le livre)</li><li><strong>la</strong> → féminin singulier (la table)</li><li><strong>l'</strong> → devant voyelle ou h muet (l'ami, l'hôtel)</li><li><strong>les</strong> → pluriel (les livres, les tables)</li></ul>
<h4>Emploi</h4>
<ul><li>Quand on a déjà mentionné la chose : « J'ai un chat. <strong>Le</strong> chat est noir. »</li><li>Quand c'est unique : <strong>le</strong> soleil, <strong>la</strong> lune</li><li>Avec les noms de pays : <strong>la</strong> France, <strong>le</strong> Japon</li></ul>`,
  },
  {
    id: 2, slug: 'passe-compose', title: 'Le passé composé', category: 'Grammaire', level: 'A2',
    content: `<h3>Le passé composé</h3>
<p>Le passé composé exprime une action terminée dans le passé.</p>
<h4>Formation</h4>
<p><strong>Avoir ou être</strong> (au présent) + <strong>participe passé</strong></p>
<ul><li>J'ai <strong>mangé</strong> → auxiliary « avoir »</li><li>Je suis <strong>allé(e)</strong> → auxiliary « être » (mouvement, pronominal)</li></ul>
<h4>Participes passés irréguliers</h4>
<ul><li>faire → fait</li><li>être → été</li><li>avoir → eu</li><li>aller → allé</li><li>voir → vu</li><li>pouvoir → pu</li><li>devoir → dû</li></ul>`,
  },
  {
    id: 3, slug: 'liaison', title: 'La liaison', category: 'Prononciation', level: 'A1',
    content: `<h3>La liaison en français</h3>
<p>La liaison est la prononciation d'une consonne finale normalement muette devant un mot commençant par une voyelle.</p>
<h4>Exemples courants</h4>
<ul><li>les‿amis [le.za.mi]</li><li>un petit‿ami [œ̃.pə.ti.ta.mi]</li><li>vous‿avez [vu.za.ve]</li><li>très‿important [tʁɛ.zɛ̃.pɔʁ.tɑ̃]</li></ul>
<h4>Types de liaison</h4>
<ul><li><strong>Obligatoire</strong> : entre article et nom (les‿amis), entre pronom et verbe (ils‿ont)</li>
<li><strong>Facultative</strong> : après un adverbe (très‿important)</li>
<li><strong>Interdite</strong> : devant un « h aspiré » (les héros ≠ les‿héros ✗)</li></ul>`,
  },
  {
    id: 4, slug: 'expressions-avec-avoir', title: 'Expressions avec avoir', category: 'Vocabulaire', level: 'A1',
    content: `<h3>Expressions avec « avoir »</h3>
<p>En français, de nombreuses expressions utilisent « avoir » là où l'anglais utilise « to be ».</p>
<h4>Expressions essentielles</h4>
<ul><li><strong>avoir faim</strong> — to be hungry</li><li><strong>avoir soif</strong> — to be thirsty</li><li><strong>avoir froid</strong> — to be cold</li><li><strong>avoir chaud</strong> — to be hot</li><li><strong>avoir sommeil</strong> — to be sleepy</li><li><strong>avoir peur</strong> — to be afraid</li><li><strong>avoir raison</strong> — to be right</li><li><strong>avoir tort</strong> — to be wrong</li><li><strong>avoir besoin de</strong> — to need</li><li><strong>avoir l'air</strong> — to seem</li></ul>`,
  },
  {
    id: 5, slug: 'subjonctif', title: 'Le subjonctif présent', category: 'Grammaire', level: 'B1',
    content: `<h3>Le subjonctif présent</h3>
<p>Le subjonctif exprime la subjectivité, le doute, la volonté ou l'émotion.</p>
<h4>Formation</h4>
<p>Base de la 3e personne du pluriel au présent + terminaisons : <strong>-e, -es, -e, -ions, -iez, -ent</strong></p>
<h4>Verbes irréguliers</h4>
<ul><li>être → que je sois</li><li>avoir → que j'aie</li><li>aller → que j'aille</li><li>faire → que je fasse</li><li>pouvoir → que je puisse</li><li>savoir → que je sache</li></ul>
<h4>Emploi</h4>
<ul><li>Après « il faut que » : Il faut que tu <strong>viennes</strong>.</li><li>Après « je veux que » : Je veux que tu <strong>saches</strong> la vérité.</li><li>Après « bien que » : Bien qu'il <strong>soit</strong> tard, je travaille.</li></ul>`,
  },
  {
    id: 6, slug: 'interculturel-salutations', title: 'Saluer en France', category: 'Interculturel', level: 'A1',
    content: `<h3>Saluer en France</h3>
<p>La façon de saluer en France varie selon la relation et la situation.</p>
<h4>La bise</h4>
<p>Entre amis et famille, on se fait la bise. Le nombre de bises varie selon les régions (2, 3 ou 4).</p>
<h4>La poignée de main</h4>
<p>En situation professionnelle ou formelle, on se serre la main.</p>
<h4>Vocabulaire utile</h4>
<ul><li>Bonjour — formel/politesse</li><li>Salut — informel entre amis</li><li>Coucou — très informel, famille/amis proches</li><li>Bonjour Madame/Monsieur — avec titre, très respectueux</li></ul>`,
  },
  {
    id: 7, slug: 'strategies-comprehension', title: 'Stratégies de compréhension', category: 'Stratégies', level: 'B1',
    content: `<h3>Stratégies de compréhension orale</h3>
<h4>Avant d'écouter</h4>
<ul><li>Lisez le titre et les questions pour anticiper le contenu</li><li>Activez vos connaissances sur le sujet</li></ul>
<h4>Pendant l'écoute</h4>
<ul><li>Ne cherchez pas à comprendre chaque mot — saisisz le sens global</li><li>Repérez les mots-clés</li><li>Faites attention au ton et à l'intonation</li></ul>
<h4>Après l'écoute</h4>
<ul><li>Résumez ce que vous avez compris</li><li>Identifiez les passages difficiles et réécoutez-les</li><li>Notez le vocabulaire nouveau</li></ul>`,
  },
]

// ─── TCF Tests ─────────────────────────────────────────────────────
export const tcfTests = [
  {
    id: 1, slug: 'comprehension-orale', title: 'Compréhension orale', description: 'Entraînez-vous à la compréhension orale du TCF.',
    duration: 25, questionCount: 10, level: 'A1-B2',
    type: 'practice',
  },
  {
    id: 2, slug: 'structure-langue', title: 'Structure de la langue', description: 'Grammaire et vocabulaire au format TCF.',
    duration: 15, questionCount: 10, level: 'A1-B2',
    type: 'practice',
  },
  {
    id: 3, slug: 'comprehension-ecrite', title: 'Compréhension écrite', description: 'Lisez et comprenez des textes variés.',
    duration: 30, questionCount: 10, level: 'A1-B2',
    type: 'practice',
  },
]

// ─── Diplomas ──────────────────────────────────────────────────────
export const diplomas = [
  {
    id: 1, slug: 'dfa1', title: 'Diplôme de français des affaires 1', level: 'A2',
    description: 'Certifiez votre capacité à communiquer en français dans des situations professionnelles courantes.',
    levels: ['A2', 'B1'],
  },
  {
    id: 2, slug: 'dfa2', title: 'Diplôme de français des affaires 2', level: 'B2',
    description: 'Validez vos compétences en français des affaires avancées.',
    levels: ['B1', 'B2'],
  },
  {
    id: 3, slug: 'dfp', title: 'Diplôme de français professionnel', level: 'B1',
    description: 'Certifiez vos compétences linguistiques professionnelles en français.',
    levels: ['B1', 'B2'],
  },
]

// ─── Level Test Questions ──────────────────────────────────────────
export const levelTestQuestions = [
  { id: 1, text: 'Bonjour, je m\'appelle Marie. Comment vous ___ ?', options: ['appelez', 'appeler', 'appele', 'appelés'], correct: 0, level: 'A1' },
  { id: 2, text: 'Je ___ au cinéma hier soir.', options: ['vais', 'suis allé', 'allais', 'irai'], correct: 1, level: 'A2' },
  { id: 3, text: 'Elle ___ qu\'il pleuvra demain.', options: ['dit', 'parle', 'raconte', 'explique'], correct: 0, level: 'A1' },
  { id: 4, text: 'Si j\'___ riche, je voyagerais autour du monde.', options: ['étais', 'suis', 'serais', 'étais été'], correct: 0, level: 'B1' },
  { id: 5, text: 'Il faut que tu ___ plus attention.', options: ['fais', 'fasses', 'faire', 'fera'], correct: 1, level: 'B1' },
  { id: 6, text: 'Le livre ___ j\'ai lu était passionnant.', options: ['que', 'qui', 'dont', 'où'], correct: 0, level: 'A2' },
  { id: 7, text: 'Nous ___ au restaurant ce soir.', options: ['allons', 'irons', 'allions', 'allé'], correct: 1, level: 'A2' },
  { id: 8, text: 'Bien qu\'il ___ fatigué, il a continué à travailler.', options: ['est', 'soit', 'était', 'fut'], correct: 1, level: 'B2' },
  { id: 9, text: 'Cette ville est ___ que je pensais.', options: ['plus belle', 'plus beau', 'belle plus', 'la plus belle'], correct: 0, level: 'A2' },
  { id: 10, text: 'Il m\'a demandé ___ venir.', options: ['de', 'à', 'pour', 'par'], correct: 0, level: 'B1' },
  { id: 11, text: 'Je ___ mon petit-déjeuner quand le téléphone a sonné.', options: ['prenais', 'ai pris', 'prends', 'pris'], correct: 0, level: 'B1' },
  { id: 12, text: 'C\'est la fille ___ parents habitent à Paris.', options: ['dont', 'que', 'qui', 'laquelle'], correct: 0, level: 'B2' },
  { id: 13, text: 'Je voudrais ___ de lait, s\'il vous plaît.', options: ['une tasse', 'un verre', 'un morceau', 'une tranche'], correct: 1, level: 'A1' },
  { id: 14, text: 'Les enfants ___ dans le parc quand il a commencé à pleuvoir.', options: ['jouaient', 'ont joué', 'jouent', 'joueront'], correct: 0, level: 'B1' },
  { id: 15, text: 'Non seulement il est intelligent, ___ il est travailleur.', options: ['mais', 'et', 'mais aussi', 'donc'], correct: 2, level: 'B2' },
  { id: 16, text: 'Quelle heure ___ ?', options: ['est-il', 'il est', 'est-ce', 'a-t-il'], correct: 0, level: 'A1' },
  { id: 17, text: 'Je te ___ de venir demain.', options: ['conseille', 'dis', 'parle', 'propose'], correct: 0, level: 'B1' },
  { id: 18, text: 'À peine ___ qu\'il a compris son erreur.', options: ['est-il parti', 'il est parti', 'partait-il', 'est parti il'], correct: 0, level: 'B2' },
  { id: 19, text: 'Il y a ___ livres sur la table.', options: ['beaucoup de', 'beaucoup', 'des beaucoup', 'plusieurs de'], correct: 0, level: 'A1' },
  { id: 20, text: 'Il serait temps que nous ___ partir.', options: ['partions', 'partons', 'partirons', 'partirions'], correct: 0, level: 'B2' },
]

// ─── Memo Categories ───────────────────────────────────────────────
export const memoCategories = [
  { slug: 'interculturel', label: 'Interculturel', icon: '🌍' },
  { slug: 'Grammaire', label: 'Grammaire', icon: '📝' },
  { slug: 'Prononciation', label: 'Prononciation', icon: '🗣️' },
  { slug: 'Vocabulaire', label: 'Vocabulaire', icon: '📚' },
  { slug: 'Stratégies', label: 'Stratégies', icon: '💡' },
]

// ─── Imported: SEF Batch 1 ──────────────────────────────────────────
// Merge imported exercises and series into their respective arrays
;(sefImport.exercises || []).forEach((ex: { _source?: string; [k: string]: unknown }) => {
  const { _source: _s, ...clean } = ex
  void _s
  exercises.push(clean as (typeof exercises)[number])
})
;(sefImport.series || []).forEach((s: (typeof series)[number]) => {
  series.push(s)
})

// ─── Imported: Course Batch 2 (7 videos for Première classe) ────────
const courseModuleExerciseMap: Record<string, number> = {}
;(courseImport.exercises || []).forEach((ex: { _moduleSlug?: string; [k: string]: unknown }) => {
  const { _moduleSlug, ...clean } = ex
  exercises.push(clean as (typeof exercises)[number])
  if (_moduleSlug) courseModuleExerciseMap[_moduleSlug] = clean.id as number
})

// ─── Imported: 30天听懂法国人说话 (Lesson + Blocks model) ───────────
// Courses are now registered in contentManifest.ts
// 注意：原版 courses 数组**混合两种数据模型** —— mock.js 内联的 3 个旧关系型
// course（exerciseIds/steps）+ contentManifest 注入的 2 个新 5 步 course
// （lessons/blocks）。两种类型在 TS 里不兼容，但 1:1 还原原版必须保留混合。
// 用 unknown 双重断言（不是 any）让数据通过；调用方按 slug 区分访问。
getManifestCourses().forEach(c => {
  const { _manifest, ...courseData } = c
  void _manifest
  if (!courses.find(existing => existing.slug === courseData.slug)) {
    courses.push(courseData as unknown as (typeof courses)[number])
  }
})

// ─── Helper Functions ──────────────────────────────────────────────
export function getExercise(id: number | string) {
  return exercises.find(e => e.id === Number(id))
}

export function getExercisesByLevel(levelSlug: string) {
  const map: Record<string, string> = { 'a1-debutant': 'A1', 'a2-elementaire': 'A2', 'b1-intermediaire': 'B1', 'b2-avance': 'B2' }
  const code = map[levelSlug]
  return code ? exercises.filter(e => e.level === code) : exercises
}

export function getExercisesByTheme(themeSlug: string) {
  const theme = themes.find(t => t.slug === themeSlug)
  return theme ? exercises.filter(e => e.theme === theme.label) : exercises
}

export function getExercisesByCollection(collectionId: number | string) {
  return exercises.filter(e => e.collectionId === Number(collectionId))
}

export function getSeries(id: number | string) {
  return series.find(s => s.id === Number(id))
}

export function getSeriesBySlug(slug: string) {
  return series.find(s => s.slug === slug)
}

export function getCollection(slug: string) {
  return collections.find(c => c.slug === slug)
}

export function getCourse(slug: string) {
  return courses.find(c => c.slug === slug)
}

export function getCourseModule(courseSlug: string, moduleSlug: string) {
  const course = courses.find(c => c.slug === courseSlug)
  if (!course) return null
  return course.modules.find(m => m.slug === moduleSlug)
}

export function getVocabularyList(slug: string) {
  return vocabularyLists.find(v => v.slug === slug)
}

export function getMemo(slug: string) {
  return memos.find(m => m.slug === slug)
}

export function getTcfTest(slug: string) {
  return tcfTests.find(t => t.slug === slug)
}

export function getDiploma(slug: string) {
  return diplomas.find(d => d.slug === slug)
}

export function search(query: string) {
  if (!query || query.length < 2) return { exercises: [], series: [], vocabulary: [], memos: [] }
  const q = query.toLowerCase()

  const exerciseResults = exercises.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.theme.toLowerCase().includes(q)
  )

  const seriesResults = series.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q)
  )

  const vocabResults = vocabularyLists.flatMap(list =>
    list.words.filter(w =>
      w.term.toLowerCase().includes(q) ||
      w.definition.toLowerCase().includes(q)
    ).map(w => ({ ...w, listTitle: list.title }))
  )

  const memoResults = memos.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.content.toLowerCase().includes(q)
  )

  return { exercises: exerciseResults, series: seriesResults, vocabulary: vocabResults, memos: memoResults }
}

export function getLevelBySlug(slug: string) {
  return levels.find(l => l.slug === slug)
}

export function getLevelByCode(code: string) {
  return levels.find(l => l.code === code)
}

export function getThemeBySlug(slug: string) {
  return themes.find(t => t.slug === slug)
}

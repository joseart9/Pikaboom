export type WordEntry = { word: string; category: string };

// Lista local de respaldo; la misma lista se carga en Supabase (public.charades_words).
const RAW: Record<string, string[]> = {
  Animales: [
    "Elefante", "Canguro", "Pingüino", "Mono", "Jirafa", "Serpiente", "Gallina", "Pulpo",
    "Cangrejo", "Rana", "León", "Tiburón", "Mariposa", "Tortuga", "Flamenco", "Gorila",
    "Caballo", "Delfín", "Araña", "Murciélago", "Búho", "Cocodrilo", "Conejo", "Perezoso",
    "Pavo real", "Oso", "Pato", "Gato", "Perro", "Vaca",
  ],
  Acciones: [
    "Nadar", "Saltar en paracaídas", "Hacer malabares", "Surfear", "Boxear", "Tejer", "Lavarse los dientes",
    "Tomarse una selfie", "Pasear al perro", "Cambiar un pañal", "Subir una escalera", "Trapear el piso",
    "Montar a caballo", "Levantar pesas", "Tocar la guitarra", "Estornudar", "Pescar", "Jugar boliche",
    "Patinar sobre hielo", "Ordeñar una vaca", "Bailar con hula hula", "Pintar una pared", "Hacer yoga", "Ser sonámbulo",
    "Hacer burbujas", "Rasurarse", "Planchar la ropa", "Volar un papalote", "Remar en una lancha", "Hacer el moonwalk",
  ],
  Profesiones: [
    "Bombero", "Dentista", "Chef", "Piloto", "Mago", "Astronauta", "Policía",
    "Mesero", "Fotógrafo", "Peluquero", "Doctor", "Maestro", "DJ", "Plomero",
    "Salvavidas", "Mimo", "Granjero", "Cirujano", "Vaquero", "Pirata", "Ninja", "Árbitro",
    "Director de orquesta", "Mecánico", "Cartero",
  ],
  Objetos: [
    "Paraguas", "Cepillo de dientes", "Teléfono", "Tijeras", "Cámara", "Microondas", "Martillo",
    "Globo", "Aspiradora", "Lavadora", "Motosierra", "Trampolín", "Piano",
    "Control remoto", "Secadora de pelo", "Mochila", "Silla de ruedas", "Patineta", "Escalera",
    "Lentes de sol", "Excusado", "Despertador", "Engrapadora", "Podadora", "Yoyo",
  ],
  Películas: [
    "Titanic", "Avatar", "El Hombre Araña", "La Guerra de las Galaxias", "El Rey León", "Frozen", "Harry Potter",
    "Parque Jurásico", "Batman", "Toy Story", "Buscando a Nemo", "Rocky", "Shrek", "Superman",
    "King Kong", "Terminator", "Pinocho", "Karate Kid", "Aladdín", "Los Cazafantasmas",
    "Matrix", "Mi Pobre Angelito", "Piratas del Caribe", "Coco", "E.T.",
  ],
  Deportes: [
    "Fútbol", "Básquetbol", "Tenis", "Golf", "Béisbol", "Karate", "Esgrima", "Tiro con arco",
    "Lucha libre", "Esquí", "Voleibol", "Ciclismo", "Ping pong", "Gimnasia", "Rugby",
    "Hockey", "Sumo", "Clavados", "Salto con garrocha", "Escalada",
  ],
  Comida: [
    "Espagueti", "Pizza", "Helado", "Plátano", "Palomitas", "Taco", "Hot dog", "Sushi",
    "Sandía", "Limón", "Elote", "Chicle", "Hotcakes", "Hamburguesa",
    "Mango", "Paleta", "Sopa", "Chile", "Algodón de azúcar", "Pastel de cumpleaños",
  ],
  Cotidiano: [
    "Tráfico", "Entrevista de trabajo", "Primera cita", "Montaña rusa", "Casa embrujada",
    "Temblor", "Tormenta", "Boda", "Fiesta de cumpleaños", "Elevador", "Zombi",
    "Vampiro", "Robot", "Fantasma", "Superhéroe", "Sirena", "Extraterrestre", "Muñeco de nieve", "Santa Claus",
    "Ratón de los dientes", "Momia", "Hombre lobo", "Estatua", "Espantapájaros", "Hipo",
  ],
};

export const LOCAL_WORDS: WordEntry[] = Object.entries(RAW).flatMap(([category, words]) =>
  words.map((word) => ({ word, category })),
);

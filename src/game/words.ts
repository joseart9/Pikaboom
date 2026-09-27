export type WordEntry = { word: string; category: string };

// Local fallback list; the same list is seeded into Supabase (public.charades_words).
const RAW: Record<string, string[]> = {
  Animals: [
    "Elephant", "Kangaroo", "Penguin", "Monkey", "Giraffe", "Snake", "Chicken", "Octopus",
    "Crab", "Frog", "Lion", "Shark", "Butterfly", "Turtle", "Flamingo", "Gorilla",
    "Horse", "Dolphin", "Spider", "Bat", "Owl", "Crocodile", "Rabbit", "Sloth",
    "Peacock", "Bear", "Duck", "Cat", "Dog", "Cow",
  ],
  Actions: [
    "Swimming", "Skydiving", "Juggling", "Surfing", "Boxing", "Knitting", "Brushing teeth",
    "Taking a selfie", "Walking a dog", "Changing a diaper", "Climbing a ladder", "Mopping the floor",
    "Riding a horse", "Lifting weights", "Playing guitar", "Sneezing", "Fishing", "Bowling",
    "Ice skating", "Milking a cow", "Hula hoop", "Painting a wall", "Doing yoga", "Sleepwalking",
    "Blowing bubbles", "Shaving", "Ironing clothes", "Flying a kite", "Rowing a boat", "Moonwalking",
  ],
  Jobs: [
    "Firefighter", "Dentist", "Chef", "Pilot", "Magician", "Astronaut", "Police officer",
    "Waiter", "Photographer", "Hairdresser", "Doctor", "Teacher", "DJ", "Plumber",
    "Lifeguard", "Mime", "Farmer", "Surgeon", "Cowboy", "Pirate", "Ninja", "Referee",
    "Orchestra conductor", "Mechanic", "Mail carrier",
  ],
  Objects: [
    "Umbrella", "Toothbrush", "Telephone", "Scissors", "Camera", "Microwave", "Hammer",
    "Balloon", "Vacuum cleaner", "Washing machine", "Chainsaw", "Trampoline", "Piano",
    "Remote control", "Hairdryer", "Backpack", "Wheelchair", "Skateboard", "Ladder",
    "Sunglasses", "Toilet", "Alarm clock", "Stapler", "Lawn mower", "Yo-yo",
  ],
  Movies: [
    "Titanic", "Jaws", "Spider-Man", "Star Wars", "The Lion King", "Frozen", "Harry Potter",
    "Jurassic Park", "Batman", "Toy Story", "Finding Nemo", "Rocky", "Shrek", "Superman",
    "King Kong", "Terminator", "Pinocchio", "Karate Kid", "Aladdin", "Ghostbusters",
    "The Matrix", "Home Alone", "Pirates of the Caribbean", "Mary Poppins", "E.T.",
  ],
  Sports: [
    "Soccer", "Basketball", "Tennis", "Golf", "Baseball", "Karate", "Fencing", "Archery",
    "Wrestling", "Skiing", "Volleyball", "Cycling", "Ping pong", "Gymnastics", "Rugby",
    "Hockey", "Sumo wrestling", "Diving", "Pole vault", "Rock climbing",
  ],
  Food: [
    "Spaghetti", "Pizza", "Ice cream", "Banana", "Popcorn", "Taco", "Hot dog", "Sushi",
    "Watermelon", "Lemon", "Corn on the cob", "Chewing gum", "Pancakes", "Hamburger",
    "Coconut", "Lollipop", "Soup", "Chili pepper", "Cotton candy", "Birthday cake",
  ],
  Everyday: [
    "Traffic jam", "Job interview", "First date", "Rollercoaster", "Haunted house",
    "Earthquake", "Thunderstorm", "Wedding", "Birthday party", "Elevator", "Zombie",
    "Vampire", "Robot", "Ghost", "Superhero", "Mermaid", "Alien", "Snowman", "Santa Claus",
    "Tooth fairy", "Mummy", "Werewolf", "Statue", "Scarecrow", "Hiccups",
  ],
};

export const LOCAL_WORDS: WordEntry[] = Object.entries(RAW).flatMap(([category, words]) =>
  words.map((word) => ({ word, category })),
);

// Stand-in player lists for the anytime-goalscorer picker. The TxLINE feed
// identifies scorers by numeric PlayerId only and exposes no roster, so
// until a real lineup feed is wired in, this is a short hand-curated list of
// each team's likeliest scorers — attackers first — for the teams that
// actually appear in the fixture list. Deliberately not exhaustive: the
// picker always offers "someone else" as free text, so a missing team or a
// transfer this list hasn't caught up with never blocks the market.

const SQUADS: Record<string, string[]> = {
  // National teams (Friendlies)
  argentina: ["Lionel Messi", "Lautaro Martínez", "Julián Álvarez", "Alexis Mac Allister", "Enzo Fernández"],
  brazil: ["Vinícius Júnior", "Raphinha", "Rodrygo", "Endrick", "Gabriel Martinelli"],
  mexico: ["Santiago Giménez", "Raúl Jiménez", "Hirving Lozano", "Orbelín Pineda", "Edson Álvarez"],
  usa: ["Christian Pulisic", "Folarin Balogun", "Ricardo Pepi", "Weston McKennie", "Timothy Weah"],
  canada: ["Jonathan David", "Cyle Larin", "Alphonso Davies", "Tajon Buchanan", "Jacob Shaffelburg"],
  colombia: ["Luis Díaz", "James Rodríguez", "Jhon Durán", "Jhon Arias", "Rafael Santos Borré"],
  japan: ["Kaoru Mitoma", "Takefusa Kubo", "Ayase Ueda", "Takumi Minamino", "Ritsu Doan"],
  "south korea": ["Son Heung-min", "Hwang Hee-chan", "Lee Kang-in", "Cho Gue-sung", "Oh Hyeon-gyu"],
  australia: ["Mitchell Duke", "Kusini Yengi", "Martin Boyle", "Craig Goodwin", "Jackson Irvine"],
  morocco: ["Youssef En-Nesyri", "Brahim Díaz", "Ayoub El Kaabi", "Achraf Hakimi", "Abde Ezzalzouli"],
  egypt: ["Mohamed Salah", "Omar Marmoush", "Mostafa Mohamed", "Trézéguet", "Emam Ashour"],
  algeria: ["Riyad Mahrez", "Amine Gouiri", "Mohamed Amoura", "Baghdad Bounedjah", "Ismaël Bennacer"],
  tunisia: ["Elias Achouri", "Youssef Msakni", "Hannibal Mejbri", "Naïm Sliti", "Seifeddine Jaziri"],
  "ivory coast": ["Sébastien Haller", "Simon Adingra", "Amad Diallo", "Nicolas Pépé", "Franck Kessié"],
  nigeria: ["Victor Osimhen", "Ademola Lookman", "Victor Boniface", "Samuel Chukwueze", "Alex Iwobi"],
  uzbekistan: ["Eldor Shomurodov", "Abbosbek Fayzullaev", "Oston Urunov", "Igor Sergeev", "Jaloliddin Masharipov"],
  // MLS
  "inter miami": ["Lionel Messi", "Luis Suárez", "Tadeo Allende", "Rodrigo De Paul", "Jordi Alba"],
  "la galaxy": ["Gabriel Pec", "Joseph Paintsil", "Riqui Puig", "Matheus Nascimento", "Marco Reus"],
  lafc: ["Son Heung-min", "Denis Bouanga", "David Martínez", "Timothy Tillman", "Mark Delgado"],
  "atlanta united": ["Emmanuel Latte Lath", "Miguel Almirón", "Saba Lobjanidze", "Aleksei Miranchuk", "Jamal Thiaré"],
  "columbus crew": ["Diego Rossi", "Wessam Abou Ali", "Max Arfsten", "Dylan Chambost", "Jacen Russell-Rowe"],
  "nashville sc": ["Sam Surridge", "Hany Mukhtar", "Jacob Shaffelburg", "Alex Muyl", "Patrick Yazbek"],
  "seattle sounders": ["Jordan Morris", "Albert Rusnák", "Pedro de la Vega", "Paul Rothrock", "Jesús Ferreira"],
  "vancouver whitecaps": ["Brian White", "Thomas Müller", "Ryan Gauld", "Emmanuel Sabbi", "Jayden Nelson"],
  "philadelphia union": ["Tai Baribo", "Mikael Uhre", "Quinn Sullivan", "Bruno Damiani", "Danley Jean Jacques"],
  "chicago fire": ["Hugo Cuypers", "Philip Zinckernagel", "Jonathan Bamba", "Brian Gutiérrez", "Andrew Gutman"],
  "austin fc": ["Myrto Uzuni", "Brandon Vázquez", "Osman Bukari", "Owen Wolff", "Jáder Obrian"],
  "new york rb": ["Emil Forsberg", "Eric Maxim Choupo-Moting", "Lewis Morgan", "Julian Hall", "Wikelman Carmona"],
  "real salt lake": ["Diego Luna", "Dominik Marczuk", "Ariath Piol", "Diogo Gonçalves", "Victor Olatunji"],
  "san jose earthquakes": ["Cristian Arango", "Josef Martínez", "Cristian Espinoza", "Preston Judd", "Ousseni Bouda"],
  "houston dynamo": ["Ezequiel Ponce", "Amine Bassi", "Jack McGlynn", "Lawrence Ennali", "Sebastian Kowalczyk"],
  dallas: ["Petar Musa", "Logan Farrington", "Bernard Kamungo", "Pedrinho", "Anderson Julio"],
  charlotte: ["Wilfried Zaha", "Pep Biel", "Liel Abada", "Idan Toklomati", "Brandt Bronico"],
  montreal: ["Prince Owusu", "Dante Sealy", "Giacomo Vrioni", "Hennadiy Synchuk", "Caden Clark"],
  "san diego fc": ["Hirving Lozano", "Anders Dreyer", "Marcus Ingvartsen", "Milan Iloski", "Onni Valakari"],
};

const ALIASES: Record<string, string> = {
  "united states": "usa",
  "korea republic": "south korea",
  "cote d'ivoire": "ivory coast",
  "côte d'ivoire": "ivory coast",
  "los angeles fc": "lafc",
  "fc dallas": "dallas",
  "cf montreal": "montreal",
  "cf montréal": "montreal",
  "charlotte fc": "charlotte",
  "new york red bulls": "new york rb",
  "seattle sounders fc": "seattle sounders",
  "inter miami cf": "inter miami",
};

export function playersFor(team: string): string[] {
  const key = team.trim().toLowerCase();
  return SQUADS[ALIASES[key] ?? key] ?? [];
}

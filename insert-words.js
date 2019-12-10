var mongoose = require("mongoose");

var dbConn = mongoose.connection;
const mongoString =
  "mongodb+srv://TestUser:Password1!@soft355-pictionary-gx8rh.azure.mongodb.net/test?retryWrites=true&w=majority";

dbConn.on("error", console.error.bind(console, "connection error: "));

dbConn.once("open", function() {
  console.log("connection established with MongoDB");
});

mongoose.connect(mongoString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

var words = [
  "sailboat",
  "brain",
  "birthday cake",
  "skirt",
  "knee",
  "pineapple",
  "tusk",
  "sprinkler",
  "money",
  "spool",
  "lighthouse",
  "doormat",
  "face",
  "flute",
  "rug",
  "snowball",
  "purse",
  "owl",
  "gate",
  "suitcase",
  "stomach",
  "doghouse",
  "pajamas",
  "bathroom scale",
  "peach",
  "newspaper",
  "watering can",
  "hook",
  "school",
  "beaver",
  "beehive",
  "beach",
  "artist",
  "flagpole",
  "camera",
  "hair dryer",
  "mushroom",
  "toe",
  "pretzel",
  "TV",
  "quilt",
  "chalk",
  "pound",
  "chin",
  "swing",
  "garden",
  "ticket",
  "boot",
  "cello",
  "rain",
  "clam",
  "pelican",
  "stingray",
  "fur",
  "pufferfish",
  "rainbow",
  "happy",
  "half",
  "cardboard",
  "oar",
  "babysitter",
  "drip",
  "shampoo",
  "point",
  "time machine",
  "think",
  "lace",
  "lice",
  "darts",
  "world",
  "avocado",
  "bleach",
  "shower curtain",
  "extension cord",
  "dent",
  "birthday",
  "lap",
  "sandbox",
  "bruise",
  "quicksand",
  "fog",
  "gasoline",
  "pocket",
  "honk",
  "sponge",
  "rim",
  "bride",
  "wig",
  "zip",
  "wag",
  "letter opener",
  "fiddle",
  "water buffalo",
  "pilot",
  "brand",
  "pail",
  "baguette",
  "rib",
  "mascot",
  "fireman pole",
  "zoo",
  "sushi",
  "fizz",
  "ceiling fan",
  "bald",
  "banister",
  "punk",
  "post office",
  "season",
  "internet",
  "chess",
  "puppet",
  "chime",
  "ivy",
  "full",
  "koala",
  "dentist"
];

// define schema
var WordSchema = mongoose.Schema({
  name: String
});

// compile schema to model
var Word = mongoose.model("Word", WordSchema);

// create schema objects
var wordObjs = [];
words.forEach(word => {
  var modelWord = new Word({ name: word });
  wordObjs.push(modelWord);
});

// insert objects
wordObjs.forEach(wordObj =>
  wordObj.save(function(err, word) {
    if (err) return console.error(err);
    console.log(word.name + " saved to collection.");
  })
);

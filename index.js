const express =require('express')
const cors =require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db("swiftParcelDB");
    const parcelsCollection = db.collection("parcels");

   
    app.get("/", (req, res) => {
      res.send("SwiftParcel server is running!");
    });

    
    app.post("/parcels", async (req, res) => {
      const newParcel = req.body;
      const result = await parcelsCollection.insertOne(newParcel);
      res.send(result);
    });

  
    app.get("/parcels", async (req, res) => {
      const parcels = await parcelsCollection.find().toArray();
      res.send(parcels);
    });

  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`SwiftParcel server running on port ${port}`);
});

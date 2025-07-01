const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

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
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("swiftParcelDB");
    const parcelsCollection = db.collection("parcels");

    app.get("/", (req, res) => {
      res.send("SwiftParcel server is running!");
    });
    app.get("/parcels", async (req, res) => {
      try {
        let query = {};
        if (req.query.email) {
          query.created_by = req.query.email;
        }
        const parcels = await parcelsCollection.find(query).toArray();
        res.send(parcels);
      } catch (error) {
        console.error("something went wrong", error);
        res.status(500).send({ message: "parcels not found" });
      }
    });

    // get a specific parcel by id

    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await parcelsCollection.findOne(query);
        res.send();
      } catch (error) {
        console.error("Error fetching the parcel:", error);
        res.status(500).send({ message: "Failed to get parcel data" });
      }
    });

    app.post("/parcels", async (req, res) => {
      const newParcel = req.body;
      const result = await parcelsCollection.insertOne(newParcel);
      res.send(result);
    });

    app.delete("/parcels/:id", async (req, res) => {
      try {
        console.log("Request params on server:", req.params);
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await parcelsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.error("Error occurred while deleting parcel:", err);

        res.status(500).send({
          message: "Failed to delete parcel from server.",
          error: err.message,
        });
      }
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`SwiftParcel server running on port ${port}`);
});

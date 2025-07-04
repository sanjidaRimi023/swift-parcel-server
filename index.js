const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.VITE_STRIPE_SECRET_KEY);
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
    const paymentCollection = db.collection("payments");

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
        res.send(result);
      } catch (error) {
        console.error("Error fetching the parcel:", error);
        res.status(500).send({ message: "Failed to get parcel data" });
      }
    });

    app.get("/payments", async (req, res) => {
      try {
        const userEmail = req.query.email;
        const query = userEmail ? { email: userEmail } : {};
        const option = { sort: { paidAt: -1 } };

        const payments = await paymentCollection.find(query, option).toArray();
        res.send(payments);
      } catch (error) {
        console.log("error in history loading");
        res.status(500).send({ success: false, error: "data is not loaded" });
      }
    });

    app.post("/parcels", async (req, res) => {
      const newParcel = req.body;
      const result = await parcelsCollection.insertOne(newParcel);
      res.send(result);
    });

    //create payment intent api for payment recieve

    app.post("/create-payment-intent", async (req, res) => {
      const amountInCent = req.body.amountInCent;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCent,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //parcels update and save payment history api

    app.post("/payments", async (req, res) => {
      const { parcelId, userEmail, amount, paymentMethod, transactionId } =
        req.body;

      try {
        // 1. parcel update
        const updateParcels = await parcelsCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          { $set: { payment_status: "paid" } }
        );

        // 2. payment history save
        const paymentRecord = {
          parcelId: new ObjectId(parcelId),
          userEmail,
          amount,
          paymentMethod,
          transactionId,
          status: "paid",
          paid_at_string: new Date().toISOString(),
          paidAt: new Date(),
        };

        const insertHistory = await paymentCollection.insertOne(paymentRecord);

        res.send({
          success: true,
          message: "Payment successful & history saved",
          updated: updateParcels.modifiedCount > 0,
          insertedId: insertHistory.insertedId,
        });
      } catch (error) {
        console.error("Problem in saving history:", error);
        res.status(500).send({ success: false, error: "Server Error" });
      }
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

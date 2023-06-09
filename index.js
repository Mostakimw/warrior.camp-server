const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// ! middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eh4qdyd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const usersCollection = client.db("warriorCamp").collection("users");
const classesCollection = client.db("warriorCamp").collection("classes");
// const usersCollection = client.db("warriorCamp").collection("users");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // ! users storing on db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // ! getting all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // ! change user to admin or instructor
    app.put("/users/:id/role", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const query = { _id: new ObjectId(id) };
      const currentUser = await usersCollection.findOne(query);
      if (!currentUser) {
        return res.status(404).send({ message: "user not found" });
      }
      const updateDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // ! store the class from instructor from add class page
    app.post("/classes", async (req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    // ! get the stored all classes data
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // ! get class data by instructor
    app.get("/classes/instructor", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      console.log(query);
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // ! get single class by their id
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    // ! update class by instructor
    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const classData = req.body;
      console.log(classData);
      const query = { _id: new ObjectId(id) };
      //   const classDataSavedInDb = await classesCollection.findOne(query);
      const updateDoc = {
        $set: {
          className: classData?.className,
          classThumbnail: classData?.classThumbnail,
          price: classData?.price,
          availableSeats: classData?.availableSeats,
          description: classData?.description,
        },
      };
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // ! update class status
    app.put("/classes/:id/status", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      console.log(status);
      const query = { _id: new ObjectId(id) };
      const currentStatus = await classesCollection.findOne(query);
      if (!currentStatus) {
        return res.status(404).send({ message: "user not found" });
      }
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Warrior is Running");
});

app.listen(port, () => {
  console.log(`warrior is running on port ${port}`);
});

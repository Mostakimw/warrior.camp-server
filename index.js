const express = require("express");
require("dotenv").config();
const cors = require("cors");
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SK);

const port = process.env.PORT || 5000;
const app = express();

// ! middleware
app.use(cors());
app.use(express.json());

// ! verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("warriorCamp").collection("users");
    const classesCollection = client.db("warriorCamp").collection("classes");
    const selectedClassesCollection = client
      .db("warriorCamp")
      .collection("selectedClasses");
    const enrollmentCollection = client
      .db("warriorCamp")
      .collection("enrollment");

    // ! verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      if (result?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // ! jwt
    app.post("/jwt", async (req, res) => {
      const body = req.body;
      const token = jwt.sign(body, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ! get/check if its admin or not
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // ! get/check if its instructor or not
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

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

    // ! delete user by admin in manage user page
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);

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
    app.get("/classes", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail !== email) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }
      const query = { email: email };
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
      const query = { _id: new ObjectId(id) };
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

    // ! update seat and enrollment after stu enrolled
    app.patch("/classes/:courseId", async (req, res) => {
      const courseId = req.params.courseId;

      try {
        const update = await classesCollection.updateOne(
          { courseId },
          { $inc: { availableSeats: -1, enrollment: 1 } }
        );

        res.send(update);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to update class.");
      }
    });

    // ! selected classes

    // ! post selected classes to db
    app.post("/selected-classes", async (req, res) => {
      try {
        const data = req.body;
        const existingSelection = await selectedClassesCollection.findOne({
          email: data.email,
          courseId: data.courseId,
        });
        if (existingSelection) {
          return res
            .status(409)
            .json({ message: "This class is already selected" });
        }
        data.selected = true;
        const result = await selectedClassesCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to select the class" });
      }
    });

    // ! get all the selected classes by their email
    app.get("/selected-classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      if (req.decoded.email !== email) {
        if (email !== decodedEmail) {
          return res
            .status(403)
            .send({ error: true, message: "Forbidden access" });
        }
      }
      const query = { email: email };
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result);
    });
    // ! get single class by their id
    app.get("/selected-classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await selectedClassesCollection.findOne(query);
      res.send(result);
    });

    // ! delete single class by user
    app.delete("/selected-classes/:id", async (req, res) => {
      const id = req.params.id;
      const result = await selectedClassesCollection.deleteOne({
        _id: id,
      });
      res.send(result);
    });

    // ! payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;
      if (!price) return;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // ! store the enrollment class and payment information
    app.post("/enroll", async (req, res) => {
      const enrolledData = req.body;
      const result = await enrollmentCollection.insertOne(enrolledData);
      res.send(result);
    });

    //! get all the paid classes
    app.get("/enrolled", async (req, res) => {
      const result = await enrollmentCollection.find().toArray();
      res.send(result);
    });

    app.get("/enroll", async (req, res) => {
      const email = req.query.email;
      //   if (req.decoded.email !== email) {
      //     return res.status(403).send({ message: "Forbidden access" });
      //   }
      const query = { email: email };
      const result = await enrollmentCollection.find(query).toArray();
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

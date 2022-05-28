const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion,ObjectId} = require('mongodb');
const port = process.env.PORT || 5000;
 
//middleware
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h4yoxky.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: "Invalid authorization" });
    }
    const token = authHeader.split(" ")[1];
    // console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      req.decoded = decoded;
      next();
    });
  }

async function run() {
    try {
      await client.connect();
      console.log("connected ");
      const partsCollection = await client.db("ryans-pc").collection("parts");
      const purchaseCollection = await client
      .db("ryans-pc")
      .collection("purchase");
      const userCollection = await client.db("ryans-pc").collection("users");
      const reviewCollection = await client
      .db("ryans-pc")
      .collection("reviews");
      const profileCollection = await client
      .db("ryans-pc")
      .collection("profile");

      const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          next();
        } else {
          res.status(403).send({ message: "forbidden" });
        }
      };


    /*PARTS COLLECTION*/

    //Add parts

    app.post("/part", async (req, res) => {
        const data = req.body;
        const result = await partsCollection.insertOne(data);
        res.send(result);
      });

    //get all parts
    

    app.get("/part", async (req, res) => {
        const result = await partsCollection.find().toArray();
        res.send(result);
      });

      //get specific parts details

    app.get("/part/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await partsCollection.findOne(filter);
        res.send(result);
      });
       // manage or delete parts from admin panel

    app.delete("/part/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await partsCollection.deleteOne(filter);
        res.send(result);
      });
  

 /* Confirm Purchase Collection*/

    // add purchase

    app.post("/purchase", async (req, res) => {
        const data = req.body;
        const result = await purchaseCollection.insertOne(data);
        res.send(result);
      });

      //get specific Confirmed purchase by user email

    app.get("/purchase", verifyJWT, async (req, res) => {
        const email = req.query.email;
        // const authHeader = req.headers.authorization;
        // console.log(authHeader);
        const decodedEmail = req.decoded.email;
        if (email === decodedEmail) {
          const query = { email: email };
          const result = await purchaseCollection.find(query).toArray();
          res.send(result);
        } else {
          return res.status(403).send({ message: "Forbidden" });
        }
      });
  
      //get users purchase collection for payment
  
      app.get("/purchase/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await purchaseCollection.findOne(query);
        res.send(result);
      });
  
      //get all purchase or order collection for admin
  
      app.get("/order", async (req, res) => {
        const result = await purchaseCollection.find().toArray();
        res.send(result);
      });
  
      /* USER COLLECTION */
  
      // Add User information
  
      app.put("/user/:email", async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        console.log(user);
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
        console.log(token);
        res.send({ result, token });
      });
  
      // get all users
  
      app.get("/user", verifyJWT, async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });
  
      //identify users
      app.get("/user/:email", async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isUser = user.role !== "admin";
        res.send({ user: isUser });
      });
  
      /**
       * ADMIN PART
       */
      //set a admin role to make the user to admin
      app.put("/user/admin/:email", verifyJWT, async (req, res) => {
        const email = req.params.email;
        const requester = req.decoded.email;
        const reqesterAccount = await userCollection.findOne({
          email: requester,
        });
        // if (reqesterAccount.role === "admin") {
          const filter = { email: email };
          const updateDoc = {
            $set: {
              role: "admin",
            },
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        // } else {
        //   res.status(403).send({ message: "Forbidden access" });
        // }
      });
  
      // verify admin to make a user ADMIN
      app.get("/admin/:email", async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role == "admin";
        res.send({ admin: isAdmin });
      });
  
      /*
      REVIEW PART
      */
  
      //add or post a review
  
      app.post("/review", async (req, res) => {
        const data = req.body;
        const result = await reviewCollection.insertOne(data);
        res.send(result);
      });
  
      //get all review
      app.get("/review", async (req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      });

      /*
    PAYMENT 
    */

    // app.post("/create-payment-intent", verifyJWT, async (req, res) => {
    //     const service = req.body;
    //     const price = service.price;
    //     const amount = price * 100;
    //     const paymentIntent = await stripe.paymentIntents.create({
    //       amount: amount,
    //       currency: "usd",
    //       payment_method_types: ["card"],
    //     });
    //     console.log(paymentIntent.client_secret);
    //     res.send({ clientSecret: paymentIntent.client_secret });
    //   });
  
      /*MY PROFILE
      
      */
      //add or update information
      app.put("/profile/:email", async (req, res) => {
        const email = req.params.email;
        const userInfo = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: userInfo,
        };
        const result = await profileCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      });
  
      //get all data from
      app.get("/profile", async (req, res) => {
        const email = req.query.email;
        const filter = { email: email };
        const result = await profileCollection.findOne({ filter });
        res.send(result);
      });
  


    } finally {
    }
  }
  run().catch(console.dir);
 
app.get("/", (req, res) => {
  res.send("Hello from doctor!");
});
 
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

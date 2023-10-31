const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3001;

// middleware
app.use(cors({
   origin: [
      // 'http://localhost:5173',
      'car-doctor-c273a.web.app',
      'car-doctor-c273a.firebaseapp.com'
   ],
   credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// console.log(process.env.DB_USER,process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sxdrhxr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// self middleware
const logger = async(req, res, next) =>{
   console.log('called', req.host, req.originalUrl);
   next();
}

const verifyToken = async(req,res, next) =>{
   const token = req.cookies?.token;
   console.log('value of token in middleware', token);
   if(!token){
      return res.status(401).send({message: 'not authorizes'})
   }
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
      // error
      if(err){
         console.log(err);
         return res.status(401).send({message: 'Unauthorized'})
      }
      // if token is valid then it would be decoded
      console.log('Value in the token', decoded);
      req.user = decoded;
      next()
   })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
   //  await client.connect();

   const serviceCollection = client.db('CarDoctor').collection('services');
   const bookingCollection = client.db('CarDoctor').collection('booking');

   // auth related api
   app.post('/jwt', logger, async(req,res) =>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

      res
      .cookie('token', token, {
         httpOnly: true,
         secure: false, // http://localhost:5173/login,
         sameSite: 'none'

      })
      res.send({success: true});
   })

   // all services related api
// all services show
   app.get('/services', logger, async(req,res) =>{
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
   });
// single service show
   app.get('/services/:id', logger, async(req,res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const options = {
         // Include only the `title` and `imdb` fields in the returned document
         projection: { title: 1, price: 1, service_id: 1, img: 1 },
       };
      const result = await serviceCollection.findOne(query,options);
      res.send(result);
   });

   // bookings get
   app.get('/bookings', logger, verifyToken, async(req,res) =>{
      console.log(req.query.email);
      console.log('User in the Valid token',req.user);
      // token get
      // console.log('token',req.cookies.token);
      // conditional query and sort
      let query = {};
      if(req.query?.email){
         query = {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
   });
   // bookings insert
   app.post('/bookings', logger, async(req, res) =>{
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
   });
   // update
   app.patch('/bookings/:id', logger, async(req,res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
         $set:{
            status : updateBooking.status
         },
      };
     const result = await bookingCollection.updateOne(filter,updateDoc);
     res.send(result);
   })
   // delete booking
   app.delete('/bookings/:id', logger, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
   });
   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   //  await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res) =>{
   res.send("Server is running");
})

app.listen(port, () =>{
   console.log(`Car Doctor is running on port: ${port}`);
})
const express = require('express')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000;
var cors = require('cors')


 

app.use(express.json())
app.use(
    cors({
      origin: [
        "http://localhost:5173",
      ],
      credentials: true,
    })
  );



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r31xce1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function run() {
  try {
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection =  client.db("final_p_DB").collection('menuData')
    const cardCollection =  client.db("final_p_DB").collection('cardData')
    const reviewsCollection =  client.db("final_p_DB").collection('reviewData')

    app.get('/menu', async(req, res) => {
        const category=req.query.category
       
        const query = {}
        if (category) {
            query.category = category;
        }
     
        const result = await menuCollection.find(query).toArray();
        res.send(result)
      })

    //  add  food card 
      app.post('/foodCard',async (req,res)=>{

        const {cardInfo}= req.body;
        const result = await cardCollection.insertOne(cardInfo)
        res.send(result)
       
      })

      // get food Card by email

      app.get('/foodCard', async (req,res)=>{
        const {email}=req.query;
        const filter={userEmail:email}
        const result = await cardCollection.find(filter).toArray()
        res.send(result)
      })


      // get food Card

      app.get('/cart', async(req, res) => {
        const cursor = cardCollection.find();
        const result =  await cursor.toArray()
        res.send(result)
    })


      app.delete('/deleteCart/:id', async (req,res)=>{
        const id=req.params.id
        const query={cardId:id};
        const result = await cardCollection.deleteOne(query)
        res.send(result)
        console.log(id);
      })
   

      // get singel cart

      app.get('/menu/:id', async(req,res)=>{
        const id=req.params.id;
        const filter={_id: new ObjectId(id)}
        const result = await menuCollection.findOne(filter)
        res.send(result)
        
 
      })


      // get review data 

      app.get('/reviews',async(req,res)=>{
        const cursor = reviewsCollection.find();
        const result =  await cursor.toArray()
        res.send(result)

      })
   



    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Bistro Boos Server is Running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
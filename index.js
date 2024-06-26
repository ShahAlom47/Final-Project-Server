const express = require('express')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000;
var cors = require('cors')
var jwt = require('jsonwebtoken');


// https://final-project-server-mu.vercel.app  

app.use(express.json())
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      'https://bistro-boss-final-projec-81261.web.app'

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


// payment related 
const stripe = require("stripe")('sk_test_51PKiBjL0G1CCoDyDRkCUwtKpYgtrBhUq77lrlEW7VZ3qrktdgwqENoZXkNIamCJc5pdhkyouwywNOZzSdaagQXox00buzKKS5T');

app.use(express.static("public"));



async function run() {
  try {
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("final_p_DB").collection('menuData')
    const cardCollection = client.db("final_p_DB").collection('cardData')
    const reviewsCollection = client.db("final_p_DB").collection('reviewData')
    const userCollection = client.db("final_p_DB").collection('usersData')
    const paymentCollection = client.db("final_p_DB").collection('paymentData')

    // middleware 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unAuthorize access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;

        next()
      });
    }

    const verifyAdmin = async (req, res, next) => {
      const tokenEmail = req.decoded.data;
      const query = { email: tokenEmail }
      const result = await userCollection.findOne(query)
      const isAdmin = result?.role === 'admin'

      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    // jwt related API

    app.post('/jwt', async (req, res) => {
      const userInfo = req.body.userInfo

      const token = jwt.sign({
        data: userInfo
      }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token })


    })



    // user related  api

    app.post('/addUser', async (req, res) => {

      const userInfo = req.body
      const query = { email: userInfo.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }

      const result = await userCollection.insertOne(userInfo)
      res.send(result)
    })


    app.get('/allUsers', verifyToken, verifyAdmin, async (req, res) => {
      const userEmail = req.decoded.data.userInfo;
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    //  delete user 
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id

      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })

    // admin making

    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id

      const filter = { _id: new ObjectId(id) }
      const updatedDocs = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDocs)
      res.send(result)
    })


    // user Home data 
    app.get('/userHomeData/:email',verifyToken, async(req,res)=>{
      const email=req.params.email;
      
      const orderData= await cardCollection.countDocuments({userEmail:email});
      const reviewData= await reviewsCollection.countDocuments({userEmail:email});
      const paymentData= await paymentCollection.countDocuments({email:email})
     
      res.send({order:orderData,review:reviewData,payment:paymentData})


    })

    // get admin Api

    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const userEmail = req.params.email
      const tokenEmail = req.decoded.data;
      if (userEmail !== tokenEmail) {
        return res.status(403).send({ message: 'forbidden user' })
      }
      const query = { email: userEmail }
      const result = await userCollection.findOne(query)
      let admin = false;

      if (result) {
        admin = result?.role === 'admin'
      }
    
      res.send(admin)
    })



    

    // menu related Api

    app.get('/menu', async (req, res) => {
      const category = req.query.category

      const query = {}
      if (category) {
        query.category = category;
      }

      const result = await menuCollection.find(query).toArray();
      res.send(result)
    })

    // get single menu item 
    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query)
      res.send(result)

    })

    // update menu item
    app.patch('/menu/update/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const updatedData = req.body
      const filter = { _id: new ObjectId(id) }
      const updatedDocs = {
        $set: {
          name: updatedData.name,
          recipe: updatedData.recipe,
          image: updatedData.image,
          category: updatedData.category,
          price: updatedData.price,
        }
      }
      const result = await menuCollection.updateOne(filter, updatedDocs)
      res.send(result)
    

    })

    // add menu

    app.post('/addMenu', verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body
      const result = await menuCollection.insertOne(menuItem)
      res.send(result)
    })

    // delete menu 

    app.delete('/menu/delete/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    
    })




    //  add  food card 
    app.post('/foodCard', async (req, res) => {

      const { cardInfo } = req.body;
      const result = await cardCollection.insertOne(cardInfo)
      res.send(result)

    })

    // get food Card by email

    app.get('/foodCard', async (req, res) => {
      const { email } = req.query;
      const filter = { userEmail: email }
      const result = await cardCollection.find(filter).toArray()
      res.send(result)
    })


    // get food Card

    app.get('/cart', async (req, res) => {
      const cursor = cardCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })


    app.delete('/deleteCart/:id', async (req, res) => {
      const id = req.params.id
      const query = { cardId: id };
      const result = await cardCollection.deleteOne(query)
      res.send(result)

    })

    // payment related 

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(100 * price)
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "aed",
        payment_method_types: [
          "card",
        ],
      
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


// payment history related 

app.post('/payment',async(req,res )=>{
  const paymentData= req.body
  const result = await paymentCollection.insertOne(paymentData)
  // delete menu
  const query={_id:{
    $in:paymentData.itemId.map(id=> new ObjectId(id))
    }
  }
  const deleteResult= await  cardCollection.deleteMany(query)

  res.send({result,deleteResult})

})


// get payment data 
app.get('/payments',async(req,res)=>{
  const result= await paymentCollection.find().toArray();
  res.send(result)
})

app.get('/paymentHistory/:email',verifyToken, async(req,res)=>{

  const email= req.params.email
  const tokenEmail = req.decoded.data;

  if(email!==tokenEmail){
    res.status(403).send({message:'forbidden access'})
    return
  }

const query= {email:email}
  const result = await paymentCollection.find(query).toArray()
  res.send(result)
})

    // get singel cart

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(filter)
      res.send(result)


    })


    // get review data 

    app.get('/reviews', async (req, res) => {
      const cursor = reviewsCollection.find();
      const result = await cursor.toArray()
      res.send(result)

    })



    // admin state

    app.get('/admin_state/:email',verifyToken,verifyAdmin, async(req,res)=>{
      const email=req.params.email
      

      const users= await userCollection.estimatedDocumentCount();
      const menus= await menuCollection.estimatedDocumentCount();
      const payments= await paymentCollection.estimatedDocumentCount();
      const revenueResult = await paymentCollection.aggregate([
        {
          $group:{
            _id:null,
            total:{$sum:'$price'}
          }
        }
      ]).toArray();
      // revenueResult  aita akta array return kore jar modde 2 ta property bt amar dorkar total namer  2nd peoperty tai array te 0 ar besi proparty thakle tar modde theke  total ta ke return koranu hoyece ar jodi na thake ta hole 0 return kora hoyece . 
      const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

      res.send({
        users,
        menus,
        payments,
        revenue
      })

    })


    app.get('/adminStatData', verifyToken, verifyAdmin, async (req, res) => {
    
      const result = await paymentCollection.aggregate([
      
       
          {
            $addFields: {
              menuItemsObjectIds: {
                $map: {
                  input: '$cartId',
                  as: 'itemId',
                  in: { $toObjectId: '$$itemId' }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'menuData',
              localField: 'menuItemsObjectIds',
              foreignField: '_id',
              as: 'menuItemsData'
            }
          },
          {
            $unwind: '$menuItemsData'
          },
          {
            $group:{
              _id:'$menuItemsData.category',
              quantity:{
                $sum:1
              },
              totalRevenue:{
                $sum:'$menuItemsData.price'
              }

            }
          },
          {
            $project:{
              _id:0,
              category:'$_id',
              quantity:1,
              totalRevenue:1


            }
          }


          //
          // // {
          // //   $project: {
          // //     category: '$_id',
          // //     count: 1,
          // //     total: { $round: ['$total', 2] },
          // //     _id: 0
          // //   }
          // // }
        
      ]).toArray();

      res.send(result);
    
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
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {MongoClient,ObjectId} = require('mongodb');
const app = express();
const port = 8081;
app.use(cors());
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extcloseed: true }));

// app.use(cookieParser());
const mongoUri ="mongodb+srv://vembu_karthick:0sJ98iEuQsh3qjxY@cluster0.mslvczx.mongodb.net/?retryWrites=true&w=majority";
const mongoClient = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
const SECRET_KEY = "voosh";

app.post('/add-user', async(req, res)=>{
    try{
        const userData=req.body
        const {name,phone_number,password} = userData
        if(!name || !password || !phone_number){
            res.status(404).json({"message": "Please provide the required details"});
        }
        else{
            await mongoClient.connect();
            coll=await mongoClient.db('database1').collection('userDetails');
            let res_data=await coll.findOne({phone_number: phone_number});
            if(res_data==null){
                const hashedPassword = await bcrypt.hash(password, 10);
                userData['password']=hashedPassword
                await coll.insertOne(userData);
                res.status(200).json({"message": "Successfully registered"});
            }
            else{
                res.status(400).json({"message":"Phone number is already registered"})
                
            }
        }
    }
    catch(e){
        console.log(e);
        res.status(500).send({"message":"Internal server error"})
    }
    finally{
        await mongoClient.close();
    }
  return;  
})

app.post('/login-user',async(req, res)=>{
    const {phone_number,password} = req.body
    try {
        if(!phone_number || !password){
            res.status(404).json({"message": "Please provide the required fields"});
        }
        else{
            await mongoClient.connect();
            coll=await mongoClient.db('database1').collection('userDetails');
            let res_data=await coll.findOne({phone_number:phone_number});
            console.log(res_data);
            if(res_data!=null){
                const passwordMatch = await bcrypt.compare(password, res_data.password);
                if (!passwordMatch) {
                    res.status(401).json({ "message": 'Invalid password' });
                    return;
                }
                let auth_token = jwt.sign({"user_id":res_data._id}, SECRET_KEY);
                res.status(200).json({auth_token});
            }
            else{
                res.status(404).json({"message": "Phone number not found. Please register"});
            }
        }
    }
    catch(e){
        console.log(e);
        res.status(500).json({"message":"Internal server error"})
    }
    finally{
        await mongoClient.close();
    }
    return;  
});

app.post('/add-order',async(req, res)=>{
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ "message": 'Authorization required' });
        }
        const orderData=req.body;
        const {user_id,sub_total,phone_number} = orderData
        if(!phone_number || !user_id || !sub_total){
            res.status(404).json({"message": "Please provide the required fields"});
        }
        else{
            const auth_token=token.split(' ')[1];
            const decoded = jwt.verify(auth_token, SECRET_KEY,(err)=>{
                res.status(401).json({ "message": 'Token is Invalid, Please Sign In again' });
            });
            await mongoClient.connect();
            coll=await mongoClient.db('database1').collection('userDetails');
            let res_data=await coll.findOne({phone_number: phone_number});
            if(decoded==null || decoded.user_id != res_data._id){
                return res.status(401).json({ "message": 'Token is Invalid, Please Sign In again' });
            }
            else{
                coll=await mongoClient.db('database1').collection('userProductDetails');
                let res_data=await coll.insertOne(orderData);
                res.status(200).json({"message":"Order is added successfully"});
            }
        }
    }
    catch(e){
        console.log(e);
        res.status(500).json({"message":"Internal server error"})
    }
    finally{
        await mongoClient.close();
    }
    return; 
})
app.get('/get-order',async(req, res)=>{
    try{
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ "message": 'Authorization required' });
        }
        const user_id=req.query.user_id;
        if(user_id ==null){
            res.status(404).json({ "message":"Please provide the user_id in query parameter"});
        }
        else{
            const auth_token=token.split(' ')[1];
            const decoded = jwt.verify(auth_token, SECRET_KEY,(err)=>{
                res.status(401).json({ "message": 'Token is Invalid, Please Sign In again' });
            });
            await mongoClient.connect();
            coll=await mongoClient.db('database1').collection('userDetails');
            let res_data=await coll.findOne({ _id:new ObjectId(user_id) });
            console.log(decoded);
            console.log(user_id);
            console.log(res_data);
            if(decoded==null || decoded.user_id != res_data._id){
                res.status(401).json({ "message": 'Token is Invalid, Please Sign In again' });
            }
            else{
                coll=await mongoClient.db('database1').collection('userProductDetails');
                let res_data=await coll.findOne({user_id:user_id});
                if(res_data==null) {
                    res.status(404).json({ "message":"No order details found for this provided user_id"});
                }
                else{
                    delete(res_data._id);
                    res.status(200).json({ "orders":res_data});
                }
            }
        }
    }
    catch(e){
        console.log(e);
        res.status(500).json({"message":"Internal server error"})
    }
    finally{
        await mongoClient.close();
    }
    return;
});
app.listen(port, () => {
    console.log(`App listening http://localhost:${port}`);
});
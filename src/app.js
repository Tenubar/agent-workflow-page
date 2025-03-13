import express from 'express';
import { Router } from 'express';
import { modelUsers } from './modelUsers.js';
import { dbconnect } from './config.js';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import path from 'path';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import cors from 'cors';

const eventEmitter = new EventEmitter();

dotenv.config();
const app = express();
const router = Router();
const PORT = 3000;

app.use(cors());
app.use(router);
router.use(express.json());
router.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static(path.join(path.resolve(), 'public')));
dbconnect();

// Options for HTTP-only cookies
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
};

const cookieOnboard = { httpOnly: true, maxAge: 10000 }; // Expires after 10 seconds




router.post('/register', async(req, res)=>{
    try {
        const {username, password} = req.body;
        const authTokenKey = crypto.randomBytes(32).toString('hex');
        const agents = [];
        const user = new modelUsers({
            username,
            password,
            apiKey: crypto.randomBytes(8).toString('hex'),
            loggedBefore: false,
            authTokenKey,
            agentCount: 0,
            workflowCount: 0,
            agents
        });
        await user.save();
        res.send(`
        <div class = "button" style = "font-size:14px;padding:12px;"><a href = "index.html"> ← Go Back </a></div>
        <h1 style = "color: green; font-size: 18px; padding:8px;">Registration Successful!</h1>
        `);
    } catch (error) {
        res.status(500).send('Something went wrong during registration. Please try again.');
    }
});



router.post('/authenticate', async (req, res) => {
    const { username, password } = req.body;
    try{
    const user = await modelUsers.findOne({username});
        if(!user){
            return res.status(401).header('error').send(`User not registered <div class = "button" style = "font-size:14px;padding:12px;"><a href = "index.html"> ← Go Back </a></div>`);
        }else{
        await user.isCorrectPassword(password,(err, result)=>{
            if(err){
                res.send('Authentication error');
            }else if (result) {


            const token = jwt.sign({ username: user.username, id: user._id }, user.authTokenKey, {
                expiresIn: '24h', // Token valid for 24 hours
            });
      
            res.cookie('auth_token', token, cookieOptions);


            if (!user.loggedBefore) {
                eventEmitter.emit('userFirstLogin', user.username);
                res.cookie('welcomeMessage', 'Hello, welcome!', cookieOnboard);
            }

            return res.redirect('/home');

            }else{
                res.status(500).send('usuario y/o contraseña incorrecta');
            }
        });
        }
        }catch{
            res.status(500).send('Internal server error please try again');
    }
});

// Token verification middleware
const authenticateToken = async (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        res.clearCookie('auth_token');
        return res.status(401).send('Access denied. Please log in.');
    }
  
    try {
        const decoded = jwt.decode(token);
        const user = await modelUsers.findById(decoded.id);
  
    if (!user) {
        res.clearCookie('auth_token');
        return res.status(403).send('Invalid token.');
    }

    jwt.verify(token, user.authTokenKey, (err) => {
    if (err) {
        res.clearCookie('auth_token');
        return res.status(403).send('Invalid token.');
    }
  
        req.user = user;
        next();
    });
    } catch (error) {
        res.status(500).send('Error validating token. Please try again.');
        res.clearCookie('auth_token');
    }
};

// Update Events
eventEmitter.on('userFirstLogin', async (username) => {
    console.log(`${username} logged in for the first time`);

    // await modelUsers.updateOne({ username }, { $set: { loggedBefore: true } });

    // trigger addition actions here, such as notifications
});


// GET agentID 
router.get("/get-agents/:id", async (req, res) => {
    const userId = req.params.id;
    try {
        // Retrieve only the titles from the agents array
        const getAgent = await modelUsers.findById(
        userId
    );

    if (getAgent && getAgent.agents) {
        const agentIds = getAgent.agents.map(agent => agent._id);
        const agentBackground = getAgent.agents.map(agent => agent.background);

        res.status(200).json({ message: "agentFound", titles: getAgent.agents.map(agent => agent.title), backgrounds: agentBackground, agentId: agentIds});

    } else {
        console.log("No agents found or the data is null");
    }
    
    } catch (error) {                                                                                             
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// GET AGENT Title and Background
router.get("/get-agent/:id", async (req, res) => {
    const userId = req.params.id;
    try {
        // Retrieve only the titles and background from the agents array
        const getAgent = await modelUsers.findById(userId, { "agents.title": 1, "agents.background": 1, _id: 0 });
        const agentDetails = getAgent.agents[0]; // Assuming you're retrieving the first agent
        res.status(200).json({ title: agentDetails.title, background: agentDetails.background});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET AGENT ARRAY ID
router.get("/get-agent/:userId/:agentId", async (req, res) => {
    const { userId, agentId } = req.params;

    try {
        const getAgent = await modelUsers.findOne(
            { _id: userId, "agents._id": agentId },
            { "agents.$": 1, _id: 0 }
        );

        if (!getAgent || !getAgent.agents) {
            return res.status(404).json({ error: "Agent not found" });
        }

        const agentDetails = getAgent.agents[0]; // The matched agent
        res.status(200).json({ title: agentDetails.title, background: agentDetails.background });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// POST AGENT
router.post("/create-agent/:id", async (req,res) =>{
    const userId = req.params.id;
    const { title, background } = req.body;

    try {
        const newAgent = await modelUsers.findByIdAndUpdate(
            userId,
            {
                $inc: { agentCount: 1 },
                $push: {agents: {title: title, background: background}}
            },
            {new: true}
        )
        if(!newAgent){
            return res.status(404).json({ error: "Error at creating the new agent" });
        }
        res.status(200).json({ message: "Agent created", newAgent });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// UPDATE AGENT
router.put("/update-agent/:userId/:agentID", async (req, res) => {
    const { userId, agentID } = req.params;
    const { newTitle, newBackground } = req.body;

    try {
        const updatedUser = await modelUsers.findByIdAndUpdate(
            userId,
            { 
                $set: { "agents.$[agent].title": newTitle, "agents.$[agent].background": newBackground }
            },

            {
                arrayFilters: [{ "agent._id": agentID }], 
                new: true 
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "Agent title updated", updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// DELETE AGENT
router.delete("/delete-agent/:userId/:agentID", async (req, res) => {
    const { userId, agentID } = req.params;
    try {
        const deleteUser = await modelUsers.findByIdAndUpdate(
            userId,
            { 
                $pull: { agents: { _id: agentID } }, 
                $inc: { agentCount: -1 }
            },
            {
                new: true 
            }
        );

        if (!deleteUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "Agent title updated", deleteUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// CHAT WITH AGENT ID
router.get("/chat-agent/:userId/:agentID", async (req, res) => {
    const { userId, agentID } = req.params;

    try {
        const getAgent = await modelUsers.findOne(
            { _id: userId, "agents._id": agentID },
            { "agents.$": 1, _id: 0 }
        );

        if (!getAgent || !getAgent.agents) {
            return res.status(404).json({ error: "Agent not found" });
        }

        const agentDetails = getAgent.agents[0]; // The matched agent
        return res.json({ title: agentDetails.title, background: agentDetails.background });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// WORKFLOW CRUD

// CREATE WORKFLOW
router.post("/create-workflow/:id", async (req,res) =>{
    const userId = req.params.id;
    const { title, background } = req.body;

    try {
        const newAgent = await modelUsers.findByIdAndUpdate(
            userId,
            {
                $inc: { agentCount: 1 },
                $push: {agents: {title: title, background: background}}
            },
            {new: true}
        )
        if(!newAgent){
            return res.status(404).json({ error: "Error at creating the new agent" });
        }
        res.status(200).json({ message: "Agent created", newAgent });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
let webhookData = false;

// webhooks
// router.post('/webhook', (req, res)=>{
//     console.log('Webhook received:', req.body);
//     webhookData = req.body;
//     res.status(200).send('Webhook received successfully');
// });

// Webhook endpoint
router.post('/webhook', (req, res) => {
    console.log('Webhook received:', req.body);
    webhookData = req.body; // Store the data from the webhook
    res.status(200).send('Webhook received successfully');
});

// Frontend route
router.get('/test', (req, res) => {
    const html = `
        <html>
            <head>
                <title>Home</title>
            </head>
            <body>
                <h1>${webhookData ? 'Info received!' : 'Waiting for info...'}</h1>
            </body>
        </html>
    `;
    res.send(html);
});


// router.get('/webhook-data', (req, res) => {
//     if (webhookData) {
//       res.status(200).json(webhookData);
//     } else {
//       res.status(404).send('No data available');
//     }
// });


// User Routes
router.get('/home', authenticateToken, (req, res) => {

    const welcomeMessage = req.cookies.welcomeMessage || '';
    res.clearCookie('welcomeMessage');

    res.render('home', {
        id: req.user._id,
        agentCount: req.user.agentCount,
        workflowCount: req.user.workflowCount,
        welcomeMessage
    });
});

router.get('/training', authenticateToken, (req, res) => {
    res.render('training',{
        username: req.user.username
    });
});

router.get('/create', authenticateToken, (req, res) => {
    res.render('create',{
        id: req.user._id,
        agentCount: req.user.agentCount,
        username: req.user.username
    });
});
  
router.get('/content', authenticateToken, (req, res) => {
    res.render('content',{
        username: req.user.username
    });
});

router.get('/chat', authenticateToken, (req, res) => {
    const { title, background } = req.query;
    res.render('chat', {
        title, 
        background 
    });
});
  
router.get('/settings', authenticateToken, (req, res) => {
    res.render('settings',{
        username: req.user.username
    });
});


router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/');
});

app.listen(PORT,()=>{
    console.log(`Listening to port ${PORT}`);
});
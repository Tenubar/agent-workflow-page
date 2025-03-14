import { createServer } from "http";
import { Server } from "socket.io";
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
const server = createServer(app);
const io = new Server(server);
const router = Router();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(path.resolve(), 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));
app.use(router);


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
        const workflowRunId = [];
        const user = new modelUsers({
            username,
            password,
            apiKey: crypto.randomBytes(8).toString('hex'),
            loggedBefore: false,
            authTokenKey,
            agentCount: 0,
            workflowCount: 0,
            agents,
            socketId: "",
            workflowRunId
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

    await modelUsers.updateOne({ username }, { $set: { loggedBefore: true } });

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

// WebSocket connection
io.on("connection", (socket) => {
    console.log("Client connected");

    // socket.on("registerSocket", async ({ userId }) => {
    //     try {
    //         // Update the user's socketId in the database
    //         await modelUsers.findByIdAndUpdate(userId, { socketId: socket.id });

    //         console.log(`Socket ID ${socket.id} registered for user: ${userId}`);
    //     } catch (error) {
    //         console.error("Error registering socket ID:", error);
    //     }
    // });

    // Listen for the registerSocket event from the client
    socket.on("registerSocket", ({ workflowRunId }) => {
        // Join the client to the room identified by workflowRunId
        socket.join(workflowRunId);
        console.log(`Socket ${socket.id} joined room: ${workflowRunId}`);

        // Emit a confirmation back to the client
        socket.emit("socketRegistered", { message: `Registered to room ${workflowRunId}` });
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});


router.post('/api/save-workflow-id', async (req, res) => {
    try {
        const { userId, workflowRunId } = req.body;

        const newRun = await modelUsers.findByIdAndUpdate(
            userId,
            {
                $push:{workflowRunId: workflowRunId}
            },
            {new: true}
        )

        // Validate the request body
        if(!newRun){
            return res.status(404).json({ error: "Error at creating the new agent" });
        }
        res.status(200).json({ message: "Workflow triggered successfully", newRun });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Proxy route for making the external API request
app.post("/proxy/workflow", async (req, res) => {
    try {
        const apiKey = "sk--dUmIovpvZ3Vb83tCd9Ieg20250313174645"; // Keep API keys secure in the backend
        const workflowID = req.body.workflowID; // Retrieve workflow ID from client request
        const url = `https://api-v3.mindpal.io/api/workflow/run?workflow_id=${workflowID}`;

        // Headers for the external API
        const headers = {
            "accept": "application/json",
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        };

        // Data to send to the external API
        const data = req.body.data; // The workflow details, e.g., "Goal" and "Target Audience"

        // Make the request to the external API
        const apiResponse = await axios.post(url, data, { headers });

        // Send the response from the external API back to the client
        res.status(apiResponse.status).json(apiResponse.data);
    } catch (error) {
        console.error("Error in proxy:", error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({
            error: "Error making the request to the external API.",
            details: error.response ? error.response.data : error.message,
        });
    }
});



router.post("/api/webhook", (req, res) => {
    // Add CORS headers for this specific route
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

    const data = req.body;
    console.log(data);

    const workflow_run_id = req.body.workflow_run_id;
    console.log(workflow_run_id);

    io.to(workflow_run_id).emit("updateTextarea", { message: data });
    return res.status(200).send("Data sent to client");
});

    // const { workflowRunId, data } = req.body;

    // // Match query in the database
    // const workflow = database.get(workflowRunId);
    // if (workflow) {
    //     const { socketId } = workflow;

    //     // Emit data to the corresponding client
    //     io.to(socketId).emit("updateTextarea", { message: data });
    //     return res.status(200).send("Data sent to client");
    // }

    // res.status(404).send("Workflow not found");


// router.post("/api/webhook", (req, res) => {

//     const data = req.body;
//     console.log(data);
//     // const { workflowRunId, data } = req.body;

//     // // Match query in the database
//     // const workflow = database.get(workflowRunId);
//     // if (workflow) {
//     //     const { socketId } = workflow;

//     //     // Emit data to the corresponding client
//     //     io.to(socketId).emit("updateTextarea", { message: data });
//     //     return res.status(200).send("Data sent to client");
//     // }

//     // res.status(404).send("Workflow not found");
// });

// router.post("/api/webhook", async (req, res) => {
//     try {
//         // Extract the workflowRunId from the request body
//         const workflowRunIdObject = req.body.find(item => item.key === "workflow_run_id");
//         const dataObject = req.body.find(item => item.key === "workflow_run_output");

//         if (!workflowRunIdObject || !dataObject) {
//             return res.status(400).send("Invalid payload format");
//         }

//         const workflowRunId = workflowRunIdObject.value; // Workflow Run ID
//         const data = dataObject.value; // Workflow Run Output

//         // Search in the database for a user with the specified workflowRunId
//         const user = await modelUsers.findOne({ workflowRunId: workflowRunId });

//         if (user) {
//             // Assume each user document has a `socketId` field (you may need to add this)
//             const socketId = user.socketId;

//             // Emit data to the corresponding client
//             io.to(socketId).emit("updateTextarea", { message: data });

//             return res.status(200).send("Data sent to client");
//         }

//         res.status(404).send("WorkflowRunId not found");
//     } catch (error) {
//         console.error("Error processing webhook:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });




// let webhookData = [];

// // Webhook route
// router.post('/webhook', (req, res) => {
//     try {
//         webhookData = req.body; // Assuming the body is properly formatted
//         res.status(200).json({ message: 'Webhook data received', webhookData });
//     } catch (error) {
//         console.error('Error in /webhook route:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

// // Frontend route
// router.get('/test', (req, res) => {
//     try {
//         const workflowRunOutput = Array.isArray(webhookData)
//             ? webhookData.find(item => item.key === 'workflow_run_output')
//             : null;

//         const contents = workflowRunOutput?.value.map(item => item.content) || ['Waiting for message'];
//         res.status(200).json(contents);
//     } catch (error) {
//         console.error('Error in /test route:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });




// User Routes
router.get('/home', authenticateToken, (req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

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

server.listen(PORT,()=>{
    console.log(`Listening to port ${PORT}`);
});
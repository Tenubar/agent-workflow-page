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
import axios from 'axios';
import OpenAI from "openai";

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



// Open Ai Logic



// Routes
router.post('/register', async(req, res)=>{
    try {
        const {username, password} = req.body;
        const authTokenKey = crypto.randomBytes(32).toString('hex');
        const agents = [];
        const workflowRunId = [];
        const trainingInfo = [];
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
            workflowRunId,
            trainingInfo
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
                // $push: {agents: {title: title, background: background, chat: {assistant: 'hello', userChat: 'I respond'}}}
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

// Check if there is any training data created
router.get("/check-training-info/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Find the user and check if `trainingInfo` exists and has data
        const user = await modelUsers.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if `trainingInfo` exists and is not empty
        if (!user.trainingInfo || user.trainingInfo.length === 0) {
            // Push default information to `trainingInfo`
            const defaultTrainingInfo = {
                yourself: "",
                niche: "",
                offer: "",
                business: "",
                website: ""
            };

            user.trainingInfo = [defaultTrainingInfo]; // Initialize with the default info
            await user.save(); // Save the updated user document

            return res.status(200).json({ message: "Default trainingInfo added.", data: user.trainingInfo });
        }

        // If `trainingInfo` already has data, do nothing
        return res.status(200).json({ message: "TrainingInfo already exists.", data: user.trainingInfo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// HISTORY CHAT
router.get("/chat-history-agent/:userId/:agentID", async (req, res) => {
    const { userId, agentID} = req.params;

    try {
        const getAgent = await modelUsers.findOne(
            { _id: userId, "agents._id": agentID },
            { "agents.$": 1, _id: 0 }
        );

        if (!getAgent || !getAgent.agents) {
            return res.status(404).json({ error: "Agent not found" });
        }

        const agentDetails = getAgent.agents[0]; // The matched agent
        return res.json({ title: agentDetails.title, background: agentDetails.background, chat: agentDetails.chat, chatLength: agentDetails.chat.length});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});





// STORAGE ASSISTANT CHAT
router.post("/chat-assistant-storage/:userId/:agentId", async (req, res) => {
    const { userId, agentId } = req.params;
    const { assistant } = req.body;

    try {
        const updateChat = await modelUsers.findOneAndUpdate(
            { _id: userId, "agents._id": agentId }, // Match the user and specific agent
            { 
                $push: { "agents.$.chat": { assistant: assistant } } // Add the assistant message
            },
            { new: true } // Return updated document
        );

        if (!updateChat) {
            return res.status(404).json({ error: "User or agent not found" });
        }

        res.status(200).json({ message: "Assistant chat saved successfully", updatedChat: updateChat });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// STORAGE USER CHAT
router.post("/chat-user-storage/:userId/:agentId", async (req, res) => {
    const { userId, agentId } = req.params;
    const { user } = req.body;

    try {
        const updateChat = await modelUsers.findOneAndUpdate(
            { _id: userId, "agents._id": agentId }, 
            { 
                $push: { "agents.$.chat": { user: user } }
            },
            { new: true } 
        );

        if (!updateChat) {
            return res.status(404).json({ error: "User or Agent not found" });
        }

        res.status(200).json({ message: "Chat saved successfully", updatedAgent: updateChat });

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

    // Listen for the registerSocket event from the client
    socket.on("registerSocket", ({ workflowRunId }) => {
        // Join the client to the room identified by workflowRunId
        socket.join(workflowRunId);
        console.log(`Socket ${socket.id} joined room: ${workflowRunId}`);

        // Emit a confirmation back to the client
        socket.emit("socketRegistered", { message: `Registered to room ${workflowRunId}` });
    });

    socket.on("closeConexion", ({ workflowRunId }) => {
        socket.leave(workflowRunId);
        console.log(`Socket ${socket.id} leaved the room: ${workflowRunId}`);
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});


router.post('/api/save-workflow-id', async (req, res) => {

    try {
        const { userId, workflowRunId, title, output } = req.body;

        const newWorkflowRun = {
            title: title, // Title from request body
            output: output, // Output from request body
            runId: workflowRunId
        };

        const newRun = await modelUsers.findByIdAndUpdate(
            userId,
            {
                $push:{workflowRunId: newWorkflowRun}
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


// Get training info
router.get("/api/personal-context/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // Assuming you have a User model and trainingInfo is a field in the schema
        const user = await modelUsers.findById(userId).select("trainingInfo");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ trainingInfo: user.trainingInfo });
    } catch (err) {
        console.error("Error fetching personal context data:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Post new training info
router.post("/api/personal-context/:userId", async (req, res) => {
    const { yourself, offer, niche, business, website } = req.body; // Destructure the incoming data
    const { userId } = req.params;

    try {
        // Find the user document
        const user = await modelUsers.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure the `trainingInfo` array exists in the document
        if (user.trainingInfo && user.trainingInfo.length > 0) {
            // Find the entry to update (assuming you have a specific logic for the entry's structure)
            const existingEntry = user.trainingInfo[0]; // Assuming `trainingInfo` has one object

            // Update only the fields that exist
            if (existingEntry) {
                if (yourself) existingEntry.yourself = yourself;
                if (offer) existingEntry.offer = offer;
                if (niche) existingEntry.niche = niche;
                if (business) existingEntry.business = business;
                if (website) existingEntry.website = website;
            }
        } else {
            user.trainingInfo.push({ yourself, offer, niche, business, website });
            // return res.status(400).json({ message: 'No existing trainingInfo found to update.' });
        }

        // Save the updated document
        await user.save();

        res.status(200).json({ message: 'Training information updated successfully', data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating data', error: err });
    }
});


// Get Training Info
// router.get("/api/personal-context/:userId", async (req, res) => {
//     const { yourself, offer, niche, business, website } = req.body; // Destructure the incoming data
//     const { userId } = req.params;
// });


// Proxy route for making the external API request
app.post("/proxy/workflow", async (req, res) => {
    try {
        const workflowTitle = 'new run';
        const { workflowID, data, userId } = req.body;
        const apiKey = "sk--dUmIovpvZ3Vb83tCd9Ieg20250313174645"; // Keep API keys secure in the backend
        const url = `https://api-v3.mindpal.io/api/workflow/run?workflow_id=${workflowID}&workflow_run_title=${workflowTitle}&openai_api_key=${apiKey}&anthropic_api_key=${apiKey}&google_api_key=${apiKey}&groq_api_key=${apiKey}`;

        // Headers for the external API
        const headers = {
            "accept": "application/json",
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        };

        // Data to send to the external API
        // const data = req.body.data; // The workflow details, e.g., "Goal" and "Target Audience"
        
        const incWorkflowCount = await modelUsers.findByIdAndUpdate(
            userId,
            { 
                // $pull: { agents: { _id: agentID } }, 
                $inc: { workflowCount: 1 }
            },
            {
                new: true 
            }
        );
        
        if (!incWorkflowCount) {
            return res.status(404).json({ error: "User not found" });
        }

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
    const data = req.body;
    const workflow_run_id = req.body.workflow_run_id;

    const current_index = data.workflow_run_output.length;
    // const workflow_name = data.workflow_title;
    // const workflow_run_output = data.workflow_run_output[current_index - 1].content;

    io.to(workflow_run_id).emit("updateTextarea", { message: JSON.stringify(data, null, 2), index: current_index});
    return res.status(200).send("Data sent to client");
});

// GET WORKFLOW
router.get('/api/get-workflow/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find user by ID and select workflowRunId
        const user = await modelUsers.findById(userId).select("workflowRunId");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return the workflowRunId array
        res.status(200).json({ workflowRunId: user.workflowRunId });
    } catch (error) {
        console.error("Error retrieving workflows:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// GET ALL WORKFLOWIDS IN HISTORY
router.get('/api/get-workflowid-history/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Find user by ID
        const getWorkflowId = await modelUsers.findById(userId);

        if (getWorkflowId && getWorkflowId.workflowRunId) {
            // Retrieve all runIds
            const runIds = getWorkflowId.workflowRunId.map(workflowRun => workflowRun.runId);
            
            res.status(200).json({ message: "agentFound", runIds });
        } else {
            res.status(404).json({ message: "No agents found or the data is null" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// REMOVE WORKFLOW
// Endpoint to remove the workflow ID
app.post('/api/removeWorkflowId', async (req, res) => {
    const { runId } = req.body;
  
    if (!runId) {
      return res.status(400).json({ error: 'WorkflowId is required' });
    }
  
    try {
      // Update the document by removing the workflowRunId field for the given workflowId
      const result = await modelUsers.updateOne(
        { 'workflowRunId.runId': runId },
        { $pull: { workflowRunId: { runId: runId } } }
      );
  
      if (result) {
        res.status(200).json({ message: 'WorkflowRunId removed successfully', user: result });
      } else {
        res.status(404).json({ error: 'Workflow ID not found' });
      }
    } catch (error) {
      console.error('Error removing WorkflowRunId:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


// Chat Bot Open AI 
router.post('/api/chat', async (req, res) => {
    const message = req.body.message;
    const chatHistory = req.body.formattedChat;
    const context = req.body.context;
    const userName = req.body.userName;


    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: `Hi, my name is ${userName}, Here's a short bio about me: ${context.yourself}, I'm passionate about ${context.niche}, These are the services/products I offer${context.offer}, My business specializes in ${context.business}.` },
                    ...chatHistory,

                    { role: 'user', content: message }
                ],
                max_tokens: 150,
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.API_OPENAI}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        // Send the OpenAI response back to the frontend
        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        res.status(500).json({ error: "An error occurred." });
    }
});


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
        id: req.user._id,
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
    const { title, background, agentid } = req.query;
    res.render('chat', {
        username: req.user.username,
        id: req.user._id,
        title, 
        background,
        agentid
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
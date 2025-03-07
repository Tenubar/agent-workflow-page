import express from 'express';
import { Router } from 'express';
import { modelUsers } from './modelUsers.js';
import { dbconnect } from './config.js';
import { exec } from 'child_process';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import path from 'path';
const app = express();
const router = Router();
const PORT = 3000;

app.use(router);
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(path.resolve(), 'views'));
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static(path.join(path.resolve(), 'public')));
dbconnect();



// router.post('/open-explorer', (req, res) => {
//     exec('explorer', (err) => {
//       if (err) {
//         console.error(`Error: ${err}`);
//         return;
//       }
//       console.log('File Explorer opened!');
//     });
// });


router.post('/register', async(req, res)=>{
    try {
        const {username, password} = req.body;
        const user = new modelUsers({
            username,
            password,
            apiKey: crypto.randomBytes(8).toString('hex')
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
                res.send('error al autenticar');
            }else if (result) {
            res.status(200).header('authorization').render('home', { username: user.username});

            }else{
                res.status(500).send('usuario y/o contraseña incorrecta');
            }
        });
        }
        }catch{
            res.status(500).send('Internal server error please try again');
    }
});

router.get('/home', (req, res) => {
    res.render('home');
});

router.get('/training', (req, res) => {
    res.render('training');
});

router.get('/create', (req, res) => {
    res.render('create');
});
  
// app.get('/messages', (req, res) => {
//     res.render('messages');
// });
  
app.get('/content', (req, res) => {
    res.render('content');
});
  
app.get('/settings', (req, res) => {
    res.render('settings');
});


app.listen(PORT,()=>{
    console.log(`Listening to port ${PORT}`);
});
import mongoose from "mongoose";
import bcrypt from 'bcrypt';
const saltRounds = 10;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true
        },
        password:{
            type: String,
            required: true,
        },
        apiKey:{
            type: String
        },
        loggedBefore:{
            type: Boolean
        },
        authTokenKey:{
            type: String
        },
        agentCount:{
            type: Number
        },
        trainingInfo:[
            {yourself: {type: String}, offer: {type: String}, niche: {type: String}, business: {type: String}, website: {type: String}}
        ],
        workflowCount:{
            type: Number
        },
        workflowRunId:[
            {title: {type: String}, output:{type: String}, runId:{type:String}}
        ],
        socketId:{
            type: String
        },
        agents: [
            { title: {type: String}, background: {type: String}, chat: [{assistant: {type: String}, user:{type: String}}]}
        ]
    },
);

userSchema.pre('save', function(next){
    if(this.isNew || this.isModified('password')){
        const document = this;
        bcrypt.hash(document.password, saltRounds, (err, hashedPassword)=>{
            if(err){
                next(err);
            }else{
                document.password = hashedPassword;
                next();
            }
        });
    }else{
        next();
    }
});

userSchema.methods.isCorrectPassword = function(password,callback){
    
    bcrypt.compare(password, this.password, function (err, same){
        if(err){    
            callback(err);
        }else{
            callback(err, same);
        }
    })
}

export const modelUsers = mongoose.model('users', userSchema);
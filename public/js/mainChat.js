let flag0 = 0;

const params = new URLSearchParams(window.location.search);
const agentid = params.get('agentid');

setTimeout(function() {
    var aiMessage = "Hi! Good to see you here.";
    var aiResponse = "Assistant: " + aiMessage;
    appendMessage(aiResponse, 'ai');
    flag0 = 0;
}, 500);


async function sendMessage() {
    var input = document.getElementById('message-input');
    var message = input.value;
    if (message.trim() === '' || flag0 > 0) return;

    appendMessage("user: " + message, 'user');
    input.value = '';

    flag0 = 1;
    saveUserConversation(message);

    // Fetch response from backend
    const aiMessage = await fetchChatGPTResponse(message);
    appendMessage("Assistant: " + aiMessage, 'ai');

    flag0 = 0;

    // Save conversation to Database
    saveAssistantConversation(aiMessage);
}


async function fetchChatGPTResponse(message) {
    const agentID = agentid;
    const userName = username;
    try {
        // Getting history of chat
        const getChat = await axios.get(`/chat-history-agent/${userId}/${agentID}`);

        if (getChat.status === 200) {
            const { chat } = getChat.data;

            // Transform chat data to OpenAI's expected format
            const formattedChat = chat.map(entry => {
                if (entry.user) {
                    return { role: 'user', content: entry.user };
                } else if (entry.assistant) {
                    return { role: 'assistant', content: entry.assistant };
                }
            }).filter(entry => entry); // Remove undefined entries

            // Add the current user message to the chat history
            formattedChat.push({ role: 'user', content: message });

            // Get the training data/context
            const getContext = await axios.get(`/api/personal-context/${userId}`);

            let context = ""; // Default context in case the API call fails
            if (getContext.status === 200) {
                context = getContext.data.trainingInfo[0];
            } else {
                console.warn("Error fetching context data:", getContext.status);
                return "Could not retrieve context data.";
            }

            // Send the chat history to the backend and recieve message from backend
            const response = await axios.post('/api/chat', { message, formattedChat, context, userName});
            return response.data.reply; // Return the bot's response
        } else {
            console.error("Error fetching chat history:", getChat.status);
            return "Could not retrieve chat history.";
        }
        
    } catch (error) {
        if (error.response && error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'] || 1; // Default to 1 second if not provided
            console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds.`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Wait before retrying
            return fetchChatGPTResponse(message); // Retry the request

        } else {
            console.error("Error fetching ChatGPT response:", error.response?.data || error.message);
            return "Sorry, I couldn't process the response.";
        }
    }
}



function appendMessage(message, sender) {
    var chatMessages = document.getElementById('chat-messages');
    var messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(sender + '-message');
    messageElement.innerText = message;
    chatMessages.appendChild(messageElement);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      sendMessage();
    }
})


async function saveAssistantConversation(aiMessage){
    const agentId = agentid;

    const storeChat = aiMessage;

    try {
        const response = await axios.post(`/chat-assistant-storage/${userId}/${agentId}`,{
            assistant: storeChat,
        });

        console.log("Server response received:", response.data);
    } catch (error) {
        console.error(error.response.data.error);
        alert("An error occurred while creating new agent.");
    }
}


async function saveUserConversation(message){
    const agentId = agentid;

    const storeChat = message;

    try {
        const response = await axios.post(`/chat-user-storage/${userId}/${agentId}`,{
            user: storeChat,
        });

        console.log("Server response received:", response.data);
    } catch (error) {
        console.error(error.response.data.error);
        alert("An error occurred while creating new agent.");
    }
}
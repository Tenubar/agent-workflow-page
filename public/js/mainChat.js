let flag0 = 0;

const params = new URLSearchParams(window.location.search);
const agentid = params.get('agentid');
console.log(userId);
console.log(agentid);

setTimeout(function() {
    var aiMessage = "Hello";
    var aiResponse = "Assistant: " + aiMessage;
    appendMessage(aiResponse, 'ai');
    flag0 = 0;
}, 500);

function sendMessage() {
    var input = document.getElementById('message-input');
    var message = input.value;
    if (message.trim() === '' || flag0 > 0) return;

    appendMessage("user: " + message, 'user');
    input.value = '';

    flag0 = 1;
    saveUserConversation(message);

    // AI Response Simulation
    setTimeout(function() {
    var aiMessage = "Hello";
    var aiResponse = "Assistant: " + aiMessage;
    appendMessage(aiResponse, 'ai');
    flag0 = 0;
    // Save conversation to Database
    saveAssistantConversation(aiMessage);

    }, 500);
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
            userChat: storeChat,
        });

        console.log("Server response received:", response.data);
    } catch (error) {
        console.error(error.response.data.error);
        alert("An error occurred while creating new agent.");
    }
}
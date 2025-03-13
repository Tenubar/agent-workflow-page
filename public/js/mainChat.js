let flag0 = 0;

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

    // AI Response Simulation
    setTimeout(function() {
    var aiMessage = "Hello";
    var aiResponse = "Assistant: " + aiMessage;
    appendMessage(aiResponse, 'ai');
    flag0 = 0;
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
$(document).ready(function () {
    $("#close-btn").click(function () {
        $(".container").toggleClass("collapsed");
    });

    $(".button-new-agent").click(function(){
        
    });
});


// Fetch webhook data using Axios
const fetchWebhookData = async () => {
    try {
        const response = await axios.get('https://agent-workflow-page.onrender.com/webhook-data');
        const data = response.data;

        // Display the data in the <pre> element
        const preElement = document.getElementById('webhookData');
        preElement.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error fetching webhook data:', error);

        // Display error message
        const preElement = document.getElementById('webhookData');
        preElement.textContent = 'Error fetching webhook data. Please try again later.';
    }
};


// Call the function to fetch data
setInterval(fetchWebhookData,4000);




// const welcomeMessage = document.getElementById('welcomeMessage');
// if (welcomeMessage.innerText.trim()) {
//     welcomeMessage.style.display = 'block';
// }

// // Close the message and notify the backend
// function closeMessage() {
//     welcomeMessage.style.display = 'none';
// }
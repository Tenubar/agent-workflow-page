const today = new Date();

const formattedDate = today.toISOString().split('T')[0];

document.getElementById('dateInput').value = formattedDate;

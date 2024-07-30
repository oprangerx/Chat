// Function to encode a string to Base64
function encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Function to decode a Base64 string
function decodeBase64(str) {
    return decodeURIComponent(escape(atob(str)));
}

// Function to set a cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Function to get a cookie by name
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
}

// Function to generate a unique ID
function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Function to check if the user ID cookie exists
function checkUserId() {
    const userId = getCookie('user_id');
    if (userId) {
        document.getElementById('set-username').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
    } else {
        document.getElementById('chat-container').style.display = 'none';
    }
}

// Function to set user name and store it in a cookie
function setUserName() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim(); // Trim leading and trailing whitespace

    if (username) {
        const userId = generateUniqueId();
        setCookie('user_id', userId, 30); // Set cookie for 30 days
        saveUsernameToFile(userId, username); // Save user ID and username to file
        document.getElementById('username').value = ''; // Clear the input field
        document.getElementById('set-username').style.display = 'none'; // Hide the username input
        document.getElementById('chat-container').style.display = 'block'; // Show chat container
    } else {
        alert('Username cannot be empty'); // Alert the user if the username is empty
    }
}

// Function to send a message with Base64 encoding
function sendMessage() {
    const userId = getCookie('user_id'); // Get the user ID from the cookie
    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim(); // Trim leading and trailing whitespace

    if (message) { // Check if the message is not empty
        const fullMessage = `${userId}: ${message}`; // Combine user ID and message
        console.log('Sending message:', fullMessage); // Debug log
        const encryptedMessage = encodeBase64(fullMessage); // Encode combined message to Base64
        console.log('Encrypted message:', encryptedMessage); // Debug log

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'send_message.php', true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                messageInput.value = ''; // Clear the input field
                loadMessages(); // Call loadMessages after message is sent
            }
        };
        xhr.send('message=' + encodeURIComponent(encryptedMessage));
    } else {
        alert('Message cannot be empty'); // Alert the user if the message is empty
    }
}

// Function to load and decode Base64 messages
function loadMessages() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'get_messages.php', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const encodedMessages = xhr.responseText;
            console.log('Loaded messages:', encodedMessages); // Debug log

            if (encodedMessages && encodedMessages !== "No messages yet.") {
                // Split messages by the delimiter
                const messagesArray = encodedMessages.split('||').filter(Boolean); // Filter out empty strings
                console.log('Messages array:', messagesArray); // Debug log

                // Decode each message
                const decodedMessages = messagesArray.map(decodeBase64).filter(Boolean); // Filter out empty strings
                console.log('Decoded messages:', decodedMessages); // Debug log

                // Replace user IDs with names
                replaceUserIdsWithNames(decodedMessages, function(replacedMessages) {
                    document.getElementById('chat-box').innerHTML = replacedMessages.join('<br>');
                });
            } else {
                document.getElementById('chat-box').innerHTML = encodedMessages; // Display the "No messages yet." message
            }
        }
    };
    xhr.send();
}

// Function to replace user IDs with names
function replaceUserIdsWithNames(messages, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'usernames.txt', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const users = xhr.responseText.split('\n').reduce((acc, line) => {
                const [id, name] = line.split('=');
                if (id && name) {
                    acc[id.trim()] = name.trim();
                }
                return acc;
            }, {});
            console.log('Users:', users); // Debug log

            const replacedMessages = messages.map(message => {
                const [id, text] = message.split(': ');
                return (users[id] || id) + ': ' + (text || ''); // Ensure text is not undefined
            });

            callback(replacedMessages);
        }
    };
    xhr.send();
}

// Function to save user ID and username to a file (simulated by sending to a PHP script)
function saveUsernameToFile(userId, username) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'save_username.php', true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send('user_id=' + encodeURIComponent(userId) + '&username=' + encodeURIComponent(username));
}

// Check if the user ID cookie exists when the page loads
window.onload = function() {
    checkUserId();
    loadMessages(); // Ensure messages are loaded on page load
};

// Refresh messages every second
setInterval(loadMessages, 1000);

// Initialize Supabase
const { createClient } = supabase;
const supabaseUrl = 'https://zykbkseefmduxbgyaxsx.supabase.co'; // Your Supabase URL
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase key
const supabase = createClient(supabaseUrl, supabaseKey);

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
async function checkUserId() {
    const userId = getCookie('user_id');
    if (userId) {
        const { data, error } = await supabase
            .from('users') // Replace with your Supabase table name
            .select('name')
            .eq('id', userId)
            .single();

        if (error) console.error('Error checking user:', error);
        else {
            if (data) {
                document.getElementById('set-username').style.display = 'none';
                document.getElementById('chat-container').style.display = 'block';
            }
        }
    } else {
        document.getElementById('chat-container').style.display = 'none';
    }
}

// Function to set user name and store it in Supabase
async function setUserName() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();

    if (username) {
        const userId = generateUniqueId();
        setCookie('user_id', userId, 30); // Set cookie for 30 days
        await saveUsernameToFile(userId, username); // Save user ID and username to Supabase
        document.getElementById('username').value = ''; // Clear the input field
        document.getElementById('set-username').style.display = 'none'; // Hide the username input
        document.getElementById('chat-container').style.display = 'block'; // Show chat container
    } else {
        alert('Username cannot be empty');
    }
}

// Function to send a message with Base64 encoding
async function sendMessage() {
    const userId = getCookie('user_id');
    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();

    if (message) {
        const fullMessage = `${userId}: ${message}`;
        const encryptedMessage = encodeBase64(fullMessage);

        const { data, error } = await supabase
            .from('messages') // Replace with your Supabase table name
            .insert([{ content: encryptedMessage }]);

        if (error) console.error('Error sending message:', error);
        else {
            messageInput.value = '';
            loadMessages();
        }
    } else {
        alert('Message cannot be empty');
    }
}

// Function to load and decode Base64 messages
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages') // Replace with your Supabase table name
        .select('content')
        .order('created_at', { ascending: true }); // Assuming you have a timestamp field

    if (error) console.error('Error loading messages:', error);
    else {
        const encodedMessages = data.map(row => row.content).join('||');
        if (encodedMessages) {
            const messagesArray = encodedMessages.split('||').filter(Boolean);
            const decodedMessages = messagesArray.map(decodeBase64).filter(Boolean);
            replaceUserIdsWithNames(decodedMessages, function(replacedMessages) {
                document.getElementById('chat-box').innerHTML = replacedMessages.join('<br>');
            });
        } else {
            document.getElementById('chat-box').innerHTML = 'No messages yet.';
        }
    }
}

// Function to replace user IDs with names
async function replaceUserIdsWithNames(messages, callback) {
    const { data, error } = await supabase
        .from('users') // Replace with your Supabase table name
        .select('id, name');

    if (error) console.error('Error fetching users:', error);
    else {
        const users = data.reduce((acc, user) => {
            acc[user.id] = user.name;
            return acc;
        }, {});

        const replacedMessages = messages.map(message => {
            const [id, text] = message.split(': ');
            return (users[id] || id) + ': ' + (text || '');
        });

        callback(replacedMessages);
    }
}

// Function to save user ID and username to Supabase
async function saveUsernameToFile(userId, username) {
    const { data, error } = await supabase
        .from('users') // Replace with your Supabase table name
        .upsert({ id: userId, name: username });

    if (error) console.error('Error saving username:', error);
    else console.log('Username saved:', data);
}

// Check if the user ID cookie exists when the page loads
window.onload = function() {
    checkUserId();
    loadMessages(); // Ensure messages are loaded on page load
};

// Refresh messages every second
setInterval(loadMessages, 1000);

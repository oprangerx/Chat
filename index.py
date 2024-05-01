import socket
from http.server import BaseHTTPRequestHandler, HTTPServer
import webbrowser
import urllib.parse
import json

# Function to get the IP address of the machine
def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip_address = s.getsockname()[0]
    finally:
        s.close()
    return ip_address

# HTTP request handler class
class RequestHandler(BaseHTTPRequestHandler):
    # Connected users list
    connected_users = []
    # Message list to store sent and received messages
    messages = []

    # Handler for GET requests
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open('index.html', 'rb') as file:
                self.wfile.write(file.read())
        elif self.path == '/messages':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(self.messages).encode())
        elif self.path == '/users':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(self.connected_users).encode())
        else:
            self.send_error(404)

    # Handler for POST requests
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = urllib.parse.parse_qs(self.rfile.read(content_length).decode('utf-8'))
        if 'username' in post_data:
            username = post_data['username'][0]
            self.connected_users.append(username)
            self.send_response(303)
            self.send_header('Location', '/')
            self.end_headers()
        elif 'message' in post_data:
            message = post_data['message'][0]
            self.messages.append(message)
            self.send_response(303)
            self.send_header('Location', '/')
            self.end_headers()
            # Send message to all connected users
            self.send_messages_update()
        else:
            self.send_error(400, 'Bad Request')

    # Function to send message update to all connected users
    def send_messages_update(self):
        message_data = json.dumps(self.messages).encode()
        for user in self.connected_users:
            try:
                user_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                user_socket.connect((user, 8001))  # Assuming port 8001 is reserved for message updates
                user_socket.sendall(message_data)
                user_socket.close()
            except:
                pass

# Function to start the server
def start_server(port):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print("Server started at {}:{}".format(get_ip_address(), port))
    httpd.serve_forever()

# Function to generate the URL
def generate_url(port):
    ip_address = get_ip_address()
    return f"http://{ip_address}:{port}"

# Main function
def main():
    port = 8000  # Change this port number if needed
    url = generate_url(port)
    print("Share this URL with your friend to connect: ", url)
    webbrowser.open(url)  # Open the URL in the default web browser
    start_server(port)

if __name__ == "__main__":
    main()

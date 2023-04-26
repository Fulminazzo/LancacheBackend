import base64
import os
import socket
import subprocess
import time
import uuid
from urllib.parse import urlparse, unquote
from ssh2 import session, exceptions
from modules.http_server import Handler, sendData, simpleParser

def tryPassword(password):
    password = base64.b64decode(password)
    ip = "127.0.0.1"
    username = os.getlogin()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((ip, 22))
        sock.settimeout(1000)

        ssh = session.Session()
        ssh.handshake(sock)
        ssh.userauth_password(username, password.decode("utf-8"))

        return "success"
    except UnicodeDecodeError:
        return "invalid password"
    except ConnectionRefusedError:
        return "connection refused"
    except exceptions.AuthenticationError:
        return "wrong password"

class TerminalAuthServer(Handler):
    terminal_sessions = {}

    def do_GET(self):
        parsed_path = urlparse(self.path)
        request = parsed_path.path
        query = [q for q in parsed_path.query.split("&")]

        if len(query) == 0 or query[0] == "" or not request.lower().startswith("/api/terminal"):
            Handler.do_GET(self)
            return

        queries = {k[:k.index("=")]: unquote(k[k.index("=") + 1:]) for k in query}

        if not "uuid" in queries or queries["uuid"] == "" or queries["uuid"] is None:
            if not "pass" in queries:
                response = {"error": "Authentication Failed: no password."}
            else:
                passwd = queries["pass"]
                if passwd is None or passwd == "":
                    response = {"error": "Authentication Failed: no password."}
                else:
                    success = tryPassword(passwd)
                    if success == "success":
                        uniqueId = str(uuid.uuid4())
                        self.terminal_sessions[uniqueId] = time.time()
                        response = {"uuid": uniqueId}
                    else:
                        response = {"error": "Authentication Failed: {}.".format(success)}
        else:
            uniqueId = queries["uuid"]
            if not uniqueId in self.terminal_sessions.keys():
                response = {"error": "UUID not recognized."}
            elif time.time() - self.terminal_sessions[uniqueId] >= 10 * 60:
                response = {"error": "Timeout."}
            elif not "command" in queries:
                self.terminal_sessions[uniqueId] = time.time()
                response = {"response": "Connected."}
            else:
                self.terminal_sessions[uniqueId] = time.time()
                command = queries["command"].replace("python", "python -u")
                process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
                try:
                    process.wait(1)
                    rp = ""
                    while True:
                        line = process.stdout.readline()
                        if not line:
                            break
                        rp += line.rstrip().decode("utf-8")

                    response = {"response": rp}
                except subprocess.TimeoutExpired:
                    response = {"response": "Timeout."}

        sendData(self, response, simpleParser, contentType="application/json")
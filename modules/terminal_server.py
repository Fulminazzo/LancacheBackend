import base64
import os
import socket
import subprocess
import threading
import time
import uuid
from urllib.parse import urlparse, unquote
from ssh2 import session, exceptions
from modules.http_server import Handler, sendData

def decodeB64(string):
    return base64.b64decode(string).decode("utf-8")

def tryPassword(password):
    password = decodeB64(password)
    ip = "127.0.0.1"
    username = os.getlogin()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((ip, 22))
        sock.settimeout(1000)

        ssh = session.Session()
        ssh.handshake(sock)
        ssh.userauth_password(username, password)

        return "success"
    except UnicodeDecodeError:
        return "invalid password"
    except ConnectionRefusedError:
        return "connection refused"
    except exceptions.AuthenticationError:
        return "wrong password"

class TerminalSessionProcess:
    def __init__(self):
        self.process = None
        self.output = []
        self.readThread = None

    def executeCommand(self, command):
        if self.process is not None:
            self.process.terminate()
            self.readThread.join()
        self.stop()
        self.process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
        self.startReadThread()

    def startReadThread(self):
        self.readThread = threading.Thread(target=self.writeOutput)
        self.readThread.start()

    def stop(self):
        if self.process is not None:
            self.process.terminate()
            self.process = None
        if self.readThread is not None:
            self.readThread.join()

    def writeOutput(self):
        self.output = []
        for line in iter(self.process.stdout.readline, ""):
            line = line.decode('utf-8', "backslashreplace")
            if self.process is None or self.process.poll() is not None:
                break
            if line.upper().startswith("\x1b[2J\x1b[H"):
                self.output = []
            self.output.append(line)

class TerminalAuthServer(Handler):
    terminal_sessions = {}

    def do_GET(self):
        parsed_path = urlparse(self.path)
        request = parsed_path.path
        query = [q for q in parsed_path.query.split("&")]

        if len(query) == 0 or query[0] == "" or not request.lower().startswith("/api/terminal"):
            Handler.do_GET(self)
            return

        queries = {}
        for k in query:
            if "=" in k:
                queries[k[:k.index("=")]] = unquote(k[k.index("=") + 1:])
            else:
                queries[k] = ""

        if not "uuid" in queries or queries["uuid"] == "" or queries["uuid"] is None:
            response = self.handle_login(queries)
        elif not queries["uuid"] in self.terminal_sessions.keys():
            response = {"error": "UUID not recognized."}
        else:
            response = self.handle_user_actions(queries)

        sendData(self, response, contentType="application/json")

    def handle_login(self, queries):
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
                    self.terminal_sessions[uniqueId] = {"time": time.time(),
                                                        "process": None,
                                                        "dir": os.path.abspath(os.getcwd())}
                    response = {"uuid": uniqueId}
                else:
                    response = {"error": "Authentication Failed: {}.".format(success)}
        return response

    def handle_user_actions(self, queries):
        uniqueId = queries["uuid"]
        terminal_session = self.terminal_sessions[uniqueId]
        terminal_process = terminal_session["process"]

        if time.time() - terminal_session["time"] >= 10 * 60:
            response = {"error": "Session timeout. Please reconnect.", "exit": True}
            if terminal_process is not None:
                terminal_process.stop()
            del terminal_session
        elif "userdata" in queries:
            response = {"hostname": socket.gethostname(),
                        "username": os.getlogin(),
                        "dir": terminal_session["dir"]}
        elif "output" in queries:
            process = terminal_process
            if process is not None:
                response = {"response": process.output}
                time.sleep(0.125)
                if terminal_process.process.poll() is None:
                    response["finished"] = False
                if "clear" in queries:
                    terminal_process.output = []
            else:
                response = {"response": []}
        elif "command" in queries:
            terminal_session["time"] = time.time()
            command = decodeB64(queries["command"]).replace("python", "python -u")
            if command.lower().startswith("cd"):
                dir_name = command.split(" ")[1]
                init_dir_name = dir_name
                if not dir_name.startswith(".") and not dir_name.startswith("/"):
                    dir_name = "./" + dir_name
                try:
                    prev = os.path.abspath(os.getcwd())
                    os.chdir(terminal_session["dir"])
                    os.chdir(dir_name)
                    terminal_session["dir"] = os.path.abspath(os.getcwd())
                    os.chdir(prev)
                    response = {"response": "request-userdata"}
                except NotADirectoryError:
                    response = {"response": "cd: not a directory: {}".format(init_dir_name)}
                except FileNotFoundError:
                    response = {"response": "cd: no such file or directory: {}".format(init_dir_name)}
            elif command.lower().startswith("exit"):
                response = {"error": "Successfully exited. Goodbye", "exit": True}
                if terminal_process is not None:
                    terminal_process.stop()
                del terminal_session
            else:
                if terminal_process is None:
                    terminal_session["process"] = TerminalSessionProcess()
                    terminal_process = terminal_session["process"]
                terminal_process.executeCommand("bash -c \"{}\"".format(command))
                time.sleep(0.500)
                response = {"response": terminal_process.output}
                terminal_process.output = []
                time.sleep(0.125)
                if terminal_process.process.poll() is None:
                    response["finished"] = False
        else:
            terminal_session["time"] = time.time()
            response = {"response": "Connected."}

        return response
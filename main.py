#!/bin/env/python3
import os
from http.server import HTTPServer
from modules import terminal_server, processes_handler, http_server

def parseStorage(raw_data):
    if len(raw_data) == 0:
        return raw_data
    data = raw_data[len(raw_data) - 1]
    # Remove any spaces
    length = len(data)
    i = 0
    while i < length:
        if data[i] == ' ':
            for j in range(i + 1, len(data)):
                if data[j] != ' ':
                    data = data[0:i + 1] + data[j:]
                    length = len(data)
                    break
        i += 1
    data = data.split(" ")
    if len(data) < 3:
        return ""
    return {"total": data[1], "used": data[2], "available": data[3]}

def startStorageThread(serverHandler, processHandler):
    process_id = "storage-stat"
    processHandler.create_and_start_thread("echo \x1b[2J\x1b[H && df -m /dev/sda1 && sleep 1", process_id)
    serverHandler.add_functional_handler(serverHandler, process_id, processHandler.get_output,
                                         args=process_id, contentType="application/json",
                                         parser=parseStorage, api=True)

def parseDownload(raw_data):
    if len(raw_data) == 0:
        return raw_data
    data = raw_data[len(raw_data) - 1].split(" ")
    return data[1]

def startDownloadThread(serverHandler, processHandler):
    processHandler.create_and_start_thread("python -u modules/net_mon.py", "network-mon")
    serverHandler.add_functional_handler(serverHandler, "download-stat", processHandler.get_output,
                                         args="network-mon", contentType="application/json",
                                         parser=parseDownload, api=True)

def parseUpload(raw_data):
    if len(raw_data) == 0:
        return raw_data
    data = raw_data[len(raw_data) - 1].split(" ")
    return data[3].replace("\n", "")

def startUploadThread(serverHandler, processHandler):
    serverHandler.add_functional_handler(serverHandler, "upload-stat", processHandler.get_output,
                                         args="network-mon", contentType="application/json",
                                         parser=parseUpload, api=True)

def startSimpleThread(serverHandler, processHandler, process_string, process_dir, process_id):
    processHandler.create_and_start_thread(process_string, process_id, process_dir=process_dir)
    serverHandler.add_functional_handler(serverHandler, process_id, processHandler.get_output,
                                         args=process_id, contentType="application/json", api=True)

def loadMainPage(serverHandler):
    mainPage = "templates/index.html"
    serverHandler.add_simple_handler(serverHandler, "/", http_server.htmlToString(mainPage))

def main():
    if os.geteuid() != 0:
        print("This program requires root to run!")
        return

    hostname = "0.0.0.0"
    port = 98

    processHandler = processes_handler.ProcessesHandler()
    serverHandler = terminal_server.TerminalAuthServer
    serverHandler.extensions_map['.js'] = 'text/javascript'

    startSimpleThread(serverHandler, processHandler, "docker stats", os.getcwd(), 'docker-stats')
    startSimpleThread(serverHandler, processHandler, "sudo docker-compose logs -t -f", "/home/haze/Documents/lancache-rpi/",
                      'docker-compose-logs')
    startStorageThread(serverHandler, processHandler)
    startDownloadThread(serverHandler, processHandler)
    startUploadThread(serverHandler, processHandler)
    loadMainPage(serverHandler)

    webServer = HTTPServer((hostname, port), serverHandler)
    print("Server started http://%s:%s" % (hostname, port))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        processHandler.shutdown()

    webServer.server_close()
    print("Server stopped.")

if __name__ == '__main__':
    main()

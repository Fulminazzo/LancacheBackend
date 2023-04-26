#!/bin/env/python3
import json
import types
from http.server import SimpleHTTPRequestHandler


def simpleParser(data):
    return data

def writeToHandler(handler, data, is_json):
    if is_json:
        data = json.dumps({"data": data})
    handler.wfile.write(data.encode('utf-8'))

def sendData(handler, data, parser, response=200, contentType="text/html"):
    handler.send_response(response)
    handler.send_header("Content-type", contentType)
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.end_headers()

    if type(data) == list and len(data) > 0:
        if type(data[0]) == types.FunctionType or type(data[0]) == types.MethodType:
            data = data[0](data[1])
    writeToHandler(handler, parser(data), contentType == 'application/json')

def htmlToString(html):
    with open(html, "r") as html:
        return "\n".join(html.readlines())

def notFound():
    return htmlToString("templates/not_found.html")

class Handler(SimpleHTTPRequestHandler):
    slave_handlers = {}

    def do_GET(self):
        request = self.path
        if not request in self.slave_handlers:
            try:
                open("." + request, "rb")
                SimpleHTTPRequestHandler.do_GET(self)
            except FileNotFoundError:
                sendData(self, notFound(), simpleParser)
        else:
            handler = self.slave_handlers[request]
            sendData(self, handler["data"], handler["parser"], response=handler["response"],
                     contentType=handler["contentType"])

    def add_simple_handler(self, request, data, response=200, contentType="text/html", api=False,
                           parser=simpleParser):
        request = request[1:] if request.startswith("/") else request
        request = "api/" + request if api else request
        self.slave_handlers["/" + request] = {
            "response": response,
            "contentType": contentType,
            "data": data,
            "parser": parser
        }

    def add_functional_handler(self, request, function:types.MethodType, args=None, response=200,
                               contentType="text/html", api=False, parser=simpleParser):
        if args is None:
            args = ()
        request = request[1:] if request.startswith("/") else request
        request = "api/" + request if api else request
        self.slave_handlers["/" + request] = {
            "response": response,
            "contentType": contentType,
            "data": [function, args],
            "parser": parser
        }

#!/bin/sh
screen -dmS steam_http_server
sleep 1
screen -S steam_http_server -X stuff "zsh"`echo -ne '\015'`
screen -S steam_http_server -X stuff "cd /home/haze/Workspace/Projects/Python/SteamBackend && sudo python main.py"`echo -ne '\015'`

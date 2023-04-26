#!/bin/env/python3
from time import sleep
import psutil

def main():
    try:
        prev_rx = -1
        prev_tx = -1
        time = 1
        while True:
            sleep(time)
            io = psutil.net_io_counters()
            rx = io.bytes_recv
            tx = io.bytes_sent
            print("\x1b[2J\x1b[HReceived: {} Transmitted: {}".format(rx - prev_rx, tx - prev_tx))
            prev_rx = rx
            prev_tx = tx

    except KeyboardInterrupt:
        print("Closing network monitor")

if __name__ == '__main__':
    main()

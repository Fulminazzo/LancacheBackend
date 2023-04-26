#!/bin/env/python3
import os
import subprocess
import threading

def readProcessStdout(handler, process_string, process_dir, process_id):
    while True:
        if handler.is_shutting_down():
            return

        process = subprocess.Popen(process_string, shell=True, cwd=process_dir, stdout=subprocess.PIPE)

        for line in iter(process.stdout.readline, ""):
            line = line.decode('utf-8', "backslashreplace")

            if process.poll() is not None:
                break

            if handler.is_shutting_down():
                return

            if line.upper().startswith("\x1b[2J\x1b[H"):
                handler.set_output([], process_id)

            handler.append_output(line, process_id)

class ProcessesHandler:
    def __init__(self):
        self.threads = []
        self.outputs = {}
        self.shutting_down = False

    def is_shutting_down(self):
        return self.shutting_down

    def shutdown(self):
        self.shutting_down = True
        for t in self.threads:
            t.join()

    def append_output(self, output, output_id):
        otp = self.get_output(output_id)
        if otp is None:
            self.set_output([], output_id)
            otp = []
        otp.append(output)
        self.set_output(otp, output_id)

    def set_output(self, output, output_id):
        self.outputs[output_id] = output

    def get_output(self, output_id):
        if not output_id in self.outputs:
            return None
        else:
            return self.outputs[output_id]

    def create_and_start_thread(self, process_string, process_id, process_dir=os.getcwd()):
        thread = threading.Thread(target=readProcessStdout, args=[self, process_string, process_dir, process_id])
        self.threads.append(thread)
        thread.start()
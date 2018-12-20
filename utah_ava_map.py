# utah_ava_map.py

import os
import cherrypy
import datetime
import re
import sys
import requests
import io
import math

#sys.path.append(r'C:\dev\pyMath2D')

class WebServer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir

    @cherrypy.expose
    def default(self, **kwargs):
        return cherrypy.lib.static.serve_file(self.root_dir + '/utah_ava_map.html', content_type='text/html')

if __name__ == '__main__':
    root_dir = os.path.dirname(os.path.abspath(__file__))
    port = int(os.environ.get('PORT', 5200))
    server = WebServer(root_dir)
    config = {
        'global': {
            'server.socket_host': '0.0.0.0',
            'server.socket_port': port,
        },
        '/': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': root_dir
        },
        '/dev': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': r'c:\dev\cesium_spencer\Build\Cesium'
        }
    }
    cherrypy.quickstart(server, '/', config=config)
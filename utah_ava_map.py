# utah_ava_map.py

import os
import cherrypy
import urllib
import datetime
import re

from PIL import Image

class WebServer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir

    @cherrypy.expose
    def default(self, **kwargs):
        return cherrypy.lib.static.serve_file(self.root_dir + '/utah_ava_map.html', content_type='text/html')

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_rose(self, **kwargs):
        try:
            # This would all be much easier if they exposed an API that provided the data in JSON format.
            region = kwargs['region']
            url = 'https://utahavalanchecenter.org/forecast/' + region
            with urllib.request.urlopen(url) as response:
                html_text = response.read()
            current_date = datetime.datetime.now()
            regex = r'src="(.*forecast/' + current_date.strftime('%Y%m%d') + '.*\.png)"'
            match = re.match(regex, html_text)
            rose_url = match.group(1)
            url = 'https://utahavalanchecenter.org/' + rose_url
            with urllib.request.urlopen(url) as response:
                image_data = response.read()
            # TODO: Load into PIL image and then read pixels to get ava rose data.
            return {}
        except Exception as ex:
            return {'error': str(ex)}

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
            'tools.staticdir.root': root_dir,
            'tools.staticdir.on': True,
            'tools.staticdir.dir': ''
        }
    }
    cherrypy.quickstart(server, '/', config=config)
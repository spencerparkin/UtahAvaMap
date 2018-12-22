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

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_regions(self, **kwargs):
        try:
            print('Loading avalanche region data...')
            ava_regions_map = {}
            namespaces = {'kml': 'http://www.opengis.net/kml/2.2'}
            import xml.etree.ElementTree as ET
            tree = ET.parse('AvalancheRegions.kml')
            root = tree.getroot()
            doc = root.find('kml:Document', namespaces)
            for folder in doc.findall('kml:Folder', namespaces):
                if folder.find('kml:name', namespaces).text == 'AvalancheRegions':
                    for placemark in folder.findall('kml:Placemark', namespaces):
                        name = placemark.find('kml:name', namespaces).text
                        print('Found: %s' % name)
                        coordinates_text = placemark.find('kml:Point', namespaces).find('kml:coordinates', namespaces).text
                        coordinates_list = coordinates_text.split(',')
                        location = {
                            'longitude': float(coordinates_list[0]),
                            'latitude': float(coordinates_list[1]),
                            'altitude': float(coordinates_list[2])
                        }
                        ava_regions_map[name] = location
            return ava_regions_map
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
            'tools.staticdir.on': True,
            'tools.staticdir.dir': root_dir
        },
        '/dev': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': r'c:\dev\cesium_spencer\Build\Cesium'
        }
    }
    cherrypy.quickstart(server, '/', config=config)
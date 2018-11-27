# utah_ava_map.py

import os
import cherrypy
import urllib
import datetime
import re
import sys
import math

sys.path.append(r'C:\dev\pyMath2D')

from math2d_vector import Vector
from math2d_polygon import Polygon
from math2d_aa_rect import AxisAlignedRectangle
from math2d_region import Region, SubRegion
from PIL import Image

class WebServer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self._load_ava_boundaries()

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

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_region(self, **kwargs):
        try:
            best_name = None
            rect = AxisAlignedRectangle()
            rect.min_point = Vector(float(kwargs['west']), float(kwargs['south']))
            rect.max_point = Vector(float(kwargs['east']), float(kwargs['north']))
            polygon = rect.GeneratePolygon()
            if polygon.IsWoundCCW():
                largest_area = 0.0
                for name in self.ava_boundary_map:
                    region_polygon = self.ava_boundary_map[name]
                    overlap_polygon_list = polygon.IntersectWith(region_polygon)
                    for overlap_polygon in overlap_polygon_list:
                        overlap_polygon.Tessellate()
                    area = sum([overlap_polygon.Area() for overlap_polygon in overlap_polygon_list])
                    if area > largest_area:
                        largest_area = area
                        best_name = name
            return {'region': best_name}
        except Exception as ex:
            return {'error': str(ex)}

    def _load_ava_boundaries(self):
        # Load our avalanche boundary polygons from the KML file.
        self.ava_boundary_map = {}
        try:
            namespaces = {'kml': 'http://www.opengis.net/kml/2.2'}
            import xml.etree.ElementTree as ET
            tree = ET.parse('AvalancheBoundaries.kml')
            root = tree.getroot()
            doc = root.find('kml:Document', namespaces)
            for folder in doc.findall('kml:Folder', namespaces):
                if folder.find('kml:name', namespaces).text == 'AvalancheBoundaries':
                    for placemark in folder.findall('kml:Placemark', namespaces):
                        name = placemark.find('kml:name', namespaces).text
                        coordinates = placemark.find('kml:Polygon', namespaces).find('kml:outerBoundaryIs', namespaces).find('kml:LinearRing', namespaces).find('kml:coordinates', namespaces)
                        coordinate_list = coordinates.text.split()
                        polygon = Polygon()
                        for coordinates in coordinate_list:
                            coordinates = coordinates.split(',')
                            polygon.vertex_list.append(Vector(float(coordinates[0]), float(coordinates[1])))
                        self.ava_boundary_map[name] = polygon
                        polygon.Tessellate()
                        print('Avalanche boundary %s has area %f' % (name, polygon.Area()))
                    break
        except Exception as ex:
            raise Exception('Failed to load avalanche boundary data (%s)' % str(ex))

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
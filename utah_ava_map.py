# utah_ava_map.py

import os
import cherrypy
import datetime
import re
import sys
import requests
import io
import math

sys.path.append(r'C:\dev\pyMath2D')

from math2d_vector import Vector
from math2d_polygon import Polygon
from math2d_aa_rect import AxisAlignedRectangle
from PIL import Image

class WebServer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self._load_ava_boundaries()
        self.ava_rose_cache = {}

    @cherrypy.expose
    def default(self, **kwargs):
        return cherrypy.lib.static.serve_file(self.root_dir + '/utah_ava_map.html', content_type='text/html')

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_rose(self, **kwargs):
        try:
            # It would be nicer if www.avalanche.org exposed an API call that gave us the avalanche rose data as pure JSON.
            # Until then, we'll just have to be a bit resourceful to get at the information.
            region = kwargs['region']
            if region not in self.ava_rose_cache or (datetime.datetime.now() - self.ava_rose_cache[region]['time']).total_seconds() > 6 * 60 * 60:
                url = 'https://utahavalanchecenter.org/forecast/salt-lake'
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Languages': 'en-US,en;q=0.9',
                    'Cache-Control': 'max-age=0',
                    'Connection': 'keep-alive',
                    'Cookie': 'has_js=1; _ga=GA1.2.1167023641.1543337228; _gid=GA1.2.1436974733.1543337228',
                    'Host': 'utahavalanchecenter.org',
                    'Upgrade-Insecure-Requests': '1'
                }
                response = requests.get(url, headers=headers)
                html_text = response.text
                line_list = html_text.split('\n')
                regex = r'.*src="(.*forecast/.*\.png)".*'
                for line in line_list:
                    match = re.match(regex, line)
                    if match is not None:
                        rose_url = 'https://utahavalanchecenter.org/' + match.group(1)
                        break
                else:
                    raise Exception('Failed to find avalanche rose image URL in html.')
                response = requests.get(rose_url, headers=headers)
                image_data = io.BytesIO(response.content)
                image = Image.open(image_data)
                image = image.convert('RGB')
                rose_data = self._construct_ava_rose_data_from_image(image)
                self.ava_rose_cache[region] = {'data': rose_data, 'time': datetime.datetime.now()}
            return self.ava_rose_cache[region]['data']
        except Exception as ex:
            return {'error': str(ex)}

    def _construct_ava_rose_data_from_image(self, image):
        return {
            'west': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 78, 174)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 128, 164)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 161, 157)
                },
            ],
            'south-west': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 111, 254)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 147, 212)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 172, 182)
                },
            ],
            'south': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 198, 286)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 200, 234)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 200, 194)
                },
            ],
            'south-east': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 288, 254)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 253, 214)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 225, 183)
                },
            ],
            'east': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 324, 174)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 274, 168)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 234, 157)
                },
            ],
            'north-east': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 287, 98)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 250, 124)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 222, 140)
                },
            ],
            'north': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 198, 71)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 200, 102)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 199, 134)
                },
            ],
            'north-west': [
                {
                    'altitude': (0.0, 8000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 116, 99)
                },
                {
                    'altitude': (8000, 9500),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 150, 121)
                },
                {
                    'altitude': (9500, 14000),
                    'hazard_level': self._get_ava_hazard_level_from_image(image, 175, 139)
                },
            ]
        }
    
    def _get_ava_hazard_level_from_image(self, image, row, col):
        pixel = image.getpixel((row, col))
        pixel = (float(pixel[0]), float(pixel[1]), float(pixel[2]))
        hazard_level_map = {
            'low': (80.0, 184.0, 72.0),
            'moderate': (255.0, 242.0, 0.0),
            'considerable': (247.0, 148.0, 30.0),
            'high': (237.0, 28.0, 36.0),
            'extreme': (34.0, 34.0, 34.0)
        }
        epsilon = 1e-5
        for hazard_level in hazard_level_map:
            color = hazard_level_map[hazard_level]
            if math.sqrt(sum([(color[i] - pixel[i])**2 for i in range(0, 3)])) < epsilon:
                return hazard_level
        raise Exception('Failed to identify hazard level in ava rose image.')

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
# utah_ava_map.py

import os
import cherrypy
import datetime
import re
import sys
import requests
import io
import math
import json
import random

from PIL import Image

#sys.path.append(r'C:\dev\pyMath2D')

class WebServer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir

    @cherrypy.expose
    def default(self, **kwargs):
        return cherrypy.lib.static.serve_file(self.root_dir + '/utah_ava_map.html', content_type='text/html')
    
    def _make_unique_file_suffix(self):
        ip_addr = cherrypy.request.remote.ip
        headers = cherrypy.request.headers
        if 'X-Forwarded-For' in headers:
            ip_addr = headers['X-Forwarded-For']
        ip_addr = ip_addr.replace('.', '_')
        return ip_addr
    
    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_rose_data(self, **kwargs):
        try:
            ava_region = kwargs['ava_region']
            ava_region = ava_region.lower()
            if ava_region == 'saltlakecity':
                ava_region = 'salt-lake'
            forecast_url = 'https://utahavalanchecenter.org/forecast/' + ava_region + '/json/json.json'
            headers = {
                'User-Agent': 'Utah-Ava-Map',
                'Accept': 'text/json',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            response = requests.get(forecast_url, headers=headers)
            json_text = response.text
            json_data = json.loads(json_text)
            if len(json_data.get('advisories', [])) == 0:
                raise Exception('No advisories found!')
            advisory = json_data['advisories'][0]['advisory']   # Is it always advisory zero?  We may want to search for the most applicable advisory.
            image_url = 'https://utahavalanchecenter.org/' + advisory['overall_danger_rose_image']
            response = requests.get(image_url, headers=headers)
            image_data = io.BytesIO(response.content)
            image = Image.open(image_data, transparency=(64, 128, 64))
            image = image.convert('RGB')
            # The rose data is also encoded in the advisory dict, but by inspecting the image, we guarantee no ambiguity.
            ava_rose_data = self._construct_ava_rose_data_from_image(image)
            if kwargs.get('use_local_image_url', False):
                name, ext = os.path.splitext(image_url)
                suffix = self._make_unique_file_suffix()
                image_url = 'images/local_ava_rose_%s%s' % (suffix, ext)
                image.save(image_url, transparency=(64, 128, 64))
            return {
                'ava_rose_data': ava_rose_data,
                'ava_rose_image_url': image_url,
                'ava_rose_forecast_url': 'https://utahavalanchecenter.org/forecast/' + ava_region
            }
        except Exception as ex:
            return {'error': str(ex)}

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def custom_ava_rose_data(self, **kwargs):
        try:
            image_file = kwargs['image_file']
            name, ext = os.path.splitext(image_file.filename)
            suffix = self._make_unique_file_suffix()
            image_url = 'images/custom_%s_%s%s' % (name, suffix, ext)
            image_file_path = self.root_dir + '/' + image_url
            with open(image_file_path, 'wb') as handle:
                while True:
                    image_data = image_file.file.read(8 * 1024)
                    if not image_data:
                        break
                    handle.write(image_data)
            image = Image.open(image_file_path)
            image = image.convert('RGBA')
            ava_rose_data = self._construct_ava_rose_data_from_image(image)
            return {
                'ava_rose_data': ava_rose_data,
                'ava_rose_image_url': image_url,
                'ava_rose_forecast_url': ''
            }
        except Exception as ex:
            return {'error': str(ex)}

    def _construct_ava_rose_data_from_image(self, image):
        # TODO: We should really verify the correct dimensions needed of the image, or be more flexible here.
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
            'extreme': (0.0, 0.0, 0.0)
        }
        closest_hazard_level = None
        smallest_distance = 9999.0
        for hazard_level in hazard_level_map:
            color = hazard_level_map[hazard_level]
            distance = math.sqrt(sum([(color[i] - pixel[i]) ** 2 for i in range(0, 3)]))
            if distance < smallest_distance:
                smallest_distance = distance
                closest_hazard_level = hazard_level
        return closest_hazard_level

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def ava_regions(self, **kwargs):
        try:
            print('Loading avalanche region data...')
            ava_regions_map = {}
            namespaces = {'kml': 'http://www.opengis.net/kml/2.2'}
            import xml.etree.ElementTree as ET
            tree = ET.parse('KML/AvalancheRegions.kml')
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
        }
    }
    cherrypy.quickstart(server, '/', config=config)
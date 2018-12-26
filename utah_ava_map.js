// utah_ava_map.js

var viewer = null;
var viewModel = {
    slope_prime_radius: 15.0,
    slope_prime_alpha: 0.7,
    ava_region: '',
    ava_rose_image_url: '',
    ava_rose_forecast_url: '',
    cursor_height: '',
    cursor_latitude: '',
    cursor_longitude: '',
    cursor_slope_angle: '',
    cursor_aspect_angle: ''
};
var ava_material = null;
var ava_regions_map = null;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({
            requestVertexNormals: true
        }),
        timeline: false,
        animation: false,
        scene3DOnly: true,
        selectionIndicator: false,
        sceneModePicker: false,
        infoBox: false,
        homeButton: false,
        geocoder: false,
        vrButton: false,
        baseLayerPicker: false
    });
    
    viewer.scene.globe.enableLighting = true;
    
    let west = -111.7287239132627;
    let east = -111.6729336993894;
    let north = 40.66047397914876;
    let south = 40.64897595231015;
    let rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    viewer.camera.setView({destination: rect});
    
    promiseAvaMapShader().then(glsl_code => {
        ava_material = new Cesium.Material({
            fabric: {
                type: 'UtahAvaMaterial',
                source: glsl_code,
                uniforms: {
                    // Default to extreme danger everywhere.  We'll update this as a function of the camera position/orientation.
                    rose00: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    rose01: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    rose10: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    rose11: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    rose20: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    rose21: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                    // Look at slopes in the range [P-R,P+R], where P is the prime avalanche slope angle (38 degrees.)
                    slope_prime_radius: viewModel.slope_prime_radius,
                    slope_prime_alpha: viewModel.slope_prime_alpha
                }
            }
        });
        
        viewer.scene.globe.material = ava_material;
    });

    Cesium.knockout.track(viewModel);
    Cesium.knockout.applyBindings(viewModel, document.getElementById('cesiumControls'));
    Cesium.knockout.getObservable(viewModel, 'slope_prime_radius').subscribe(() => {
        ava_material.uniforms.slope_prime_radius = viewModel.slope_prime_radius;
    });
    Cesium.knockout.getObservable(viewModel, 'slope_prime_alpha').subscribe(() => {
        ava_material.uniforms.slope_prime_alpha = viewModel.slope_prime_alpha;
    });
    Cesium.knockout.getObservable(viewModel, 'ava_region').subscribe(() => {
        promiseAvaRose(viewModel.ava_region).then(json_data => {
            try {
                let ava_rose_data = json_data.ava_rose_data;
                viewModel.ava_rose_image_url = json_data.ava_rose_image_url;
                viewModel.ava_rose_forecast_url = json_data.ava_rose_forecast_url;
                ava_material.uniforms.rose00 = new Cesium.Color(
                    getUniformDataFromRoseData(ava_rose_data, 'east', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'north-east', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'north', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'north-west', 7500)
                );
                ava_material.uniforms.rose01 = new Cesium.Color(
                    getUniformDataFromRoseData(ava_rose_data, 'west', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'south-west', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'south', 7500),
                    getUniformDataFromRoseData(ava_rose_data, 'south-east', 7500)
                );
                ava_material.uniforms.rose10 = new Cesium.Color(
                   getUniformDataFromRoseData(ava_rose_data, 'east', 9000),
                   getUniformDataFromRoseData(ava_rose_data, 'north-east', 9000),
                   getUniformDataFromRoseData(ava_rose_data, 'north', 9000),
                   getUniformDataFromRoseData(ava_rose_data, 'north-west', 9000)
                );
                ava_material.uniforms.rose11 = new Cesium.Color(
                    getUniformDataFromRoseData(ava_rose_data, 'west', 9000),
                    getUniformDataFromRoseData(ava_rose_data, 'south-west', 9000),
                    getUniformDataFromRoseData(ava_rose_data, 'south', 9000),
                    getUniformDataFromRoseData(ava_rose_data, 'south-east', 9000)
                );
                ava_material.uniforms.rose20 = new Cesium.Color(
                    getUniformDataFromRoseData(ava_rose_data, 'east', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'north-east', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'north', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'north-west', 11000)
                );
                ava_material.uniforms.rose21 = new Cesium.Color(
                    getUniformDataFromRoseData(ava_rose_data, 'west', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'south-west', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'south', 11000),
                    getUniformDataFromRoseData(ava_rose_data, 'south-east', 11000)
                );
            } catch(e) {
                console.log(e);
            }
        });
    });

    viewer.camera.changed.addEventListener(event => {
        updateNearestAvaRegion();
    });

    promiseAvaRegions().then(json_data => {
        ava_regions_map = json_data;
        updateNearestAvaRegion();
    });

    let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas, false);
    handler.setInputAction(
        function(movement) {
            let ground_points = ground_points_from_mouse_point(movement.endPosition);
            if(ground_points) {
                let ground_data = calculate_slope_angle_and_aspect(ground_points.center, ground_points.ring_vertices);
                let positionCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(ground_points.center);
                let feetPerMeter = 3.2808;
                viewModel.cursor_height = (positionCartographic.height * feetPerMeter).toFixed(2) + ' feet';
                viewModel.cursor_latitude = (positionCartographic.latitude * 180.0 / Math.PI).toFixed(10) + ' degrees';
                viewModel.cursor_longitude = (positionCartographic.longitude * 180.0 / Math.PI).toFixed(10) + ' degrees';
                viewModel.cursor_slope_angle = (ground_data.slope_angle * 180.0 / Math.PI).toFixed(2) + ' degrees';
                viewModel.cursor_aspect_angle = (ground_data.aspect * 180.0 / Math.PI).toFixed(2) + ' degrees (' + ground_data.heading + ')';
            }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
}

window.onload = function() {
    init_map();

    $('[class=hover_help]').hover(function(event) {
        $(event.target).css({'color': 'red', 'font-weight': 'bold'});
        $('#hover_help_info').show();
        let text = event.target.outerText;
        if(text.indexOf('Slope Radius:') !== -1) {
            $('#hover_help_info').text('The "Slope Radius" denotes the range about 38 degrees for which slopes are shaded.  For example, if the radius is 10, then slopes in the range of 28 to 48 degrees are shaded.');
        } else if(text.indexOf('Slope Alpha:') !== -1) {
            $('#hover_help_info').text('The "Slope Alpha" controls the opacity (or transparency) of the slope shading on the terrain.');
        } else if(text.indexOf('Region:') !== -1) {
            $('#hover_help_info').text('The "Region" indicated tells you which forecast is being overlayed on the terrain.  It is determined by where you are looking on the map.');
        } else if(text.indexOf('Height:') !== -1) {
            $('#hover_help_info').text('The "Height" field shows the height of the terrain under the cursor.');
        } else if(text.indexOf('Latitude:') !== -1) {
            $('#hover_help_info').text('The "Latitude" field shows the latitude of the terrain under the cursor.');
        } else if(text.indexOf('Longitude:') !== -1) {
            $('#hover_help_info').text('The "Longitude" field shows the longitude of the terrain under the cursor.');
        } else if(text.indexOf('Slope Angle:') !== -1) {
            $('#hover_help_info').text('The "Slope Angle" field shows the slope-angle of the terrain under the cursor.  0 degrees is flat; 90 degrees is vertical.');
        } else if(text.indexOf('Aspect:') !== -1) {
            $('#hover_help_info').text('The "Aspect" field shows the fall-line direction of the terrain under the cursor.  0 degrees is east, 90 is north, 180 is west, 270 is south.');
        } else if(text.indexOf('Rose:') !== -1) {
            $('#hover_help_info').text('The "Rose" field is the current avalanche-rose forecast for the indicated "Region."');
        } else {
            $('#hover_help_info').text('');
        }
    }, function(event) {
        $(event.target).css({'color': 'white', 'font-weight': 'normal'});
        $('#hover_help_info').hide();
    });
}

var calculate_slope_angle_and_aspect = function(ground_center, ground_ring_ccw) {

    // Approximate the normal to the surface at the given ground center by averaging
    // all the normals we get from the given ground ring that should surround the center.
    // For this to work, there must be enough points in the ring evenly distributed about the center.
    let ground_normal = new Cesium.Cartesian3(0.0, 0.0, 0.0);
    for(let i = 0; i < ground_ring_ccw.length; i++) {
        let j = (i + 1) % ground_ring_ccw.length;
        let vector_a = new Cesium.Cartesian3();
        let vector_b = new Cesium.Cartesian3();
        Cesium.Cartesian3.subtract(ground_ring_ccw[i], ground_center, vector_a);
        Cesium.Cartesian3.subtract(ground_ring_ccw[j], ground_center, vector_b);
        let normal = new Cesium.Cartesian3();
        Cesium.Cartesian3.cross(vector_a, vector_b, normal);
        Cesium.Cartesian3.normalize(normal, normal);
        Cesium.Cartesian3.add(ground_normal, normal, ground_normal);
    }
    Cesium.Cartesian3.normalize(ground_normal, ground_normal);

    // Calculate the slope angle.
    let tangent_plane = new Cesium.EllipsoidTangentPlane(ground_center);
    let globe_normal = new Cesium.Cartesian3();
    Cesium.Cartesian3.cross(tangent_plane.xAxis, tangent_plane.yAxis, globe_normal);
    Cesium.Cartesian3.normalize(globe_normal, globe_normal); // This is probably already unit-length.
    let slope_angle = Cesium.Cartesian3.angleBetween(globe_normal, ground_normal);

    // Project our ground normal onto the tangent plane.
    let rejected_ground_normal = new Cesium.Cartesian3();
    let dot = Cesium.Cartesian3.dot(ground_normal, globe_normal);
    Cesium.Cartesian3.multiplyByScalar(globe_normal, dot, rejected_ground_normal);
    let projected_ground_normal = new Cesium.Cartesian3();
    Cesium.Cartesian3.subtract(ground_normal, rejected_ground_normal, projected_ground_normal);

    // Now since the y-axis of the tangent plane is always north, and the x-axis east, we can
    // calculate our aspect by seeing where the projected ground normal points in the tangent space.
    let aspect = Cesium.Cartesian3.angleBetween(projected_ground_normal, tangent_plane.xAxis);
    let cross = new Cesium.Cartesian3();
    Cesium.Cartesian3.cross(tangent_plane.xAxis, projected_ground_normal, cross);
    let determ = Cesium.Cartesian3.dot(cross, globe_normal);
    if(determ < 0.0)
        aspect = 2.0 * Math.PI - aspect;

    // It's nice to quantize the aspect as follows.
    let heading = '?';
    if(aspect < Math.PI / 8.0 || aspect >= 15.0 * Math.PI / 8.0)
        heading = 'E';
    else if(Math.PI / 8.0 <= aspect && aspect < 3.0 * Math.PI / 8.0)
        heading = 'NE';
    else if(3.0 * Math.PI / 8.0 <= aspect && aspect < 5.0 * Math.PI / 8.0)
        heading = 'N';
    else if(5.0 * Math.PI / 8.0 <= aspect && aspect < 7.0 * Math.PI / 8.0)
        heading = 'NW';
    else if(7.0 * Math.PI / 8.0 <= aspect && aspect < 9.0 * Math.PI / 8.0)
        heading = 'W';
    else if(9.0 * Math.PI / 8.0 <= aspect && aspect < 11.0 * Math.PI / 8.0)
        heading = 'SW';
    else if(11.0 * Math.PI / 8.0 <= aspect && aspect < 13.0 * Math.PI / 8.0)
        heading = 'S';
    else if(13.0 * Math.PI / 8.0 <= aspect && aspect < 15.0 * Math.PI / 8.0)
        heading = 'SE';

    // Finally, return the data.
    return {
        slope_angle: slope_angle,   // Ranges from 0 to 90 degrees.
        aspect: aspect,      // 0-degrees (east), 90-degrees (north), 180-degrees (west), 270-degrees (south).
        normal: ground_normal,
        heading: heading
    };
};

var ground_points_from_mouse_point = function(mouse_point) {
    let ray = viewer.camera.getPickRay(mouse_point);
    if(Cesium.defined(ray) && !isNaN(ray.direction.x)) {
        let center = viewer.scene.globe.pick(ray, viewer.scene);
        if(Cesium.defined(center)) {
            let ring_vertices = [];
            let delta_list = [[0, -2], [2, 0], [0, 2], [-2, 0]];    // Isn't this clock-wise?!
            for(let i = 0; i < delta_list.length; i++) {
                let delta = delta_list[i];
                ray = viewer.camera.getPickRay({x: mouse_point.x - delta[0], y: mouse_point.y + delta[1]});
                if(Cesium.defined(ray)) {
                    ring_vertices.push(viewer.scene.globe.pick(ray, viewer.scene));
                }
            }
            if(ring_vertices.length == delta_list.length && ring_vertices.every((vertex) => {return Cesium.defined(vertex);})) {
                return {
                    center: center,
                    ring_vertices: ring_vertices
                };
            }
        }
    }
    return undefined;
};

function updateNearestAvaRegion() {
    let center = {x: viewer.canvas.width / 2.0, y: viewer.canvas.height / 2.0};
    let cartographic = screenCoordsToCartographic(center);
    if(Cesium.defined(cartographic)) {
        let ava_region = findNearestAvaRegion(cartographic);
        if(viewModel.ava_region !== ava_region) {
            viewModel.ava_region = ava_region;
        }
    } else {
        console.log('Failed to ray-cast center of screen against terrain.  Trying again later.');
        setTimeout(() => {
            updateNearestAvaRegion();
        }, 1000);
    }
}

function findNearestAvaRegion(cartographic) {
    let nearest_region;
    let smallest_distance = 99999999.0;
    for(let region in ava_regions_map) {
        let region_cartographic = ava_regions_map[region];
        let distance = cartographicDistance(cartographic, region_cartographic);
        if(distance < smallest_distance) {
            smallest_distance = distance;
            nearest_region = region;
        }
    }
    return nearest_region;
}

function cartographicDistance(cartA, cartB) {
    return Math.sqrt(
        (cartA.longitude - cartB.longitude) * (cartA.longitude - cartB.longitude) +
        (cartA.latitude - cartB.latitude) * (cartA.latitude - cartB.latitude) +
        (cartA.height - cartB.height) * (cartA.height - cartB.height)
    );
}

function screenCoordsToCartographic(screen_point) {
    let ray = viewer.camera.getPickRay(screen_point);
    if(Cesium.defined(ray) && !isNaN(ray.direction.x)) {
        let ground_point = viewer.scene.globe.pick(ray, viewer.scene);
        if(Cesium.defined(ground_point)) {
            return Cesium.Ellipsoid.WGS84.cartesianToCartographic(ground_point);
        }
    }
    return undefined;
}

function getUniformDataFromRoseData(rose_data, heading, altitude) {
    let heading_data = rose_data[heading];
    for(let i = 0; i < heading_data.length; i++) {
        let entry = heading_data[i];
        if(entry.altitude[0] <= altitude && altitude < entry.altitude[1]) {
            let hazard_level = entry.hazard_level;
            if(hazard_level === 'low') {
                return 0.0;
            } else if(hazard_level === 'moderate') {
                return 0.25;
            } else if(hazard_level === 'considerable') {
                return 0.5;
            } else if(hazard_level === 'high') {
                return 0.75;
            } else if(hazard_level == 'extreme') {
                return 1.0;
            }
        }
    }
    throw 'Failed to determine hazard level uniform value.';
}

function promiseAvaRose(ava_region, image_only=false) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: image_only ? 'ava_rose_image' : 'ava_rose_data',
            dataType: 'json',
            data: {
                'ava_region': ava_region
            },
            success: json_data => {
                if('error' in json_data) {
                    alert(json_data['error']);
                    reject();
                } else {
                    resolve(json_data);
                }
            },
            failure: error => {
                alert(error);
                reject();
            }
        });
    });
}

function promiseAvaRegions() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'ava_regions',
            dataType: 'json',
            success: json_data => {
                if('error' in json_data) {
                    alert(json_data['error']);
                    reject();
                } else {
                    for(let region in json_data) {
                        let location = json_data[region];
                        json_data[region] = new Cesium.Cartographic(
                            location.longitude * (Math.PI / 180.0),
                            location.latitude * (Math.PI / 180.0),
                            location.altitude
                        );
                    }
                    resolve(json_data);
                }
            },
            failure: error => {
                alert(error);
                reject();
            }
        });
    });
}

function promiseAvaMapShader() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'utah_ava_map.glsl',
            dataType: 'text',
            success: glsl_code => {
                resolve(glsl_code);
            },
            failure: error => {
                alert(error);
                reject();
            }
        });
    });
}
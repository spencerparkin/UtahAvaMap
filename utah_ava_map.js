// utah_ava_map.js

var viewer = null;
var viewModel = {
    slope_prime_radius: 15.0,
    slope_prime_alpha: 0.3,
    ava_region: '',
    ava_rose_image_url: 'images/loading.gif',
    ava_rose_forecast_url: '',
    cursor_height: '',
    cursor_location: '',
    cursor_slope_angle: '',
    cursor_aspect_angle: '',
    image_layer_list: ['Terrain', 'Topological'],
    image_layer: 'Topological',
    show_pow_proj_trails: false
};
var ava_material = null;
var ava_regions_map = null;
var billboard_collection = null;
var label_collection = null;
var pow_proj_trail_cache = [];
var pow_proj_trail_map = {};
var pow_proj_key = '200163729-c0d0862c9606df39c65854f74b0af71f';    // Here it is for all to see.  Hmmm...
var utahCenter = Cesium.Cartographic.fromDegrees(-111.673769, 39.308535);

class PowProjTrailCacheEntry {
    constructor(center, radius, json_data) {
        this.center = center;
        this.radius = radius;
        this.json_data = json_data;
    }
    
    contains_point(point) {
        let meters = Cesium.Cartesian3.distance(point, this.center);
        let miles = meters / 1609.344;
        return miles < this.radius ? true : false;
    }
}

function promisePowProjTrailData(center) {
    return new Promise((resolve, reject) => {
        let cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(center);
        let distance = cartographicDistance(cartographic, utahCenter) / 1609.344;
        if(distance > 350.0)
            resolve({trails: []});
            
        for(let i = 0; i < pow_proj_trail_cache.length; i++) {
            let cache_entry = pow_proj_trail_cache[i];
            if(cache_entry.contains_point(center)) {
                resolve(cache_entry.json_data);
                return;
            }
        }
        
        let radius = 30.0;
        $.ajax({
            url: 'https://www.powderproject.com/data/get-trails',
            dataType: 'json',
            data: {
                'key': pow_proj_key,
                'lat': Cesium.Math.toDegrees(cartographic.latitude),
                'lon': Cesium.Math.toDegrees(cartographic.longitude),
                'maxDistance': radius,
                'maxResults': 100
            },
            success: json_data => {
                if('success' in json_data && json_data.success) {
                    let cache_entry = new PowProjTrailCacheEntry(center, radius, json_data);
                    pow_proj_trail_cache.push(cache_entry);
                    resolve(json_data);
                } else {
                    if('message' in json_data) {
                        console.log('PowProjError: ' + json_data.message);
                    }
                    reject();
                }
            },
            failure: error => {
                console.log('Error: ' + error);
                reject();
            }
        });
    });
}

function updatePowProjTrailMap(trail_list) {
    for(let i = 0; i < trail_list.length; i++) {
        let trail_list_entry = trail_list[i];
        if(!(trail_list_entry.id in pow_proj_trail_map)) {
            let latitude = Cesium.Math.toRadians(parseFloat(trail_list_entry.latitude));
            let longitude = Cesium.Math.toRadians(parseFloat(trail_list_entry.longitude));
            let cartographic = new Cesium.Cartographic(longitude, latitude);
            let position = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographic);
            let label = label_collection.add({
                text: trail_list_entry.name,
                position: position,
                font: '12pt Arial',
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                translucencyByDistance: new Cesium.NearFarScalar(1E4, 1, 3E4, 0),
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                pixelOffset: new Cesium.Cartesian2(0, -16)
            });
            let billboard = billboard_collection.add({
                image: trail_list_entry.imgSqSmall,
                position: position,
                scaleByDistance: new Cesium.NearFarScalar(500, 1, 1E4, 0.5),
                height: 32,
                width: 32,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            });
            billboard.linkForPick = trail_list_entry.url;
            let trail_map_entry = {
                billboard: billboard,
                label: label
            };
            pow_proj_trail_map[trail_list_entry.id] = trail_map_entry;
        }
    }
}

function updatePowProjTrailMapForCameraChange(cartographic) {
    let center = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographic);
    promisePowProjTrailData(center).then(json_data => {
        updatePowProjTrailMap(json_data.trails);
    }).catch(error => {
        viewModel.show_pow_proj_trails = false;
        console.log('Pow-proj trail data promise failed: ' + error);
    });
}

function setLabelAndBillboardVisibility(visible) {
    for(let key in pow_proj_trail_map) {
        let trail_map_entry = pow_proj_trail_map[key];
        trail_map_entry.billboard.show = visible;
        trail_map_entry.label.show = visible;
    }
}

var init_map = function() {
    var terrain_image_provider = new Cesium.ArcGisMapServerImageryProvider({
        url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
    });
    var topo_image_provider = new Cesium.ArcGisMapServerImageryProvider({
        url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer'
    });
    
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
        baseLayerPicker: false,
        imageryProvider: topo_image_provider
    });
    
    viewer.scene.globe.enableLighting = true;
    
    // TODO: There has to be a better way to get ambient/diffuse lighting on all surfaces of the map.
    viewer.clockViewModel.shouldAnimation = false;
    viewer.clockViewModel.currentTime = Cesium.JulianDate.fromIso8601('2019-02-01T19:00:00Z');
    
    billboard_collection = viewer.scene.primitives.add(new Cesium.BillboardCollection({scene: viewer.scene}));
    label_collection = viewer.scene.primitives.add(new Cesium.LabelCollection({scene: viewer.scene}));
    
    // TODO: It may be more helpful to remember the user's last viewed location.
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
    Cesium.knockout.getObservable(viewModel, 'image_layer').subscribe(() => {
        let newImageProvider;
        if(viewModel.image_layer === 'Terrain') {
            newImageProvider = terrain_image_provider;
        } else if(viewModel.image_layer === 'Topological') {
            newImageProvider = topo_image_provider;
        }
        if(Cesium.defined(newImageProvider)) {
            let currentImageProvider = viewer.imageryLayers.get(0);
            viewer.imageryLayers.remove(currentImageProvider, false);
            viewer.imageryLayers.add(new Cesium.ImageryLayer(newImageProvider));
        }
    });
    Cesium.knockout.getObservable(viewModel, 'show_pow_proj_trails').subscribe(() => {
        if(viewModel.show_pow_proj_trails) {
            let cartographic = calcScreenCenterCartographic();
            updatePowProjTrailMapForCameraChange(cartographic);
            setLabelAndBillboardVisibility(true);
        } else {
            setLabelAndBillboardVisibility(false);
        }
    });
    Cesium.knockout.getObservable(viewModel, 'slope_prime_radius').subscribe(() => {
        ava_material.uniforms.slope_prime_radius = parseFloat(viewModel.slope_prime_radius);
    });
    Cesium.knockout.getObservable(viewModel, 'slope_prime_alpha').subscribe(() => {
        ava_material.uniforms.slope_prime_alpha = parseFloat(viewModel.slope_prime_alpha);
    });
    Cesium.knockout.getObservable(viewModel, 'ava_region').subscribe(() => {
        if(Cesium.defined(viewModel.ava_region)) {
            viewModel.ava_rose_image_url = 'images/loading.gif';
            promiseAvaRose(viewModel.ava_region).then(updateAvaRose).catch(error => {
                viewModel.ava_rose_image_url = 'images/question_mark.png';
            });
        }
    });

    viewer.camera.changed.addEventListener(cameraChangedEventHandler);

    promiseAvaRegions().then(json_data => {
        ava_regions_map = json_data;
        updateNearestAvaRegionForStartup();
    });

    let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas, false);
    handler.setInputAction(
        function(movement) {
            let ground_points = ground_points_from_mouse_point(movement.endPosition);
            if(ground_points) {
                let ground_data = calculate_slope_angle_and_aspect(ground_points.center, ground_points.ring_vertices);
                let positionCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(ground_points.center);
                let feetPerMeter = 3.2808;
                viewModel.cursor_height = (positionCartographic.height * feetPerMeter).toFixed(0) + ' feet (' + positionCartographic.height.toFixed(0) + ' meters)';
                viewModel.cursor_location = formatCartographicString(positionCartographic);
                viewModel.cursor_slope_angle = (ground_data.slope_angle * 180.0 / Math.PI).toFixed(2) + ' degrees';
                viewModel.cursor_aspect_angle = (ground_data.aspect * 180.0 / Math.PI).toFixed(2) + ' degrees (' + ground_data.heading + ')';
            }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
    
    // Thanks go to Matthew Amato for helping me figure this out.
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction(function(movement) {
        let pickedFeature = viewer.scene.pick(movement.position);
        if(Cesium.defined(pickedFeature)) {
            if(Cesium.defined(pickedFeature.primitive.linkForPick))
                window.open(pickedFeature.primitive.linkForPick, '_blank');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    viewer.dataSources.add(Cesium.KmlDataSource.load('KML/Bountiful Ridge.kml', {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas,
        clampToGround: true
    }));
}

var formatCartographicAngleString = function(radians) {
    let degrees = radians * 180.0 / Math.PI;
    let degrees_rounded = Math.floor(degrees);
    let minutes = Math.floor(60.0 * (degrees - degrees_rounded));
    let seconds = Math.floor(60.0 * (60.0 * (degrees - degrees_rounded) - minutes));
    let formatted = degrees_rounded.toString() + '° ' + minutes.toString() + "' " + seconds.toString() + '" ';
    return formatted;
}

var formatCartographicString = function(cartographic) {
    let latitudeSuffix = ' N';
    if(cartographic.latitude < 0.0)
        latitudeSuffix = ' S';
    let longitudeSuffix = ' E';
    if(cartographic.longitude < 0.0)
        longitudeSuffix = ' W';
    let formatted = formatCartographicAngleString(Math.abs(cartographic.latitude)) + latitudeSuffix + ' ' + formatCartographicAngleString(Math.abs(cartographic.longitude)) + longitudeSuffix;
    return formatted;
}

var cameraChangedEventHandler = function(event) {
    let cartographic = calcScreenCenterCartographic();
    updateNearestAvaRegion(cartographic);
    if(viewModel.show_pow_proj_trails) {
        updatePowProjTrailMapForCameraChange(cartographic);
    }
}

window.onload = function() {
    init_map();
    
    if(localStorage.getItem('mapExplanationAcknowledged')) {
        document.getElementById('mapUsageBox').style.display = "none";
    } else {
        document.getElementById('mapUsageBox').style.display = "block";
    }
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

function updateNearestAvaRegionForStartup() {
    let cartographic = calcScreenCenterCartographic();
    if(Cesium.defined(cartographic)) {
        updateNearestAvaRegion(cartographic);
        console.log('Successfully performed initial ava-region update!');
    } else {
        console.log('Trying to do initial update of ava-region one second later...');
        setTimeout(updateNearestAvaRegionForStartup, 1000);
    }
}

function updateNearestAvaRegion(cartographic) {
    if(Cesium.defined(cartographic)) {
        let ava_region = findNearestAvaRegion(cartographic);
        if(viewModel.ava_region !== ava_region) {
            viewModel.ava_region = ava_region;  // This will trigger the observer function we have watching this variable.
        }
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

// For cartographics that are near-enough, this approximation is okay.
// For those further apart, one would want to take into account the curvature of the earth.
function cartographicDistance(cartographicA, cartographicB) {
    let cartesianA = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographicA);
    let cartesianB = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographicB);
    return Cesium.Cartesian3.distance(cartesianA, cartesianB);
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

function calcScreenCenterCartographic() {
    let center = {x: viewer.canvas.width / 2.0, y: viewer.canvas.height / 2.0};
    let cartographic = screenCoordsToCartographic(center);
    return cartographic;
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

function updateAvaRose(json_data) {
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
        console.log('Error: ' + e);
    }
}

function promiseAvaRose(ava_region) {
    if(ava_region === 'Custom') {
        return new Promise((resolve, reject) => {
            var upload_status = document.getElementById('custom_ava_rose_upload_status');
            
            var file_list = document.getElementById('custom_ava_rose_image_selector').files;
            if(file_list.length != 1) {
                upload_status.innerHTML = '';
                reject();
            } else {
                upload_status.innerHTML = 'Uploading...';
            
                var file = file_list[0];
            
                var formData = new FormData();
                formData.enctype = 'multipart/form-data';
                formData.append('image_file', file, file.name);
                
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'custom_ava_rose_data');
                
                xhr.onerror = function(error) {
                    reject({'error': error});
                }
                
                xhr.onload = function() {
                    if(xhr.status !== 200) {
                        upload_status.innerHTML = 'Error!';
                        reject();
                    } else {
                        upload_status.innerHTML = '';
                        
                        let json_data = JSON.parse(xhr.responseText);
                        if('error' in json_data) {
                            alert('Error: ' + json_data.error);
                            reject();
                        } else {
                            resolve(json_data);
                            viewer.camera.changed.removeEventListener(cameraChangedEventHandler);
                        }
                    }
                }
                
                xhr.upload.onprogress = function(event) {
                    if(event.lengthComputable) {
                        upload_status.innerHTML = 'Uploading... ' + Math.round(event.loaded / event.total * 100.0) + '%';
                    }
                }
                
                xhr.send(formData);
            }
        });
    } else {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'ava_rose_data',
                dataType: 'json',
                data: {
                    'ava_region': ava_region,
                    'use_local_image_url': true     // Our server can access the UAC website, but sadly, I can't.
                },
                success: json_data => {
                    if('error' in json_data) {
                        alert('Error: ' + json_data['error']);
                        reject();
                    } else {
                        resolve(json_data);
                    }
                },
                failure: error => {
                    console.log('Error: ' + error);
                    reject();
                }
            });
        });
    }
}

function promiseAvaRegions() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'ava_regions',
            dataType: 'json',
            success: json_data => {
                if('error' in json_data) {
                    console.log('Error: ' + json_data['error']);
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
                console.log('Error: ' + error);
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
                console.log('Error: ' + error);
                reject();
            }
        });
    });
}

function got_it_button_clicked() {
    document.getElementById('mapUsageBox').style.display = "none";
    localStorage.setItem('mapExplanationAcknowledged', true);
}

function help_button_clicked() {
    document.getElementById('mapUsageBox').style.display = "block";
}

function retract_controls_button_clicked() {
    $('#cesiumControls').animate({
        top: '-500px'
    }, 500, () => {
        $('#show_controls_button').css('display', 'inline-block');
    });
}

function show_controls_button_clicked() {
    $('#show_controls_button').css('display', 'none');
    $('#cesiumControls').animate({
        top: '0'
    }, 500);
}

function custom_ava_rose_image_select_changed() {
    viewModel.ava_region = undefined;
    viewModel.ava_region = 'Custom';
}

function custom_ava_rose_image_select_clicked() {
    let custom_ava_rose_image_selector = document.getElementById('custom_ava_rose_image_selector');
    custom_ava_rose_image_selector.value = '';
}
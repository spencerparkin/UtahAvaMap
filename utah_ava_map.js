// utah_ava_map.js

var viewer = null;
var viewModel = {
    slope_prime_radius: 15.0,
    slope_prime_alpha: 0.7,
    ava_region: ''
};
var ava_material = null;
var ava_regions_map = null;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({
            requestVertexNormals: true
        })
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
        /*promiseAvaRose(viewModel.ava_region).then(ava_rose => {
            ava_material.uniforms.rose00 = new Cesium.Color();
            ava_material.uniforms.rose01 = new Cesium.Color();
            ava_material.uniforms.rose10 = new Cesium.Color();
            ava_material.uniforms.rose11 = new Cesium.Color();
            ava_material.uniforms.rose20 = new Cesium.Color();
            ava_material.uniforms.rose21 = new Cesium.Color();
        });*/
    });

    viewer.camera.changed.addEventListener(event => {
        updateNearestAvaRegion();
    });

    promiseAvaRegions().then(json_data => {
        ava_regions_map = json_data;
        updateNearestAvaRegion();
    });
}

window.onload = function() {
    init_map();
}

function updateNearestAvaRegion() {
    let center = {x: viewer.canvas.width / 2.0, y: viewer.canvas.height / 2.0};
    let cartographic = screenCoordsToCartographic(center);
    if(Cesium.defined(cartographic)) {
        let ava_region = findNearestAvaRegion(cartographic);
        if(viewModel.ava_region !== ava_region) {
            viewModel.ava_region = ava_region;
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

function promiseAvaRose() {
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
// utah_ava_map.js

var viewer = null;
var viewModel = {
    slope_prime_radius: 15.0
};
var ava_material = null;

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
                    // Look at slopes in the range [P-15,P+15], where P is the prime avalanche slope angle (38 degrees.)
                    slope_prime_radius: viewModel.slope_prime_radius
                }
            }
        });
        
        viewer.scene.globe.material = ava_material;
    });
}

window.onload = function() {
    Cesium.knockout.track(viewModel);
    Cesium.knockout.applyBindings(viewModel, document.getElementById('cesiumControls'));
    Cesium.knockout.getObservable(viewModel, 'slope_prime_radius').subscribe(() => {
        ava_material.uniforms.slope_prime_radius = viewModel.slope_prime_radius;
    });
    
    init_map();
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

var debug_click = function() {
    
}
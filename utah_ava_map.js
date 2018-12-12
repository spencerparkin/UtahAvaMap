// utah_ava_map.js

var viewer = null;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({
            requestVertexNormals: true
        })
    });
    
    viewer.scene.globe.enableLighting = true;
    
    /*let west = -111.7287239132627;
    let east = -111.6729336993894;
    let north = 40.66047397914876;
    let south = 40.64897595231015;
    let rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    viewer.camera.setView({destination: rect});*/
}

window.onload = function() {
    init_map();
}

function getColorRamp() {
    var ramp = document.createElement('canvas');
    ramp.width = 100;
    ramp.height = 1;
    var ctx = ramp.getContext('2d');
    var values = [0.0, 0.29, 0.5, Math.sqrt(2)/2, 0.87, 0.91, 1.0];
    var grd = ctx.createLinearGradient(0, 0, 100, 0);
    grd.addColorStop(values[0], '#000000'); //black
    grd.addColorStop(values[1], '#2747E0'); //blue
    grd.addColorStop(values[2], '#D33B7D'); //pink
    grd.addColorStop(values[3], '#D33038'); //red
    grd.addColorStop(values[4], '#FF9742'); //orange
    grd.addColorStop(values[5], '#ffd700'); //yellow
    grd.addColorStop(values[6], '#ffffff'); //white
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 100, 1);
    return ramp;
}

var debug_click = function() {
    /*var material = new Cesium.Material({
        fabric: {
            type: 'Color',
            uniforms: {
                color: new Cesium.Color(1.0, 0.0, 0.0, 0.5)
            }
        }
    });*/
    var material = Cesium.Material.fromType('SlopeRamp');
    material.uniforms.image = getColorRamp();
    
    viewer.scene.globe.material = material;
}
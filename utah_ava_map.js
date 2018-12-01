// utah_ava_map.js

// This class will return image tiles that are a function of the avalanche rose and the terrain features.
function AvalancheHazardImageryProvider() {
    this._tilingScheme = new Cesium.GeographicTilingScheme();
    this._errorEvent = new Cesium.Event();
    this._tileWidth = 256;
    this._tileHeight = 256;
    this._readyPromise = () => {
        return Promise((resolve, reject) => {
            resolve(true);
        });
    };
}

Object.defineProperties(AvalancheHazardImageryProvider.prototype, {
    proxy : {
        get : function() {
            return undefined;
        }
    },

    tileWidth : {
        get : function() {
            return this._tileWidth;
        }
    },

    tileHeight: {
        get : function() {
            return this._tileHeight;
        }
    },

    maximumLevel : {
        get : function() {
            return undefined;
        }
    },

    minimumLevel : {
        get : function() {
            return undefined;
        }
    },

    tilingScheme : {
        get : function() {
            return this._tilingScheme;
        }
    },

    rectangle : {
        get : function() {
            return this._tilingScheme.rectangle;
        }
    },

    tileDiscardPolicy : {
        get : function() {
            return undefined;
        }
    },

    errorEvent : {
        get : function() {
            return this._errorEvent;
        }
    },

    ready : {
        get : function() {
            return true;
        }
    },

    readyPromise : {
        get : function() {
            return this._readyPromise;
        }
    },

    credit : {
        get : function() {
            return undefined;
        }
    },

    hasAlphaChannel : {
        get : function() {
            return true;
        }
    }
});

AvalancheHazardImageryProvider.prototype.getTileCredits = function(x, y, level) {
    return undefined;
};

AvalancheHazardImageryProvider.prototype.requestImage = function(x, y, level) {
    return new Promise((resolve, reject) => {
        let tileRect = this._tilingScheme.tileXYToRectangle(x, y, level);
        this._promise_ava_region(tileRect, level).then(region => {
            if(!region) {
                resolve(undefined);
            } else {
                this._promise_ava_rose(region).then(rose => {
                    let canvas = this._generate_tile_canvas(rose, region, tileRect);
                    resolve(canvas);
                });
            }
        });
    });
};

AvalancheHazardImageryProvider.prototype._promise_ava_region = function(tileRect, level) {
    return new Promise((resolve, reject) => {
        if(level < 7) {
            resolve(undefined);
        }
        $.ajax({
            url: 'ava_region',
            dataType: 'json',
            data: {
                west: tileRect.west * 180.0 / Math.PI,
                east: tileRect.east * 180.0 / Math.PI,
                south: tileRect.south * 180.0 / Math.PI,
                north: tileRect.north * 180.0 / Math.PI
            },
            contentType: 'application/json',
            type: 'GET',
            success: json_data => {
                if('error' in json_data) {
                    alert(json_data['error']);
                    reject();
                } else {
                    resolve(json_data['region']);
                }
            },
            failure: error => {
                alert(error);
                reject();
            }
        });
    });
}

AvalancheHazardImageryProvider.prototype._promise_ava_rose = function(region) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'ava_rose',
            dataType: 'json',
            data: {
                region: region
            },
            contentType: 'application/json',
            type: 'GET',
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

var calculate_ground_position_at_location = function(longitude, latitude) {
    let cartographic = new Cesium.Cartographic(longitude, latitude);
    cartographic.height = viewer.scene.globe.getHeight(cartographic); // Slow ray cast!
    let position = Cesium.Cartographic.toCartesian(cartographic);
    return position;
}

AvalancheHazardImageryProvider.prototype._generate_tile_canvas = function(rose, region, tileRect) {
    let canvas = document.createElement('canvas');
    canvas.width = this._tileWidth;
    canvas.height = this._tileHeight;
    
    let context = canvas.getContext('2d');
    
    let row_step = 32;
    let col_step = 16;
    
    let matrix_rows = canvas.height / row_step;
    let matrix_cols = canvas.width / col_step;
    
    let dx = ((tileRect.east - tileRect.west) / matrix_cols) / 8.0;
    let dy = ((tileRect.north - tileRect.south) / matrix_rows) / 8.0;
    
    let start_time = new Date();
    
    let matrix = [];
    for(let i = 0; i < matrix_rows; i++) {
        let column = [];
        matrix.push(column);
        let latitude = tileRect.north + ((i + 0.5) / matrix_rows) * (tileRect.south - tileRect.north);
        
        for(let j = 0; j < matrix_cols; j++) {
            let longitude = tileRect.west + ((j + 0.5) / matrix_cols) * (tileRect.east - tileRect.east);
            
            let position = calculate_ground_position_at_location(longitude, latitude);
            let eastPosition = calculate_ground_position_at_location(longitude + dx, latitude);
            let westPosition = calculate_ground_position_at_location(longitude - dx, latitude);
            let northPosition = calculate_ground_position_at_location(longitude, latitude + dy);
            let southPosition = calculate_ground_position_at_location(longitude, latitude - dy);
            
            let ground_ring_ccw = [eastPosition, northPosition, westPosition, southPosition];
            let ground_data = calculate_slope_angle_and_aspect(position, ground_ring_ccw);
            
            ground_data.slope_angle *= 180.0 / Math.PI;
            ground_data.aspect *= 180.0 / Math.PI;
            
            column.push(ground_data);
        }
    }
    
    let end_time = new Date();
    let diff_time = end_time - start_time;
    console.log('Time taken: ' + diff_time);
      
    let r, g, b, a;
    
    for(let i = 0; i < canvas.height; i += row_step) {
        for(let j = 0; j < canvas.width; j += col_step) {
            let entry = matrix[i / row_step][j / col_step];
            
            r = 255.0 * (entry.slope_angle / 90.0);
            g = 255.0 * (entry.slope_angle / 90.0);
            b = 255.0 * (entry.slope_angle / 90.0);
            a = 255;
            
            context.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
            context.fillRect(j, i, col_step, row_step);
        }
    }

    return canvas;
};

AvalancheHazardImageryProvider.prototype.pickFeatures = function() {
    return undefined;
};

let calculate_slope_angle_and_aspect = function(ground_center, ground_ring_ccw) {
    
    // Approximate the normal to the surface at the given ground center by averaging
    // all the normals we get from the given ground ring that should surround the center.
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
    if(aspect < 0.0)
        aspect += 2.0 * Math.PI;
    
    // Finally, return the data.
    return {
        slope_angle: slope_angle,   // Ranges from 0 to 90 degrees.
        aspect: aspect,      // 0-degrees (east), 90-degrees (north), 180-degrees (west), 270-degrees (south).
        normal: ground_normal,
        center: ground_center
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

var viewer = null;
var debug_flag = false;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({
            requestVertexNormals: true
        })
    });
    
    viewer.canvas.setAttribute('tabindex', '0');
    viewer.canvas.onclick = function() {
        viewer.canvas.focus();
    };
    
    let west = -111.7287239132627;
    let east = -111.6729336993894;
    let north = 40.66047397914876;
    let south = 40.64897595231015;
    let rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    viewer.camera.setView({destination: rect});
    
    let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas, false);
    handler.setInputAction(
        function(movement) {
            let ground_points = ground_points_from_mouse_point(movement.endPosition);
            if(ground_points) {
                let ground_data = calculate_slope_angle_and_aspect(ground_points.center, ground_points.ring_vertices);
                let positionCartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(ground_points.center);
                let span = document.getElementById('ground_data');
                span.textContent = 'Height: ' + positionCartographic.height.toFixed(2);
                span.textContent += '; Latitude: ' + (positionCartographic.latitude * 180.0 / Math.PI).toFixed(10);
                span.textContent += '; Longitude: ' + (positionCartographic.longitude * 180.0 / Math.PI).toFixed(10);
                span.textContent += '; Slope Angle: ' + (ground_data.slope_angle * 180.0 / Math.PI).toFixed(2);
                span.textContent += '; Aspect: ' + (ground_data.aspect * 180.0 / Math.PI).toFixed(2);
            
                if(debug_flag) {
                    debug_flag = false;
                    let entity = new Cesium.Entity({
                        position: ground_points.center,
                        point: new Cesium.PointGraphics({
                            color: Cesium.Color.RED,
                            pixelSize: 10
                        })
                    });
                    viewer.entities.add(entity);
                    
                    let vector_tip = new Cesium.Cartesian3();
                    Cesium.Cartesian3.multiplyByScalar(ground_data.normal, 100.0, vector_tip);
                    Cesium.Cartesian3.add(ground_points.center, vector_tip, vector_tip);
                    entity = new Cesium.Entity({
                        position: ground_points.center,
                        polyline: new Cesium.PolylineGraphics({
                            positions: [ground_points.center, vector_tip]
                        })
                    });
                    viewer.entities.add(entity);
                }
            }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
}

window.onload = function() {
    init_map();
    
    document.addEventListener('keydown', function(event) {
        if(event.keyCode == 68) {
            debug_flag = true;
        }
    });
}

var debug_click = function() {
    let layer = viewer.imageryLayers.addImageryProvider(new AvalancheHazardImageryProvider());
    layer.show = true;
    layer.alpha = 0.5;
    layer.name = 'Avalanche Hazard';
}
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

AvalancheHazardImageryProvider.prototype._generate_tile_canvas = function(rose, region, tileRect) {
    let canvas = document.createElement('canvas');
    canvas.width = this._tileWidth;
    canvas.height = this._tileHeight;
    
    let context = canvas.getContext('2d');
    
    let row_step = 16;
    let col_step = 16;
    
    let height_field_rows = canvas.height / row_step;
    let height_field_cols = canvas.width / col_step;
    
    // Generate a height field for the tile.  This is the most expensive part.
    let height_field = [];
    for(let i = 0; i < height_field_rows; i++) {
        let column = [];
        height_field.push(column);
        let longitude = tileRect.west + ((i + 0.5) / height_field_rows) * (tileRect.east - tileRect.west);
        for(let j = 0; j < height_field_cols; j++) {
            let latitude = tileRect.south + (1.0 - (j + 0.5) / height_field_cols) * (tileRect.north - tileRect.south);
            let cartographic = new Cesium.Cartographic(longitude, latitude);
            cartographic.height = viewer.scene.globe.getHeight(cartographic); // Slow ray cast!
            let position = Cesium.Cartographic.toCartesian(cartographic);
            column.push({position: position, aspect: undefined, slope_angle: undefined});
        }
    }
    
    // Now go calculate aspect and slope-angle for each point in the height field.
    for(let i = 0; i < height_field_rows; i++) {
        for(let j = 0; j < height_field_cols; j++) {
            let entry = height_field[i][j];
            
            // Collect and compute normals from adjacent entries in the height field.
            let normal;
            let vector_a = new Cesium.Cartesian3();
            let vector_b = new Cesium.Cartesian3();
            let normal_list = [];
            if(i + 1 < height_field_rows) {
                if(j + 1 < height_field_cols) {
                    Cesium.Cartesian3.subtract(height_field[i+1][j].position, entry.position, vector_a);
                    Cesium.Cartesian3.subtract(height_field[i][j+1].position, entry.position, vector_b);
                    normal = new Cesium.Cartesian3();
                    Cesium.Cartesian3.cross(vector_a, vector_b, normal)
                    Cesium.Cartesian3.normalize(normal, normal);
                    normal_list.push(normal);
                }
                if(j > 0) {
                    Cesium.Cartesian3.subtract(height_field[i][j-1].position, entry.position, vector_a);
                    Cesium.Cartesian3.subtract(height_field[i+1][j].position, entry.position, vector_b);
                    normal = new Cesium.Cartesian3();
                    Cesium.Cartesian3.cross(vector_a, vector_b, normal)
                    Cesium.Cartesian3.normalize(normal, normal);
                    normal_list.push(normal);
                }
            }
            if(i > 0) {
                if(j + 1 < height_field_cols) {
                    Cesium.Cartesian3.subtract(height_field[i][j+1].position, entry.position, vector_a);
                    Cesium.Cartesian3.subtract(height_field[i-1][j].position, entry.position, vector_b);
                    normal = new Cesium.Cartesian3();
                    Cesium.Cartesian3.cross(vector_a, vector_b, normal)
                    Cesium.Cartesian3.normalize(normal, normal);
                    normal_list.push(normal);
                }
                if(j > 0) {
                    Cesium.Cartesian3.subtract(height_field[i-1][j].position, entry.position, vector_a);
                    Cesium.Cartesian3.subtract(height_field[i][j-1].position, entry.position, vector_b);
                    normal = new Cesium.Cartesian3();
                    Cesium.Cartesian3.cross(vector_a, vector_b, normal)
                    Cesium.Cartesian3.normalize(normal, normal);
                    normal_list.push(normal);
                }
            }
            
            // Average the normals to get our best approximation.
            normal = new Cesium.Cartesian3(0.0, 0.0, 0.0);
            for(let k = 0; k < normal_list.length; k++)
                Cesium.Cartesian3.add(normal, normal_list[k], normal);
            Cesium.Cartesian3.normalize(normal, normal);
            
            // Finally, calculate aspect and slope-angle.
            entry.aspect = Math.atan2(normal.z, normal.x);
            let normal_projected = new Cesium.Cartesian3(normal.x, 0.0, normal.z);
            let angle = Cesium.Cartesian3.angleBetween(normal, normal_projected);
            entry.slope_angle = angle * 180.0 / Math.PI;
        }
    }
    
    let prime_slope_angle = 38.0;
    let prime_slope_angle_radius = 5.0;
    let slope_angle_min = prime_slope_angle - prime_slope_angle_radius;
    let slope_angle_max = prime_slope_angle + prime_slope_angle_radius;
    
    let r, g, b, a;
    
    for(let i = 0; i < canvas.height; i += row_step) {
        for(let j = 0; j < canvas.width; j += col_step) {
            let entry = height_field[i / row_step][j / col_step];
            if(entry.slope_angle >= slope_angle_min && entry.slope_angle <= slope_angle_max) {
                
                // TODO: Color the avalanchy slope based on its aspect/elevation and the avalanche rose.
            
                r = 255;
                g = 255;
                b = 255;
                a = 255;
            } else {
                r = 0;
                g = 0;
                b = 0;
                a = 0;
            }
            
            context.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
            context.fillRect(j, i, col_step, row_step);
        }
    }

    return canvas;
};

AvalancheHazardImageryProvider.prototype.pickFeatures = function() {
    return undefined;
};

var viewer = null;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain({
            requestVertexNormals: true
        })
    });
    
    let west = -111.7287239132627;
    let east = -111.6729336993894;
    let north = 40.66047397914876;
    let south = 40.64897595231015;
    let rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    viewer.camera.setView({destination: rect});
}

window.onload = function() {
    init_map();
}

var debug_click = function() {
    let layer = viewer.imageryLayers.addImageryProvider(new AvalancheHazardImageryProvider());
    layer.show = true;
    layer.alpha = 0.5;
    layer.name = 'Avalanche Hazard';
}
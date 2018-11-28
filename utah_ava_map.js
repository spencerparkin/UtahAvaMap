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
    
    let di = 4;
    let dj = 4;
    
    for(let i = 0; i < canvas.width; i += di) {
        for(let j = 0; j < canvas.height; j += dj) {
            let r = i % 256;
            let g = j % 256;
            let b = (i + j) % 256;
            let a = 255;
            context.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
            context.fillRect(i, j, di, dj);
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
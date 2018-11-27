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
    let canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    
    let context = canvas.getContext('2d');
    
    let gradient = context.createLinearGradient(0, 0, 200, 0);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(1, 'white');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);

    return canvas;
};

AvalancheHazardImageryProvider.prototype.pickFeatures = function() {
    return undefined;
};

var viewer = null;

var init_map = function() {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZjBmNGUxMi1mNjYyLTQ4NTMtYjdkZC03ZGJkMzZlMzYyZWQiLCJpZCI6NTA2Miwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MjMwODg2MH0.MJB-IG9INCNEA0ydUvprHcUTLdKDbnPpkWG6DCqXKQc';
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain()
    });
    
    let layer = viewer.imageryLayers.addImageryProvider(new Cesium.TileCoordinatesImageryProvider());
    layer.alpha = 0.5;
    layer.show = true;
    layer.name = 'Tile Coordinates';
}

window.onload = function() {
    init_map();
}

var debug_click = function() {
    debug_layer = viewer.imageryLayers.addImageryProvider(new AvalancheHazardImageryProvider());
    debug_layer.show = true;
    debug_layer.alpha = 0.5;
}
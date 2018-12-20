// utah_ava_map.glsl

// Each component is 0.0 (green), 0.25 (moderate), 0.5 (considerable), 0.75 (high) or 1.0 (extreme)
uniform vec4 rose00;    // Below 8000, E through NW
uniform vec4 rose01;    // Below 8000, W through SE
uniform vec4 rose10;    // 8000-9500, E through NW
uniform vec4 rose11;    // 8000-9500, W through SE
uniform vec4 rose20;    // Above 9500, E through NW
uniform vec4 rose21;    // Above 9500, W through SE

// 38 degrees +/- this radius gives our coloring range.
uniform float slope_prime_radius;

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    float pi = 3.1415926536;
    float aspect = materialInput.aspect * (180.0 / pi);     // This is in degrees [0,360); 0 degrees is East.
    float slope = materialInput.slope * (180.0 / pi);       // This is in degrees [0,90); 0 degrees is flat, 90 is vertical.
    float elevation = materialInput.height;                 // This is in meters; -414.0 is dead sea elevation, 8777.0 is everest elevation.
    
    float slope_prime = 38.0;   // This is the best slope angle for avalanches.
    float slope_min = slope_prime - slope_prime_radius;
    float slope_max = slope_prime + slope_prime_radius;
    
    // The applicability of the danger rating color is based on slope angle.
    if(slope < slope_min || slope > slope_max) {
        material.alpha = 0.0;   // Fully transparent.
    } else if(slope_min <= slope && slope <= slope_max) {
        material.alpha = 1.0;   // Fully opaque.
    }
    
    // Determine which level of the avalanche rose is applicable.
    vec4 rose0, rose1;
    if(elevation < 2438.4 /* 8000 feet */) {
        rose0 = rose00;
        rose1 = rose01;
    } else if(elevation >= 2438.4 && elevation <= 2895.6 /* 9500 feet*/) {
        rose0 = rose10;
        rose1 = rose11;
    } else {
        rose0 = rose20;
        rose1 = rose21;
    }
    
    // Now determine which direction of the avalanche rose is applicable.
    float rating = 1.0;
    if(aspect < 22.5 || aspect >= 337.5) { // E
        rating = rose0.r;
    } else if(aspect >= 22.5 && aspect < 67.5) { // NE
        rating = rose0.g;
    } else if(aspect >= 67.5 && aspect < 112.5) { // N
        rating = rose0.b;
    } else if(aspect >= 112.5 && aspect < 157.5) { // NW
        rating = rose0.a;
    } else if(aspect >= 157.5 && aspect < 202.5) { // W
        rating = rose1.r;
    } else if(aspect >= 202.5 && aspect < 247.5) { // SW
        rating = rose1.g;
    } else if(aspect >= 247.5 && aspect < 292.5) { // S
        rating = rose1.b;
    } else if(aspect >= 292.5 && aspect < 337.5) { // SE
        rating = rose1.a;
    }
    
    // Finally, translate the danger rating into its designated color.
    if(rating == 0.0) {
        material.diffuse = vec3(0.0, 195.0 / 255.0, 70.0 / 255.0);             // Green (Low)
    } else if(rating == 0.25) {
        material.diffuse = vec3(252.0 / 255.0, 252.0 / 255.0, 0.0);            // Yellow (Moderate)
    } else if(rating == 0.50) {
        material.diffuse = vec3(1.0, 145.0 / 255.0, 0.0);                      // Orange (Considerable)
    } else if(rating == 0.75) {
        material.diffuse = vec3(204.0 / 255.0, 51.0 / 255.0, 44.0 / 255.0);    // Red (High)
    } else if(rating == 1.0) {
        material.diffuse = vec3(34.0 / 255.0, 34.0 / 255.0, 34.0 / 255.0);     // Black (Extreme)
    } else {
        material.diffuse = vec3(1.0, 1.0, 1.0);     // Something is wrong here.
    }
    
    return material;
}
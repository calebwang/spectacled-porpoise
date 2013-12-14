#line 0 101
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleNeighborData;

uniform float uMass;
uniform float uWeightConstant;

uniform float uGridSize;
uniform float uSearchRadius;
uniform vec2 u_ngrid_resolution;
uniform float u_ngrid_L;
uniform float u_ngrid_D;
uniform float uSpaceSide;

varying vec2 vCoord;

uniform vec3 uNeighborVoxels[27];

vec4 getPosition(vec2 xy) {
    return texture2D(uParticlePositionData, xy);
}

vec2 textureCoord(float index) {
    vec2 coord;
    coord.x = mod(index, uGridSize);
    coord.y = floor(index / uGridSize);
    return (coord + 0.5) / uGridSize;
}


vec2 voxelIndex(vec3 pos) {
    // Assumiing smallest voxel coordinate is (0, 0, 0)
    // Find the correct 3D bucket pos belongs into based off the grid side
    // length u_particleDiameter
    vec3 g = floor(pos*u_ngrid_L);

    // Determining which slice the 3D bucket belongs to if a 2D metagraph
    // is constructed from slices of the 3D space
    vec2 meta;
    meta.x = mod(g.z, u_ngrid_D);
    meta.y = floor(g.z / u_ngrid_D);

    // Determining the correct position on the 2D neighbor graph based off
    // the meta graph.
    vec2 n_pos;
    n_pos.x = g.x + u_ngrid_L * meta.x;
    n_pos.y = g.y + u_ngrid_L * meta.y;
    return n_pos;
}

float densityKernel(vec3 myPos, vec3 neighbor) {
    float dist = distance(myPos, neighbor);
    float density = 0.0;
    float search = uSearchRadius;
    //smoothing kernel
    if (dist < search) {
        float diff = search*search - dist*dist;
        density = uWeightConstant * uMass * diff * diff * diff;
    }
    return density;
}


float computeDensityContribution(vec3 offset) {
    float density = 0.0;
    vec3 myPos = getPosition(vCoord).xyz;
    vec3 pos = myPos + offset/uSpaceSide;
    vec3 clampedPos = clamp(pos, 0.0, 1.0);
    bvec3 compare = equal(pos, clampedPos);
    if (compare.x && compare.y && compare.z) {
        vec2 voxel = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
        vec4 vertexIndices = texture2D(uParticleNeighborData, voxel);

        if (vertexIndices.r > 0.0) {
            density += max(densityKernel(myPos, getPosition(textureCoord(vertexIndices.r)).xyz), 0.0);
        }
        if (vertexIndices.g > 0.0) {
            density += max(densityKernel(myPos, getPosition(textureCoord(vertexIndices.g)).xyz), 0.0);
        }
        if (vertexIndices.b > 0.0) {
            density += max(densityKernel(myPos, getPosition(textureCoord(vertexIndices.b)).xyz), 0.0);
        }
        if (vertexIndices.a > 0.0) {
            density += max(densityKernel(myPos, getPosition(textureCoord(vertexIndices.a)).xyz), 0.0);
        }
        if (density < 0.0) {
            return 0.0;
        }
    }
    return density;
}

void main(void) {
    float density = 0.0;
    for (int i = 0; i < 27; i++) {
        density += computeDensityContribution(uNeighborVoxels[i]);
    }

    gl_FragColor = vec4(density);
}

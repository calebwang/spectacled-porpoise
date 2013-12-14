#line 0 100
precision highp float;
precision mediump int;

attribute float aParticleIndex;

uniform float uGridSize;
uniform float uParticleRadius;
uniform float uParticleScale;

uniform sampler2D uParticlePositionData;
uniform sampler2D uSurfaceDepthData;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying float vCoord;
varying vec3 posEye;

uniform vec2 u_partex_resolution;
uniform vec2 u_space_resolution;
uniform vec2 u_ngrid_resolution;

uniform float u_particleDiameter;

uniform float u_ngrid_L;
uniform float u_ngrid_D;

uniform float u_numParticles;


vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec2 voxelIndex(vec3 pos) {
    // Assumiing smallest voxel coordinate is (0, 0, 0)
    // Find the correct 3D bucket pos belongs into based off the grid side
    // length u_particleDiameter
    vec3 g = floor(pos*u_ngrid_L / u_particleDiameter);

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



void main(void) {
    vec2 uv = getUVFromIndex(aParticleIndex);
    vec4 particle = texture2D(uParticlePositionData, uv);

    posEye = vec3(uMVMatrix * particle);
    float particleDepth = length(posEye);
    gl_PointSize = uParticleRadius * (uParticleScale / particleDepth);
    gl_Position = uPMatrix * uMVMatrix * particle;
}

precision mediump float;
precision mediump int;

attribute float aParticleIndex;

uniform float uGridSize;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform sampler2D uParticleDensityData;
uniform sampler2D uParticleNeighborData;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform vec2 u_partex_resolution;
uniform vec2 u_space_resolution;
uniform vec2 u_ngrid_resolution;

uniform float u_particleDiameter;

uniform float u_ngrid_L;
uniform float u_ngrid_D;

uniform float u_numParticles;


varying float vCoord;

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
#line 10 100
    vec2 uv = getUVFromIndex(aParticleIndex);
    vec4 particle = texture2D(uParticlePositionData, uv);
    vCoord = aParticleIndex;
    vec3 pos = particle.rgb;
    vec2 nIndex = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
    vec4 ind = texture2D(uParticleNeighborData, nIndex);
    gl_Position = uPMatrix * uMVMatrix * particle;

    gl_PointSize = 3.0;
}

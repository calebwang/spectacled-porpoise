precision highp float;
attribute float a_particleIndex;
varying vec4 vColor;

uniform vec2 u_partex_resolution;
uniform vec2 u_space_resolution;
uniform vec2 u_ngrid_resolution;

uniform float u_particleDiameter;

uniform float u_ngrid_L;
uniform float u_ngrid_D;

uniform float u_numParticles;

// Particle positions texture
uniform sampler2D u_particlePositions;

vec2 textureCoord(float index) {
    vec2 coord;
    coord.x = mod(index, u_partex_resolution.x);
    coord.y = floor(index / u_partex_resolution.x);
    return (coord + 0.5) / u_partex_resolution;
}

vec2 voxelIndex(vec3 pos) {
    // Assumiing smallest voxel coordinate is (0, 0, 0)
    // Find the correct 3D bucket pos belongs into based off the grid side
    // length u_particleDiameter
    vec3 g = floor(pos / u_particleDiameter);

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

void main() {
    // Get the 3D particle position corrresponding to the particle index
    // by transforming from 1D to 2D buffer indices
    vec3 particlePosition = texture2D(u_particlePositions, textureCoord(a_particleIndex)).rgb;
    // // Save the voxel position into gl_Position
    vec2 p = voxelIndex(particlePosition) + 0.5;
    //vec2 p = particlePosition.rg + 0.5;
    vec2 zeroToOne = p / u_ngrid_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - vec2(1.0, 1.0);

    // Give depth to the position
    gl_Position = vec4(clipSpace, a_particleIndex / u_numParticles, 1);
    gl_PointSize = 0.5;
    // // Pass a color where all the components are the index
    vColor = vec4(a_particleIndex);
}

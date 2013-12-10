#line 0 101
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleNeighborData;

uniform float uMass;
uniform float uKernelConstant;

uniform float uGridSize;
uniform float uSearchRadius;
uniform float u_particleDiameter;
uniform vec3 u_space_resolution;
uniform vec2 u_ngrid_resolution;
uniform float u_ngrid_L;
uniform float u_ngrid_D;

varying vec2 vTexCoord;

vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec4 getPosition(vec2 texCoord) {
    return texture2D(uParticlePositionData, texCoord);
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

vec2 voxelIndexFromParticleIndex(float index) {
    vec3 pos = getPosition(textureCoord(index)).rgb;
    return voxelIndex(pos) + 0.5;
}

float densityKernel(vec3 dist) {
    float d = length(dist) * u_ngrid_L;
    float density = 0.0;
    float search = uSearchRadius;
    //smoothing kernel
    if (d < search) {
        float diff = search*search - d*d;
        density = uKernelConstant * uMass * d * d * d;
    }
    return density;
}


float computeDensityContribution(vec3 offset) {
    float density = 0.0;
    vec3 pos = getPosition(vTexCoord).xyz + offset/u_space_resolution;
    if (pos.x >= 0.0 && pos.y >= 0.0 && pos.z >= 0.0) {
        if (pos.x <= 1.0 && pos.y <= 1.0 && pos.z <= 1.0) {
            vec2 voxel = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
            vec4 vertexIndices = texture2D(uParticleNeighborData, voxel);

            if (vertexIndices.r > 0.0) {
                density += max(densityKernel(pos - texture2D(uParticlePositionData, textureCoord(vertexIndices.r)).rgb), 0.0);
            }
            if (vertexIndices.g > 0.0) {
                density += max(densityKernel(pos - texture2D(uParticlePositionData, textureCoord(vertexIndices.g)).rgb), 0.0);
            }
            if (vertexIndices.b > 0.0) {
                density += max(densityKernel(pos - texture2D(uParticlePositionData, textureCoord(vertexIndices.b)).rgb), 0.0);
            }
            if (vertexIndices.a > 0.0) {
                density += max(densityKernel(pos - texture2D(uParticlePositionData, textureCoord(vertexIndices.a)).rgb), 0.0);
            }
            if (density < 0.0) {
                return 0.0;
            }
        }
    }
    return density;
}

void main(void) {
    // Get the 3D particle position corrresponding to the particle index
    // by transforming from 1D to 2D buffer indices
    vec3 particlePosition = getPosition(vTexCoord).xyz;
    // // Save the voxel position into gl_Position
    vec2 p = voxelIndex(particlePosition) + 0.5;
    //vec2 p = particlePosition.rg + 0.5;

    float density = 0.0;
    density += computeDensityContribution(vec3(0.0, 0.0, 0.0));
    density += computeDensityContribution(vec3(0.0, 0.0, 1.0));
    density += computeDensityContribution(vec3(0.0, 1.0, 0.0));
    density += computeDensityContribution(vec3(0.0, 1.0, 1.0));
    density += computeDensityContribution(vec3(0.0, -1.0, 0.0));
    density += computeDensityContribution(vec3(0.0, 0.0, -1.0));
    density += computeDensityContribution(vec3(0.0, -1.0, -1.0));
    density += computeDensityContribution(vec3(0.0, 1.0, -1.0));
    density += computeDensityContribution(vec3(0.0, -1.0, 1.0));

    density += computeDensityContribution(vec3(1.0, 0.0, 0.0));
    density += computeDensityContribution(vec3(1.0, 0.0, 1.0));
    density += computeDensityContribution(vec3(1.0, 1.0, 0.0));
    density += computeDensityContribution(vec3(1.0, 1.0, 1.0));
    density += computeDensityContribution(vec3(1.0, -1.0, 0.0));
    density += computeDensityContribution(vec3(1.0, 0.0, -1.0));
    density += computeDensityContribution(vec3(1.0, -1.0, -1.0));
    density += computeDensityContribution(vec3(1.0, 1.0, -1.0));
    density += computeDensityContribution(vec3(1.0, -1.0, 1.0));

    density += computeDensityContribution(vec3(-1.0, 0.0, 0.0));
    density += computeDensityContribution(vec3(-1.0, 0.0, 1.0));
    density += computeDensityContribution(vec3(-1.0, 1.0, 0.0));
    density += computeDensityContribution(vec3(-1.0, 1.0, 1.0));
    density += computeDensityContribution(vec3(-1.0, -1.0, 0.0));
    density += computeDensityContribution(vec3(-1.0, 0.0, -1.0));
    density += computeDensityContribution(vec3(-1.0, -1.0, -1.0));
    density += computeDensityContribution(vec3(-1.0, 1.0, -1.0));
    density += computeDensityContribution(vec3(-1.0, -1.0, 1.0));

    gl_FragColor = vec4(density);
}

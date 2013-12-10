#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform sampler2D uParticleDensityData;
uniform sampler2D uParticleNeighborData;
uniform float uMass;
uniform float uSearchRadius;

uniform float uPressureConstant;

uniform vec2 u_partex_resolution;
uniform vec2 u_space_resolution;
uniform vec2 u_ngrid_resolution;

uniform float u_particleDiameter;

uniform float u_ngrid_L;
uniform float u_ngrid_D;

uniform float u_numParticles;

uniform vec2 uViewportSize;
uniform float uGridSize;
uniform float uSpaceSide;

vec2 textureCoord(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec4 getPosition(vec2 xy) {
    return texture2D(uParticlePositionData, xy);
}

vec4 getVelocity(vec2 xy) {
    return texture2D(uParticleVelocityData, xy);
}

vec4 getDensity(vec2 xy) {
    return texture2D(uParticleDensityData, xy);
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

vec3 pressureKernel(vec3 pos, float index) {
    vec3 dist = getPosition(textureCoord(index)).rgb - pos;
    float myDensitiy = getDensity(gl_FragCoord.xy).r;
    float density = getDensity(textureCoord(index)).r;
    vec3 result = vec3(0.0, 0.0, 0.0);
    float d = length(dist);

    if (d > 0.0 && d < uSearchRadius) {
        float x = uSearchRadius - d;
        result = (getDensity(gl_FragCoord.xy/uViewportSize).r/998.23 - 1.0)*uMass*uPressureConstant*x*x*x*normalize(dist)/density;
    }
    return result;
}

vec3 computeForceContribution(vec3 offset) {
    vec3 force = vec3(0.0, 0.0, 0.0);
    vec3 pos = getPosition(gl_FragCoord.xy/uViewportSize).rgb + offset/uSpaceSide;

    if (pos.x >= 0.0 && pos.y >= 0.0 && pos.z >= 0.0) {
        if (pos.x <= 1.0 && pos.y <= 1.0 && pos.z <= 1.0) {
            vec2 voxel = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
            vec4 vertexIndices = texture2D(uParticleNeighborData, voxel);

            if (vertexIndices.r > 0.0) {
                force += pressureKernel(pos, vertexIndices.r);
            }
            if (vertexIndices.g > 0.0) {
                force += pressureKernel(pos, vertexIndices.g);
            }
            if (vertexIndices.b > 0.0) {
                force += pressureKernel(pos, vertexIndices.b);
            }
            if (vertexIndices.a > 0.0) {
                force += pressureKernel(pos, vertexIndices.a);
            }
        }
    }
    return force;
}

void main(void) {
    vec3 vel = getVelocity(gl_FragCoord.xy/uViewportSize).xyz;
    vec3 pos = getPosition(gl_FragCoord.xy/uViewportSize).xyz;
    float density = getDensity(gl_FragCoord.xy/uViewportSize).x;

    vec3 force = vec3(0.0, 0.0, 0.0);
    force += computeForceContribution(vec3(0.0, 0.0, 0.0));
    force += computeForceContribution(vec3(0.0, 0.0, 1.0));
    force += computeForceContribution(vec3(0.0, 1.0, 0.0));
    force += computeForceContribution(vec3(0.0, 1.0, 1.0));
    force += computeForceContribution(vec3(0.0, -1.0, 0.0));
    force += computeForceContribution(vec3(0.0, 0.0, -1.0));
    force += computeForceContribution(vec3(0.0, -1.0, -1.0));
    force += computeForceContribution(vec3(0.0, 1.0, -1.0));
    force += computeForceContribution(vec3(0.0, -1.0, 1.0));

    force += computeForceContribution(vec3(1.0, 0.0, 0.0));
    force += computeForceContribution(vec3(1.0, 0.0, 1.0));
    force += computeForceContribution(vec3(1.0, 1.0, 0.0));
    force += computeForceContribution(vec3(1.0, 1.0, 1.0));
    force += computeForceContribution(vec3(1.0, -1.0, 0.0));
    force += computeForceContribution(vec3(1.0, 0.0, -1.0));
    force += computeForceContribution(vec3(1.0, -1.0, -1.0));
    force += computeForceContribution(vec3(1.0, 1.0, -1.0));
    force += computeForceContribution(vec3(1.0, -1.0, 1.0));

    force += computeForceContribution(vec3(-1.0, 0.0, 0.0));
    force += computeForceContribution(vec3(-1.0, 0.0, 1.0));
    force += computeForceContribution(vec3(-1.0, 1.0, 0.0));
    force += computeForceContribution(vec3(-1.0, 1.0, 1.0));
    force += computeForceContribution(vec3(-1.0, -1.0, 0.0));
    force += computeForceContribution(vec3(-1.0, 0.0, -1.0));
    force += computeForceContribution(vec3(-1.0, -1.0, -1.0));
    force += computeForceContribution(vec3(-1.0, 1.0, -1.0));
    force += computeForceContribution(vec3(-1.0, -1.0, 1.0));

    vel += 0.005*(force/9.23);

    if (pos.x > 1.0) {
        vel.x = -abs(vel.x) * 0.8;
    }
    if (pos.y > 1.0) {
        vel.y = -abs(vel.y) * 0.8;
    }
    if (pos.z > 1.0) {
        vel.z = -abs(vel.z) * 0.8;
    }
    if (pos.x < 0.0) {
        vel.x = abs(vel.x) * 0.8;
    }
    if (pos.y < 0.0) {
        vel.y = 9.8*0.01;
    }
    if (pos.z < 0.0) {
        vel.z = abs(vel.z) * 0.8;
    }

    vel += 0.005*vec3(0.0, -9.8, 0.0);

    gl_FragColor = vec4(vel, 1.0);
}

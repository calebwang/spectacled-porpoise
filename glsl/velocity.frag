#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform sampler2D uParticleDensityData;
uniform sampler2D uParticleNeighborData;

uniform float uMass;
uniform float uPressureConstant;
uniform float uViscosityConstant;

uniform float uGridSize;
uniform float uSearchRadius;
uniform vec3 u_space_resolution;
uniform vec2 u_ngrid_resolution;
uniform float u_ngrid_L;
uniform float u_ngrid_D;

varying vec2 vTexCoord;
varying float vVertexIndex;

uniform vec3 u_neighborVoxels[27];

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

vec3 pressureKernel(vec3 myPos, vec3 neighbor) {
    vec3 result = vec3(0.0, 0.0, 0.0);
    float d = distance(myPos, neighbor) * u_ngrid_L;

    if (d < uSearchRadius) {
        float x = uSearchRadius - d;
        result = uPressureConstant*x*x*normalize(neighbor - myPos);
    }
    return vec3(0.0) - result;
}

float viscosityKernel(vec3 myPos, vec3 neighbor) {
    float result = 0.0;
    float d = distance(myPos, neighbor) * u_ngrid_L;

    if (d < uSearchRadius) {
        float x = uSearchRadius - d;
        result = uViscosityConstant*x;
    }
    return result;
}

float pressure(float density) {
    return 3.0 * (density - uMass);
}

vec3 computeForce(float index) {
    if (vVertexIndex == index) {
        return vec3(0.0);
    }
    vec2 neighborTexCoord = textureCoord(index);
    vec3 myPos = getPosition(vTexCoord).xyz;
    vec3 neighbor = getPosition(textureCoord(index)).xyz;

    float myDensity = getDensity(vTexCoord).x;
    float density = getDensity(neighborTexCoord).x;

    float avg_pressure = (pressure(density) + pressure(myDensity)) / 2.0;
    vec3 pressureForce = pressureKernel(myPos, neighbor) * avg_pressure * uMass / density;

    vec3 myVelocity = getVelocity(vTexCoord).xyz;
    vec3 velocity = getVelocity(neighborTexCoord).xyz;
    vec3 dv = velocity - myVelocity;
    vec3 viscosityForce = dv * viscosityKernel(myPos, neighbor) * 36.0 * uMass / density;

    return pressureForce + viscosityForce;
}

vec3 computeForceContribution(vec3 offset) {
    vec3 force = vec3(0.0, 0.0, 0.0);
    vec3 pos = getPosition(vTexCoord).xyz + offset/u_space_resolution;
    vec3 clampedPos = clamp(pos, 0.0, 1.0);
    bvec3 compare = equal(pos, clampedPos);
    if (compare.x && compare.y && compare.z) {
        vec2 voxel = (voxelIndex(pos) + 0.5)/u_ngrid_resolution;
        vec4 vertexIndices = texture2D(uParticleNeighborData, voxel);

        if (vertexIndices.r > 0.0) {
            force += computeForce(vertexIndices.r);
        }
        if (vertexIndices.g > 0.0) {
            force += computeForce(vertexIndices.g);
        }
        if (vertexIndices.b > 0.0) {
            force += computeForce(vertexIndices.b);
        }
        if (vertexIndices.a > 0.0) {
            force += computeForce(vertexIndices.a);
        }
    }
    return force;
}

void main(void) {
    vec3 vel = getVelocity(vTexCoord).xyz;
    vec3 pos = getPosition(vTexCoord).xyz;
    float density = getDensity(vTexCoord).x;

    vec3 force = vec3(0.0, 0.0, 0.0);
    for (int i = 0; i < 27; i++) {
        force += computeForceContribution(u_neighborVoxels[i]);
    }

    vec3 center = vec3(0.5);
    vec3 local = pos - center;
    vec3 box = vec3(0.48);
    vec3 contactLocal = min(box, max(-box, local));
    vec3 contact = contactLocal + center;

    float cDist = length(contactLocal + center - pos);

    if (cDist > 0.0 && length(vel) > 0.0) {
        vec3 normal = normalize(sign(contactLocal - local));
        vel -= dot(vel, normal) * normal;
    }

    // a = f_i / d_i, where f is force and d is density
    // Assuming this is meters / second
    vel += (force/density) / u_space_resolution / 60.0;
    vel += vec3(0.0, -9.8, 0.0) / u_space_resolution / 60.0;

    gl_FragColor = vec4(vel, 1.0);
}

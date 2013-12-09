#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform sampler2D uParticleDensityData;
uniform sampler2D uParticleNeighborData;
uniform float uMass;
uniform float uSearchRadius;

uniform vec2 uViewportSize;
uniform float uGridSize;
uniform float uSpaceSide; 

vec2 getUVFromIndex(float particleNumber) {
    float interval = 1.0/uGridSize;
    vec2 uv;
    uv.x = interval * (mod(particleNumber, uGridSize) + 0.5);
    uv.y = interval * (floor(particleNumber/uGridSize) + 0.5);
    return uv;
}

vec4 getPosition(vec2 xy) {
    return texture2D(uParticlePositionData, xy/uViewportSize);
}

vec4 getVelocity(vec2 xy) {
    return texture2D(uParticleVelocityData, xy/uViewportSize);
}

void main(void) {
    vec3 vel = getVelocity(gl_FragCoord.xy).xyz;
    vec3 pos = getPosition(gl_FragCoord.xy).xyz;

    if (pos.x > uSpaceSide) {
        vel.x = -vel.x * 0.8;
    }
    if (pos.y > uSpaceSide) {
        vel.y = -vel.y * 0.8;
    }
    if (pos.z > uSpaceSide) {
        vel.z = -vel.z * 0.8;
    }
    if (pos.x < 0.0) {
        vel.x = -vel.x * 0.8;
    }
    if (pos.y < 0.0) {
        vel.y = 9.8 * 0.01;
    }
    if (pos.z < 0.0) {
        vel.z = -vel.z * 0.8;
    }
    gl_FragColor = vec4(vel, 1.0) + 0.01*vec4(0.0, -9.8, 0.0, 1.0);
}

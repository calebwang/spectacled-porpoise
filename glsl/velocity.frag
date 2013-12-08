#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
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

vec4 getPosition() {
    return texture2D(uParticlePositionData, gl_FragCoord.xy/uViewportSize);
}

vec4 getVelocity() {
    return texture2D(uParticleVelocityData, gl_FragCoord.xy/uViewportSize);
}

void main(void) {
    vec3 vel = getVelocity().xyz;
    vec3 pos = getPosition().xyz;

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
        vel.y = -vel.y * 0.8 + 9.8 * 0.01;
    }
    if (pos.z < 0.0) {
        vel.z = -vel.z * 0.8;
    }
    gl_FragColor = vec4(vel, 1.0) + 0.01*vec4(0.0, -9.8, 0.0, 1.0);
}

#line 0 111
precision mediump float;
precision mediump int;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;
uniform vec2 uViewportSize;
uniform float uGridSize;

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
    if (abs(pos.x) > 1.0) {
        vel.x = -vel.x * 0.8;
    }
    if (abs(pos.z) > 1.0) {
        vel.z = -vel.z * 0.8;
    }
    if (abs(pos.y) > 1.0) {
        vel.y = -vel.y * 0.8;
    }
    if (pos.y < -1.0) {
        vel.y = vel.y + 9.8 * 0.01;
    }
    gl_FragColor = vec4(vel, 1.0) + 0.01*vec4(0.0, -9.8, 0.0, 1.0);
}

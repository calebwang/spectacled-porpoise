#line 0 100
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
    vec3 pos = getPosition().xyz;
    vec3 dir = getVelocity().xyz;
    gl_FragColor = vec4(pos, 1.0) + 0.01*vec4(dir, 1.0);
}

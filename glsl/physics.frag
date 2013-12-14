#line 0 100
precision mediump float;
precision mediump int;

varying vec2 vCoord;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;

vec3 getPosition(vec2 texCoord) {
    return texture2D(uParticlePositionData, texCoord).xyz;
}

vec3 getVelocity(vec2 texCoord) {
    return texture2D(uParticleVelocityData, texCoord).xyz;
}

void main(void) {
    vec3 pos = getPosition(vCoord);
    vec3 vel = getVelocity(vCoord);
    vec3 newPos = pos + vel / 120.0;
    gl_FragColor = vec4(newPos, 1.0);
}

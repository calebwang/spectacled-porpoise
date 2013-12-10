#line 0 100
precision mediump float;
precision mediump int;

varying vec2 vTexCoord;

uniform sampler2D uParticlePositionData;
uniform sampler2D uParticleVelocityData;

vec3 getPosition(vec2 texCoord) {
    return texture2D(uParticlePositionData, texCoord).xyz;
}

vec3 getVelocity(vec2 texCoord) {
    return texture2D(uParticleVelocityData, texCoord).xyz;
}

void main(void) {
    vec3 vel = getVelocity(vTexCoord);
    vec3 pos = getPosition(vTexCoord);

    vec3 newPos = clamp(pos + 0.00005 * vel, 0.0, 1.0);

    gl_FragColor = vec4(newPos, 1.0);
}

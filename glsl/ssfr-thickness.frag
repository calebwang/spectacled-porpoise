precision highp float;

uniform sampler2D uParticlePositionData;
uniform sampler2D uSurfaceDepthData;

uniform float uParticleRadius;
uniform float uParticleScale;

uniform mat4 uPMatrix;
varying vec3 posEye;

void main(void) {
#line 0 10
    vec3 norm;
    norm.xy = (gl_PointCoord.st * vec2(2.0, -2.0)) + vec2(-1.0, 1.0);
    float mag = dot(norm.xy, norm.xy);
    if (mag > 1.0) discard;
    float color = 0.1;
    //float color = .1 * exp(-mag);

    vec4 spherePosEye = vec4(posEye + (norm * uParticleRadius) / uParticleScale, 1.0);
    vec4 clipSpacePos = uPMatrix  * spherePosEye;

    float normDepth = clipSpacePos.z/2.0;
    gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
}

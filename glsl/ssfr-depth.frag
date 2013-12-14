#extension GL_EXT_frag_depth: enable
precision highp float;

uniform sampler2D uParticlePositionData;
uniform sampler2D uSurfaceDepthData;

uniform float uParticleRadius;
uniform float uParticleScale;


uniform mat4 uPMatrix;
varying vec3 posEye;
varying float particleDepth;

void main(void) {
#line 0 10
    vec3 norm;
    vec3 lightDir = vec3(1.0, 1.0 , 1.0);
    vec3 kd = vec3(0.0, 1.0, 1.0);

    norm.xy = (gl_PointCoord.st * vec2(2.0, -2.0)) + vec2(-1.0, 1.0);
    float mag = dot(norm.xy, norm.xy);
    if (mag > 1.0) discard;
    norm.z = sqrt(1.0 - mag);

    vec4 spherePosEye = vec4(posEye + (norm * uParticleRadius) / uParticleScale, 1.0);
    vec4 clipSpacePos = uPMatrix  * spherePosEye;

    float normDepth = clipSpacePos.z/2.0;
    gl_FragDepthEXT = normDepth;
    gl_FragColor = vec4(normDepth, normDepth, normDepth, 1.0);

}

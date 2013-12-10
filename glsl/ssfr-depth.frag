#extension GL_EXT_frag_depth: enable
precision mediump float;

uniform sampler2D uParticlePositionData;

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

   /* float normDepth = gl_FragCoord.z;
    float normMag = (norm.z*uParticleRadius)/uParticleScale + normDepth;

    //gl_FragColor = vec4(norm, 1.0); 
    //gl_FragColor = vec4(norm.z, norm.z, norm.z, 1.0);
    //gl_FragColor = vec4(normMag, normMag, normMag, 1.0);
    float diffuse = dot(norm, lightDir);
    gl_FragColor = vec4(diffuse*kd.r, diffuse*kd.g, diffuse*kd.b, 1.0);*/

    vec4 spherePosEye = vec4(posEye + (norm * uParticleRadius) / uParticleScale, 1.0);
    vec4 clipSpacePos = uPMatrix  * spherePosEye;

    float normDepth = clipSpacePos.z/clipSpacePos.w + .5;
    gl_FragDepthEXT = normDepth;
    gl_FragColor = vec4(normDepth, normDepth, normDepth, 1.0);

}
precision mediump float;

uniform sampler2D uParticlePositionData;

uniform float uParticleRadius;
uniform float uParticleScale;
uniform float near;
uniform float far;

uniform mat4 uPMatrix;
varying vec3 posEye;
varying float particleDepth;

void main(void) {
#line 0 10
    vec3 norm;

    norm.xy = (gl_PointCoord.st * vec2(2.0, -2.0)) + vec2(-1.0, 1.0);
    float mag = dot(norm.xy, norm.xy);
    if (mag > 1.0) discard;
    norm.z = sqrt(1.0 - mag);

    float normDepth = gl_FragCoord.z;
    //float depth = (((far-near)/2.0)*normDepth) + ((far+near)/2.0);
    float normMag = (norm.z*uParticleRadius)/uParticleScale + normDepth;

    //float depth = (((far-near)/2.0)*normDepth) + ((far+near)/2.0);
    //float depth = (normDepth - .) * 2.0;
    //gl_FragColor = vec4(depth, depth, depth, 1.0); 
    //gl_FragColor = vec4(norm, 1.0); 
    //gl_FragColor = vec4(norm.z, norm.z, norm.z, 1.0);
    gl_FragColor = vec4(normMag, normMag, normMag, 1.0);
    //gl_FragColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
}
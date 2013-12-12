precision highp float;

uniform mat4 uPMatrix;
uniform mat4 uInvPMatrix;
uniform mat4 uInvMVMatrix;
uniform sampler2D uSurfaceDepthData;
uniform vec2 uViewportSize;

vec3 uvToEye(vec2 uv, float depth) {
    vec3 eye = vec4(uInvMVMatrix * uInvPMatrix * vec4(uv, 0.0, 1.0)).xyz;
    eye.z = depth * 2.0;
    return eye;
}

vec3 getEyePos(vec2 uv) {
    vec3 eye = vec4(uInvMVMatrix * uInvPMatrix * vec4(uv, 0.0, 1.0)).xyz;
    float depthData = texture2D(uSurfaceDepthData, uv).z;
    eye.z = depthData * 2.0;
    return eye;
}

void main(void) {
#line 0 10
    vec2 tex_coord = gl_FragCoord.xy/uViewportSize;
    float depthData = texture2D(uSurfaceDepthData, tex_coord).x;

    if(depthData <= 0.0) discard;
    vec3 posEye = uvToEye(tex_coord, depthData);

    vec3 ddx = getEyePos(tex_coord + vec2(1.0/uViewportSize.x, 0.0)) - posEye;
    vec3 ddx2 = posEye - getEyePos(tex_coord + vec2(-1.0/uViewportSize.x, 0.0));
    if(abs(ddx.z) > abs(ddx2.z)) {
        ddx = ddx2;
    }

    vec3 ddy = getEyePos(tex_coord + vec2(0.0, 1.0/uViewportSize.y)) - posEye;
    vec3 ddy2 = posEye - getEyePos(tex_coord + vec2(0.0, -1.0/uViewportSize.y));
    if(abs(ddy2.z) < abs(ddy.z)) {
        ddy = ddy2;
    }

    vec3 n = cross(ddx, ddy);
    n = normalize(n);

    gl_FragColor = vec4(n, 1.0);
    //gl_FragColor = texture2D(uSurfaceDepthData, tex_coord);
}